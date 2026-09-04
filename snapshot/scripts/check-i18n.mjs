import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('src');
const LOCALES_DIR = path.join(SRC_DIR, 'locales');
const CARDS_DIR = path.join(SRC_DIR, 'cards');

function loadJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Failed to parse JSON: ${filePath}`, e);
  }
  return {};
}

function getNestedValue(obj, pathStr) {
  const parts = pathStr.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr && typeof curr === 'object' && part in curr) {
      curr = curr[part];
    } else {
      return undefined;
    }
  }
  return curr;
}

// 1. 加载全局词典
const globalDicts = {
  'zh-CN': loadJson(path.join(LOCALES_DIR, 'zh-CN.json')),
  'en-US': loadJson(path.join(LOCALES_DIR, 'en-US.json'))
};

// 2. 自动扫描并挂载卡片私有词典至 cards.<cardId>
if (fs.existsSync(CARDS_DIR)) {
  const cardDirs = fs.readdirSync(CARDS_DIR);
  for (const cardId of cardDirs) {
    const cardLocalesDir = path.join(CARDS_DIR, cardId, 'locales');
    if (fs.existsSync(cardLocalesDir)) {
      for (const lang of ['zh-CN', 'en-US']) {
        const cardLocaleFile = path.join(cardLocalesDir, `${lang}.json`);
        if (fs.existsSync(cardLocaleFile)) {
          const cardDict = loadJson(cardLocaleFile);
          if (!globalDicts[lang].cards) {
            globalDicts[lang].cards = {};
          }
          globalDicts[lang].cards[cardId] = cardDict;
        }
      }
    }
  }
}

function keyExists(fullKey) {
  for (const lang of Object.keys(globalDicts)) {
    if (getNestedValue(globalDicts[lang], fullKey) !== undefined) {
      return true;
    }
  }
  return false;
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath, fileList);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const sourceFiles = walkDir(SRC_DIR);
const translationCallRegex = /\b(?:t|cardT|commonT)\(\s*['"]([^'"]+)['"]/g;

const explicitGlobalPrefixes = [
  'cards.', 'common.', 'global.', 'tags.', 'nav.', 'settings.',
  'stats.', 'plan.', 'home.', 'templates.', 'shell.', 'summary.',
  'analyticsModal.', 'settingsModal.'
];

let missingCount = 0;
const errors = [];

for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match;

  let cardId = null;
  const relPath = path.relative(SRC_DIR, file);
  const pathParts = relPath.split(path.sep);
  if (pathParts[0] === 'cards' && pathParts[1]) {
    cardId = pathParts[1];
  }

  while ((match = translationCallRegex.exec(content)) !== null) {
    const key = match[1];

    if (!key || key.includes('${') || key.includes('+')) continue;

    let keysToCheck = [];
    const hasExplicitPrefix = explicitGlobalPrefixes.some(prefix => key.startsWith(prefix));

    if (hasExplicitPrefix) {
      keysToCheck.push(key);
    } else if (cardId) {
      keysToCheck.push(`cards.${cardId}.${key}`);
      keysToCheck.push(key);
    } else {
      keysToCheck.push(key);
    }

    const found = keysToCheck.some(k => keyExists(k));

    if (!found) {
      missingCount++;
      errors.push({
        file: relPath,
        key,
        attempted: keysToCheck
      });
    }
  }
}

if (missingCount > 0) {
  console.error(`\n❌ i18n Check Failed: Found ${missingCount} missing translation key(s):\n`);
  for (const err of errors) {
    console.error(`  File: ${err.file}`);
    console.error(`    Key: "${err.key}"`);
    console.error(`    Checked: ${err.attempted.join(' OR ')}\n`);
  }
  process.exit(1);
} else {
  console.log('✨ i18n Check Passed: All translation keys have corresponding entries in locale dictionaries.');
  process.exit(0);
}