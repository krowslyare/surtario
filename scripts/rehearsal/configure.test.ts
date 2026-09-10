import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { expect, test } from "vitest";

const script = resolve("scripts/rehearsal/configure.mjs");

test.each([
  "",
  "VITE_REHEARSAL=false\n",
  "VITE_REHEARSAL=\n",
  'export VITE_REHEARSAL="false"\n VITE_REHEARSAL = false\n',
])(
  "rehearsal configuration enables its notice before any provider mutation (%j)",
  (flag) => {
    const directory = mkdtempSync(join(tmpdir(), "rehearsal-config-test-"));
    try {
      mkdirSync(join(directory, ".convex/local/default"), { recursive: true });
      mkdirSync(join(directory, "bin"));
      writeFileSync(
        join(directory, ".convex/local/default/config.json"),
        JSON.stringify({
          deploymentName: "test-only",
          ports: { cloud: 3240, site: 3241 },
        }),
      );
      writeFileSync(
        join(directory, ".env.local"),
        `CONVEX_DEPLOYMENT=anonymous:test-only\nVITE_CONVEX_URL=http://127.0.0.1:3240\nVITE_OTHER=preserved\n${flag}`,
      );
      // Replace the CLI process, so this exercises the real script without a backend or network.
      writeFileSync(
        join(directory, "bin/npx"),
        `#!/usr/bin/env node
const fs = require("node:fs");
const text = fs.readFileSync(".env.local", "utf8");
if (!/^VITE_REHEARSAL=true$/m.test(text)) process.exit(9);
if (process.argv.slice(2, 5).join(" ") !== "convex env set") process.exit(10);
fs.appendFileSync("calls.txt", "configured\\n");
`,
        { mode: 0o700 },
      );
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        PATH: `${join(directory, "bin")}${delimiter}${process.env.PATH}`,
      };
      for (const name of [
        "CONVEX_DEPLOY_KEY",
        "CONVEX_DEPLOYMENT",
        "CONVEX_SELF_HOSTED_URL",
      ])
        delete env[name];
      execFileSync(process.execPath, [script], {
        cwd: directory,
        env,
        timeout: 20000,
      });
      const updated = readFileSync(join(directory, ".env.local"), "utf8");
      expect(updated.match(/VITE_REHEARSAL\s*=/g)).toHaveLength(1);
      expect(updated).toContain("VITE_REHEARSAL=true\n");
      expect(updated).toContain("VITE_OTHER=preserved\n");
      expect(
        readFileSync(join(directory, "calls.txt"), "utf8").trim().split("\n"),
      ).toHaveLength(14);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
