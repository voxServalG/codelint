import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { detect } from "./detect.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function rl() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(question) {
  return new Promise((resolve) => {
    const iface = rl();
    iface.question(question, (answer) => {
      iface.close();
      resolve(answer.trim());
    });
  });
}

export async function run(projectRoot) {
  console.log("\n  codelint · Python 代码层级检查工具");
  console.log("  " + "═".repeat(35) + "\n");

  const configPath = path.join(projectRoot, "codelint.json");
  let existing = {};
  if (fs.existsSync(configPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      console.log("  检测到已有配置，将以现有值作为默认值\n");
    } catch {
      console.log("  已有配置文件无法读取，将重新配置\n");
    }
  }

  const detected = detect(projectRoot);

  const cfg = {
    modulePrefix: existing.modulePrefix || (detected.modulePrefix || ""),
    srcDir: existing.srcDir || (detected.srcDir || "src"),
    maxLinesError: existing.maxLinesError ?? 500,
    maxLinesWarning: existing.maxLinesWarning ?? 300,
    tiers: existing.tiers || detected.tiers || [],
  };

  while (true) {
    printChecklist(cfg, detected);
    const choice = await ask("  输入编号修改，输入 0 完成\n  > ");

    if (choice === "0") break;

    switch (choice) {
      case "1": await editModulePrefix(cfg, detected); break;
      case "2": await editSrcDir(cfg); break;
      case "3": await editMaxLinesError(cfg); break;
      case "4": await editMaxLinesWarning(cfg); break;
      case "5": await editTiers(cfg, detected, projectRoot); break;
      default: console.log("  无效选择，请输入 1-5 或 0");
    }
    console.log("");
  }

  console.log("\n  即将写入以下文件：\n");
  console.log("  • codelint.json");
  console.log("  • .github/workflows/code-quality.yml");

  const workflowPath = path.join(projectRoot, ".github", "workflows", "code-quality.yml");
  if (fs.existsSync(workflowPath)) {
    console.log("    ⚠ .github/workflows/code-quality.yml 已存在，将覆盖");
  }

  const confirm = await ask("\n  确认写入？[Y/n] ");
  if (confirm && confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
    console.log("\n  已取消，未写入任何文件\n");
    return;
  }

  if (fs.existsSync(workflowPath)) {
    const ov = await ask(`\n  ⚠ code-quality.yml 已存在。覆盖/跳过？[o/s] `);
    if (ov === "s") {
      console.log("  跳过 workflow");
    } else {
      writeWorkflow(projectRoot);
      console.log("  ✓  .github/workflows/code-quality.yml  已写入");
    }
  } else {
    writeWorkflow(projectRoot);
    console.log("  ✓  .github/workflows/code-quality.yml  已写入");
  }

  const { writeFileSync, mkdirSync, existsSync: fe } = await import("fs");
  writeFileSync(configPath, JSON.stringify(cfg, null, 2) + "\n");
  console.log("  ✓  codelint.json  已写入");

  console.log("\n  下一步：");
  console.log("    git add codelint.json .github/workflows/code-quality.yml");
  console.log("    codelint check    立即运行检查\n");
}

