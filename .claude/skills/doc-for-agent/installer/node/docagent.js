#!/usr/bin/env node
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function resolveCliScript() {
  const candidates = [
    path.resolve(__dirname, "..", "assets", "installer", "docagent.py"),
    path.resolve(__dirname, "..", "docagent.py")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function runPython(cliScript, args) {
  const pythonCandidates = [];
  if (process.env.DOCAGENT_PYTHON) {
    pythonCandidates.push([process.env.DOCAGENT_PYTHON, []]);
  }
  pythonCandidates.push(["python3", []], ["python", []], ["py", ["-3"]]);

  for (const [executable, preArgs] of pythonCandidates) {
    const run = spawnSync(executable, [...preArgs, cliScript, ...args], { stdio: "inherit" });
    if (run.error && run.error.code === "ENOENT") {
      continue;
    }
    if (run.error) {
      console.error(`[docagent] Failed to start ${executable}: ${run.error.message}`);
      return 2;
    }
    return run.status == null ? 1 : run.status;
  }

  console.error("[docagent] Python runtime was not found.");
  console.error("[docagent] Install Python 3, then run one of:");
  console.error("  - npm install -g doc-for-agent");
  return 2;
}

function main() {
  const cliScript = resolveCliScript();
  if (!cliScript) {
    console.error("[docagent] Packaged runtime assets are missing.");
    console.error("[docagent] Expected one of:");
    console.error("  - doc-for-agent/installer/assets/installer/docagent.py");
    console.error("  - doc-for-agent/installer/docagent.py");
    return 2;
  }
  const forwardedArgs = process.argv.slice(2);
  if (forwardedArgs.length === 0) {
    forwardedArgs.push("quickstart");
  } else if (forwardedArgs[0] === "help") {
    forwardedArgs[0] = "--help";
  } else if (forwardedArgs[0] === "init") {
    try {
      const initScript = require("./init");
      initScript.runInit(forwardedArgs);
    } catch (e) {
      console.error("[docagent Node] Error during native template injection:", e.message);
    }
    // Proceed to run Python so it initializes the directories too.
  }
  return runPython(cliScript, forwardedArgs);
}

process.exit(main());
