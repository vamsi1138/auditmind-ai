import express from "express";
import cors from "cors";
import { analyzeRoute } from "./backend/routes/analyze";

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.send("AuditMind AI backend is running.");
});

app.post("/api/analyze", analyzeRoute);

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});