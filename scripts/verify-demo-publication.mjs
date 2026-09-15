import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const site = "https://incredible-wolverine-122.convex.site";
async function get(path) {
  return fetch(`${site}/${path}`, { signal: AbortSignal.timeout(30_000) });
}
async function verifyDirectory(directory, prefix = "") {
  let count = 0;
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    const relative = `${prefix}${item.name}`;
    if (item.isDirectory()) {
      count += await verifyDirectory(path, `${relative}/`);
    } else {
      const response = await get(relative);
      assert.equal(response.status, 200, `Missing published file: ${relative}`);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(path), `Published file differs: ${relative}`);
      count++;
    }
  }
  return count;
}
const count = await verifyDirectory("dist");
const route = await get("comparison");
assert.equal(route.status, 200);
assert.deepEqual(Buffer.from(await route.arrayBuffer()), await readFile("dist/index.html"));
const missing = await get("deployment-verification-missing.js");
assert.equal(missing.status, 404);
console.log(`Verified ${count} published files, SPA fallback and missing-asset response on ${site}.`);
