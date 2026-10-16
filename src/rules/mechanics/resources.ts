import type { CharacterResourceCode, ClassCode } from '../../enums/character.js';
import { classResources, resourceRecovery } from '../progression.js';
import { facetsOf } from './compute.js';
import type { MechanicsHolder } from './types.js';

export interface CharacterResource {
  code: CharacterResourceCode;
  max: number;
  recovery: 'SHORT' | 'LONG';
}

/**
 * Все ресурсы персонажа одним списком: таблицы класса (ци, ярость, канал)
 * и грани `resource` умений и черт носителя — подклассовые, расовые,
 * воззваний (§П2 разбора умений). Одна функция на лист, отдых и трату:
 * иначе бес-колдун получил бы удачу Тёмного чужого покровителя, а трата
 * барда упиралась бы в максимум без Харизмы (план волны 3, §6).
 */
export function characterResources(input: {
  classCode: ClassCode | null;
  level: number;
  charismaModifier: number;
  holder: MechanicsHolder;
}): CharacterResource[] {
  const fromClass = input.classCode
    ? classResources(input.classCode, input.level, { charismaModifier: input.charismaModifier })
    : [];
  const out: CharacterResource[] = fromClass.map(({ code, max }) => ({
    code,
    max,
    recovery: resourceRecovery(code, input.level),
  }));
  for (const { facet } of facetsOf(input.holder)) {
    if (facet.kind !== 'resource') continue;
    if (input.level < (facet.fromLevel ?? 1)) continue;
    if (out.some((row) => row.code === facet.code)) continue;
    out.push({ code: facet.code, max: 1, recovery: facet.recovery });
  }
  return out;
}
