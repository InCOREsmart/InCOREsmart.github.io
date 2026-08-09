import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const localeDir = path.join(srcDir, 'i18n', 'locales');
const localeFiles = { ru: 'ru.json', en: 'en.json', kk: 'kk.json', az: 'az.json' };
const translationSources = ['core.ts', 'uiTranslations.ts', 'uiSupplement.ts'];

function flatten(value, prefix = '', out = new Set()) {
  if (!value || typeof value !== 'object') return out;
  for (const [key, child] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out.add(full);
  }
  return out;
}

function addAll(target, values) {
  for (const value of values) target.add(value);
}

function extractObjectLiteral(text, start) {
  const open = text.indexOf('{', start);
  if (open < 0) return null;
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
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return null;
}

function loadRuntimeTranslations(file) {
  const text = fs.readFileSync(file, 'utf8');
  const result = {};
  const re = /export\s+const\s+[A-Za-z_$][\w$]*\s*=\s*\{/g;
  let match;
  while ((match = re.exec(text))) {
    const literal = extractObjectLiteral(text, match.index);
    if (!literal) continue;
    try {
      const value = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 });
      if (value && typeof value === 'object') Object.assign(result, value);
    } catch (error) {
      console.error(`Cannot parse translation source ${file}: ${error.message}`);
      process.exit(1);
    }
  }
  return result;
}

const resources = { ru: new Set(), en: new Set(), kk: new Set(), az: new Set() };
for (const [lang, file] of Object.entries(localeFiles)) {
  const full = path.join(localeDir, file);
  if (fs.existsSync(full)) addAll(resources[lang], flatten(JSON.parse(fs.readFileSync(full, 'utf8'))));
}
for (const fileName of translationSources) {
  const full = path.join(srcDir, 'i18n', fileName);
  if (!fs.existsSync(full)) continue;
  const runtime = loadRuntimeTranslations(full);
  for (const lang of Object.keys(resources)) {
    if (runtime[lang]) addAll(resources[lang], flatten(runtime[lang]));
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

const used = new Map();
for (const file of walk(srcDir)) {
  if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  for (const pattern of [/\bt\(\s*['"]([^'"]+)['"]/g, /\bi18n\.t\(\s*['"]([^'"]+)['"]/g]) {
    let match;
    while ((match = pattern.exec(text))) {
      const key = match[1];
      if (!key.includes('${')) {
        if (!used.has(key)) used.set(key, new Set());
        used.get(key).add(relative);
      }
    }
  }
}

const missing = [];
for (const [key, files] of used) {
  for (const lang of Object.keys(resources)) {
    if (!resources[lang].has(key)) missing.push(`${lang}: ${key} (${[...files].join(', ')})`);
  }
}

if (missing.length) {
  console.error(`Missing i18n keys: ${missing.length}`);
  for (const item of missing.sort()) console.error(`- ${item}`);
  process.exit(1);
}
console.log(`i18n check passed: ${used.size} translation keys verified across RU/EN/KZ/AZ.`);
