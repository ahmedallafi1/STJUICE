import { startOrderingServer } from "../ordering/server.mjs";

const server = await startOrderingServer({ port: Number(process.env.ST_JUICE_PORT || process.env.PORT || 4173) });
const address = server.address();
console.log(`ST. JUICE pre-launch ordering preview: http://127.0.0.1:${address.port}/site/`);
