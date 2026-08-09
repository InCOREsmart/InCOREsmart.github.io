import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const localeDir = path.join(srcDir, 'i18n', 'locales');
const localeFiles = { ru: 'ru.json', en: 'en.json', kk: 'kk.json', az: 'az.json' };
const sourceFiles = ['core.ts', 'uiTranslations.ts', 'uiSupplement.ts'];
const languages = Object.keys(localeFiles);

function flatten(value, prefix = '', out = new Set()) {
  if (!value || typeof value !== 'object') return out;
  for (const [key, child] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out.add(full);
  }
  return out;
}

function balancedObject(text, start) {
  const open = text.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(open + 1, i);
    }
  }
  return '';
}

function languageBlock(text, language) {
  const re = new RegExp(`\\b${language}\\s*:\\s*\\{`);
  const match = re.exec(text);
  return match ? balancedObject(text, match.index) : '';
}

function namespaceKeys(block) {
  const result = new Set();
  const re = /\b([A-Za-z_$][\w$]*)\s*:\s*\{/g;
  let match;
  while ((match = re.exec(block))) {
    const namespace = match[1];
    const object = balancedObject(block, match.index);
    if (!object) continue;
    const leaf = /\b([A-Za-z_$][\w$]*)\s*:/g;
    let item;
    while ((item = leaf.exec(object))) result.add(`${namespace}.${item[1]}`);
  }
  return result;
}

const resources = Object.fromEntries(languages.map(lang => [lang, new Set()]));
for (const [lang, file] of Object.entries(localeFiles)) {
  const full = path.join(localeDir, file);
  if (fs.existsSync(full)) {
    for (const key of flatten(JSON.parse(fs.readFileSync(full, 'utf8')))) resources[lang].add(key);
  }
}

for (const source of sourceFiles) {
  const full = path.join(srcDir, 'i18n', source);
  if (!fs.existsSync(full)) continue;
  const text = fs.readFileSync(full, 'utf8');
  for (const lang of languages) {
    const block = languageBlock(text, lang);
    for (const key of namespaceKeys(block)) resources[lang].add(key);
  }
}

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) result.push(full);
  }
  return result;
}

const used = new Set();
for (const file of walk(srcDir)) {
  if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const re of [/\bt\(\s*['"]([^'"]+)['"]/g, /\bi18n\.t\(\s*['"]([^'"]+)['"]/g]) {
    let match;
    while ((match = re.exec(text))) {
      const key = match[1];
      if (!key.includes('${')) used.add(key);
    }
  }
}

const missing = [];
for (const key of [...used].sort()) {
  for (const lang of languages) {
    if (!resources[lang].has(key)) missing.push(`${lang}: ${key}`);
  }
}

if (missing.length) {
  console.error(`Missing i18n keys: ${missing.length}`);
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`i18n check passed: ${used.size} translation keys verified across RU/EN/KZ/AZ.`);
