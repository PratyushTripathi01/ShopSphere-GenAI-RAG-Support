import OpenAI from "openai";
import { config } from "../config/env.js";

let openaiClient = null;

export function getOpenAIClient() {
  if (!openaiClient) {
    if (!config.openai.apiKey) {
      throw new Error(
        "OpenAI API key is missing. Please set OPENAI_API_KEY in your .env file."
      );
    }
    openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openaiClient;
}

/**
 * Creates vector embeddings for an array of text strings
 * @param {string[]} texts - Array of strings to embed
 * @returns {Promise<Array<{ embedding: number[], index: number }>>}
 */
export async function createEmbeddings(texts) {
  const client = getOpenAIClient();
  const response = await client.embeddings.create({
    model: config.openai.embeddingModel,
    input: texts,
    dimensions: config.openai.embeddingDimensions,
  });
  return response.data;
}

/**
 * Generates an answer to a customer question grounded in company context
 * @param {string} question - The user's query
 * @param {string} context - The retrieved knowledge base text chunks
 * @returns {Promise<string>}
 */
export async function generateAnswer(question, context) {
  const client = getOpenAIClient();

  const instructions = `You are an AI customer support assistant for ShopSphere, an e-commerce company.

Answer the customer using ONLY the company information provided below.

If the answer is not available in the provided information, say:
"I don't have that information in the company documents."

COMPANY INFORMATION:
${context || "No relevant company documents found."}`;

  const completion = await client.chat.completions.create({
    model: config.openai.chatModel,
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: question },
    ],
    temperature: 0.1, // low temperature for high factual accuracy grounded in documents
  });

  return completion.choices[0]?.message?.content?.trim() || "No response generated.";
}