function printChecklist(cfg, detected) {
  const tierNames = {};
  if (cfg.tiers && cfg.tiers.length > 0) {
    for (let i = 0; i < cfg.tiers.length; i++) {
      tierNames[i] = cfg.tiers[i].name || `L${i}`;
    }
  }
  const tierCounts = {};
  for (let i = 0; i < (cfg.tiers || []).length; i++) {
    tierCounts[i] = (cfg.tiers[i].modules || []).length;
  }
  const tierSummary = Object.entries(tierCounts)
    .map(([t, c]) => `L${t} ${tierNames[t] || ""}: ${c} 个模块`)
    .join("，") || "未配置";

  console.log("  ┌──────────────────────────────────────────────────────┐");
  printItem("1", "模块前缀", cfg.modulePrefix || "(未配置)",
    detected.modulePrefix ? `检测到: ${detected.modulePrefix}/` : "未检测到",
    "只检查该前缀下的 Python 导入");
  printItem("2", "代码目录", cfg.srcDir,
    detected.srcDir ? `检测到: ${detected.srcDir}/` : "",
    "扫描此目录下的 .py 文件");
  printItem("3", "错误行数", String(cfg.maxLinesError),
    "范围 10–2000",
    "超过此行数的文件报 error");
  printItem("4", "警告行数", String(cfg.maxLinesWarning),
    "范围 10–2000",
    "超过此行数的文件报 warning");
  printItem("5", "层级定义", tierSummary,
    `共 ${cfg.tiers ? cfg.tiers.length : 0} 个层级`,
    "模块层级归属，底层不可导入高层");
  console.log("  └──────────────────────────────────────────────────────┘");
  console.log("");
}

function printItem(num, label, value, detail, help) {
  console.log(`  │ ${num}. ${label}`.padEnd(30) + `  ${value}`.padEnd(20) + "│");
  if (detail) console.log(`  │    ${detail}`.padEnd(60) + "│");
  console.log(`  │    作用：${help}`.padEnd(60) + "│");
  console.log("  │                                                      │");
}

async function editModulePrefix(cfg, detected) {
  console.log("\n  ── 模块前缀 ──");
  console.log("  作用：只检查该前缀下的 Python 导入。");
  if (detected.modulePrefix) console.log(`  检测到: ${detected.modulePrefix}/`);
  console.log(`  当前: ${cfg.modulePrefix || "(未配置)"}`);
  const val = await ask("  > ");
  if (val) cfg.modulePrefix = val;
}

async function editSrcDir(cfg) {
  console.log("\n  ── 代码目录 ──");
  console.log("  作用：扫描此目录下的 .py 文件。");
  console.log(`  当前: ${cfg.srcDir}`);
  const val = await ask("  > ");
  if (val) cfg.srcDir = val;
}

async function editMaxLinesError(cfg) {
  console.log("\n  ── 错误行数 ──");
  console.log("  作用：超过此行数的文件报 error。");
  console.log("  范围：10–2000");
  console.log(`  当前: ${cfg.maxLinesError}`);
  const val = await ask("  > ");
  if (val === "") return;
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 10 || n > 2000) { console.log("  无效值，保持当前"); return; }
  cfg.maxLinesError = n;
}

async function editMaxLinesWarning(cfg) {
  console.log("\n  ── 警告行数 ──");
  console.log("  作用：超过此行数的文件报 warning。");
  console.log("  范围：10–2000");
  console.log(`  当前: ${cfg.maxLinesWarning}`);
  const val = await ask("  > ");
  if (val === "") return;
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 10 || n > 2000) { console.log("  无效值，保持当前"); return; }
  cfg.maxLinesWarning = n;
}

async function editTiers(cfg, detected, projectRoot) {
  console.log("\n  ── 层级定义 ──");
  console.log("  作用：模块层级归属，底层不可导入高层。\n");

  while (true) {
    printTierMenu(cfg);
    const choice = await ask("  输入编号操作，输入 0 返回\n  > ");

    if (choice === "0") return;

    if (choice === "n") {
      await addTier(cfg);
    } else if (choice === "a") {
      await addModuleToTier(cfg);
    } else if (choice === "r") {
      await removeModule(cfg);
    } else {
      const n = parseInt(choice);
      if (isNaN(n)) continue;
      const tierIdx = n - 1;
      if (tierIdx >= 0 && tierIdx < (cfg.tiers || []).length) {
        await editTierName(cfg, tierIdx);
      }
    }
    console.log("");
  }
}

