import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const dist = resolve("dist");
const indexPath = join(dist, "index.html");
const index = await readFile(indexPath, "utf8");

const references = [...index.matchAll(/(?:src|href)="([^"#?]+)"/g)]
  .map((match) => match[1])
  .filter((path) => path.startsWith("/assets/"));

if (references.length === 0) {
  throw new Error("dist/index.html does not reference any built /assets files");
}

for (const reference of references) {
  const target = join(dist, reference.slice(1));
  if (!(await stat(target)).isFile()) {
    throw new Error(`Missing asset referenced by index.html: ${reference}`);
  }
}

const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else files.push(path);
  }
}
await walk(dist);

const forbiddenBackendEnvNames = [
  "OPENAI_API_KEY",
  "FIRECRAWL_API_KEY",
  "AGENTMAIL_API_KEY",
  "AGENTMAIL_WEBHOOK_SECRET",
];
for (const file of files.filter((path) =>
  [".html", ".js", ".css"].includes(extname(path)),
)) {
  const body = await readFile(file, "utf8");
  for (const name of forbiddenBackendEnvNames) {
    if (body.includes(name)) {
      throw new Error(
        `Backend-only environment name ${name} leaked into ${file}`,
      );
    }
  }
}

console.log(
  `Hosting build ready: ${files.length} files; ${references.length} entry assets resolved.`,
);
