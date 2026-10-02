import { Router } from "express";
import {
  queryHandler,
  ingestHandler,
  statusHandler,
} from "../controllers/chatbotController.js";

export const apiRouter = Router();

// Supports both GET query parameter (?question=...) and POST JSON body ({ question })
apiRouter.get("/query", queryHandler);
apiRouter.post("/query", queryHandler);

// Ingestion and system status routes
apiRouter.post("/ingest", ingestHandler);
apiRouter.get("/status", statusHandler);
