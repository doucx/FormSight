import fs from 'node:fs';
import path from 'node:path';

const CARDS_DIR = path.resolve('src/cards');
const SDK_MODULE = '@formsight/card-sdk';

/**
 * 判断 importPath 是否跨出了卡片自身目录并指向了宿主内部实现
 */
function isHostImportPath(importPath) {
  // 匹配指向宿主内部系统的相对路径
  if (
    importPath.includes('/core/') ||
    importPath.includes('/utils/') ||
    importPath.includes('/components/') ||
    importPath.includes('/storage/') ||
    importPath.includes('/hooks/')
  ) {
    return true;
  }

  // 匹配指向全局 src/types 的相对路径 (至少两个 ../，排除卡片私有的 ./types 与 ../types)
  if (/^\.\.\/(\.\.\/)+types(\.ts)?$/.test(importPath)) {
    return true;
  }

  return false;
}

/**
 * 递归收集指定目录下的所有 .ts / .tsx 文件
 */
function getFilesRecursively(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * 处理单文件内容，将宿主相对引用转换为 SDK 引用
 */
function transformFileContent(content) {
  // 匹配所有形如 import ... from '...'; 的语句 (支持多行)
  const importRegex = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?/g;

  const valueSpecifiers = new Set();
  const typeSpecifiers = new Set();
  const retainedImportStatements = [];

  let lastIndex = 0;
  let match;
  let modified = false;

  // 逐个匹配文件顶部的 import
  while ((match = importRegex.exec(content)) !== null) {
    const fullStatement = match[0];
    const rawClause = match[1].trim();
    const sourcePath = match[2].trim();

    if (isHostImportPath(sourcePath)) {
      modified = true;
      const isWholeStatementType = rawClause.startsWith('type ');
      const innerClause = isWholeStatementType ? rawClause.slice(5).trim() : rawClause;

      // 提取大括号中的命名导出项
      const braceMatch = innerClause.match(/^\{([\s\S]*)\}$/);
      if (braceMatch) {
        const items = braceMatch[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        for (const item of items) {
          if (isWholeStatementType) {
            typeSpecifiers.add(item.replace(/^type\s+/, ''));
          } else if (item.startsWith('type ')) {
            typeSpecifiers.add(item.replace(/^type\s+/, '').trim());
          } else {
            valueSpecifiers.add(item);
          }
        }
      }
    } else {
      retainedImportStatements.push({
        start: match.index,
        end: importRegex.lastIndex,
        raw: fullStatement,
      });
    }

    lastIndex = importRegex.lastIndex;
  }

  if (!modified) {
    return null; // 无需更改
  }

  // 截取所有 import 语句之后的代码主体
  const bodyCode = content.slice(lastIndex).trimStart();

  // 构建新 import 语句列表
  const newSdkStatements = [];

  if (valueSpecifiers.size > 0) {
    const sortedValues = Array.from(valueSpecifiers).sort();
    if (sortedValues.length > 3) {
      newSdkStatements.push(
        `import {\n  ${sortedValues.join(',\n  ')},\n} from '${SDK_MODULE}';`,
      );
    } else {
      newSdkStatements.push(`import { ${sortedValues.join(', ')} } from '${SDK_MODULE}';`);
    }
  }

  if (typeSpecifiers.size > 0) {
    const sortedTypes = Array.from(typeSpecifiers).sort();
    if (sortedTypes.length > 3) {
      newSdkStatements.push(
        `import type {\n  ${sortedTypes.join(',\n  ')},\n} from '${SDK_MODULE}';`,
      );
    } else {
      newSdkStatements.push(`import type { ${sortedTypes.join(', ')} } from '${SDK_MODULE}';`);
    }
  }

  // 保留的其它 import
  const otherImports = retainedImportStatements.map((s) => s.raw).join('\n');

  const combinedHeader = [otherImports, newSdkStatements.join('\n')]
    .filter(Boolean)
    .join('\n');

  return `${combinedHeader}\n\n${bodyCode}`;
}

async function run() {
  console.log('🔍 开始扫描卡片文件:', CARDS_DIR);
  const files = getFilesRecursively(CARDS_DIR);
  console.log(`📑 找到 ${files.length} 个卡片源代码文件`);

  let transformedCount = 0;

  for (const file of files) {
    const originalContent = fs.readFileSync(file, 'utf-8');
    const transformed = transformFileContent(originalContent);

    if (transformed && transformed !== originalContent) {
      fs.writeFileSync(file, transformed, 'utf-8');
      transformedCount++;
      const relPath = path.relative(process.cwd(), file);
      console.log(`✅ 已重构: ${relPath}`);
    }
  }

  console.log(`\n🎉 重构完成！共计重构 ${transformedCount} 个文件。`);
}

run();