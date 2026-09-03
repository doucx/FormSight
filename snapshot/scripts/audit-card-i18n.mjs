#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CARDS_DIR = path.join(ROOT_DIR, 'src', 'cards');
const COMPONENTS_DIR = path.join(ROOT_DIR, 'src', 'components');

const args = process.argv.slice(2);
const isFixMode = args.includes('--fix');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

let totalViolations = 0;
let totalFixes = 0;

function logInfo(msg) {
  console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`);
}
function logSuccess(msg) {
  console.log(`${colors.green}[OK]${colors.reset} ${msg}`);
}
function logWarn(msg) {
  console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`);
}
function logError(msg) {
  console.log(`${colors.red}[FAIL]${colors.reset} ${msg}`);
}

function getCardDirectories() {
  if (!fs.existsSync(CARDS_DIR)) return [];
  return fs
    .readdirSync(CARDS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function getAllFiles(dir, exts = ['.ts', '.tsx', '.json']) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

// ==========================================
// 1. 检查 & 展平卡片私有 locales 中的 views / labels
// ==========================================
function auditCardLocales(cardId) {
  const localesDir = path.join(CARDS_DIR, cardId, 'locales');
  if (!fs.existsSync(localesDir)) return [];

  const localeFiles = fs
    .readdirSync(localesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(localesDir, f));

  const flattenedKeys = new Set();
  const issues = [];

  for (const file of localeFiles) {
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const data = JSON.parse(raw);
      let changed = false;

      // 检查 views 嵌套
      if (data.views && typeof data.views === 'object' && !Array.isArray(data.views)) {
        issues.push({
          file,
          cardId,
          type: 'nested_views',
          message: `发现嵌套 'views' 层级，建议展平`,
        });
        if (isFixMode) {
          for (const [key, val] of Object.entries(data.views)) {
            if (!(key in data)) {
              data[key] = val;
              flattenedKeys.add(`views.${key}`);
            }
          }
          data.views = undefined;
          changed = true;
        }
      }

      // 检查 labels 嵌套
      if (data.labels && typeof data.labels === 'object' && !Array.isArray(data.labels)) {
        issues.push({
          file,
          cardId,
          type: 'nested_labels',
          message: `发现嵌套 'labels' 层级，建议展平`,
        });
        if (isFixMode) {
          for (const [key, val] of Object.entries(data.labels)) {
            if (!(key in data)) {
              data[key] = val;
              flattenedKeys.add(`labels.${key}`);
            }
          }
          data.labels = undefined;
          changed = true;
        }
      }

      if (isFixMode && changed) {
        fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
        totalFixes++;
      }
    } catch (e) {
      issues.push({
        file,
        cardId,
        type: 'invalid_json',
        message: `JSON 解析失败: ${e.message}`,
      });
    }
  }

  return { issues, flattenedKeys: Array.from(flattenedKeys) };
}

// ==========================================
// 2. 检查 & 修复卡片视图中的 useCardTranslation 与相对 Key
// ==========================================
function auditCardViews(cardId, flattenedKeys = []) {
  const cardPath = path.join(CARDS_DIR, cardId);
  const files = getAllFiles(cardPath, ['.tsx', '.ts']);
  const issues = [];

  for (const file of files) {
    const fileName = path.basename(file);
    // 排除 analytics 与 generator
    if (
      fileName === 'analytics.tsx' ||
      fileName === 'generator.ts' ||
      fileName.includes('.test.')
    ) {
      continue;
    }

    let content = fs.readFileSync(file, 'utf-8');
    let fileChanged = false;

    // A. 检查绝对路径: cards.<cardId>.
    const absoluteKeyPattern = new RegExp(`cards\\.${cardId}\\.`, 'g');
    if (absoluteKeyPattern.test(content)) {
      issues.push({
        file,
        cardId,
        type: 'absolute_key',
        message: `存在绝对命名空间调用 'cards.${cardId}.'`,
      });
      if (isFixMode) {
        content = content.replace(absoluteKeyPattern, '');
        fileChanged = true;
      }
    }

    // B. 如果有展平字段，将 t('views.xxx') 替换为 t('xxx')
    for (const oldPrefix of flattenedKeys) {
      const shortKey = oldPrefix.replace(/^(views|labels)\./, '');
      const keyCallPattern = new RegExp(`(['"\`])${oldPrefix}(['"\`])`, 'g');
      if (keyCallPattern.test(content)) {
        issues.push({
          file,
          cardId,
          type: 'flattened_key_call',
          message: `调用了展平前的遗留路径 '${oldPrefix}'`,
        });
        if (isFixMode) {
          content = content.replace(keyCallPattern, `$1${shortKey}$2`);
          fileChanged = true;
        }
      }
    }

    // C. 检查是否在视图组件中直接使用全局 useTranslation
    const hasGlobalUseTranslation =
      content.includes('useTranslation()') && !content.includes('useCardTranslation(');
    if (hasGlobalUseTranslation) {
      issues.push({
        file,
        cardId,
        type: 'use_card_translation_missing',
        message: `视图组件使用全局 'useTranslation()'，应使用 'useCardTranslation("${cardId}")'`,
      });

      if (isFixMode) {
        // 自动替换导入
        if (content.includes('useTranslation') && !content.includes('useCardTranslation')) {
          content = content.replace(/\buseTranslation\b/g, 'useCardTranslation');
          content = content.replace(
            /const\s*\{\s*t\s*\}\s*=\s*useCardTranslation\(\);/g,
            `const { t } = useCardTranslation('${cardId}');`,
          );
          fileChanged = true;
        }
      }
    }

    if (isFixMode && fileChanged) {
      fs.writeFileSync(file, content, 'utf-8');
      totalFixes++;
    }
  }

  return issues;
}

// ==========================================
// 3. 检查全局垫片代码 (split('.').slice(2))
// ==========================================
function auditSlicePatches() {
  const settingsDir = path.join(COMPONENTS_DIR, 'settings');
  const files = getAllFiles(settingsDir, ['.tsx', '.ts']);
  const issues = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes("split('.').slice(2)")) {
      issues.push({
        file,
        type: 'slice_patch_found',
        message: `发现 split('.').slice(2) 逆向截取垫片代码，待卡片 Key 规范化后应彻底拔除`,
      });
    }
  }

  return issues;
}

