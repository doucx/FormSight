import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

const isFixMode = process.argv.includes('--fix') || process.argv.includes('--clean');

function flattenObject(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(result, flattenObject(v, key));
    } else {
      result[key] = v;
    }
  }
  return result;
}

// 1. 收集所有定义在 JSON 中的键及其来源文件路径
const definedKeysMap = new Map(); // fullKey -> { zh: boolean, en: boolean, files: { zh: string, en: string }, jsonPaths: { zh: string[], en: string[] } }

function registerDefinedJson(filePath, cardId = null) {
  if (!fs.existsSync(filePath)) return;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const flat = flattenObject(parsed);
    const isZh = filePath.includes('zh-CN.json');
    const langKey = isZh ? 'zh' : 'en';

    for (const [k] of Object.entries(flat)) {
      const fullKey = cardId && !k.startsWith('cards.') ? `cards.${cardId}.${k}` : k;
      
      // 记录嵌套路径数组，用于后续 --fix 自动删除
      const pathArray = cardId && !k.startsWith('cards.') ? [cardId, ...k.split('.')] : k.split('.');

      if (!definedKeysMap.has(fullKey)) {
        definedKeysMap.set(fullKey, {
          files: {},
          jsonPaths: {},
        });
      }
      const entry = definedKeysMap.get(fullKey);
      entry.files[langKey] = filePath;
      entry.jsonPaths[langKey] = pathArray;
    }
  } catch (err) {
    console.error(`⚠️ Failed to parse JSON file ${filePath}:`, err.message);
  }
}

// 加载全局语言包
registerDefinedJson(path.join(SRC_DIR, 'locales', 'zh-CN.json'));
registerDefinedJson(path.join(SRC_DIR, 'locales', 'en-US.json'));

// 加载各 Card 语言包
const cardsDir = path.join(SRC_DIR, 'cards');
const cardIdsList = [];
if (fs.existsSync(cardsDir)) {
  const cardDirs = fs
    .readdirSync(cardsDir)
    .filter((d) => fs.statSync(path.join(cardsDir, d)).isDirectory());
  
  for (const cardId of cardDirs) {
    cardIdsList.push(cardId);
    registerDefinedJson(path.join(cardsDir, cardId, 'locales', 'zh-CN.json'), cardId);
    registerDefinedJson(path.join(cardsDir, cardId, 'locales', 'en-US.json'), cardId);
  }
}

const EXPLICIT_GLOBAL_PREFIXES = [
  'cards.',
  'common.',
  'global.',
  'tags.',
  'nav.',
  'stats.',
  'plan.',
  'home.',
  'shell.',
  'summary.',
  'analyticsModal.',
  'settingsModal.',
  'templates.',
];

function isExplicitGlobal(key) {
  return EXPLICIT_GLOBAL_PREFIXES.some((prefix) => key.startsWith(prefix));
}

const usedKeys = new Set();
const missingUsages = [];
const recordedUsages = new Set();

function markUsed(key, cardId) {
  if (cardId && !isExplicitGlobal(key)) {
    const cardKey = `cards.${cardId}.${key.replace(/^\./, '')}`;
    usedKeys.add(cardKey);
  }
  usedKeys.add(key);
}

// 保护一些通过变量动态拼接访问的常用键（防止误判为未使用）
function protectDynamicUsages() {
  // 1. 卡片通用标题、描述、指引 (通过 getCardTitle / getCardDesc / TrainingShell 动态拼装访问)
  for (const cardId of cardIdsList) {
    usedKeys.add(`cards.${cardId}.title`);
    usedKeys.add(`cards.${cardId}.desc`);
    usedKeys.add(`cards.${cardId}.instruction`);
  }
  // 2. 标签、计划模板等
  for (const [fullKey] of definedKeysMap) {
    if (fullKey.startsWith('tags.') || fullKey.startsWith('templates.') || fullKey.includes('.sectors.')) {
      usedKeys.add(fullKey);
    }
  }
}

function scanSourceFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  // 匹配 t('...'), cardT('...'), commonT('...'), i18n.t('...')
  const T_CALL_REGEX = /(?:(?<![a-zA-Z0-9_$])(?:t|cardT|commonT)|i18n\.t)\s*\(\s*(['"`])(.*?)\1/g;

  const relativePath = path.relative(SRC_DIR, filepath);
  let cardId = null;
  const matchCard = relativePath.match(/^cards[\\/]([^\\/]+)[\\/]/);
  if (matchCard) {
    cardId = matchCard[1];
  }

  for (const match of content.matchAll(T_CALL_REGEX)) {
    const key = match[2];
    if (key.includes('${') || !key.trim()) continue;
    markUsed(key, cardId);

    // 检查是否存在
    const fullKey = cardId && !isExplicitGlobal(key) ? `cards.${cardId}.${key.replace(/^\./, '')}` : key;
    const zhExists = definedKeysMap.has(fullKey) && definedKeysMap.get(fullKey).files.zh;
    const enExists = definedKeysMap.has(fullKey) && definedKeysMap.get(fullKey).files.en;

    if (!zhExists || !enExists) {
      const uniqueId = `${filepath}:${cardId || 'global'}:${key}`;
      if (!recordedUsages.has(uniqueId)) {
        recordedUsages.add(uniqueId);
        missingUsages.push({
          filepath: relativePath,
          key,
          zhMissing: !zhExists,
          enMissing: !enExists,
          cardId,
        });
      }
    }
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walkDir(filepath);
    } else if (stat.isFile() && /\.(ts|tsx)$/.test(filepath)) {
      scanSourceFile(filepath);
    }
  }
}

console.log('🔍 Scanning codebase for i18n key usages...');
walkDir(SRC_DIR);
protectDynamicUsages();

// 计算未使用的键 (Unused Keys)
const unusedKeys = [];
for (const [fullKey, meta] of definedKeysMap) {
  if (!usedKeys.has(fullKey)) {
    unusedKeys.push({ fullKey, meta });
  }
}

// 辅助函数：从嵌套 JSON 对象中按路径删除属性并清理空对象
function removeNestedKey(obj, pathArr) {
  if (pathArr.length === 1) {
    delete obj[pathArr[0]];
    return;
  }
  const [head, ...tail] = pathArr;
  if (obj[head] && typeof obj[head] === 'object') {
    removeNestedKey(obj[head], tail);
    if (Object.keys(obj[head]).length === 0) {
      delete obj[head];
    }
  }
}

let hasError = false;

// 1. 打印缺失的键 (Missing Keys)
if (missingUsages.length > 0) {
  hasError = true;
  console.log('\n❌ Found missing i18n keys (Used in code, but missing in JSON):\n');
  const byFile = {};
  for (const m of missingUsages) {
    if (!byFile[m.filepath]) byFile[m.filepath] = [];
    byFile[m.filepath].push(m);
  }
  for (const [file, keys] of Object.entries(byFile)) {
    console.log(`📄 ${file}`);
    for (const m of keys) {
      const langs = [];
      if (m.zhMissing) langs.push('zh-CN');
      if (m.enMissing) langs.push('en-US');
      console.log(`   - "${m.key}" (Missing in: ${langs.join(', ')})`);
    }
    console.log('');
  }
}

// 2. 打印未使用的键 (Unused Keys)
if (unusedKeys.length > 0) {
  console.log(`\n⚠️ Found ${unusedKeys.length} unused i18n keys (Defined in JSON, but never used in code):\n`);
  
  const unusedByFile = {};
  for (const { fullKey, meta } of unusedKeys) {
    for (const [lang, filePath] of Object.entries(meta.files)) {
      if (!unusedByFile[filePath]) unusedByFile[filePath] = [];
      unusedByFile[filePath].push({ fullKey, lang });
    }
  }

  for (const [filePath, items] of Object.entries(unusedByFile)) {
    const relPath = path.relative(ROOT_DIR, filePath);
    console.log(`📄 ${relPath}`);
    for (const item of items) {
      console.log(`   - "${item.fullKey}"`);
    }
    console.log('');
  }

  if (isFixMode) {
    console.log('🧹 Cleaning up unused keys from JSON files...');
    const fileEdits = new Map(); // filePath -> Set of jsonPaths

    for (const { meta } of unusedKeys) {
      for (const [lang, filePath] of Object.entries(meta.files)) {
        const jsonPath = meta.jsonPaths[lang];
        if (!jsonPath) continue;
        if (!fileEdits.has(filePath)) fileEdits.set(filePath, []);
        fileEdits.get(filePath).push(jsonPath);
      }
    }

    for (const [filePath, pathsToRemove] of fileEdits) {
      if (!fs.existsSync(filePath)) continue;
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);

      for (const pArr of pathsToRemove) {
        removeNestedKey(parsed, pArr);
      }

      fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
      console.log(`   ✨ Updated: ${path.relative(ROOT_DIR, filePath)}`);
    }
    console.log('✅ Cleanup completed successfully!');
  } else {
    console.log('💡 Tip: Run `node scripts/check-i18n.mjs --fix` (or `--clean`) to automatically remove these unused keys.');
  }
}

if (hasError) {
  process.exit(1);
} else {
  console.log('\n✅ i18n check passed successfully.');
  process.exit(0);
}
