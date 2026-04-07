#!/usr/bin/env bun
/**
 * Self-contained build script for ElizaOS projects.
 */

import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";

async function cleanBuild(outdir = "dist") {
  if (existsSync(outdir)) {
    await rm(outdir, { recursive: true, force: true });
    console.log(`Cleaned ${outdir} directory`);
  }
}

async function build() {
  const start = performance.now();
  console.log("Building project...");

  try {
    await cleanBuild("dist");

    console.log("Starting build tasks...");

    console.log("Building frontend with Vite...");
    try {
      await runLocalCli("./node_modules/vite/bin/vite.js", ["build"]);
      console.log("Frontend build generated");
    } catch (error) {
      console.error("Failed to build frontend");
      console.error(error);
      return false;
    }

    console.log("Bundling with Bun...");
    const buildResult = await Bun.build({
      entrypoints: ["./src/index.ts"],
      outdir: "./dist",
      target: "node",
      format: "esm",
      sourcemap: true,
      minify: false,
      external: [
        "dotenv",
        "fs",
        "path",
        "https",
        "node:*",
        "@elizaos/core",
        "@elizaos/plugin-bootstrap",
        "@elizaos/plugin-sql",
        "@elizaos/cli",
        "zod",
      ],
      naming: {
        entry: "[dir]/[name].[ext]",
      },
    });

    if (!buildResult.success) {
      console.error("Build failed:", buildResult.logs);
      return false;
    }

    const totalSize = buildResult.outputs.reduce((sum, output) => sum + output.size, 0);
    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
    console.log(`Built ${buildResult.outputs.length} file(s) - ${sizeMB}MB`);

    console.log("Generating TypeScript declarations...");
    try {
      await runLocalCli("./node_modules/typescript/bin/tsc", [
        "--emitDeclarationOnly",
        "--incremental",
        "--project",
        "./tsconfig.build.json",
      ]);
      console.log("TypeScript declarations generated");
    } catch (error) {
      console.error("Failed to generate TypeScript declarations");
      console.error(error);
      return false;
    }

    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    console.log(`Build complete! (${elapsed}s)`);
    return true;
  } catch (error) {
    console.error("Build error:", error);
    return false;
  }
}

function runLocalCli(scriptPath: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [scriptPath, ...args],
      {
        cwd: process.cwd(),
        stdio: "inherit",
      }
    );

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptPath} exited with code ${code}`));
    });
  });
}

build()
  .then((success) => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("Build script error:", error);
    process.exit(1);
  });
