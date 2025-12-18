import express from "express";
import cors from "cors";
import multer from "multer";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting (important)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
});

app.use(cors());
app.use(limiter);
app.use(express.json());

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

Return ONLY valid JSON with:
- outcome (one of: You cooked 🔥, Recoverable 😬, You fumbled 😭, Brother it’s over 💀)
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

    const result = response.choices[0].message.content;

    res.json(JSON.parse(result));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analysis failed" });
  }
});
