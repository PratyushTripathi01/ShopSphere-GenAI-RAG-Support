import { config } from "../config/env.js";
import { readKnowledgeBase, generateChunkId } from "./pdfService.js";
import { createEmbeddings, generateAnswer } from "./openaiService.js";
import { upsertVectors, querySimilarVectors } from "./pineconeService.js";

/**
 * Loads, chunks, embeds, and indexes all PDFs in the knowledge base into Pinecone.
 * @returns {Promise<{ chunkCount: number, fileCount: number, documents: string[] }>}
 */
export async function loadKnowledgeBase() {
  console.log(`[RAG Service] Reading knowledge base from: ${config.knowledgeDir}`);
  const chunks = await readKnowledgeBase(config.knowledgeDir);

  if (chunks.length === 0) {
    throw new Error(
      `No chunks extracted from knowledge directory: ${config.knowledgeDir}`
    );
  }

  const uniqueFiles = [...new Set(chunks.map((c) => c.metadata.source))];
  console.log(
    `[RAG Service] Found ${chunks.length} chunks across ${uniqueFiles.length} files. Creating embeddings...`
  );

  const batchSize = 100;
  for (let start = 0; start < chunks.length; start += batchSize) {
    const batch = chunks.slice(start, start + batchSize);
    const textBatch = batch.map((chunk) => chunk.text);

    // 1. Create embeddings via OpenAI
    const embeddingData = await createEmbeddings(textBatch);

    // 2. Prepare Pinecone vector records
    const records = batch.map((chunk, index) => ({
      id: generateChunkId(chunk),
      values: embeddingData[index].embedding,
      metadata: {
        ...chunk.metadata,
        text: chunk.text,
      },
    }));

    // 3. Upsert to Pinecone
    await upsertVectors(records);
    console.log(
      `[RAG Service] Upserted batch ${Math.floor(start / batchSize) + 1} (${records.length} records)`
    );
  }

  console.log(
    `[RAG Service] Successfully indexed ${chunks.length} chunks into Pinecone [${config.pinecone.indexName} : ${config.pinecone.namespace}]`
  );

  return {
    chunkCount: chunks.length,
    fileCount: uniqueFiles.length,
    documents: uniqueFiles,
  };
}

/**
 * Answers a user question using RAG (Pinecone vector search + OpenAI LLM).
 * @param {string} question - Customer question
 * @returns {Promise<{ answer: string, sources: string[], matches: Array }>}
 */
export async function answerUserQuery(question) {
  if (!question || typeof question !== "string" || !question.trim()) {
    throw new Error("A valid question string is required.");
  }

  const trimmedQuestion = question.trim();

  // 1. Convert question to vector embedding
  const embeddingData = await createEmbeddings([trimmedQuestion]);
  const queryVector = embeddingData[0].embedding;

  // 2. Similarity search in Pinecone vector store (top K results)
  const matches = await querySimilarVectors(queryVector, config.rag.topK);

  // 3. Extract text content and sources from matching chunks
  const contextParts = [];
  const sourcesSet = new Set();

  for (const match of matches) {
    if (match.metadata && match.metadata.text) {
      contextParts.push(match.metadata.text);
      if (match.metadata.source) {
        sourcesSet.add(match.metadata.source);
      }
    }
  }

  const context = contextParts.join("\n\n");
  const sources = Array.from(sourcesSet);

  // 4. Generate answer grounded strictly in retrieved context
  const answer = await generateAnswer(trimmedQuestion, context);

  return {
    answer,
    sources,
    matches: matches.map((m) => ({
      id: m.id,
      score: m.score,
      source: m.metadata?.source,
      chunk: m.metadata?.chunk,
    })),
  };
}
