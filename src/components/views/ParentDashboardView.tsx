import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Loader2, ShieldCheck, Trash2, Users } from 'lucide-react';
import type {
  GuardianStudentLink,
  GuardianStudentSummary,
  StudentGuardianLink,
  UserRole,
} from '../../types/studyverse';
import { getClassById } from '../../utils/curriculumHelpers';
import {
  claimGuardianInvitation,
  createGuardianInvitation,
  loadGuardianStudentSummary,
  loadGuardianStudents,
  loadStudentGuardians,
  revokeGuardianLink,
} from '../../utils/studyverseDb';
import {
  generateGuardianInvitationCode,
  hashGuardianInvitationCode,
} from '../../utils/guardianHelpers';

interface ParentDashboardViewProps {
  role: UserRole;
  userId: string | null;
}

export function ParentDashboardView({ role, userId }: ParentDashboardViewProps) {
  const [students, setStudents] = useState<GuardianStudentLink[]>([]);
  const [guardians, setGuardians] = useState<StudentGuardianLink[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [summary, setSummary] = useState<GuardianStudentSummary | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const linksRequestId = useRef(0);

  const refreshLinks = useCallback(async () => {
    if (!userId) return;
    const requestId = ++linksRequestId.current;
    setLoadingLinks(true);
    setError(null);
    try {
      if (role === 'parent') {
        const result = await loadGuardianStudents(userId);
        if (linksRequestId.current !== requestId) return;
        if (result.error || !result.data) {
          setError(result.error ?? 'Could not load linked students.');
          setStudents([]);
        } else {
          setStudents(result.data);
          setSelectedStudentId((selected) =>
            result.data!.some((student) => student.studentId === selected)
              ? selected
              : result.data![0]?.studentId ?? ''
          );
        }
      } else {
        const result = await loadStudentGuardians(userId);
        if (linksRequestId.current !== requestId) return;
        if (result.error || !result.data) {
          setError(result.error ?? 'Could not load linked guardians.');
          setGuardians([]);
        } else {
          setGuardians(result.data);
        }
      }
    } catch {
      if (linksRequestId.current === requestId) {
        setError('Could not load guardian connections. Please try again.');
      }
    } finally {
      if (linksRequestId.current === requestId) setLoadingLinks(false);
    }
  }, [role, userId]);

  useEffect(() => {
    setStudents([]);
    setGuardians([]);
    setSummary(null);
    setSelectedStudentId('');
    void refreshLinks();
  }, [refreshLinks]);

  useEffect(() => {
    if (!userId || role !== 'parent' || !selectedStudentId) {
      setSummary(null);
      return;
    }
    let active = true;
    setLoadingSummary(true);
    setSummary(null);
    void loadGuardianStudentSummary(userId, selectedStudentId)
      .then((result) => {
        if (!active) return;
        if (result.error || !result.data) {
          setError(result.error ?? 'Could not load this student summary.');
        } else {
          setSummary(result.data);
        }
      })
      .catch(() => {
        if (active) setError('Could not load this student summary. Please try again.');
      })
      .finally(() => {
        if (active) setLoadingSummary(false);
      });
    return () => {
      active = false;
    };
  }, [role, selectedStudentId, userId]);

  const handleCreateInvitation = async () => {
    if (!userId || !consentGiven || working) return;
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const code = generateGuardianInvitationCode();
      const tokenHash = await hashGuardianInvitationCode(code);
      const result = await createGuardianInvitation(userId, tokenHash, consentGiven);
      if (result.error) {
        setError(result.error);
      } else {
        setInviteCode(code);
        setNotice(
          `Invitation created. It expires ${new Date(result.data!.expiresAt).toLocaleString()}. Share the code only with your guardian.`
        );
      }
    } catch (invitationError) {
      setError(invitationError instanceof Error ? invitationError.message : 'Could not create an invitation.');
    } finally {
      setWorking(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setNotice('Invitation code copied. Share it privately with your guardian.');
    } catch {
      setError('Clipboard access is unavailable. You can copy the displayed code manually.');
    }
  };

  const handleClaimInvitation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || working) return;
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const tokenHash = await hashGuardianInvitationCode(enteredCode);
      const result = await claimGuardianInvitation(userId, tokenHash);
      if (result.error) {
        setError(result.error);
      } else {
        setEnteredCode('');
        setNotice('Guardian connection approved. You can now view the student’s shared progress.');
        await refreshLinks();
      }
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : 'Could not accept this invitation.');
    } finally {
      setWorking(false);
    }
  };

  const handleRevoke = async (linkId: string) => {
    if (!userId || working) return;
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const result = await revokeGuardianLink(userId, linkId);
      if (result.error) {
        setError(result.error);
      } else {
        setNotice('Guardian access has been revoked.');
        setSummary(null);
        await refreshLinks();
      }
    } catch {
      setError('Could not revoke this guardian connection. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  if (!userId) {
    return (
      <section className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6">
        <h2 className="font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">
          Parent &amp; Guardian Portal
        </h2>
        <p className="mt-2 text-sm text-[#6b6684] dark:text-[#b0a6cf]">
          Sign in to invite a guardian or accept a student’s invitation. This portal never substitutes
          your own student data for a linked student’s progress.
        </p>
      </section>
    );
  }

  const selectedStudent = students.find((student) => student.studentId === selectedStudentId);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#5a45c8] dark:text-[#c4b5fd]">
            Consent-Based Guardian Access
          </div>
          <h2 className="mt-1 font-display text-xl font-bold text-[#1b1831] dark:text-[#f3f0fc]">
            Parent &amp; Guardian Portal
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-[#6b6684] dark:text-[#b0a6cf]">
            {role === 'student'
              ? 'Create a one-time invitation to share read-only academic progress, study time, assessment results, and achievements.'
              : 'View only students who explicitly approved your invitation. Private notes and AI conversations are never shared.'}
          </p>
        </div>
        <ShieldCheck className="h-7 w-7 shrink-0 text-[#5a45c8] dark:text-[#a78bfa]" aria-hidden="true" />
      </section>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div role="status" className="rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-3 text-xs text-[#047857] dark:border-[#047857] dark:bg-[#102d24] dark:text-[#34d399]">
          {notice}
        </div>
      ) : null}

      {role === 'student' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">
              Invite a Guardian
            </h3>
            <label className="flex items-start gap-2 text-xs leading-relaxed text-[#6b6684] dark:text-[#b0a6cf]">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(event) => setConsentGiven(event.target.checked)}
                className="mt-0.5 accent-[#5a45c8]"
              />
              I consent to share my progress, study plan completion, focus totals, quiz/test results,
              and achievements with the guardian who redeems this code. Notes and AI chats remain private.
            </label>
            <button
              type="button"
              onClick={() => void handleCreateInvitation()}
              disabled={!consentGiven || working}
              className="inline-flex items-center gap-2 rounded-xl bg-[#5a45c8] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
            >
              {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Users className="h-4 w-4" aria-hidden="true" />}
              Create 24-hour invitation
            </button>
            {inviteCode ? (
              <div className="rounded-xl border border-[#c4b5fd] bg-[#f5f3ff] dark:bg-[#2c214f] p-4">
                <div className="text-[11px] font-semibold text-[#442cb2] dark:text-[#ddd6fe]">
                  One-time invitation code
                </div>
                <div className="mt-2 break-all font-mono text-lg font-bold tracking-wider text-[#1b1831] dark:text-[#f3f0fc]">
                  {inviteCode}
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyCode()}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#c4b5fd] px-3 py-1.5 text-xs font-semibold text-[#442cb2] dark:text-[#ddd6fe] cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy code
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-[#1b1831] dark:text-[#f3f0fc]">
              Linked Guardians
            </h3>
            {loadingLinks ? (
              <div role="status" className="flex items-center gap-2 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading connections...
              </div>
            ) : guardians.length ? (
              <ul className="space-y-2">
                {guardians.map((guardian) => (
                  <li key={guardian.linkId} className="flex items-center justify-between gap-3 rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] p-3">
                    <div>
                      <div className="text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc]">{guardian.fullName}</div>
                      <div className="text-[11px] text-[#776d94] dark:text-[#968cb8]">
                        Connected {new Date(guardian.linkedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRevoke(guardian.linkId)}
                      disabled={working}
                      aria-label={`Revoke access for ${guardian.fullName}`}
                      className="rounded-lg p-2 text-[#8f84b3] hover:text-red-600 disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#6b6684] dark:text-[#b0a6cf]">No guardians are currently linked.</p>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.5fr)]">
          <section className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6 space-y-4">
            <form onSubmit={(event) => void handleClaimInvitation(event)} className="space-y-3">
              <label htmlFor="guardian-invitation-code" className="block text-xs font-semibold text-[#6b6684] dark:text-[#b0a6cf]">
                Student invitation code
              </label>
              <input
                id="guardian-invitation-code"
                value={enteredCode}
                onChange={(event) => setEnteredCode(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx"
                className="w-full rounded-xl border border-[#e5deff] dark:border-[#372a5c] bg-[#fcfaff] dark:bg-[#221a3a] px-3 py-2.5 font-mono text-xs text-[#1b1831] dark:text-[#f3f0fc]"
              />
              <button
                type="submit"
                disabled={working || enteredCode.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-[#5a45c8] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
              >
                {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Users className="h-4 w-4" aria-hidden="true" />}
                Accept student invitation
              </button>
            </form>

            <div className="border-t border-[#ece6ff] dark:border-[#2a2147] pt-4">
              <h3 className="text-sm font-bold text-[#1b1831] dark:text-[#f3f0fc]">Linked students</h3>
              {loadingLinks ? (
                <div role="status" className="mt-3 flex items-center gap-2 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading students...
                </div>
              ) : students.length ? (
                <ul className="mt-3 space-y-2">
                  {students.map((student) => (
                    <li key={student.linkId} className={`rounded-xl border p-3 ${studentIdStyle(student.studentId, selectedStudentId)}`}>
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentId(student.studentId)}
                          className="min-w-0 text-left cursor-pointer"
                        >
                          <span className="block truncate text-sm font-semibold">{student.fullName}</span>
                          <span className="block text-[11px] opacity-75">
                            {getClassById(student.classLevel).label} · {student.board}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRevoke(student.linkId)}
                          disabled={working}
                          aria-label={`Unlink ${student.fullName}`}
                          className="rounded-lg p-1.5 text-[#8f84b3] hover:text-red-600 disabled:opacity-50 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                  No student has linked an account yet. Ask the student to create and privately share an invitation code.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[#e5deff] dark:border-[#2e244d] bg-white dark:bg-[#19132b] p-6">
            {loadingSummary ? (
              <div role="status" className="flex items-center gap-2 text-sm text-[#6b6684] dark:text-[#b0a6cf]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading approved student summary...
              </div>
            ) : summary && selectedStudent ? (
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-medium text-[#5a45c8] dark:text-[#c4b5fd]">Approved student summary</div>
                  <h3 className="mt-1 font-display text-lg font-bold text-[#1b1831] dark:text-[#f3f0fc]">{summary.student.name}</h3>
                  <p className="mt-1 text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                    {getClassById(summary.student.classLevel).label} · {summary.student.board}
                    {summary.student.stream !== 'general' ? ` · ${summary.student.stream.toUpperCase()}` : ''}
                  </p>
                </div>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  <Metric label="Curriculum topics" value={`${summary.progress.completedTopics}/${summary.progress.trackedTopics}`} />
                  <Metric label="Average mastery" value={`${summary.progress.averageMastery}%`} />
                  <Metric label="Study plan" value={`${summary.studyPlan.completedSessions}/${summary.studyPlan.totalSessions}`} />
                  <Metric label="Quiz average" value={`${summary.quizzes.averageScore}% · ${summary.quizzes.attempts}`} />
                  <Metric label="Test average" value={`${summary.tests.averageScore}% · ${summary.tests.attempts}`} />
                  <Metric label="Completed focus" value={`${summary.focus.completedMinutes} min · ${summary.focus.completedSessions}`} />
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#1b1831] dark:text-[#f3f0fc]">Recent assessments</h4>
                    {summary.recentAssessments.length ? (
                      <ul className="mt-2 divide-y divide-[#ece6ff] dark:divide-[#2a2147]">
                        {summary.recentAssessments.map((assessment, index) => (
                          <li key={`${assessment.kind}-${assessment.completedAt}-${index}`} className="flex items-center justify-between gap-3 py-2 text-xs">
                            <span className="truncate text-[#6b6684] dark:text-[#b0a6cf]">{assessment.subject} · {assessment.kind}</span>
                            <span className="font-semibold text-[#1b1831] dark:text-[#f3f0fc]">{assessment.score}%</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-2 text-xs text-[#776d94]">No saved assessments yet.</p>}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1b1831] dark:text-[#f3f0fc]">Achievements</h4>
                    {summary.achievements.length ? (
                      <ul className="mt-2 space-y-1">
                        {summary.achievements.map((achievement) => (
                          <li key={`${achievement.title}-${achievement.unlockedAt}`} className="text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                            {achievement.title}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mt-2 text-xs text-[#776d94]">No achievements recorded.</p>}
                  </div>
                </div>
                {summary.focus.interruptedSessions ? (
                  <p className="text-[11px] text-[#776d94] dark:text-[#968cb8]">
                    {summary.focus.interruptedSessions} interrupted focus sessions are not included in completed focus time.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center text-center">
                <Users className="h-7 w-7 text-[#8f84b3]" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-[#1b1831] dark:text-[#f3f0fc]">
                  {selectedStudent ? 'Student summary unavailable' : 'Select a linked student'}
                </p>
                <p className="mt-1 max-w-sm text-xs text-[#6b6684] dark:text-[#b0a6cf]">
                  Only explicitly approved academic summaries are available here. Private notes and conversations are excluded.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function studentIdStyle(studentId: string, selectedStudentId: string): string {
  return studentId === selectedStudentId
    ? 'border-[#5a45c8] bg-[#f5f3ff] text-[#442cb2] dark:border-[#5a45c8] dark:bg-[#2c214f] dark:text-[#ddd6fe]'
    : 'border-[#ece6ff] bg-[#fcfaff] text-[#1b1831] dark:border-[#2e244d] dark:bg-[#221a3a] dark:text-[#f3f0fc]';
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#fcfaff] dark:bg-[#221a3a] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8f84b3]">{label}</div>
      <div className="mt-1 text-sm font-bold text-[#1b1831] dark:text-[#f3f0fc]">{value}</div>
    </div>
  );
}
