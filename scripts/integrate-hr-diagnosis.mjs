import fs from 'node:fs';

const file = 'src/pages/public/HrLossCalculatorPage.tsx';
const marker = "import { HrLossDiagnosisPanel } from '../../features/hrCalculator/HrLossDiagnosisPanel';";
const jsxMarker = '<HrLossDiagnosisPanel result={result} t={t} money={(value) => money(value, language)} />';

let source = fs.readFileSync(file, 'utf8');

if (!source.includes(marker)) {
  const importTarget = "import { calculateHrLoss, type HrCalculatorInput } from '../../features/hrCalculator/hrCalculator';";
  if (!source.includes(importTarget)) throw new Error('HR calculator import anchor not found');
  source = source.replace(importTarget, `${importTarget}\n${marker}`);
}

if (!source.includes(jsxMarker)) {
  const benchmarkAnchor = '    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">{t(\'hrCalculatorBenchmark.title\')}';
  const index = source.indexOf(benchmarkAnchor);
  if (index === -1) throw new Error('Benchmark section anchor not found');
  source = `${source.slice(0, index)}    <div className="mt-6">${jsxMarker}</div>\n\n${source.slice(index)}`;
}

fs.writeFileSync(file, source);
console.log('HR diagnosis panel integrated into HrLossCalculatorPage.tsx');
