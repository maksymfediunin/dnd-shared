import type { MechanicRecord } from './types.js';

/**
 * Черты монстров (план волны 7, §4.3): код черты (`traitCodeOf` — slug
 * имени без скобки) → что делает в бою. Своё пространство ключей: коды
 * `sneak-attack` и `keen-senses` совпадают с умениями классов и расами.
 * Волна 7а заводит то, что читает её урон и спасброски; прочие коды
 * ждут в допуске теста полноты своих подволн.
 */
export const MONSTER_TRAIT_MECHANICS: Readonly<Record<string, MechanicRecord>> = {
  // «The X's weapon attacks are magical» — снимают оговорку «немагическое».
  'magic-weapons': { facets: [{ kind: 'rule', rule: 'magicWeapons' }] },
  // Ангельское и адское оружие: лишние кости уже в действии (р. 7
  // разбора) — грань только магичности.
  'angelic-weapons': { facets: [{ kind: 'rule', rule: 'magicWeapons' }] },
  'hellish-weapons': { facets: [{ kind: 'rule', rule: 'magicWeapons' }] },
  'heated-weapons': { sheet: 'урон уже в атаке: «included in the attack»' },
  brute: { sheet: 'урон уже в атаке: «included in the attack»' },
  // Провалив спасбросок, может считать его успешным; N в день — счётчик
  // фишки `legendaryResistance`, число — `usage` черты.
  'legendary-resistance': {
    facets: [
      {
        kind: 'reaction',
        ability: 'LEGENDARY_RESISTANCE',
        event: ['saveFailed'],
        economy: 'FREE',
        who: 'self',
        effect: { forceSuccess: true },
      },
    ],
  },
};
