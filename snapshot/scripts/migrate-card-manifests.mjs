import fs from 'node:fs';
import path from 'node:path';

function extractProperty(source, propName) {
  const regex = new RegExp(`(^|\\n)([ \\t]*)${propName}\\s*:\\s*`, 'm');
  const match = regex.exec(source);
  if (!match) return null;
  const startIndex = match.index + match[1].length;
  const valueStartIndex = match.index + match[0].length;
  const indent = match[2];

  let i = valueStartIndex;
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let inString = false;
  let stringChar = '';

  while (i < source.length) {
    const ch = source[i];
    const prev = source[i - 1];

    if (inString) {
      if (ch === stringChar && prev !== '\\') {
        inString = false;
      }
    } else {
      if (ch === '"' || ch === "'" || ch === '`') {
        inString = true;
        stringChar = ch;
      } else if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth--;
      else if (ch === '{') braceDepth++;
      else if (ch === '}') {
        if (braceDepth === 0 && parenDepth === 0 && bracketDepth === 0) {
          break;
        }
        braceDepth--;
      } else if (ch === '[') bracketDepth++;
      else if (ch === ']') bracketDepth--;
      else if (ch === ',' && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
        i++;
        break;
      }
    }
    i++;
  }

  let endIndex = i;
  if (source[endIndex] === '\n') endIndex++;

  const rawValue = source.slice(valueStartIndex, i).trim().replace(/,\s*$/, '');

  return {
    startIndex,
    endIndex,
    indent,
    rawValue,
  };
}

const cardsDir = path.resolve('src/cards');
const cardDirs = fs
  .readdirSync(cardsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let migratedCount = 0;

for (const cardName of cardDirs) {
  const indexPath = path.join(cardsDir, cardName, 'index.tsx');
  if (!fs.existsSync(indexPath)) continue;

  let content = fs.readFileSync(indexPath, 'utf-8');

  // 如果已经包含 engine: 和 ui:，跳过
  if (content.includes('engine:') && content.includes('ui:')) {
    console.log(`[SKIP] Already migrated: ${cardName}`);
    continue;
  }

  const iconProp = extractProperty(content, 'icon');
  const renderSettingsProp = extractProperty(content, 'renderSettings');
  const trainingProp = extractProperty(content, 'training');

  if (!iconProp || !trainingProp) {
    console.warn(`[WARN] Missing icon or training in: ${cardName}`);
    continue;
  }

  // 从 training 中抽离 renderCanvas
  const trainingVal = trainingProp.rawValue; // "{ ... }"
  if (!trainingVal.startsWith('{') || !trainingVal.endsWith('}')) {
    console.warn(`[WARN] Unexpected training value structure in: ${cardName}`);
    continue;
  }

  const innerTraining = trainingVal.slice(1, -1);
  const renderCanvasProp = extractProperty(innerTraining, 'renderCanvas');

  if (!renderCanvasProp) {
    console.warn(`[WARN] Missing renderCanvas inside training in: ${cardName}`);
    continue;
  }

  const remainingInner = (
    innerTraining.slice(0, renderCanvasProp.startIndex) +
    innerTraining.slice(renderCanvasProp.endIndex)
  ).trim();

  // 格式化 engine 内容
  const baseIndent = trainingProp.indent;
  const engineBlock = `${baseIndent}engine: {\n${remainingInner
    .split('\n')
    .map((line) => (line.trim() ? line : ''))
    .join('\n')}\n${baseIndent}},`;

  // 格式化 ui 内容
  const innerIndent = `${baseIndent}  `;
  const uiItems = [];
  uiItems.push(`${innerIndent}icon: ${iconProp.rawValue},`);
  if (renderSettingsProp) {
    uiItems.push(`${innerIndent}renderSettings: ${renderSettingsProp.rawValue},`);
  }
  uiItems.push(`${innerIndent}renderCanvas: ${renderCanvasProp.rawValue},`);

  const uiBlock = `${baseIndent}ui: {\n${uiItems.join('\n')}\n${baseIndent}},`;

  // 倒序替换源文件，确保前面的 offset 不被改动
  const replacements = [];
  replacements.push({
    start: iconProp.startIndex,
    end: iconProp.endIndex,
    replacement: '',
  });

  if (renderSettingsProp) {
    replacements.push({
      start: renderSettingsProp.startIndex,
      end: renderSettingsProp.endIndex,
      replacement: '',
    });
  }

  replacements.push({
    start: trainingProp.startIndex,
    end: trainingProp.endIndex,
    replacement: `${engineBlock}\n${uiBlock}\n`,
  });

  replacements.sort((a, b) => b.start - a.start);

  for (const rep of replacements) {
    content = content.slice(0, rep.start) + rep.replacement + content.slice(rep.end);
  }

  // 清理多余连续空行
  content = content.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(indexPath, content, 'utf-8');
  console.log(`[OK] Successfully migrated: ${cardName}`);
  migratedCount++;
}

console.log(`\nMigration completed: ${migratedCount} cards processed.`);