// ==========================================
// 4. 检查 Canvas 渲染逻辑中的硬编码中文
// ==========================================
function auditCanvasHardcodedChinese() {
  const chartFiles = [
    ...getAllFiles(path.join(ROOT_DIR, 'src', 'core', 'canvas', 'charts'), ['.ts', '.tsx']),
    ...getAllFiles(CARDS_DIR, ['.ts', '.tsx']).filter((f) => f.includes('charts.ts')),
  ];

  const issues = [];
  const chineseRegex = /[\u4e00-\u9fa5]{2,}/g;

  for (const file of chartFiles) {
    const lines = fs.readFileSync(file, 'utf-8').split('\n');
    lines.forEach((line, idx) => {
      // 排除纯注释行
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        return;
      }
      if (
        line.includes('fillText') ||
        line.includes('strokeText') ||
        line.includes('SECTOR_NAMES')
      ) {
        const matches = line.match(chineseRegex);
        if (matches && matches.length > 0) {
          issues.push({
            file,
            line: idx + 1,
            type: 'canvas_hardcoded_chinese',
            message: `Canvas 绘图上下文包含硬编码中文 [${matches.join(', ')}]，需参数化注入`,
          });
        }
      }
    });
  }

  return issues;
}

// ==========================================
// 执行主流程
// ==========================================
function run() {
  console.log(`\n${colors.bold}=== FormSight 卡片 i18n 架构契约审计 ===${colors.reset}\n`);
  logInfo(`工作区根目录: ${ROOT_DIR}`);
  logInfo(
    `运行模式: ${isFixMode ? `${colors.green}自动修复 (--fix)${colors.reset}` : `${colors.yellow}仅检查 (--check)${colors.reset}`}\n`,
  );

  const cardIds = getCardDirectories();
  logInfo(`共检索到 ${cardIds.length} 个卡片模块。\n`);

  const allIssues = [];

  for (const cardId of cardIds) {
    const { issues: localeIssues, flattenedKeys } = auditCardLocales(cardId);
    const viewIssues = auditCardViews(cardId, flattenedKeys);

    const cardIssues = [...localeIssues, ...viewIssues];
    if (cardIssues.length > 0) {
      allIssues.push(...cardIssues);
      console.log(
        `${colors.yellow}● 卡片 [${cardId}]${colors.reset} 发现 ${cardIssues.length} 处规范偏差:`,
      );
      for (const issue of cardIssues) {
        console.log(
          `  - ${colors.gray}${path.relative(ROOT_DIR, issue.file)}${colors.reset}: ${issue.message}`,
        );
      }
    }
  }

  const sliceIssues = auditSlicePatches();
  if (sliceIssues.length > 0) {
    allIssues.push(...sliceIssues);
    console.log(`\n${colors.yellow}● 设置垫片代码检查:${colors.reset}`);
    for (const issue of sliceIssues) {
      console.log(
        `  - ${colors.gray}${path.relative(ROOT_DIR, issue.file)}${colors.reset}: ${issue.message}`,
      );
    }
  }

  const canvasIssues = auditCanvasHardcodedChinese();
  if (canvasIssues.length > 0) {
    allIssues.push(...canvasIssues);
    console.log(`\n${colors.yellow}● Canvas 图表国际化硬编码检查:${colors.reset}`);
    for (const issue of canvasIssues) {
      console.log(
        `  - ${colors.gray}${path.relative(ROOT_DIR, issue.file)}:${issue.line}${colors.reset}: ${issue.message}`,
      );
    }
  }

  totalViolations = allIssues.length;

  console.log(`\n${colors.bold}=== 审计总结 ===${colors.reset}`);
  if (totalViolations === 0) {
    logSuccess('未发现任何卡片 i18n 规范偏差，架构一致性良好！');
    process.exit(0);
  } else {
    if (isFixMode) {
      logSuccess(`已尝试自动修复，共应用 ${totalFixes} 处补丁。请复核 Git 变更。`);
      process.exit(0);
    } else {
      logError(`共发现 ${totalViolations} 处规范违规。`);
      console.log(
        `${colors.gray}提示: 运行 'node scripts/audit-card-i18n.mjs --fix' 可自动修复常见路径与词典层级偏差。${colors.reset}\n`,
      );
      process.exit(1);
    }
  }
}

run();
