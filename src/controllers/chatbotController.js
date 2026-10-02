import { answerUserQuery, loadKnowledgeBase } from "../services/ragService.js";
import { config, validateConfig } from "../config/env.js";
import { readdir } from "node:fs/promises";

/**
 * Handles GET & POST /api/v1/query
 * Supports both ?question=... query parameter and JSON body { question }
 */
export async function queryHandler(req, res) {
  try {
    const question = req.query.question || req.body?.question;

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        error: "Missing question. Provide ?question=... or JSON body { 'question': '...' }",
      });
    }

    const result = await answerUserQuery(question);

    // Return grounded answer along with source document attribution and vector match scores
    return res.json({
      answer: result.answer,
      sources: result.sources,
      matches: result.matches,
    });
  } catch (error) {
    console.error("[ChatbotController] Query error:", error.message);
    const status = error.message.includes("missing") ? 401 : 500;
    return res.status(status).json({
      error: error.message || "Failed to process query",
    });
  }
}

/**
 * Handles POST /api/v1/ingest
 * Ingests all policy PDFs into Pinecone vector index
 */
export async function ingestHandler(req, res) {
  try {
    console.log("[ChatbotController] Ingestion triggered via API...");
    const result = await loadKnowledgeBase();
    return res.json({
      success: true,
      message: `Successfully ingested ${result.chunkCount} chunks across ${result.fileCount} policy documents into Pinecone!`,
      details: result,
    });
  } catch (error) {
    console.error("[ChatbotController] Ingest error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to ingest knowledge base",
    });
  }
}

/**
 * Handles GET /api/v1/status
 * Returns system configuration status, file count, and environment health
 */
export async function statusHandler(req, res) {
  try {
    const envStatus = validateConfig();
    let files = [];
    try {
      const entries = await readdir(config.knowledgeDir);
      files = entries.filter((f) => f.toLowerCase().endsWith(".pdf"));
    } catch {
      files = [];
    }

    return res.json({
      ready: envStatus.isValid,
      missingKeys: envStatus.missing,
      models: {
        chat: config.openai.chatModel,
        embedding: config.openai.embeddingModel,
      },
      pinecone: {
        index: config.pinecone.indexName,
        namespace: config.pinecone.namespace,
      },
      knowledgeBase: {
        directory: config.knowledgeDir,
        fileCount: files.length,
        files,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
