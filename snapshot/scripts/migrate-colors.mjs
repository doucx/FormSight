import fs from 'node:fs';
import path from 'node:path';

// 递归获取目录下所有匹配文件
function getFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFiles(fullPath));
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

// 语义 Token 批量映射规则表
const REPLACEMENTS = [
  // 1. 背景色与卡片容器
  [/\bbg-white\s+dark:bg-slate-900\b/g, 'bg-card'],
  [/\bbg-white\/95\s+dark:bg-slate-900\/95\b/g, 'bg-card/95'],
  [/\bbg-white\/80\s+dark:bg-slate-800\/60\b/g, 'bg-card/80'],
  [/\bbg-slate-50\s+dark:bg-slate-800\/60\b/g, 'bg-muted/60'],
  [/\bbg-slate-50\s+dark:bg-slate-800\/80\b/g, 'bg-muted/80'],
  [/\bbg-slate-50\s+dark:bg-slate-800\b/g, 'bg-muted'],
  [/\bbg-slate-50\/50\s+dark:bg-slate-800\/40\b/g, 'bg-muted/40'],
  [/\bbg-slate-50\/70\s+dark:bg-slate-800\/60\b/g, 'bg-muted/60'],
  [/\bbg-slate-50\/80\s+dark:bg-slate-800\/80\b/g, 'bg-muted/80'],
  [/\bbg-slate-50\/60\s+dark:bg-slate-800\/40\b/g, 'bg-muted/40'],
  [/\bbg-slate-100\s+dark:bg-slate-800\b/g, 'bg-muted'],
  [/\bbg-slate-100\/90\s+dark:bg-slate-800\b/g, 'bg-muted'],
  [/\bbg-slate-200\s+dark:bg-slate-700\b/g, 'bg-border'],
  [/\bbg-slate-200\/80\s+dark:bg-slate-900\/80\b/g, 'bg-muted'],
  [/\bhover:bg-slate-100\s+dark:hover:bg-slate-800\b/g, 'hover:bg-accent'],
  [/\bhover:bg-slate-50\s+dark:hover:bg-slate-800\b/g, 'hover:bg-accent'],
  [/\bhover:bg-slate-50\s+dark:hover:bg-slate-700\b/g, 'hover:bg-accent'],
  [/\bhover:bg-slate-50\s+dark:hover:bg-slate-800\/60\b/g, 'hover:bg-accent'],
  [/\bhover:bg-slate-100\s+dark:hover:bg-slate-700\b/g, 'hover:bg-accent'],
  [/\bhover:bg-slate-200\s+dark:hover:bg-slate-700\b/g, 'hover:bg-muted/80'],

  // 2. 边框 (Borders)
  [/\bborder-slate-200(?:\/80|\/90)?\s+dark:border-slate-800(?:\/80|\/60)?\b/g, 'border-border'],
  [/\bborder-slate-200(?:\/80|\/90)?\s+dark:border-slate-700(?:\/80|\/60)?\b/g, 'border-border'],
  [/\bborder-slate-200\s+dark:border-slate-800\b/g, 'border-border'],
  [/\bborder-slate-200\s+dark:border-slate-700\b/g, 'border-border'],
  [/\bborder-slate-200\/60\s+dark:border-slate-700\/60\b/g, 'border-border/60'],
  [/\bborder-slate-100\s+dark:border-slate-800\b/g, 'border-border/60'],
  [/\bborder-slate-100\s+dark:border-slate-700(?:\/60)?\b/g, 'border-border/60'],
  [/\bborder-gray-200\/80\s+dark:border-slate-800\b/g, 'border-border'],
  [/\bborder-gray-100\s+dark:border-slate-800\b/g, 'border-border'],

  // 3. 文字色彩 (Text Colors)
  [/\btext-slate-900\s+dark:text-slate-100\b/g, 'text-foreground'],
  [/\btext-slate-800\s+dark:text-slate-100\b/g, 'text-foreground'],
  [/\btext-slate-800\s+dark:text-slate-200\b/g, 'text-foreground'],
  [/\btext-slate-700\s+dark:text-slate-200\b/g, 'text-foreground'],
  [/\btext-slate-700\s+dark:text-slate-300\b/g, 'text-foreground'],
  [/\btext-slate-600\s+dark:text-slate-300\b/g, 'text-muted-foreground'],
  [/\btext-slate-600\s+dark:text-slate-400\b/g, 'text-muted-foreground'],
  [/\btext-slate-500\s+dark:text-slate-400\b/g, 'text-muted-foreground'],
  [/\btext-slate-400\s+dark:text-slate-500\b/g, 'text-muted-foreground'],
  [/\bhover:text-slate-900\s+dark:hover:text-slate-100\b/g, 'hover:text-foreground'],
  [/\bhover:text-slate-900\s+dark:hover:text-slate-200\b/g, 'hover:text-foreground'],
  [/\bhover:text-slate-700\s+dark:hover:text-slate-200\b/g, 'hover:text-foreground'],
  [/\bhover:text-slate-600\s+dark:hover:text-slate-200\b/g, 'hover:text-foreground'],
  [/\bplaceholder:text-slate-400\s+dark:placeholder:text-slate-500\b/g, 'placeholder:text-muted-foreground'],

  // 4. 品牌与强调色 (Primary / Accent / Indigo)
  [/\bbg-indigo-50\s+dark:bg-indigo-950\/60\b/g, 'bg-accent'],
  [/\bbg-indigo-50\s+dark:bg-indigo-950\b/g, 'bg-accent'],
  [/\btext-indigo-600\s+dark:text-indigo-400\b/g, 'text-primary'],
  [/\btext-indigo-700\s+dark:text-indigo-300\b/g, 'text-primary'],
  [/\bhover:text-indigo-600\s+dark:hover:text-indigo-400\b/g, 'hover:text-primary'],
  [/\bhover:bg-indigo-50\s+dark:hover:bg-indigo-950\b/g, 'hover:bg-accent'],
  [/\bhover:bg-indigo-50\/60\s+dark:hover:bg-indigo-950\/40\b/g, 'hover:bg-accent/60'],
  [/\bhover:bg-indigo-50\/30\s+dark:hover:bg-indigo-950\/30\b/g, 'hover:bg-accent/30'],
  [/\bhover:border-indigo-300\s+dark:hover:border-indigo-500\b/g, 'hover:border-primary/60'],
];

// 需要排除的文件 (避免修改基础定义文件)
const EXCLUDED_FILES = new Set([
  path.resolve('src/utils/theme.ts'),
  path.resolve('src/utils/cn.ts'),
  path.resolve('src/components/ui/button.tsx'),
  path.resolve('src/components/ui/card.tsx'),
  path.resolve('src/components/ui/badge.tsx'),
]);

const srcDir = path.resolve('src');
const allFiles = getFiles(srcDir);

let modifiedCount = 0;

for (const file of allFiles) {
  if (EXCLUDED_FILES.has(file)) continue;

  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  for (const [regex, replacement] of REPLACEMENTS) {
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`[Cleaned] ${path.relative(process.cwd(), file)}`);
    modifiedCount++;
  }
}

console.log(`\n🎉 Refactoring Complete: Cleaned ${modifiedCount} files.`);