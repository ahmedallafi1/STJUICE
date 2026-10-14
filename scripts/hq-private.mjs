// Local owner CLI: never run with untrusted output/log sinks.
import { loadPrivateHq, privateHqSummary, privateHqCard, privateHqPage } from "../hq/private-workspace.mjs";
const master = loadPrivateHq();
const command = process.argv[2] || "summary";
const n = Number(process.argv[3]);
let output;
switch (command) {
  case "summary": output = privateHqSummary(master); break;
  case "card": output = privateHqCard(master, n); break;
  case "page": output = privateHqPage(master, n); break;
  default:
    console.error("Usage: npm run hq:private -- summary|card 1..40|page 1..52");
    process.exit(2);
}
if (!output) { console.error("Not found."); process.exit(2); }
console.log(JSON.stringify(output, null, 2));
