# StudyVerse

StudyVerse is a React, TypeScript, and Vite study workspace for Classes 5–10 and Intermediate 1st and 2nd Year. It includes curriculum exploration, practice assessments, study planning, notes, and Aria, the Gemini-powered academic teacher.

## Setup

Install dependencies and configure the environment:

```sh
npm install
cp .env.example .env
```

Set `GEMINI_API_KEY` as a **server-side secret**. Never use a `VITE_` prefix for this key or send it to the browser. Supabase preview/auth features use the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` values. Apply the schema and RLS migrations in `supabase/migrations` to enable cloud data sync; the AI Study Planner additionally requires its `planner_metadata` migration documented below.

For Supabase Authentication, set the production application URL as **Site URL** in the Supabase Dashboard under **Authentication → URL Configuration**. Add the exact local development origin (`http://localhost:3000` for `npm run dev`) and each deployed application origin to **Redirect URLs**. Signup confirmation, Google OAuth, and password reset redirect to the current browser origin; they do not hardcode a localhost URL. Keep local origins out of production-only deployments, and confirm the Google provider is enabled and its OAuth callback URL is configured with the provider. A successful redirect still depends on those dashboard/provider settings and has not been live-tested as part of this repository audit.

Run the app and checks:

```sh
npm run dev
npm test
npm run lint
npm run build
```

## Supabase migration application checklist

The migrations have **not** been applied or validated against a live Supabase database. Preserve existing data; do not reset the project or run destructive SQL. Before enabling cloud persistence, review and apply the following files in order in a staging project first, then repeat against production after backup and verification:

- [ ] `202611140001_studyverse_schema.sql` — base tables and constraints.
- [ ] `202611140002_rls_and_auth_trigger.sql` — owner-only policies and signup profile trigger.
- [ ] `202611150001_ai_study_planner_metadata.sql` — planner metadata on existing study-plan rows.
- [ ] `202611160001_video_learning_progress.sql` — per-user video learning progress.
- [ ] `202611170001_focus_session_persistence.sql` — per-user focus history.
- [ ] `202611170002_notification_persistence.sql` — per-user notifications.
- [ ] `202611170003_quiz_topic_results.sql` — topic IDs on quiz attempts.
- [ ] `202611170004_guardian_linking.sql` — signup-assigned account roles, consented invitations, guardian links, and restricted summary RPCs.

Confirm each statement completes, inspect the resulting tables/functions/policies, and test with two distinct authenticated accounts to verify owner isolation and guardian consent/revocation. The guardian migration depends on the base schema and focus-session table. Do not mark the checklist complete until the target project has been verified.

## Aria conversation API

`POST /api/aria/chat` accepts a JSON body with a `message`, optional `history` (up to 12 user/assistant messages), `teachingStyle` (`step-by-step`, `socratic`, or `exam-coach`), and optional curriculum `context`. Message and context lengths and roles are validated on the server. The server calls Gemini using the existing `GEMINI_API_KEY` and returns `{ "reply": "..." }`; it never returns or exposes the key.

Aria is limited to 12 requests per IP observed by the Express process per minute. This in-memory limit is per process; for multi-instance deployments, configure the hosting gateway to apply a shared rate limit. When deployed behind a proxy, configure Express proxy trust only for the known proxy chain so client IPs are interpreted correctly.

## AI Notes API

`POST /api/notes/generate` validates note-generation inputs and returns a normalized structured note. It uses the server-only `GEMINI_API_KEY`, returns `400` for invalid input, `503` when Gemini is not configured, and a safe provider/normalization error when generation fails. Requests are limited to 12 per observed IP per minute in the Express process; multi-instance deployments should also apply a shared gateway limit.

## AI Textbook Lessons API

`POST /api/lessons/generate` accepts the selected `classLabel`, `board`, `subject`, `chapter`, `topic`, `topicSummary`, lesson `depth` (`overview`, `walkthrough`, or `exam`), and `teachingStyle` (`step-by-step`, `analogy-led`, or `socratic`). `keyFormula` is optional. The server validates and bounds these fields, uses the existing server-only `GEMINI_API_KEY`, and returns a structured `{ "lesson": ... }` response with a simple explanation, detailed explanation, real-life examples, definitions, key points, and practice questions with answers and explanations.

