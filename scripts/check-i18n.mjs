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
const sourceFiles = [
  ...Object.values(localeFiles),
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

function keysFromSource(text) {
  const keys = new Set();
  for (const match of text.matchAll(/['"]([A-Za-z][A-Za-z0-9_.-]+)['"]\s*:/g)) keys.add(match[1]);
  return keys;
}

const localeText = {};
const localeKeys = {};
for (const [locale, file] of Object.entries(localeFiles)) {
  const text = fs.readFileSync(file, 'utf8');
  localeText[locale] = text;
  localeKeys[locale] = flatten(JSON.parse(text));
}

for (const extra of sourceFiles.slice(4)) {
  const text = fs.readFileSync(extra, 'utf8');
  const name = path.basename(extra);
  const groups = ['ru', 'en', 'kk', 'az'];
  for (const locale of groups) {
    const marker = new RegExp(`${locale}\\s*:\\s*\\{`);
    const match = marker.exec(text);
    if (!match) continue;
    const rest = text.slice(match.index);
    const keys = keysFromSource(rest.slice(0, rest.indexOf(`\n  ${groups.find(g => g !== locale)}:`) > -1 ? rest.indexOf(`\n  ${groups.find(g => g !== locale)}:`) : rest.length));
    for (const key of keys) localeText[locale] += ` ${key}:`;
  }
}

const files = walk(srcDir);
const used = new Map();
for (const file of files) {
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
    const jsonHas = localeKeys[locale].has(key);
    const extraHas = new RegExp(`(?:["'])${key.replaceAll('.', '\\.')}(?:["'])\\s*:`).test(localeText[locale]);
    if (!jsonHas && !extraHas) missing.push(`${locale}: ${key} (${[...filesUsing].join(', ')})`);
  }
}

if (missing.length) {
  console.error('Missing i18n keys:');
  for (const item of missing.sort()) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`i18n check passed: ${used.size} translation keys verified across RU/EN/KZ/AZ.`);
