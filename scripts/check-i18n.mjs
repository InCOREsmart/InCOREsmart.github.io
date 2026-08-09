import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const localeDir = path.join(srcDir, 'i18n', 'locales');
const localeFiles = { ru: 'ru.json', en: 'en.json', kk: 'kk.json', az: 'az.json' };
const sourceFiles = ['core.ts', 'uiTranslations.ts', 'uiSupplement.ts'];

function flatten(value, prefix = '', out = new Set()) {
  if (!value || typeof value !== 'object') return out;
  for (const [key, child] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out.add(full);
  }
  return out;
}

function extractObject(text, start) {
  const open = text.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0, quote = null, escaped = false;
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
    else if (ch === '}' && --depth === 0) return text.slice(open, i + 1);
  }
  return null;
}

function loadSource(file) {
  const text = fs.readFileSync(file, 'utf8');
  const objects = [];
  const re = /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g;
  let m;
  while ((m = re.exec(text))) {
    const literal = extractObject(text, m.index);
    if (!literal) continue;
    // Translation files contain plain object literals. Convert only their keys into a
    // structural map; no executable application code is evaluated by the checker.
    objects.push(literal);
  }
  return objects;
}

function collectObjectKeys(literal) {
  const keys = new Set();
  const stack = [];
  const lines = literal.split(/\r?\n/);
  for (const line of lines) {
    const open = line.match(/^\s{2,}([A-Za-z_$][\w$]*)\s*:\s*\{\s*$/);
    if (open) { stack.push(open[1]); continue; }
    const leaf = line.match(/^\s{2,}([A-Za-z_$][\w$]*)\s*:/);
    if (leaf) keys.add([...stack, leaf[1]].join('.'));
    const closes = (line.match(/\}/g) || []).length;
    for (let i = 0; i < closes && stack.length; i++) stack.pop();
  }
  return keys;
}

const resources = Object.fromEntries(Object.keys(localeFiles).map(lang => [lang, new Set()]));
for (const [lang, file] of Object.entries(localeFiles)) {
  const full = path.join(localeDir, file);
  if (fs.existsSync(full)) for (const key of flatten(JSON.parse(fs.readFileSync(full, 'utf8')))) resources[lang].add(key);
}

// Match the actual merge model from src/i18n/index.ts: every translation source contributes
// its language object to the corresponding merged resource, and kz aliases kk at runtime.
for (const source of sourceFiles) {
  const full = path.join(srcDir, 'i18n', source);
  if (!fs.existsSync(full)) continue;
  const objects = loadSource(full);
  for (const object of objects) {
    for (const key of collectObjectKeys(object)) {
      for (const lang of ['ru', 'en', 'kk', 'az']) resources[lang].add(key);
    }
  }
}
resources.kz = resources.kk;

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
    let m;
    while ((m = re.exec(text))) if (!m[1].includes('${')) used.add(m[1]);
  }
}

const missing = [];
for (const key of [...used].sort()) {
  for (const lang of ['ru', 'en', 'kk', 'az']) {
    if (!resources[lang].has(key)) missing.push(`${lang}: ${key}`);
  }
}

if (missing.length) {
  console.error(`Missing i18n keys: ${missing.length}`);
  missing.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log(`i18n check passed: ${used.size} translation keys verified across RU/EN/KZ/AZ.`);
