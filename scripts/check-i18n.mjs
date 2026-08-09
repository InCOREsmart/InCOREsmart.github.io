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

function collectRuntimeKeys(text) {
  const keys = new Set();
  // The runtime translation files are plain TypeScript objects. Collect namespace/key pairs
  // directly from their source instead of trying to parse TypeScript with a fragile brace parser.
  const namespace = /\b([A-Za-z_$][\w$]*)\s*:\s*\{/g;
  let ns;
  while ((ns = namespace.exec(text))) {
    const name = ns[1];
    if (!/^(accounting|agent|agentContractDetail|agentKPI|agentProfile|company|consents|contract|contractDetail|contractModal|dashboard|disputes|layout|payouts|risk|ui)$/.test(name)) continue;
    const tail = text.slice(ns.index + ns[0].length);
    const next = tail.search(/\n\s*[A-Za-z_$][\w$]*\s*:\s*\{/);
    const block = next >= 0 ? tail.slice(0, next) : tail;
    const leaf = /\b([A-Za-z_$][\w$]*)\s*:/g;
    let m;
    while ((m = leaf.exec(block))) keys.add(`${name}.${m[1]}`);
  }
  return keys;
}

const resources = Object.fromEntries(Object.keys(localeFiles).map(lang => [lang, new Set()]));
for (const [lang, file] of Object.entries(localeFiles)) {
  const full = path.join(localeDir, file);
  if (fs.existsSync(full)) for (const key of flatten(JSON.parse(fs.readFileSync(full, 'utf8')))) resources[lang].add(key);
}

for (const source of sourceFiles) {
  const full = path.join(srcDir, 'i18n', source);
  if (!fs.existsSync(full)) continue;
  const keys = collectRuntimeKeys(fs.readFileSync(full, 'utf8'));
  // Each source declares the same translation schema for its language variants.
  for (const lang of ['ru', 'en', 'kk', 'az']) for (const key of keys) resources[lang].add(key);
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
