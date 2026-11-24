#!/usr/bin/env node

/**
 * TypeScript 架构“坏味道”检测（阻断 / 咨询分流版）
 *
 * 检测导致类型系统失效的错误抽象：
 * 1. 暴力双重断言: `as unknown as XXX` 或 `as any as XXX`          -> 阻断
 * 2. 类型黑洞: `Record<string, unknown>` 或 `[key: string]: any`     -> 咨询
 * 3. 巨型联合类型（缝合怪）: 包含 3 个及以上 `|` 的联合声明          -> 咨询
 *
 * 分流规则（接门禁前必须先稳定）：
 * - 阻断子集：生产代码中的 ERROR 级坏味道。命中即退出码 1。
 * - 咨询子集：WARNING 级坏味道，以及测试代码（`__tests__/`、`*.test.*`、
 *   `*.spec.*`）中的 ERROR。只报告，不阻断。
 * - 测试代码中的断言不纳入阻断，避免为了门禁变绿去改既有测试用例
 *   （AGENTS.md 第 2 条）。
 *
 * 运行方式:
 *   node scripts/check-ts-smells.mjs [扫描目录=src] [--json] [--strict]
 *
 * 参数:
 *   --json    输出机器可读 JSON（无 ANSI 颜色），供后续门禁聚合使用
 *   --strict  咨询子集也视为阻断（退出码 1），默认关闭
 *
 * 退出码:
 *   0  阻断子集为空（--strict 时咨询子集也为空）
 *   1  存在阻断项
 *   2  参数错误
 */

import fs from 'node:fs';
import path from 'node:path';

// --- 配置区 ---
const IGNORE_DIRS = ['node_modules', 'dist', 'build', 'coverage', '.git', '.quipu'];
const TARGET_EXTS = ['.ts', '.tsx'];

// --- 颜色终端输出 ---
const c = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// --- 坏味道正则定义 ---
const SMELLS = [
  {
    id: 'Double Assertion (双重断言)',
    level: 'ERROR',
    blocking: true,
    regex: /as\s+(?:unknown|any)\s+as\s+[A-Za-z0-9_]+/g,
    desc: '暴力的类型欺骗，通常是为了将不兼容的强转，意味着接口设计可能已腐化。',
  },
  {
    id: 'Type Blackhole (类型黑洞)',
    level: 'WARNING',
    blocking: false,
    regex:
      /Record\s*<\s*(?:string|number)\s*,\s*(?:unknown|any)\s*>|\[\s*[a-zA-Z0-9_]+\s*:\s*(?:string|number)\s*\]\s*:\s*(?:any|unknown)/g,
    desc: '放弃了结构化数据的类型约束，导致调用方必须到处写 `as`。建议具体化 DTO。',
  },
  {
    id: 'Mega Union Type (巨型缝合类型)',
    level: 'WARNING',
    blocking: false,
    // 匹配在 type 定义或参数定义中，包含 3 个及以上的 | 符号的类型声明
    regex:
      /(?:type\s+[A-Za-z0-9_]+\s*=\s*|:\s*)(?:[A-Za-z0-9_<>\[\]'"\s]+\|\s*){3,}[A-Za-z0-9_<>\[\]'"\s]+/g,
    desc: '过度泛化的接口。建议使用区分化联合类型 (Discriminated Unions) 或拆分函数。',
  },
];

// --- 参数解析 ---
function usage() {
  console.log('用法: node scripts/check-ts-smells.mjs [扫描目录=src] [--json] [--strict]');
}

function parseArgs(argv) {
  let targetDir = 'src';
  let json = false;
  let strict = false;

  for (const arg of argv) {
    if (arg === '--json') {
      json = true;
    } else if (arg === '--strict') {
      strict = true;
    } else if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (arg.startsWith('-')) {
      console.error(`未知参数: ${arg}`);
      usage();
      process.exit(2);
    } else {
      targetDir = arg;
    }
  }

  return { targetDir, json, strict };
}

const { targetDir, json, strict } = parseArgs(process.argv.slice(2));

// --- 文件遍历 ---
function walkDir(dir, files) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir).sort();

  for (const entry of entries) {
    if (IGNORE_DIRS.includes(entry)) continue;

    const filepath = path.join(dir, entry);
    const stat = fs.statSync(filepath);

    if (stat.isDirectory()) {
      walkDir(filepath, files);
    } else if (stat.isFile() && TARGET_EXTS.includes(path.extname(filepath))) {
      files.push(filepath);
    }
  }
}

