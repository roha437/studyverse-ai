import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildNotesPrompt,
  mapGeminiErrorToResponse,
  normalizeGeneratedNotePayload,
  validateGenerateNotesPayload,
} from './src/utils/notesGeneratorHelpers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(getGeminiClient()),
    });
  });

  app.post('/api/notes/generate', async (req, res) => {
    const validated = validateGenerateNotesPayload(req.body);
    if (!validated.valid) {
      res.status(400).json({ error: validated.error });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'AI note generation requires a server GEMINI_API_KEY. Please configure GEMINI_API_KEY in Settings > Secrets and try again.',
      });
      return;
    }

    const payload = validated.data;
    const prompt = buildNotesPrompt(payload);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are StudyVerse AI Notes Studio, an expert academic tutor for Indian school students (Classes 5–10 and Intermediate 1st & 2nd Year). Produce clear, accurate, syllabus-aligned study notes tailored to the requested class, curriculum board, subject, chapter, topic, and note format. Keep the summary concise (3–5 sentences) and provide 5–7 crisp, student-friendly entries in keyPoints.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Clear, descriptive note title for the topic and format.',
              },
              summary: {
                type: Type.STRING,
                description: 'Well-structured, syllabus-accurate overview paragraph.',
              },
              keyPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '5 to 7 concise revision bullets, formulas, Q&A items, or concept branches.',
              },
              formula: {
                type: Type.STRING,
                description: 'Optional primary formula or rule if applicable to the topic.',
              },
            },
            required: ['title', 'summary', 'keyPoints'],
          },
        },
      });

      const normalized = normalizeGeneratedNotePayload(response.text ?? '', {
        topic: payload.topic,
        keyFormula: payload.keyFormula,
        noteFormat: payload.noteFormat,
      });

      if (!normalized) {
        res.status(502).json({
          error: 'The AI response could not be formatted into study notes. Please try again.',
        });
        return;
      }

      res.json({ note: normalized });
    } catch (err) {
      const mapped = mapGeminiErrorToResponse(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudyVerse server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
