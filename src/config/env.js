import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../");

// Load .env from project root
dotenv.config({ path: path.join(projectRoot, ".env") });

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  knowledgeDir: process.env.KNOWLEDGE_DIR
    ? path.resolve(projectRoot, process.env.KNOWLEDGE_DIR)
    : path.join(projectRoot, "knowledge"),
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    chatModel: process.env.CHAT_MODEL || "gpt-4o-mini",
    embeddingModel: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
    embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || "1024", 10),
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || "",
    indexName: process.env.PINECONE_INDEX_NAME || "shop-support",
    namespace: process.env.PINECONE_NAMESPACE || "policies",
  },
  rag: {
    chunkSize: parseInt(process.env.CHUNK_SIZE || "300", 10),
    topK: parseInt(process.env.TOP_K || "4", 10),
  },
};

export function validateConfig() {
  const missing = [];
  if (!config.openai.apiKey) missing.push("OPENAI_API_KEY");
  if (!config.pinecone.apiKey) missing.push("PINECONE_API_KEY");
  return {
    isValid: missing.length === 0,
    missing,
  };
}
