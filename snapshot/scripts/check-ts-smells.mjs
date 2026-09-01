#!/usr/bin/env node

/**
 * TypeScript 架构“坏味道”检测脚本
 * 
 * 专门检测导致类型系统失效的错误抽象：
 * 1. 暴力双重断言: `as unknown as XXX` 或 `as any as XXX`
 * 2. 类型黑洞: `Record<string, unknown>` 或 `Record<string, any>`
 * 3. 巨型联合类型（缝合怪）: 包含超过 3 个 `|` 的联合类型
 * 
 * 运行方式: node scripts/check-ts-smells.mjs [扫描目录, 默认 src]
 */

import fs from 'fs';
import path from 'path';

// --- 配置区 ---
const TARGET_DIR = process.argv[2] || 'src';
const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.git'];
const TARGET_EXTS = ['.ts', '.tsx'];

// --- 颜色终端输出 ---
const c = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// --- 坏味道正则定义 ---
const SMELLS = [
  {
    id: 'Double Assertion (双重断言)',
    level: 'ERROR',
    color: c.red,
    regex: /as\s+(?:unknown|any)\s+as\s+[A-Za-z0-9_]+/g,
    desc: '暴力的类型欺骗，通常是为了将不兼容的强转，意味着接口设计可能已腐化。'
  },
  {
    id: 'Type Blackhole (类型黑洞)',
    level: 'WARNING',
    color: c.yellow,
    regex: /Record\s*<\s*(?:string|number)\s*,\s*(?:unknown|any)\s*>|\[\s*[a-zA-Z0-9_]+\s*:\s*(?:string|number)\s*\]\s*:\s*(?:any|unknown)/g,
    desc: '放弃了结构化数据的类型约束，导致调用方必须到处写 `as`。建议具体化 DTO。'
  },
  {
    id: 'Mega Union Type (巨型缝合类型)',
    level: 'WARNING',
    color: c.yellow,
    // 匹配在 type 定义或参数定义中，包含 3 个及以上的 | 符号的类型声明
    regex: /(?:type\s+[A-Za-z0-9_]+\s*=\s*|:\s*)(?:[A-Za-z0-9_<>\[\]'"\s]+\|\s*){3,}[A-Za-z0-9_<>\[\]'"\s]+/g,
    desc: '过度泛化的接口。建议使用区分化联合类型 (Discriminated Unions) 或拆分函数。'
  }
];

// --- 核心逻辑 ---
let totalIssues = 0;
let filesWithIssues = 0;

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    if (IGNORE_DIRS.includes(file)) continue;
    
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);

    if (stat.isDirectory()) {
      walkDir(filepath, callback);
    } else if (stat.isFile() && TARGET_EXTS.includes(path.extname(filepath))) {
      callback(filepath);
    }
  }
}

function analyzeFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  let fileHasIssue = false;
  const fileIssues = [];

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    // 简单跳过单行注释
    if (line.trim().startsWith('//')) return;

    SMELLS.forEach(smell => {
      // 克隆正则以重置 lastIndex
      const regex = new RegExp(smell.regex.source, smell.regex.flags);
      let match;
      while ((match = regex.exec(line)) !== null) {
        fileHasIssue = true;
        totalIssues++;
        fileIssues.push({
          lineNum,
          matchStr: match[0].trim(),
          lineStr: line.trim(),
          smell
        });
      }
    });
  });

  if (fileHasIssue) {
    filesWithIssues++;
    console.log(`\n📄 ${c.cyan}${c.bold}${filepath}${c.reset}`);
    fileIssues.forEach(issue => {
      console.log(`   ${c.gray}Line ${issue.lineNum.toString().padEnd(4)}${c.reset} | [${issue.smell.color}${issue.smell.level}${c.reset}] ${c.bold}${issue.smell.id}${c.reset}`);
      console.log(`             ${c.gray}Code: ${c.reset}${issue.lineStr}`);
      console.log(`             ${c.gray}Hint: ${c.reset}${issue.smell.desc}`);
    });
  }
}

// --- 执行与输出 ---
console.log(`${c.bold}🚀 开始扫描 TypeScript 架构“坏味道”...${c.reset}`);
console.log(`${c.gray}扫描目录: ./${TARGET_DIR}${c.reset}`);

const startTime = Date.now();
walkDir(TARGET_DIR, analyzeFile);
const timeTaken = Date.now() - startTime;

console.log('\n' + '='.repeat(50));
if (totalIssues > 0) {
  console.log(`⚠️  ${c.yellow}扫描完成！发现 ${c.bold}${totalIssues}${c.reset}${c.yellow} 处坏味道，分布在 ${c.bold}${filesWithIssues}${c.reset}${c.yellow} 个文件中。${c.reset}`);
  console.log(`⏱  耗时: ${timeTaken}ms`);
  console.log(`\n💡 ${c.cyan}建议：不要试图用一个接口“统治”所有业务。允许适度的代码重复（Duplication），消除为了合并而合并的错误抽象。${c.reset}`);
  
  // 如果遇到 ERROR 级别的，可以以非 0 状态退出，拦截 CI/CD
  const hasError = true; // 此处简化，实际可根据 issues 详细统计
  process.exit(1); 
} else {
  console.log(`✅  ${c.cyan}太棒了！没有发现明显的类型系统坏味道。${c.reset}`);
  console.log(`⏱  耗时: ${timeTaken}ms`);
  process.exit(0);
}
