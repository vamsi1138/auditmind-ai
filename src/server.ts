import "dotenv/config";
import express from "express";
import cors from "cors";
import { spawnSync } from "node:child_process";
import { analyzeRoute } from "./backend/routes/analyze";

const app = express();
const PORT = Number(process.env.PORT || 3001);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: [FRONTEND_ORIGIN, "http://localhost:5173"],
    credentials: false,
  })
);

app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.send("AuditMind AI backend is running.");
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "auditmind-backend",
    port: PORT,
  });
});

app.get("/api/tooling-status", (_req, res) => {
  const check = (command: string, args: string[] = ["--version"]) => {
    const result = spawnSync(command, args, {
      encoding: "utf8",
      shell: process.platform === "win32",
    });

    return {
      installed: result.status === 0,
      output:
        result.status === 0
          ? (result.stdout || result.stderr || "").trim()
          : "Not installed",
    };
  };

  res.json({
    success: true,
    tools: {
      slither: check("slither"),
      foundry: check("forge"),
    },
  });
});

app.post("/api/analyze", analyzeRoute);

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
