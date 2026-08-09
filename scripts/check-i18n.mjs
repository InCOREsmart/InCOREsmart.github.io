import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const localeDir = path.join(srcDir, 'i18n', 'locales');
const localeFiles = {
  ru: path.join(localeDir, 'ru.json'),
  en: path.join(localeDir, 'en.json'),
  kk: path.join(localeDir, 'kk.json'),
  az: path.join(localeDir, 'az.json'),
};
const translationSources = [
  path.join(srcDir, 'i18n', 'core.ts'),
  path.join(srcDir, 'i18n', 'uiTranslations.ts'),
  path.join(srcDir, 'i18n', 'uiSupplement.ts'),
];

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) result.push(full);
  }
  return result;
}

function flatten(value, prefix = '', out = new Set()) {
  if (!value || typeof value !== 'object') return out;
  for (const [key, child] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out.add(full);
  }
  return out;
}

function extractBalancedObject(text, start) {
  const open = text.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return '';
}

function extractLocaleBlocks(text, locale) {
  const blocks = [];
  const re = new RegExp(`\\b${locale}\\s*:`,'g');
  let match;
  while ((match = re.exec(text))) {
    const block = extractBalancedObject(text, match.index);
    if (block) blocks.push(block);
  }
  return blocks;
}

function hasTranslationKey(sourceText, key) {
  const parts = key.split('.');
  let block = sourceText;
  for (const part of parts) {
    const marker = new RegExp(`(?:["']${part}["']|\\b${part})\\s*:`).exec(block);
    if (!marker) return false;
    block = extractBalancedObject(block, marker.index) || block.slice(marker.index, marker.index + 1000);
  }
  return true;
}

const localeKeys = {};
const localeSourceBlocks = { ru: [], en: [], kk: [], az: [] };
for (const [locale, file] of Object.entries(localeFiles)) {
  localeKeys[locale] = flatten(JSON.parse(fs.readFileSync(file, 'utf8')));
}
for (const file of translationSources) {
  const text = fs.readFileSync(file, 'utf8');
  for (const locale of Object.keys(localeSourceBlocks)) {
    localeSourceBlocks[locale].push(...extractLocaleBlocks(text, locale));
  }
}

const files = walk(srcDir);
const used = new Map();
for (const file of files) {
  if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  for (const match of text.matchAll(/\bt\(\s*[`'\"]([^`'\"]+)[`'\"]\s*[,)]/g)) {
    const key = match[1];
    if (key.includes('${') || key.startsWith('http')) continue;
    if (!used.has(key)) used.set(key, new Set());
    used.get(key).add(rel);
  }
}

const missing = [];
for (const [key, filesUsing] of used) {
  for (const locale of Object.keys(localeFiles)) {
    const exists = localeKeys[locale].has(key) || localeSourceBlocks[locale].some(block => hasTranslationKey(block, key));
    if (!exists) missing.push(`${locale}: ${key} (${[...filesUsing].join(', ')})`);
  }
}

if (missing.length) {
  console.error('Missing i18n keys:');
  missing.sort().forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`i18n check passed: ${used.size} translation keys verified across RU/EN/KZ/AZ.`);
