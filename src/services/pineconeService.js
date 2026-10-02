import { Pinecone } from "@pinecone-database/pinecone";
import { config } from "../config/env.js";

let pineconeClient = null;

export function getPineconeClient() {
  if (!pineconeClient) {
    if (!config.pinecone.apiKey) {
      throw new Error(
        "Pinecone API key is missing. Please set PINECONE_API_KEY in your .env file."
      );
    }
    pineconeClient = new Pinecone({ apiKey: config.pinecone.apiKey });
  }
  return pineconeClient;
}

export function getIndexTarget() {
  const client = getPineconeClient();
  return client.index(config.pinecone.indexName).namespace(config.pinecone.namespace);
}

/**
 * Checks connection to Pinecone and describes index stats
 */
export async function getPineconeStats() {
  const client = getPineconeClient();
  const index = client.index(config.pinecone.indexName);
  const stats = await index.describeIndexStats();
  return stats;
}

/**
 * Upserts vector records into Pinecone
 * @param {Array<{ id: string, values: number[], metadata: Object }>} records
 * @param {number} batchSize - Maximum records per batch
 */
export async function upsertVectors(records, batchSize = 100) {
  const target = getIndexTarget();

  for (let start = 0; start < records.length; start += batchSize) {
    const batch = records.slice(start, start + batchSize);
    // Pinecone SDK v9 requires an options object with the `records` property
    await target.upsert({ records: batch });
  }
}

/**
 * Performs vector similarity search in Pinecone
 * @param {number[]} queryVector - 1024-dimensional embedding vector
 * @param {number} topK - Number of most similar chunks to retrieve
 * @returns {Promise<Array<{ id: string, score: number, metadata: Object }>>}
 */
export async function querySimilarVectors(queryVector, topK = config.rag.topK) {
  const target = getIndexTarget();
  const searchResult = await target.query({
    vector: queryVector,
    topK,
    includeMetadata: true,
  });

  return searchResult.matches || [];
}
