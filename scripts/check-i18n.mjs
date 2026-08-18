import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const localeDir = path.join(srcDir, 'i18n', 'locales');
const localeFiles = { ru: 'ru.json', en: 'en.json', kk: 'kk.json', az: 'az.json' };
const languages = Object.keys(localeFiles);
const sourceFiles = ['core.ts', 'uiTranslations.ts', 'uiSupplement.ts', 'candidateTranslations.ts', 'onboardingTranslations.ts'];

function flatten(value, prefix = '', out = new Set()) {
  if (!value || typeof value !== 'object') return out;
  for (const [key, child] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out.add(full);
  }
  return out;
}

function nameOf(node) {
  if (!node?.name) return null;
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) || ts.isNumericLiteral(node.name)) return node.name.text;
  return null;
}

function collectLeaves(node, prefix = '', out = new Set()) {
  if (!ts.isObjectLiteralExpression(node)) return out;
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = nameOf(property);
    if (!name) continue;
    const full = prefix ? `${prefix}.${name}` : name;
    if (ts.isObjectLiteralExpression(property.initializer)) collectLeaves(property.initializer, full, out);
    else out.add(full);
  }
  return out;
}

function collectRuntimeKeys(file) {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const result = Object.fromEntries(languages.map(lang => [lang, new Set()]));
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const lang = nameOf(property);
        if (languages.includes(lang) && ts.isObjectLiteralExpression(property.initializer)) {
          for (const key of collectLeaves(property.initializer)) result[lang].add(key);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return result;
}

const resources = Object.fromEntries(languages.map(lang => [lang, new Set()]));
for (const [lang, file] of Object.entries(localeFiles)) {
  const full = path.join(localeDir, file);
  if (fs.existsSync(full)) for (const key of flatten(JSON.parse(fs.readFileSync(full, 'utf8')))) resources[lang].add(key);
}
for (const source of sourceFiles) {
  const full = path.join(srcDir, 'i18n', source);
  if (!fs.existsSync(full)) continue;
  const runtime = collectRuntimeKeys(full);
  for (const lang of languages) for (const key of runtime[lang]) resources[lang].add(key);
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
for (const key of [...used].sort()) for (const lang of languages) if (!resources[lang].has(key)) missing.push(`${lang}: ${key}`);
if (missing.length) { console.error(`Missing i18n keys: ${missing.length}`); for (const item of missing) console.error(`- ${item}`); process.exit(1); }
console.log(`i18n check passed: ${used.size} translation keys verified across RU/EN/KK/AZ.`);
