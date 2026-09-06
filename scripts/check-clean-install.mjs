import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  closeSync,
  readFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const snapshot = mkdtempSync(join(root, ".tmp.clean-install-"));
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: root, encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
for (const file of new Set(files)) {
  const destination = join(snapshot, file);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(join(root, file), destination);
}
const logPath = join(snapshot, "validation.log");
const log = openSync(logPath, "a");
try {
  for (const args of [
    ["ci"],
    ["run", "lint"],
    ["run", "format:check"],
    ["run", "build"],
    ["test"],
  ]) {
    console.log(`Clean installation: npm ${args.join(" ")}…`);
    const result = spawnSync("npm", args, {
      cwd: snapshot,
      env: { ...process.env, CI: "1" },
      stdio: ["ignore", log, log],
      timeout: 180000,
    });
    if (result.status !== 0) {
      console.error(readFileSync(logPath, "utf8").slice(-12000));
      throw new Error(
        `Clean installation failed: npm ${args.join(" ")}. Log: ${logPath}`,
      );
    }
  }
  console.log(
    `Clean installation, build and browser workflow passed. Log: ${logPath}`,
  );
} finally {
  closeSync(log);
}
