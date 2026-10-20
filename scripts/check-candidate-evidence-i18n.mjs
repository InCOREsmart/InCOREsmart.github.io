import fs from 'node:fs';

const locales = ['ru', 'en', 'kk', 'az'];
const required = {
  auth: ['roleCandidate'],
  candidatePortal: [
    'eyebrow', 'title', 'subtitle', 'profileHint', 'verifiedWork',
    'verifiedWorkHint', 'noWorkHistory', 'evidenceTitle', 'evidenceHint',
    'noProfile', 'noProfileHint', 'claimError',
  ],
  candidateEvidence: [
    'title', 'hint', 'skill', 'source', 'link', 'description', 'add',
    'history', 'empty', 'unknownSkill', 'required', 'open', 'hide', 'close',
    'passportTitle', 'passportHint', 'verifiedSkillsCount', 'noVerifiedSkills',
    'workHistoryTitle', 'workHistoryEmpty', 'unknownContract',
  ],
  evidenceMatching: ['title', 'migrationNeeded', 'details'],
  evidenceReview: [
    'title', 'subtitle', 'empty', 'candidateId', 'verify', 'reject',
    'verifiedNotice', 'rejectedNotice', 'forbiddenTitle', 'forbiddenText', 'back',
  ],
};

const errors = [];
for (const locale of locales) {
  const path = `src/i18n/locales/${locale}.json`;
  const json = JSON.parse(fs.readFileSync(path, 'utf8'));
  for (const [namespace, keys] of Object.entries(required)) {
    const section = json[namespace];
    if (!section || typeof section !== 'object') {
      errors.push(`${locale}: missing namespace ${namespace}`);
      continue;
    }
    for (const key of keys) {
      if (!(key in section)) errors.push(`${locale}: missing ${namespace}.${key}`);
    }
  }
  for (const key of ['sources', 'status']) {
    if (!json.candidateEvidence?.[key]) errors.push(`${locale}: missing candidateEvidence.${key}`);
  }
}
if (errors.length) {
  console.error(`Candidate evidence translation check failed: ${errors.length}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Candidate evidence translations validated for RU/EN/KK/AZ.');
