#!/usr/bin/env node

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const command = process.argv[2];
const projectRoot = process.cwd();

const pythonDir = path.resolve(__dirname, "python");

function findPython() {
  for (const name of ["python3", "python"]) {
    const r = spawnSync(name, ["--version"], { encoding: "utf-8", timeout: 5000 });
    if (r.status === 0 && r.stdout) {
      const m = r.stdout.match(/(\d+)\.(\d+)/);
      if (m && parseInt(m[1]) >= 3) return name;
    }
  }
  return null;
}

async function main() {
  switch (command) {
    case "deploy":
    case "init": {
      const { run } = await import("./deploy/ui.js");
      await run(projectRoot);
      break;
    }
    case "check": {
      const python = findPython();
      if (!python) {
        console.error("❌ 未找到 Python 3，请安装 Python >= 3.10");
        process.exit(1);
      }

      const checkArgs = process.argv.slice(3);
      const pythonArgs = ["-m", "codelint", ...checkArgs];

      const r = spawnSync(python, pythonArgs, {
        stdio: "inherit",
        cwd: projectRoot,
        env: {
          ...process.env,
          PYTHONPATH: pythonDir,
        },
      });
      process.exit(r.status ?? 1);
      break;
    }
    default: {
      console.log("codelint · Python 代码层级检查工具\n");
      console.log("用法:");
      console.log("  codelint deploy    部署配置（交互式）");
      console.log("  codelint check     检查代码层级与文件大小");
      break;
    }
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
