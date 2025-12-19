import express from "express";
import cors from "cors";
import multer from "multer";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Invalid file type"), ok);
  },
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting (important)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
});

import { z } from "zod";

const ResultSchema = z.object({
  outcome: z.string(),
  roast: z.string(),
  tip: z.string(),
});

function safeJsonParse(text) {
  if (!text || typeof text !== "string") return null;

  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // Strip markdown fences if present
  const stripped = text.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {}

  // Try to extract a JSON object from surrounding text
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function normalizeResult(obj) {
  const fallback = {
    outcome: "Recoverable 😬",
    roast: "The vibe is… unclear, but we move.",
    tip: "Keep it short. Ask a question. Don’t over-explain.",
  };

  const parsed = ResultSchema.safeParse(obj);
  if (!parsed.success) return fallback;

  const allowed = new Set([
    "You cooked 🔥",
    "Recoverable 😬",
    "You fumbled 😭",
    "Yeah… it’s over 💀",
  ]);

  const clean = parsed.data;

  if (!allowed.has(clean.outcome)) clean.outcome = fallback.outcome;

  clean.roast = String(clean.roast).trim().slice(0, 140);
  clean.tip = String(clean.tip).trim().slice(0, 200);

  return clean;
}

app.use(cors());
app.use(limiter);
app.use(express.json());

app.use((err, req, res, next) => {
  if (err?.message === "Invalid file type") {
    return res.status(400).json({ error: "Invalid file type. Upload PNG/JPG/JPEG/WEBP." });
  }
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Max 5MB." });
  }
  next(err);
});

app.get("/", (req, res) => {
  res.send("Did I Fumble backend is live 🔥");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🔥 Did I Fumble backend running on port ${PORT}`);
});

app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const base64Image = req.file.buffer.toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a brutally honest dating coach with a sense of humor.

Analyze the chat screenshot.

Return ONLY valid JSON.
No markdown. No code blocks. No extra text.

The JSON must have exactly these fields:
- outcome (one of: You cooked 🔥, Recoverable 😬, You fumbled 😭, Yeah… it’s over 💀)
- roast (short, funny, not cruel)
- tip (one actionable improvement)

Keep it meme-worthy and concise.
          `,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this chat screenshot." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0.7,
    });

    const content = response.choices?.[0]?.message?.content ?? "";
    const parsed = safeJsonParse(content);
    const finalResult = normalizeResult(parsed);

    return res.json(finalResult);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analysis failed" });
  }
});
