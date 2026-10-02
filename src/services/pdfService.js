import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getEncoding } from "js-tiktoken";
import { extractText } from "unpdf";
import { config } from "../config/env.js";

// cl100k_base is the standard tokenizer used by text-embedding-3-small and GPT-4/GPT-4o
const tokenizer = getEncoding("cl100k_base");

/**
 * Splits raw text into chunks of specified maximum token length
 * @param {string} text - Raw input text
 * @param {number} chunkSize - Maximum tokens per chunk (defaults to config.rag.chunkSize)
 * @returns {string[]} Array of chunk text strings
 */
export function splitIntoTokenChunks(text, chunkSize = config.rag.chunkSize) {
  if (!text || typeof text !== "string") return [];

  const tokens = tokenizer.encode(text);
  const chunks = [];

  for (let start = 0; start < tokens.length; start += chunkSize) {
    const chunkTokens = tokens.slice(start, start + chunkSize);
    const chunk = tokenizer.decode(chunkTokens).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

/**
 * Generates a stable, reproducible SHA-256 ID for a chunk
 * Ensures idempotent upserts in Pinecone (no duplicate vectors)
 * @param {Object} chunk - { text, metadata: { source, chunk } }
 * @returns {string} Hex-encoded SHA-256 hash
 */
export function generateChunkId(chunk) {
  return createHash("sha256")
    .update(`${chunk.metadata.source}:${chunk.metadata.chunk}:${chunk.text}`)
    .digest("hex");
}

/**
 * Reads all PDF documents in the knowledge directory, extracts text,
 * and splits them into token-sized chunks ready for embedding.
 * @param {string} knowledgeDir - Directory path where PDFs are located
 * @returns {Promise<Array<{ text: string, metadata: { source: string, chunk: number } }>>}
 */
export async function readKnowledgeBase(knowledgeDir = config.knowledgeDir) {
  const entries = await readdir(knowledgeDir, { withFileTypes: true });
  const pdfFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => entry.name)
    .sort();

  if (pdfFiles.length === 0) {
    console.warn(`[PDF Service] No PDF files found in ${knowledgeDir}`);
    return [];
  }

  const allChunks = [];

  for (const fileName of pdfFiles) {
    const filePath = path.join(knowledgeDir, fileName);
    try {
      const buffer = await readFile(filePath);
      const { text } = await extractText(new Uint8Array(buffer));
      const fullText = Array.isArray(text) ? text.join("\n") : String(text || "");

      const chunks = splitIntoTokenChunks(fullText, config.rag.chunkSize);
      chunks.forEach((chunkText, chunkIndex) => {
        allChunks.push({
          text: chunkText,
          metadata: {
            source: fileName,
            chunk: chunkIndex,
          },
        });
      });
      console.log(`[PDF Service] Processed "${fileName}": extracted ${chunks.length} chunks`);
    } catch (err) {
      console.error(`[PDF Service] Error processing file "${fileName}":`, err.message);
      throw err;
    }
  }

  return allChunks;
}
