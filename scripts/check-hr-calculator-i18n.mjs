import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const sources = [
  { file: path.join(root, 'src', 'i18n', 'hrCalculatorTranslations.ts'), prefix: 'hrCalculator' },
  { file: path.join(root, 'src', 'i18n', 'hrCalculatorBenchmarkTranslations.ts'), prefix: 'hrCalculatorBenchmark' },
];
const languages = ['ru', 'en', 'kk', 'az'];

function nameOf(node) {
  if (!node?.name) return null;
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) || ts.isNumericLiteral(node.name)) return node.name.text;
  return null;
}

function collectLeaves(node, prefix, out) {
  if (!ts.isObjectLiteralExpression(node)) return;
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = nameOf(property);
    if (!name) continue;
    const full = `${prefix}.${name}`;
    if (ts.isObjectLiteralExpression(property.initializer)) collectLeaves(property.initializer, full, out);
    else out.add(full);
  }
}

function collectFromFile(file, prefix) {
  if (!fs.existsSync(file)) {
    console.error(`Missing translation source: ${file}`);
    process.exit(1);
  }
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const byLanguage = Object.fromEntries(languages.map((lang) => [lang, new Set()]));

  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property)) continue;
        const lang = nameOf(property);
        if (languages.includes(lang) && ts.isObjectLiteralExpression(property.initializer)) {
          collectLeaves(property.initializer, prefix, byLanguage[lang]);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return byLanguage;
}

const missing = [];
let total = 0;
for (const { file, prefix } of sources) {
  const byLanguage = collectFromFile(file, prefix);
  const base = byLanguage.ru;
  total += base.size;
  for (const lang of languages) {
    for (const key of [...base].sort()) {
      if (!byLanguage[lang].has(key)) missing.push(`${lang}: ${key}`);
    }
  }
}

if (missing.length) {
  console.error(`Missing HR Calculator i18n keys: ${missing.length}`);
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`HR Calculator i18n check passed: ${total} keys verified across RU/EN/KK/AZ.`);
