## [WIP] refactor(dx): 简化 check-i18n.mjs 静态检查脚本，彻底移除已废弃的 Schema 解析逻辑

### 错误分析

随着 Phase 1 到 Phase 4 的彻底重构，FormSight 中基于 JSON Schema 的动态设置引擎（`settingSchemas`）及其特异性属性解析已被完全废弃，转而采用直觉的“配置即组件 (Configuration by Component)”自治方案。
然而，旧的 `scripts/check-i18n.mjs` 中仍然保留了专门用于扫描 Schema 内部 `title`、`description` 等字段的 `extractSchemaKeys` 逻辑。这不仅是无用的死代码，也造成了不必要的维护开销。

### 用户需求

按照路线图 Phase 5 的指示，大幅简化 `scripts/check-i18n.mjs`。使其回归纯粹的 TSX/TS 组件源码正则扫描 (`t(...)`)，彻底消除“配置即代码”残留的静态检查盲区与冗余逻辑。

### 评论

这是实施系统性架构演进的收官之笔。当过度工程的抽象层被剥离后，周边的工具链（如 i18n 静态检查）也变得极其精简健壮。

### 目标

使用 `write_file` 完全重写 `scripts/check-i18n.mjs`，剔除 `extractSchemaKeys` 及相关逻辑，精简为标准源码国际化 Key 扫描器。

### 基本原理

由于所有配置项（包括开关、按钮组、靶向选择器等）现在均作为原生 TSX 组件直接编写在各卡片私有目录中，它们的 `t(...)` 调用会被 `scanSourceFile` 中的标准正则表达式直接捕获，因此不再需要任何定制化的 Schema 结构属性扫描器。

### 标签

#intent/refine #flow/ready #priority/high #comp/build #concept/config #scope/dx #ai/refine #task/domain/core #task/object/i18n-script #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 重写并极简优化 check-i18n.mjs 脚本

~~~~~act
write_file
scripts/check-i18n.mjs
~~~~~
~~~~~javascript
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

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
  const cardDirs = fs
    .readdirSync(cardsDir)
    .filter((d) => fs.statSync(path.join(cardsDir, d)).isDirectory());
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

function checkKeyExists(key, cardId, vGlobal) {
  if (cardId && !isExplicitGlobal(key)) {
    const cardKey = `cards.${cardId}.${key.replace(/^\./, '')}`;
    if (Object.hasOwn(vGlobal, cardKey)) return true;
  }
  return Object.hasOwn(vGlobal, key);
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
        cardId,
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

  for (const match of content.matchAll(T_CALL_REGEX)) {
    const key = match[2];
    if (key.includes('${') || !key.trim()) continue;
    addMissing(relativePath, key, cardId);
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
  console.log('✅ All statically analyzable i18n keys are correctly defined in locale files.');
  process.exit(0);
}
~~~~~

### 下一步建议

- `check-i18n.mjs` 静态检查脚本现在已经完全清除了 Schema 属性扫描负担，回归为纯粹高效的 TSX 国际化 Key 扫描器。你可以随时运行 `node scripts/check-i18n.mjs` 验证整个代码库的国际化完整性。