const TEST_PATH_RE = /(^|[/\\])__tests__([/\\]|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/;

function isTestFile(filepath) {
  return TEST_PATH_RE.test(filepath);
}

// --- 核心分析 ---
function analyzeFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  const findings = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lineNum = index + 1;
    // 简单跳过单行注释
    if (line.trim().startsWith('//')) continue;

    for (const smell of SMELLS) {
      // 克隆正则以重置 lastIndex
      const regex = new RegExp(smell.regex.source, smell.regex.flags);
      for (const match of line.matchAll(regex)) {
        const inTest = isTestFile(filepath);
        // 测试代码中的 ERROR 降级为咨询，避免门禁逼迫修改既有测试
        const blocking = smell.blocking && !inTest;
        findings.push({
          file: filepath,
          line: lineNum,
          level: smell.level,
          smell: smell.id,
          code: match[0].trim(),
          desc: smell.desc,
          bucket: blocking ? 'blocking' : 'advisory',
          reason: blocking ? 'production' : inTest && smell.blocking ? 'test-code' : 'warning',
        });
      }
    }
  }

  return findings;
}

// --- 输出 ---
function printSection(title, color, findings) {
  const files = [...new Set(findings.map((finding) => finding.file))];
  console.log(
    `\n${color}${c.bold}=== ${title} ===${c.reset} ${files.length} 个文件 / ${findings.length} 处`,
  );

  if (findings.length === 0) {
    console.log(`${c.gray}(无)${c.reset}`);
    return;
  }

  for (const file of files) {
    console.log(`\n📄 ${c.cyan}${c.bold}${file}${c.reset}`);
    for (const finding of findings.filter((item) => item.file === file)) {
      const levelColor = finding.level === 'ERROR' ? c.red : c.yellow;
      const reasonTag = finding.reason === 'test-code' ? `${c.gray}(test-code)${c.reset}` : '';
      console.log(
        `   ${c.gray}Line ${finding.line.toString().padEnd(4)}${c.reset} | [${levelColor}${finding.level}${c.reset}] ${c.bold}${finding.smell}${c.reset} ${reasonTag}`,
      );
      console.log(`             ${c.gray}Code: ${c.reset}${finding.code}`);
      console.log(`             ${c.gray}Hint: ${c.reset}${finding.desc}`);
    }
  }
}

// --- 执行 ---
const scanStart = Date.now();
const files = [];
walkDir(targetDir, files);

const findings = files.flatMap(analyzeFile);
const blocking = findings.filter((finding) => finding.bucket === 'blocking');
const advisory = findings.filter((finding) => finding.bucket === 'advisory');
const allFiles = new Set(findings.map((finding) => finding.file)).size;
const blockingFiles = new Set(blocking.map((finding) => finding.file)).size;
const advisoryFiles = new Set(advisory.map((finding) => finding.file)).size;
const timeTaken = Date.now() - scanStart;

const summary = {
  scannedFiles: files.length,
  total: findings.length,
  files: allFiles,
  blocking: blocking.length,
  blockingFiles,
  advisory: advisory.length,
  advisoryFiles,
  durationMs: timeTaken,
};

const failed = blocking.length > 0 || (strict && advisory.length > 0);

if (json) {
  const toRecord = (finding) => ({
    file: finding.file,
    line: finding.line,
    level: finding.level,
    smell: finding.smell,
    code: finding.code,
    reason: finding.reason,
  });
  console.log(
    JSON.stringify(
      {
        target: targetDir,
        blocking: blocking.map(toRecord),
        advisory: advisory.map(toRecord),
        summary,
        passed: !failed,
      },
      null,
      2,
    ),
  );
} else {
  console.log(`${c.bold}🚀 开始扫描 TypeScript 架构“坏味道”...${c.reset}`);
  console.log(`${c.gray}扫描目录: ./${targetDir}${c.reset}`);

  printSection('阻断子集 (blocking)', c.red, blocking);
  printSection('咨询子集 (advisory)', c.yellow, advisory);

  console.log(`\n${'='.repeat(50)}`);
  if (blocking.length > 0) {
    console.log(
      `${c.red}❌ 阻断: ${c.bold}${blocking.length}${c.reset}${c.red} 处 / ${blockingFiles} 个文件；` +
        `咨询: ${advisory.length} 处 / ${advisoryFiles} 个文件。阻断项清零前不可接入 pnpm verify。${c.reset}`,
    );
  } else {
    console.log(
      `${c.green}✅ 阻断子集为空${c.reset}${c.gray}；咨询: ${advisory.length} 处 / ${advisoryFiles} 个文件（不阻断）。${c.reset}`,
    );
  }
  if (strict && advisory.length > 0) {
    console.log(`${c.red}--strict: 咨询子集视为阻断。${c.reset}`);
  }
  console.log(`⏱  耗时: ${timeTaken}ms（扫描 ${files.length} 个文件）`);

  if (advisory.length > 0) {
    console.log(
      `\n💡 ${c.cyan}建议：不要试图用一个接口“统治”所有业务。允许适度的代码重复（Duplication），消除为了合并而合并的错误抽象。${c.reset}`,
    );
  }
}

process.exitCode = failed ? 1 : 0;