The endpoint allows 12 requests per observed IP per minute using an in-memory per-process limit and returns `429` with `Retry-After` when exceeded. Invalid requests return `400`; missing server Gemini configuration returns `503`; provider or malformed-output failures return `429` or `502`. The lesson view supports retry and cancels its pending browser request when the user cancels or changes curriculum context. As with Aria, multi-instance deployments should enforce a shared gateway rate limit and configure Express proxy trust for the known proxy chain.

## Numerical Lab API

The Numerical Lab uses two server-side Gemini endpoints:

- `POST /api/numerical-lab/solve` accepts `classLabel`, `board`, `subject`, `chapter`, `topic`, `problemStatement`, and optional `givenValues`. It returns `{ "solution": ... }` with extracted givens, required quantity, formula and explanation, unit conversions, worked calculations, final answer and units, a verification check, and common mistakes.
- `POST /api/numerical-lab/verify` accepts the same context and problem fields plus `studentSteps` (one calculation per line). It returns `{ "verification": ... }`, including a per-step assessment, the first demonstrably incorrect step, an explanation, a hint, a separate correction, and any valid alternative approaches.

Both endpoints validate and bound all input and generated content. Step verification treats mathematically equivalent methods as valid and marks a step incorrect only when Gemini supplies a concrete justification, hint, and correction; otherwise the step is returned as uncertain. The UI reveals a correction only after the student opens its hint. The endpoints share a 12-request-per-observed-IP-per-minute in-memory limit and return `429` with `Retry-After` when exceeded. Invalid requests return `400`, missing server-side Gemini configuration returns `503`, and malformed model output or provider errors return a safe `502`, `503`, `504`, or `429` response. The Gemini key remains server-only. Configure a shared gateway limiter for multi-instance deployments.

## AI Study Planner API

`POST /api/study-planner/generate` accepts `gradeId`, `board`, selected `subjects` and `weakSubjects`, `dailyAvailableMinutes`, `weekStartDate`, `targetDate`, `preferredDays`, optional `chaptersAndTopics`, and `revisionPreference` (`spaced`, `balanced`, or `exam-focused`). The server validates and bounds these preferences, uses the server-only Gemini key, and returns `{ "plan": ... }` with a weekly schedule, learning objectives, practice recommendations, revision guidance, and break guidance. Sessions contain a date/day, optional start time, bounded duration, subject/topic, learning objective, practice recommendation, session type, and priority. Every generated session is normalized against the requested week, preferred days, subjects, and available daily minutes before it reaches the browser.

Example request:

```json
{
  "gradeId": "class-10",
  "board": "NCERT / CBSE",
  "subjects": ["Mathematics", "Physics"],
  "weakSubjects": ["Physics"],
  "dailyAvailableMinutes": 120,
  "weekStartDate": "2027-01-04",
  "targetDate": "2027-03-01",
  "preferredDays": ["Mon", "Tue", "Wed", "Thu", "Fri"],
  "chaptersAndTopics": "Quadratics and electricity",
  "revisionPreference": "spaced"
}
```

The endpoint is limited to 6 requests per observed IP per minute using an in-memory per-process limiter and has a 45-second server deadline. Invalid input returns `400`, missing Gemini configuration returns `503`, malformed model output returns `502`, and provider quota/timeouts map to `429`/`504`. Browser cancellation stops waiting for a generation; the provider request may continue until Gemini responds or the server deadline is reached. Deployments with multiple server instances should enforce a shared gateway rate limit and configure Express proxy trust for the known proxy chain.

AI sessions are saved as rows in the existing `study_plans` table. Apply `supabase/migrations/202611150001_ai_study_planner_metadata.sql` after the existing schema and RLS migrations to add the `planner_metadata` JSONB column and plan-group index. The migration does not create another table or change existing owner-only RLS policies. Generated plans are stored through the existing authenticated Supabase client and remain protected by those policies; unauthenticated preview plans are session-local.

## YouTube Learning Hub

The Hub uses the server-only `YOUTUBE_API_KEY` environment variable with YouTube Data API v3. Set it in the server environment (or local `.env`) to enable real search; never prefix it with `VITE_`. The checked-in `.env.example` contains a placeholder. Without a configured key, `/api/youtube/search` returns `503` and the UI provides a direct YouTube search link rather than fabricated results.

