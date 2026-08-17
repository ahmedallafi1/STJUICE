import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const account = await readFile(new URL("../lib/account.js", import.meta.url), "utf8");
const views = await readFile(new URL("../lib/views.js", import.meta.url), "utf8");
for (const term of ["favorites", "savedMixes", "orderHistory", "student", "business", "points"]) assert.match(account, new RegExp(term));
for (const term of ["STUDENT VERIFICATION", "BUSINESS PROFILE", "ORDER HISTORY", "SAVED MIXES", "working reward"]) assert.match(views, new RegExp(term, "i"));
assert.doesNotMatch(account, /password|cardNumber|socialSecurity/i);
console.log("Stage 07 account contract passed.");
