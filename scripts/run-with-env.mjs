import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const [, , mode, command, ...args] = process.argv;

if (!mode || !command) {
  console.error("Usage: node scripts/run-with-env.mjs <mode> <command> [...args]");
  process.exit(1);
}

const projectRoot = process.cwd();
const envFile = path.join(projectRoot, `.env.${mode}`);
const rootEnvFile = path.join(projectRoot, ".env");

if (!fs.existsSync(envFile)) {
  console.error(`[run-with-env] Missing env file: ${path.basename(envFile)}`);
  process.exit(1);
}

function parseEnvFile(content) {
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const fileEnv = parseEnvFile(fs.readFileSync(envFile, "utf8"));
const rootEnv = fs.existsSync(rootEnvFile)
  ? parseEnvFile(fs.readFileSync(rootEnvFile, "utf8"))
  : {};
const isZmpCommand = path.basename(command) === "zmp";

const mergedEnv = {
  ...process.env,
  ...fileEnv,
};

if (isZmpCommand) {
  for (const key of ["APP_ID", "ZMP_TOKEN"]) {
    if (typeof rootEnv[key] === "string" && rootEnv[key].trim()) {
      mergedEnv[key] = rootEnv[key];
    }
  }
}

const child = spawn(command, args, {
  cwd: projectRoot,
  env: mergedEnv,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`[run-with-env] Failed to start ${command}:`, error.message);
  process.exit(1);
});
