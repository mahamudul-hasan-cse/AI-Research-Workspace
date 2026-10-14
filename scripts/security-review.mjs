import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Print locations only: a finding must never echo a credential into CI logs.
const pattern = "sk-or-v1-[a-fA-F0-9]{32,}|sk-[A-Za-z0-9_-]{32,}|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----";
const secret = new RegExp(pattern);
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const files = git("ls-files", "--cached", "--others", "--exclude-standard").split("\n").filter(Boolean);
const findings = [];
for (const file of files) {
  if (existsSync(file) && secret.test(readFileSync(file, "utf8"))) findings.push(`Working file: ${file}`);
}
for (const revision of git("rev-list", "--all").split("\n").filter(Boolean)) {
  const result = spawnSync("git", ["grep", "-I", "-l", "-E", pattern, revision, "--", "."], {
    encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status === 0) findings.push(...result.stdout.trim().split("\n"));
  else if (result.status !== 1) throw new Error("History scan failed; review is incomplete.");
}
const trackedEnv = git("ls-files", "--", ".env.local");
if (trackedEnv) findings.push(".env.local is tracked");
if (spawnSync("git", ["check-ignore", "--quiet", ".env.local"]).status !== 0) findings.push(".env.local is not ignored");
if (git("log", "--all", "--format=%h", "--", ".env.local")) findings.push(".env.local exists in reachable history");

if (process.argv.includes("--include-build")) {
  if (!existsSync(".next/static")) throw new Error("Run a normal production build first.");
  const manifest = JSON.parse(readFileSync(".next/required-server-files.json", "utf8"));
  if (manifest.config?.env?.NEXT_PUBLIC_ENABLE_CHAT_SABOTAGE !== "0") {
    findings.push("Build configuration enables chat test hooks; rebuild normally before deployment");
  }
  // Compare the local key in memory as well as checking recognizable patterns.
  // Neither the file contents nor the key is printed or passed to a subprocess.
  const localKey = existsSync(".env.local")
    ? readFileSync(".env.local", "utf8").match(/^OPENROUTER_API_KEY\s*=\s*["']?([^\s"'\r\n]+)/m)?.[1]
    : undefined;
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else {
        const source = readFileSync(file, "utf8");
        if (secret.test(source) || (localKey && source.includes(localKey))) findings.push(`Public build asset: ${file}`);
        if (/This is a simulated reply from test mode|simulated mid-stream failure/.test(source)) {
          findings.push(`Test scenario in public production asset: ${file}`);
        }
      }
    }
  };
  walk(".next/static");
}
if (findings.length) {
  for (const finding of findings) console.error(finding);
  process.exitCode = 1;
} else {
  console.log("PASS: no obvious credential patterns in working files or reachable Git history; .env.local is ignored and absent from history.");
  if (process.argv.includes("--include-build")) console.log("PASS: build test hooks are off; public assets contain neither the local API key nor scripted response text.");
}
console.log("Pattern scan only; this does not prove that every possible secret format is absent.");
