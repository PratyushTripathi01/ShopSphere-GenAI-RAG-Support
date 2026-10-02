import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, validateConfig } from "./config/env.js";
import { apiRouter } from "./routes/apiRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../");
const publicDir = path.join(projectRoot, "public");

export const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(publicDir));

// Mount API routes
app.use("/api/v1", apiRouter);

// Fallback for SPA/HTML
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(publicDir, "index.html"));
});

export function startServer(port = config.port) {
  const validation = validateConfig();

  return app.listen(port, () => {
    console.log("==================================================");
    console.log("[SERVER] ShopSphere GenAI RAG Support Server is running");
    console.log(`  Local Web App: http://localhost:${port}`);
    console.log(`  Query API:     http://localhost:${port}/api/v1/query?question=...`);
    console.log(`  Ingest API:    http://localhost:${port}/api/v1/ingest (POST)`);
    console.log(`  System Status: http://localhost:${port}/api/v1/status`);
    console.log("==================================================");

    if (!validation.isValid) {
      console.warn("[WARN] Missing environment variables:", validation.missing.join(", "));
      console.warn("[WARN] Please add your API keys to the .env file in the root directory.");
    } else {
      console.log("[INFO] Environment configuration loaded successfully.");
    }
  });
}

// Start server if this file is run directly
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer();
}
