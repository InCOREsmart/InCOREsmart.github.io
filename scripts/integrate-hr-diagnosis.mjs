import fs from 'node:fs';

const file = 'src/pages/public/HrLossCalculatorPage.tsx';
const diagnosisImport = "import { HrLossDiagnosisPanel } from '../../features/hrCalculator/HrLossDiagnosisPanel';";
const diagnosisJsx = '<HrLossDiagnosisPanel result={result} t={t} money={(value) => money(value, language)} />';
const leadImport = "import { HrReportLeadCapture } from '../../features/hrCalculator/HrReportLeadCapture';";
const leadJsx = `<HrReportLeadCapture\n      t={t}\n      locale={language}\n      totalLoss={money(result.totalLoss, language)}\n      potentialEffect={money(scenarioSaving, language)}\n    />`;

let source = fs.readFileSync(file, 'utf8');

if (!source.includes(diagnosisImport)) {
  const importTarget = "import { calculateHrLoss, type HrCalculatorInput } from '../../features/hrCalculator/hrCalculator';";
  if (!source.includes(importTarget)) throw new Error('HR calculator import anchor not found');
  source = source.replace(importTarget, `${importTarget}\n${diagnosisImport}`);
}

if (!source.includes(diagnosisJsx)) {
  const benchmarkAnchor = "    <section className=\"mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7\"><div className=\"flex items-start justify-between gap-4\"><div><h2 className=\"text-xl font-black\">{t('hrCalculatorBenchmark.title')}";
  const index = source.indexOf(benchmarkAnchor);
  if (index === -1) throw new Error('Benchmark section anchor not found');
  source = `${source.slice(0, index)}    <div className="mt-6">${diagnosisJsx}</div>\n\n${source.slice(index)}`;
}

if (!source.includes(leadImport)) {
  const importTarget = diagnosisImport;
  if (!source.includes(importTarget)) throw new Error('Diagnosis import anchor not found');
  source = source.replace(importTarget, `${importTarget}\n${leadImport}`);
}

if (!source.includes('<HrReportLeadCapture')) {
  const nextAnchor = "    <section className=\"mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8\"><div className=\"grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center\"><div><div className=\"flex items-center gap-2 text-sm font-bold text-slate-700\"><ShieldAlert size={18} /> {t('hrCalculator.next.badge')}";
  const index = source.indexOf(nextAnchor);
  if (index === -1) throw new Error('Next-step section anchor not found');
  source = `${source.slice(0, index)}    <div className="mt-6">${leadJsx}</div>\n\n${source.slice(index)}`;
}

fs.writeFileSync(file, source);
console.log('HR diagnosis and report lead capture integrated into HrLossCalculatorPage.tsx');
