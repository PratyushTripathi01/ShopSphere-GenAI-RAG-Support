import { answerUserQuery, loadKnowledgeBase } from "./services/ragService.js";
import { validateConfig, config } from "./config/env.js";

async function runCli() {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  const validation = validateConfig();
  if (!validation.isValid) {
    console.error(
      `\n[ERROR] Missing required environment variables: ${validation.missing.join(", ")}`
    );
    console.error(
      `Please configure OPENAI_API_KEY and PINECONE_API_KEY in your .env file.\n`
    );
    process.exit(1);
  }

  if (command === "ingest") {
    console.log("==========================================");
    console.log("   Starting Knowledge Base Ingestion      ");
    console.log("==========================================");
    console.log(`Knowledge directory: ${config.knowledgeDir}`);
    console.log(`Pinecone index:      ${config.pinecone.indexName}`);
    console.log(`Pinecone namespace:  ${config.pinecone.namespace}\n`);

    const result = await loadKnowledgeBase();
    console.log("\n==========================================");
    console.log("   Ingestion Complete                     ");
    console.log("==========================================");
    console.log(`Indexed ${result.chunkCount} chunks across ${result.fileCount} policy files.`);
    console.log("Files processed:", result.documents.join(", "));
    return;
  }

  // Treat as query
  let question = "";
  if (command === "query") {
    question = args.slice(1).join(" ");
  } else {
    question = args.join(" ");
  }

  if (!question) {
    question = "What is the return policy?";
    console.log(`(No question provided, using default: "${question}")\n`);
  }

  console.log("==========================================");
  console.log("   Querying ShopSphere Support Assistant  ");
  console.log("==========================================");
  console.log(`Question: "${question}"\n`);
  console.log("Searching Pinecone and generating response...\n");

  const startTime = Date.now();
  const response = await answerUserQuery(question);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("------------------------------------------");
  console.log("Answer:\n");
  console.log(response.answer);
  console.log("------------------------------------------");
  console.log(`Referenced Sources: ${response.sources.length ? response.sources.join(", ") : "None"}`);
  console.log(`Response Time:      ${duration}s`);
  console.log("==========================================\n");
}

runCli().catch((err) => {
  console.error("\n[ERROR] Execution failed:", err.message);
  process.exit(1);
});