`GET /api/youtube/search` accepts `query` (up to 200 characters), optional `gradeId`, `board`, `subject`, `chapter`, `topic`, and an opaque YouTube `pageToken`. The endpoint combines bounded curriculum context, requests up to 12 video results, validates returned video IDs, and loads durations from YouTube when available. It returns `{ "videos": [...], "nextPageToken": "...", "totalResults": n }`; provider quota errors return `429`, invalid input/page tokens return `400`, missing or invalid API configuration returns `503`, and provider failures return a safe `502`/`504`. Search is limited to 12 requests per observed IP per minute in this server process.

Video bookmarks reuse the existing `bookmarks` table (`resource_type = 'video'`), its JSONB metadata, unique user/resource constraint, and owner-only RLS. No database migration is required. Signed-in bookmarks sync to the account and appear in Personal Library; guest bookmarks remain in current app memory only. Search history is stored locally in the browser. Start `npm run dev`, open YouTube Hub, and search to test; actual API results require a valid server-side YouTube Data API key and enabled YouTube Data API v3 project.

## Video learning integration

Textbook Lessons and each Study Planner session can search real recommendations through the same `/api/youtube/search` endpoint and server-side `YOUTUBE_API_KEY`. Search results are always real YouTube Data API results; when the key is missing the app shows a configuration error and a direct YouTube search link, not sample videos. Planner sessions can store one selected video in their existing `study_plans.planner_metadata` JSON; there is no separate planner-video table.

Students can manually set a video to `Not Started`, `In Progress`, or `Completed`. Marking a video complete reveals the existing curriculum quiz flow, which uses the selected class, board, subject, chapter, and topic and draws questions from the existing question bank. This is a student self-report only: StudyVerse does not track YouTube watch time or verify completion.

Signed-in progress is stored in `public.video_learning_progress`, protected by per-user RLS. Apply `supabase/migrations/202611160001_video_learning_progress.sql` after the base schema and RLS migrations. Guest progress remains in app memory for the current session. Run `npm test` to test search/progress helpers and planner metadata mapping; live YouTube results require the configured server key.

## Focus, notifications, and guardian access

Apply the migrations in timestamp order after the base schema and RLS migrations:

- `202611170001_focus_session_persistence.sql` adds owner-only focus history with completed/interrupted status.
- `202611170002_notification_persistence.sql` adds owner-only persisted notifications.
- `202611170003_quiz_topic_results.sql` adds topic-level quiz result details used by weak-topic analytics.
- `202611170004_guardian_linking.sql` adds account roles, one-time guardian invitations, approved links, and narrowly scoped academic summary RPCs.
- `202611170005_profile_account_role_integrity.sql` prevents client-side profile deletion and recreation from changing `account_role`, while retaining profile inserts and signup-trigger behavior.

Focus history and notifications are loaded only for the signed-in user and cleared from the client when accounts change. Active mock tests are restored from account- and context-scoped browser storage; only submitted attempts are stored in Supabase. Guardian access requires the student to create and privately share a single-use code after explicit consent. Codes expire after 24 hours, are stored as SHA-256 hashes, and invitation creation is limited to five per student per day. Guardians must authenticate with a separate parent account. They can view only linked students' permitted progress and assessment summaries; notes and AI conversations are excluded. Either participant can revoke a link. The migration is not applied automatically; verify it in the target Supabase project before enabling guardian linking.

The current curriculum is a curated learning map, not a complete transcription of official textbooks. Classes 6–10 include core mathematics, science, English, and social-studies learning pathways, but the topic clusters do not claim official chapter names, ordering, or complete syllabus coverage. Class 6–8 clusters are broad learning pathways, not a verified mapping to a particular NCERT textbook edition; Class 9–10 subject availability is cross-checked against the [CBSE 2026–27 curriculum index](https://cbseacademic.nic.in/curriculum_2027.html). Check the official curriculum for the applicable academic year before making syllabus-alignment claims. Quiz questions remain limited to the reviewed question bank: a curriculum topic without reviewed questions does not receive fabricated questions.
