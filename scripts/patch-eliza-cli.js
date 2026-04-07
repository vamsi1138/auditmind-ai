#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const cliDistPath = path.join(
  process.cwd(),
  "node_modules",
  "@elizaos",
  "cli",
  "dist",
  "index.js"
);

const helperSnippet = `function resolveWindowsSpawnCommand(command) {
  if (process.platform !== "win32") {
    return command;
  }
  if (command === "npm") {
    return "npm.cmd";
  }
  if (command === "npx") {
    return "npx.cmd";
  }
  return command;
}
`;

function main() {
  if (!existsSync(cliDistPath)) {
    console.log("[patch-eliza-cli] Local @elizaos/cli not found, skipping.");
    return;
  }

  let source = readFileSync(cliDistPath, "utf8");
  let changed = false;

  if (!source.includes("function resolveWindowsSpawnCommand(command)")) {
    const next = source.replace(
      "async function bunExec(command, args = [], options = {}) {",
      `${helperSnippet}async function bunExec(command, args = [], options = {}) {`
    );

    if (next === source) {
      throw new Error("Unable to locate bunExec function in @elizaos/cli dist bundle.");
    }

    source = next
      .replace(
        '    const fullCommand = [command, ...escapedArgs].join(" ");',
        '    const resolvedCommand = resolveWindowsSpawnCommand(command);\n    const fullCommand = [resolvedCommand, ...escapedArgs].join(" ");'
      )
      .replace(
        "    proc = Bun.spawn([command, ...args], {",
        "    proc = Bun.spawn([resolvedCommand, ...args], {"
      );

    changed = true;
  }

  if (!source.includes('process.env.ELIZA_SKIP_UPDATE_CHECK === "true"')) {
    const next = source
      .replace(
        "async function getLatestCliVersionForChannel(currentVersion) {",
        'async function getLatestCliVersionForChannel(currentVersion) {\n  if (process.platform === "win32" || process.env.ELIZA_SKIP_UPDATE_CHECK === "true") {\n    return null;\n  }'
      )
      .replace(
        "async function checkLatestCliVersionForChannel(currentVersion) {",
        'async function checkLatestCliVersionForChannel(currentVersion) {\n  if (process.platform === "win32" || process.env.ELIZA_SKIP_UPDATE_CHECK === "true") {\n    return { status: "up_to_date" };\n  }'
      );

    if (next === source) {
      throw new Error("Unable to patch update-check handling in @elizaos/cli dist bundle.");
    }

    source = next;
    changed = true;
  }

  if (!changed) {
    console.log("[patch-eliza-cli] Patch already applied.");
    return;
  }

  writeFileSync(cliDistPath, source, "utf8");
  console.log("[patch-eliza-cli] Patched local @elizaos/cli for Windows command resolution and update checks.");
}

main();
