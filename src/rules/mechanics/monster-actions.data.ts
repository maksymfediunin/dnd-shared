import type { MonsterActionMechanic } from '../monster-actions.js';

/**
 * Поправки разбора действий монстров: код действия → механика целиком.
 * Поправка побеждает разбор. Сюда попадает то, где источник
 * (`srd/en/monsters.json` из 5e-database) расходится с текстом статблока.
 * Сам источник не правится: он перезаливается из 5e-database, и правка в
 * нём потерялась бы (§6 р. 24 разбора монстров).
 */
export const MONSTER_ACTION_OVERRIDES: Readonly<Record<string, MonsterActionMechanic>> = {
  // Состав в источнике — короткий меч ×2, текст — «can also make a
  // shortsword attack», то есть один. Меч считается вынутым (§6 р. 26).
  'veteran-multiattack-action': {
    kind: 'multiattack',
    options: [
      [
        { action: 'veteran-longsword-action', count: 2 },
        { action: 'veteran-shortsword-action', count: 1 },
      ],
    ],
  },
  // Битая ссылка: в составе «Claws», действие называется «Claw».
  'dragon-turtle-multiattack-action': {
    kind: 'multiattack',
    options: [
      [
        { action: 'dragon-turtle-bite-action', count: 1 },
        { action: 'dragon-turtle-claw-action', count: 2 },
      ],
      [
        { action: 'dragon-turtle-bite-action', count: 1 },
        { action: 'dragon-turtle-tail-action', count: 1 },
      ],
    ],
  },
  // Битая ссылка: «Claw», а действие — «Claw (Oni Form Only)». Обличье
  // волна 7 разберёт отдельно (`formsOnly`); пока когти доступны всегда.
  'oni-multiattack-action': {
    kind: 'multiattack',
    options: [
      [{ action: 'oni-glaive-action', count: 2 }],
      [{ action: 'oni-claw-oni-form-only-action', count: 2 }],
      [
        { action: 'oni-glaive-action', count: 1 },
        { action: 'oni-claw-oni-form-only-action', count: 1 },
      ],
    ],
  },
  // Битые ссылки: в составе имена с «(Vampire Form Only)», у действий их нет.
  // «Only one of which can be a bite» — две безоружных или безоружная и укус.
  'vampire-vampire-multiattack-action': {
    kind: 'multiattack',
    options: [
      [
        { action: 'vampire-vampire-unarmed-strike-action', count: 1 },
        { action: 'vampire-vampire-bite-action', count: 1 },
      ],
      [{ action: 'vampire-vampire-unarmed-strike-action', count: 2 }],
    ],
  },
};
