import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, startServer } from "./src/server.js";
import { loadKnowledgeBase, answerUserQuery } from "./src/services/ragService.js";
import { config } from "./src/config/env.js";

const __filename = fileURLToPath(import.meta.url);

// Re-export core services for library/external use
export { app, startServer, loadKnowledgeBase, answerUserQuery, config };

// Main execution entry point
async function main() {
  const args = process.argv.slice(2);

  // If arguments are provided (e.g., node index.js "Can I return an item?"), run as CLI query/ingest
  if (args.length > 0) {
    const firstArg = args[0].toLowerCase();
    if (firstArg === "ingest") {
      console.log("Starting knowledge base ingestion...");
      const result = await loadKnowledgeBase();
      console.log(`Ingested ${result.chunkCount} chunks across ${result.fileCount} documents.`);
      return;
    }

    const question = args.join(" ");
    console.log(`Asking: "${question}"`);
    const result = await answerUserQuery(question);
    console.log("\nAnswer:");
    console.log(result.answer);
    console.log(`\nSources: ${result.sources.join(", ") || "None"}`);
    return;
  }

  // Default: Start the Web Application Server
  startServer(config.port);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((err) => {
    console.error("Application error:", err.message);
    process.exitCode = 1;
  });
}
