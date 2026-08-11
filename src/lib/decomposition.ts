import { RoleDecomposition, ValidationResult } from '../types/decomposition';

export function validateDecomposition(result: RoleDecomposition): ValidationResult {
  const errors: string[] = [];
  const totalWeight = result.skills.reduce((sum, skill) => sum + Number(skill.weight || 0), 0);

  if (result.skills.length < 5 || result.skills.length > 8) {
    errors.push(`Количество навыков: ${result.skills.length}. Допустимо от 5 до 8.`);
  }

  if (Math.abs(totalWeight - 1) > 0.001) {
    errors.push(`Сумма весов: ${totalWeight.toFixed(4)}. Должно быть 1.0000.`);
  }

  const names = new Set<string>();
  result.skills.forEach(skill => {
    if (!skill.name.trim()) errors.push('У навыка отсутствует название.');
    if (names.has(skill.name)) errors.push(`Дублируется навык: ${skill.name}.`);
    names.add(skill.name);
    if (skill.weight < 0 || skill.weight > 1) errors.push(`Некорректный вес навыка «${skill.name}».`);
    if (!skill.expected_outcomes.length) errors.push(`У навыка «${skill.name}» нет ожидаемого результата.`);
    if (!skill.verification_criteria.length) errors.push(`У навыка «${skill.name}» нет критериев проверки.`);
  });

  result.skills_relations.forEach(relation => {
    if (!names.has(relation.skill_from)) errors.push(`Связь ссылается на неизвестный навык «${relation.skill_from}».`);
    if (!names.has(relation.skill_to)) errors.push(`Связь ссылается на неизвестный навык «${relation.skill_to}».`);
    if (relation.strength < 0 || relation.strength > 1) errors.push(`Некорректная сила связи ${relation.strength}.`);
  });

  return { valid: errors.length === 0, errors };
}
