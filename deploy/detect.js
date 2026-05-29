import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export function detect(projectRoot) {
  const srcInfo = detectSrcDir(projectRoot);

  return {
    srcDir: srcInfo ? srcInfo.name : "src",
    modulePrefix: srcInfo ? srcInfo.prefix : "",
    tiers: srcInfo ? suggestTiers(projectRoot, srcInfo) : [],
  };
}

function detectSrcDir(root) {
  const candidates = ["src", "lib", "app", "source"];
  for (const name of candidates) {
    const p = path.join(root, name);
    if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) continue;

    const subdirs = fs.readdirSync(p, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !d.name.startsWith("_"));

    const pyCounts = {};
    for (const sub of subdirs) {
      pyCounts[sub.name] = countPyFiles(path.join(p, sub.name));
    }

    const best = Object.entries(pyCounts).sort((a, b) => b[1] - a[1])[0];
    if (!best || best[1] === 0) continue;

    return {
      name,
      prefix: best[0],
      pyFiles: best[1],
      subdirs: Object.keys(pyCounts),
    };
  }
  return null;
}

function countPyFiles(dir) {
  let count = 0;
  function walk(d, depth = 0) {
    if (depth > 5) return;
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "__pycache__") {
          walk(full, depth + 1);
        } else if (entry.name.endsWith(".py") && !entry.name.startsWith("_")) {
          count++;
        }
      }
    } catch {}
  }
  try { walk(dir); } catch {}
  return count;
}

function suggestTiers(projectRoot, srcInfo) {
  const srcPath = path.join(projectRoot, srcInfo.name, srcInfo.prefix);
  const items = [];

  function scanDir(dirPath, modulePathParts) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
        const fullPath = path.join(dirPath, entry.name);
        const modPath = [...modulePathParts, entry.name].join(".");
        const pyCount = countPyFiles(fullPath);

        let tier = null;
        if (/^(core|config|log|research|types|utils|base)$/.test(entry.name)) tier = 0;
        else if (/^(signal|strategy|execute|paper|live|event|runtime|account|risk|reconcile|manual|mode|market|store|gate|boot)$/.test(entry.name)) tier = 1;
        else if (/^(cli|app|main|cmd)$/.test(entry.name)) tier = 2;

        if (pyCount > 0) {
          items.push({ mod: modPath, pyFiles: pyCount, suggestedTier: tier });
        }

        const children = fs.readdirSync(fullPath, { withFileTypes: true })
          .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("_"));
        if (children.length > 0 && tier !== null) {
          for (const child of children) {
            scanDir(path.join(fullPath, child.name), [...modulePathParts, entry.name, child.name]);
          }
        }
      }
    } catch {}
  }

  if (fs.existsSync(srcPath)) {
    scanDir(srcPath, []);
  }

  const tiers = {};
  for (const item of items) {
    const t = item.suggestedTier ?? 2;
    if (!tiers[t]) tiers[t] = { name: tierNames[t], modules: [] };
    tiers[t].modules.push(item.mod);
  }

  const result = [];
  for (let i = 0; i < 3; i++) {
    if (tiers[i]) result.push(tiers[i]);
    else result.push({ name: tierNames[i], modules: [] });
  }

  return result;
}

const tierNames = { 0: "纯基元", 1: "业务核心", 2: "终端入口" };
