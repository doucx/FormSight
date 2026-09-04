import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

function flattenObject(obj, prefix = '') {
  let result = {};
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

const vGlobalZh = {};
const vGlobalEn = {};

const globalZhPath = path.join(SRC_DIR, 'locales', 'zh-CN.json');
const globalEnPath = path.join(SRC_DIR, 'locales', 'en-US.json');

if (fs.existsSync(globalZhPath)) {
  Object.assign(vGlobalZh, flattenObject(JSON.parse(fs.readFileSync(globalZhPath, 'utf8'))));
}
if (fs.existsSync(globalEnPath)) {
  Object.assign(vGlobalEn, flattenObject(JSON.parse(fs.readFileSync(globalEnPath, 'utf8'))));
}

const cardsDir = path.join(SRC_DIR, 'cards');
if (fs.existsSync(cardsDir)) {
  const cardDirs = fs.readdirSync(cardsDir).filter(d => fs.statSync(path.join(cardsDir, d)).isDirectory());
  for (const cardId of cardDirs) {
    const zhPath = path.join(cardsDir, cardId, 'locales', 'zh-CN.json');
    if (fs.existsSync(zhPath)) {
      const flat = flattenObject(JSON.parse(fs.readFileSync(zhPath, 'utf8')));
      for (const [k, v] of Object.entries(flat)) vGlobalZh[`cards.${cardId}.${k}`] = v;
    }
    const enPath = path.join(cardsDir, cardId, 'locales', 'en-US.json');
    if (fs.existsSync(enPath)) {
      const flat = flattenObject(JSON.parse(fs.readFileSync(enPath, 'utf8')));
      for (const [k, v] of Object.entries(flat)) vGlobalEn[`cards.${cardId}.${k}`] = v;
    }
  }
}

// 移除了 'settings.'，因为卡片内的 settings 是局部嵌套键
const EXPLICIT_GLOBAL_PREFIXES = [
  'cards.', 'common.', 'global.', 'tags.', 'nav.', 'stats.', 'plan.', 'home.', 'shell.', 'summary.', 'analyticsModal.', 'settingsModal.', 'templates.'
];

function isExplicitGlobal(key) {
  return EXPLICIT_GLOBAL_PREFIXES.some(prefix => key.startsWith(prefix));
}

function checkKeyExists(key, cardId, vGlobal) {
  if (cardId && !isExplicitGlobal(key)) {
    const cardKey = `cards.${cardId}.${key.replace(/^\./, '')}`;
    if (vGlobal.hasOwnProperty(cardKey)) return true;
  }
  return vGlobal.hasOwnProperty(key);
}

const missingKeys = [];
const recordedUsages = new Set();

function addMissing(filepath, key, cardId) {
  const zhExists = checkKeyExists(key, cardId, vGlobalZh);
  const enExists = checkKeyExists(key, cardId, vGlobalEn);

  if (!zhExists || !enExists) {
    const uniqueId = `${filepath}:${cardId || 'global'}:${key}`;
    if (!recordedUsages.has(uniqueId)) {
      recordedUsages.add(uniqueId);
      missingKeys.push({
        filepath,
        key,
        zhMissing: !zhExists,
        enMissing: !enExists,
        cardId
      });
    }
  }
}

function scanSourceFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const T_CALL_REGEX = /(?:(?<![a-zA-Z0-9_$])(?:t|cardT|commonT)|i18n\.t)\s*\(\s*(['"`])(.*?)\1/g;
  
  const relativePath = path.relative(SRC_DIR, filepath);
  let cardId = null;
  const matchCard = relativePath.match(/^cards[\\/]([^\\/]+)[\\/]/);
  if (matchCard) {
    cardId = matchCard[1];
  }

  let match;
  while ((match = T_CALL_REGEX.exec(content)) !== null) {
    const key = match[2];
    if (key.includes('${') || !key.trim()) continue;
    addMissing(relativePath, key, cardId);
  }
}

function extractSchemaKeys(content) {
  const keys = [];
  const titleMatches = content.matchAll(/title:\s*(['"])([^'"]+)\1/g);
  for (const m of titleMatches) keys.push(m[2]);

  const descMatches = content.matchAll(/description:\s*(['"])([^'"]+)\1/g);
  for (const m of descMatches) keys.push(m[2]);

  const labelMatches = content.matchAll(/label:\s*(['"])([^'"]+)\1/g);
  for (const m of labelMatches) keys.push(m[2]);

  const constArrayMatches = content.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*\[([\s\S]*?)\]/g);
  for (const m of constArrayMatches) {
    const arrayContent = m[2];
    const stringMatches = arrayContent.matchAll(/(['"])([^'"]+)\1/g);
    for (const sm of stringMatches) {
      keys.push(sm[2]);
    }
  }
  return keys;
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

      const relativePath = path.relative(SRC_DIR, filepath);
      const matchCard = relativePath.match(/^cards[\\/]([^\\/]+)[\\/]index\.tsx?$/);
      if (matchCard) {
        const cardId = matchCard[1];
        const content = fs.readFileSync(filepath, 'utf8');
        const schemaKeys = extractSchemaKeys(content);
        for (const sk of schemaKeys) {
          if (sk.includes('${') || !sk.trim()) continue;
          addMissing(relativePath, sk, cardId);
        }
      }
    }
  }
}

console.log('🔍 Scanning codebase for i18n key usages and card configuration schemas...');
walkDir(SRC_DIR);

if (missingKeys.length > 0) {
  console.log('\n❌ Found missing i18n keys:\n');
  
  const byFile = {};
  for (const m of missingKeys) {
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
  
  console.log(`Total missing usages found: ${missingKeys.length}`);
  process.exit(1);
} else {
  console.log('✅ All statically analyzable i18n keys and card schemas are correctly defined in locale files.');
  process.exit(0);
}
