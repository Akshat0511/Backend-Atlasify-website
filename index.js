// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";

dotenv.config();

const app = express();

/* ---------------------- MIDDLEWARE ---------------------- */
app.use(
  cors({
    origin: "*", // production me frontend URL laga sakte ho
    methods: ["GET", "POST"],
  })
);
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ---------------------- ROOT ---------------------- */
app.get("/", (req, res) => {
  res.send("Server is running with ChatGPT 🚀");
});

/* ---------------------- ROADMAP API ---------------------- */
app.post("/api/roadmap", async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic required" });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert curriculum designer.",
        },
        {
          role: "user",
          content: `
Create a step-by-step learning roadmap for "${topic}"
from beginner to advanced.

⚠️ Only include educational steps, no general advice or unrelated suggestions.

Return ONLY valid JSON:

{
  "roadmap": [
    "Step 1: Basics",
    "Step 2: Core Concepts",
    "Step 3: Hands-on Practice",
    "Step 4: Advanced Topics",
    "Step 5: Real-world Projects"
  ]
}
`,
        },
      ],
    });

    const clean = response.choices[0].message.content
      .replace(/```json|```/g, "")
      .trim();

    res.json(JSON.parse(clean));
  } catch (err) {
    console.error("Roadmap Error:", err.message);
    res.json({
      roadmap: [
        "Learn fundamentals",
        "Understand core concepts",
        "Practice with examples",
        "Build projects",
        "Advanced topics",
      ],
    });
  }
});

/* ---------------------- ARTICLES API ---------------------- */
app.post("/api/articles", async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic required" });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert educational content curator.",
        },
        {
          role: "user",
          content: `
Suggest 5 educational, beginner-friendly articles for "${topic}"
from trusted learning platforms like freeCodeCamp, MDN, GeeksforGeeks, W3Schools.

Return ONLY JSON array:

[
  {
    "title": "",
    "description": "",
    "author": "",
    "url": ""
  }
]
`,
        },
      ],
    });

    const clean = response.choices[0].message.content
      .replace(/```json|```/g, "")
      .trim();

    res.json(JSON.parse(clean));
  } catch {
    res.json([
      {
        title: "Getting Started Guide",
        description: "Beginner friendly introduction",
        author: "freeCodeCamp",
        url: "#",
      },
    ]);
  }
});

/* ---------------------- PROJECTS API ---------------------- */
app.post("/api/projects", async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: "Topic required" });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert project mentor.",
        },
        {
          role: "user",
          content: `
Suggest 5 educational project ideas for "${topic}"
suitable for beginners to advanced learners.

Return ONLY JSON array:

[
  "Project 1",
  "Project 2",
  "Project 3",
  "Project 4",
  "Project 5"
]
`,
        },
      ],
    });

    const clean = response.choices[0].message.content
      .replace(/```json|```/g, "")
      .trim();

    res.json(JSON.parse(clean));
  } catch {
    res.json([
      "Build a simple app",
      "Create a small game",
      "Develop a portfolio project",
      "Automate a task",
      "Open-source contribution",
    ]);
  }
});

/* ---------------------- CHATBOT API ---------------------- */
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const messages = [
      {
        role: "system",
        content: `
You are an AI education mentor.
- Help students with learning paths, roadmaps, resources, and career guidance.
- Explain concepts in a simple, beginner-friendly way.
- Suggest next steps, courses, projects, and study plans.
- If the question is NOT related to education or learning, politely redirect them back to educational topics.
Rules:
- Be concise, clear, and structured.
- No emojis.
- No motivational fluff.
- Focus ONLY on education, skills, and learning paths.
        `,
      },
      ...history,
      { role: "user", content: message },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const reply = response.choices[0].message.content.trim();
    res.json({ reply });
  } catch (err) {
    console.error("Chatbot Error:", err.message);
    res.status(500).json({
      reply:
        "I am unable to respond right now. Please ask an education-related question again.",
    });
  }
});

/* ---------------------- YOUTUBE API ---------------------- */
app.post("/api/youtube", async (req, res) => {
  try {
    const { query } = req.body;
    const apiKey = process.env.YOUTUBE_API_KEY;
    const MIN_DURATION = 300; // 5 minutes
    const searchQuery = query + " tutorial OR course OR learn";

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=15&q=${encodeURIComponent(
      searchQuery
    )}&key=${apiKey}`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    const ids = searchData.items.map((v) => v.id.videoId).join(",");

    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${ids}&key=${apiKey}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    const isoToSec = (iso) => {
      const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      return (m?.[1] || 0) * 3600 + (m?.[2] || 0) * 60 + (m?.[3] || 0);
    };

    const videos = detailsData.items
      .map((v) => ({
        id: v.id,
        title: v.snippet.title,
        description: v.snippet.description,
        thumbnail: v.snippet.thumbnails.medium.url,
        duration: v.contentDetails.duration,
        durationSec: isoToSec(v.contentDetails.duration),
        views: Number(v.statistics.viewCount || 0),
      }))
      .filter((v) => v.durationSec >= MIN_DURATION)
      .filter((v) =>
        /tutorial|course|learn/i.test(v.title + v.description)
      )
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    res.json(videos);
  } catch {
    res.status(500).json({ error: "YouTube API failed" });
  }
});

/* ---------------------- GITHUB API ---------------------- */
app.post("/api/github", async (req, res) => {
  try {
    const { query } = req.body;
    const token = process.env.GITHUB_API_KEY;

    const searchQuery = query + " tutorial example learning";

    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
      searchQuery
    )}&sort=stars&order=desc&per_page=10`;

    const ghRes = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
      },
    });

    const data = await ghRes.json();

    const repos = data.items.map((repo) => ({
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count,
      language: repo.language,
      owner: repo.owner.login,
      avatar: repo.owner.avatar_url,
    }));

    res.json(repos);
  } catch {
    res.status(500).json({ error: "GitHub API failed" });
  }
});

/* ---------------------- EXPORT FOR VERCEL ---------------------- */
export default app;
