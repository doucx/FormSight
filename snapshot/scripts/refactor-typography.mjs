import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve('src');
const EXTENSIONS = new Set(['.tsx', '.ts', '.css']);

// 替换规则映射列表 (按优先级自上而下匹配)
const REPLACEMENTS = [
  // 1. 响应式复合字阶规则
  {
    pattern: /\btext-\[10px\]\s+sm:text-\[11px\]\b/g,
    replacement: 'text-xs sm:text-sm',
    label: 'text-[10px] sm:text-[11px] -> text-xs sm:text-sm',
  },
  {
    pattern: /\btext-\[10px\]\s+sm:text-xs\b/g,
    replacement: 'text-xs sm:text-sm',
    label: 'text-[10px] sm:text-xs -> text-xs sm:text-sm',
  },
  {
    pattern: /\btext-\[11px\]\s+sm:text-xs\b/g,
    replacement: 'text-xs sm:text-sm',
    label: 'text-[11px] sm:text-xs -> text-xs sm:text-sm',
  },
  // 2. 独立微小字号规则收敛至 text-xs (12px)
  {
    pattern: /\btext-\[9px\]\b/g,
    replacement: 'text-xs',
    label: 'text-[9px] -> text-xs',
  },
  {
    pattern: /\btext-\[10px\]\b/g,
    replacement: 'text-xs',
    label: 'text-[10px] -> text-xs',
  },
  {
    pattern: /\btext-\[11px\]\b/g,
    replacement: 'text-xs',
    label: 'text-[11px] -> text-xs',
  },
];

function walkDirectory(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDirectory(fullPath, fileList);
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function runRefactor() {
  console.log('🚀 开始扫描并重构 src/ 目录中的字阶排版...');
  const files = walkDirectory(SRC_DIR);

  let totalChangedFiles = 0;
  let totalReplacements = 0;
  const statsByRule = new Map();

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let fileChanged = false;
    let fileReplacementCount = 0;

    for (const rule of REPLACEMENTS) {
      const matchCount = (content.match(rule.pattern) || []).length;
      if (matchCount > 0) {
        content = content.replace(rule.pattern, rule.replacement);
        fileChanged = true;
        fileReplacementCount += matchCount;
        statsByRule.set(rule.label, (statsByRule.get(rule.label) || 0) + matchCount);
      }
    }

    if (fileChanged) {
      fs.writeFileSync(file, content, 'utf8');
      totalChangedFiles++;
      totalReplacements += fileReplacementCount;
      const relativePath = path.relative(process.cwd(), file);
      console.log(`  ✓ 已重构: ${relativePath} (${fileReplacementCount} 处变更)`);
    }
  }

  console.log('\n================ 重构统计报告 ================');
  console.log(`共扫描文件数: ${files.length}`);
  console.log(`已修改文件数: ${totalChangedFiles}`);
  console.log(`总替换命中数: ${totalReplacements}`);
  console.log('规则明细:');
  for (const [label, count] of statsByRule.entries()) {
    console.log(`  - ${label}: ${count} 次`);
  }
  console.log('==============================================\n');
}

runRefactor();