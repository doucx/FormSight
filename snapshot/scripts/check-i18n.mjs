import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// 1. JSON 键值展平工具，支持数组处理 (例如 heatmapMonths)
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

// 2. 加载并挂载虚拟全量字典 (vGlobalZh / vGlobalEn)
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

// 3. 代码扫码逻辑：精细区分“显式全局”与“相对私有”
const EXPLICIT_GLOBAL_PREFIXES = [
  'cards.', 'common.', 'global.', 'tags.', 'nav.', 'settings.', 'stats.', 'plan.', 'home.', 'shell.', 'summary.', 'analyticsModal.', 'settingsModal.', 'templates.'
];

function isExplicitGlobal(key) {
  return EXPLICIT_GLOBAL_PREFIXES.some(prefix => key.startsWith(prefix));
}

function checkKeyExists(key, cardId, vGlobal) {
  // 如果此文件属于某个 Card 且其不含有全局显式前缀，尝试将其作为该卡片私有 Key 查询
  if (cardId && !isExplicitGlobal(key)) {
    const cardKey = `cards.${cardId}.${key.replace(/^\./, '')}`;
    if (vGlobal.hasOwnProperty(cardKey)) return true;
  }
  // 回退或直查全局
  return vGlobal.hasOwnProperty(key);
}

const missingKeys = [];

function scanFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  // 匹配形式：t('xxx') / cardT("xxx") / commonT(`xxx`) / i18n.t('xxx')
  const T_CALL_REGEX = /(?:(?<![a-zA-Z0-9_$])(?:t|cardT|commonT)|i18n\.t)\s*\(\s*(['"`])(.*?)\1/g;
  
  let match;
  
  // 探明所处的卡片作用域：例如 src/cards/star_single/... -> star_single
  const relativePath = path.relative(SRC_DIR, filepath);
  let cardId = null;
  const matchCard = relativePath.match(/^cards[\\/]([^\\/]+)[\\/]/);
  if (matchCard) {
    cardId = matchCard[1];
  }

  while ((match = T_CALL_REGEX.exec(content)) !== null) {
    const key = match[2];
    // 忽略动态模板插值 `${...}`
    if (key.includes('${') || !key.trim()) continue; 
    
    const zhExists = checkKeyExists(key, cardId, vGlobalZh);
    const enExists = checkKeyExists(key, cardId, vGlobalEn);
    
    if (!zhExists || !enExists) {
      missingKeys.push({
        filepath: relativePath,
        key,
        zhMissing: !zhExists,
        enMissing: !enExists,
        cardId
      });
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
      scanFile(filepath);
    }
  }
}

console.log('🔍 Scanning codebase for i18n key usages...');
walkDir(SRC_DIR);

// 4. 分析报告与退出
if (missingKeys.length > 0) {
  console.log('\n❌ Found missing i18n keys:\n');
  
  const byFile = {};
  for (const m of missingKeys) {
    if (!byFile[m.filepath]) byFile[m.filepath] = [];
    // 基础去重
    if (!byFile[m.filepath].some(x => x.key === m.key)) {
      byFile[m.filepath].push(m);
    }
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
  console.log('✅ All statically analyzable i18n keys are correctly defined in locale files.');
  process.exit(0);
}