function printTierMenu(cfg) {
  const tiers = cfg.tiers || [];
  console.log("  ┌──────────────────────────────────────────────────────┐");
  if (tiers.length === 0) {
    console.log("  │   (暂无层级)".padEnd(60) + "│");
  } else {
    let i = 1;
    for (const tier of tiers) {
      const mods = (tier.modules || []).slice(0, 4).join(", ");
      const more = (tier.modules || []).length > 4 ? ` ... 等${tier.modules.length}个` : "";
      console.log(`  │ ${i}. L${i - 1} ${tier.name}`.padEnd(30) + `  ${mods}${more}`.padEnd(30) + "│");
      i++;
    }
  }
  console.log("  +──────────────────────────────────────────────────────");
  console.log("  │ a. 添加模块到某层".padEnd(60) + "│");
  console.log("  │ r. 移除某层模块".padEnd(60) + "│");
  console.log("  │ n. 新增层级".padEnd(60) + "│");
  console.log("  │ 0. 返回上层".padEnd(60) + "│");
  console.log("  └──────────────────────────────────────────────────────┘");
}

async function editTierName(cfg, idx) {
  const tier = cfg.tiers[idx];
  console.log(`\n  ── L${idx} ${tier.name} ──`);
  console.log(`  模块: ${(tier.modules || []).join(", ") || "(无)"}`);
  const newName = await ask(`  新名称（留空保持）\n  > `);
  if (newName) tier.name = newName;
}

async function addTier(cfg) {
  const name = await ask("  层级名称（如 基础设施）\n  > ");
  if (!name) return;
  if (!cfg.tiers) cfg.tiers = [];
  cfg.tiers.push({ name, modules: [] });
  console.log(`  ✓ 已添加 L${cfg.tiers.length - 1} ${name}`);
}

async function addModuleToTier(cfg) {
  const tiers = cfg.tiers || [];
  if (tiers.length === 0) {
    console.log("  请先创建一个层级（按 n）");
    return;
  }
  const mod = await ask("  模块路径（如 origen.signal）\n  > ");
  if (!mod) return;
  console.log("  添加到哪一层？");
  for (let i = 0; i < tiers.length; i++) {
    console.log(`    ${i + 1}. L${i} ${tiers[i].name}`);
  }
  const choice = await ask("  > ");
  const idx = parseInt(choice) - 1;
  if (idx >= 0 && idx < tiers.length) {
    if (!tiers[idx].modules) tiers[idx].modules = [];
    tiers[idx].modules.push(mod);
    console.log(`  ✓ 已添加 ${mod} → L${idx} ${tiers[idx].name}`);
  }
}

async function removeModule(cfg) {
  const tiers = cfg.tiers || [];
  if (tiers.length === 0) return;
  const allMods = [];
  for (let i = 0; i < tiers.length; i++) {
    for (const mod of (tiers[i].modules || [])) {
      allMods.push({ mod, tier: i, name: tiers[i].name });
    }
  }
  if (allMods.length === 0) {
    console.log("  没有可移除的模块");
    return;
  }
  console.log("\n  选择要移除的模块：");
  for (let i = 0; i < allMods.length; i++) {
    console.log(`    ${i + 1}. ${allMods[i].mod} (L${allMods[i].tier} ${allMods[i].name})`);
  }
  const choice = await ask("  > ");
  const idx = parseInt(choice) - 1;
  if (idx >= 0 && idx < allMods.length) {
    const { mod, tier } = allMods[idx];
    tiers[tier].modules = tiers[tier].modules.filter((m) => m !== mod);
    console.log(`  ✓ 已移除 ${mod}`);
  }
}

function writeWorkflow(projectRoot) {
  const templateDir = path.resolve(__dirname, "..", "templates");
  const templatePath = path.join(templateDir, "code-quality.yml");
  const content = fs.readFileSync(templatePath, "utf-8");

  const workflowsDir = path.join(projectRoot, ".github", "workflows");
  if (!fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(workflowsDir, "code-quality.yml"), content);
}
