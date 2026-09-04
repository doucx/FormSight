const fs = require('node:fs');
const path = require('node:path');

const cardsDir = path.join(__dirname, '../src/cards');

// 核心正则：匹配包含至少两层 `../../` 且指向宿主系统目录的 import 语句
// 这样可以 100% 避开卡片内部的引用 (如 `../types`, `./utils`)
const importRegex =
  /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]((\.\.\/){2,}(?:core|components|utils|types|storage|hooks)(?:\/[^'"]*)?)['"];?/g;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  const sdkImports = new Set();

  let match;
  // 1. 遍历收集所有符合条件的宿主导入符号
  while ((match = importRegex.exec(content)) !== null) {
    hasChanges = true;
    const identifiersStr = match[1];
    const idents = identifiersStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    idents.forEach((id) => sdkImports.add(id));
  }

  if (!hasChanges) return;

  // 2. 将原文件中匹配到的旧 import 语句完整擦除（不影响中间穿插的业务代码）
  content = content.replace(importRegex, '');

  // 3. 将收集到的标识符格式化为新的 SDK 导入语句
  if (sdkImports.size > 0) {
    const sortedImports = Array.from(sdkImports).sort((a, b) => {
      // 将带有 type 前缀的放在后面，普通变量放前面，增强可读性
      const aIsType = a.startsWith('type ');
      const bIsType = b.startsWith('type ');
      if (aIsType !== bIsType) return aIsType ? 1 : -1;
      return a.localeCompare(b);
    });

    let newImportStatement = '';
    if (sortedImports.length > 3) {
      newImportStatement = `import {\n  ${sortedImports.join(',\n  ')}\n} from '@formsight/card-sdk';\n`;
    } else {
      newImportStatement = `import { ${sortedImports.join(', ')} } from '@formsight/card-sdk';\n`;
    }

    // 4. 将新的 import 语句插入到文件最上方（紧随第三方库如 lucide-preact / preact/hooks 之后）
    const lines = content.split('\n');
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() !== '' && !lines[i].startsWith('//')) {
        if (insertIndex === 0) insertIndex = i;
        break;
      }
    }

    lines.splice(insertIndex, 0, newImportStatement.trim());
    content = lines.join('\n');

    // 清理由于删除操作遗留的多余空行
    content = content.replace(/\n{3,}/g, '\n\n');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Migrated]: ${filePath.split('/src/')[1]}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

console.log('--- 开始合并卡片层的宿主环境引用至 Card SDK ---');
walkDir(cardsDir);
console.log('--- 迁移完成 ---');
