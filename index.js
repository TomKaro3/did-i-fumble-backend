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