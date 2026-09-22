/**
 * Поля справочника, по которым сервер разрешает заклинание машинно.
 * Ровно те, что в схеме отделены комментарием «Ниже — машинная
 * механика»: `areaShape` и `areaSizeFeet` сюда не входят — это
 * прицеливание, а не разрешение, и область без урона ничего не считает.
 */
export interface MachineEffectFields {
  attackType: string | null;
  saveAbility: string | null;
  damageType: string | null;
  damageAtSlotLevel: unknown;
  damageAtLevel: unknown;
  healAtSlotLevel: unknown;
}

/**
 * Посчитает ли система эффект этого заклинания сама. У 91 заклинания
 * из 169 доступных кругов SRD все машинные поля пусты — это штатный
 * случай, а не пробел в данных: такое заклинание сотворяется тоже, а
 * эффект применяет ведущий.
 *
 * Правило живёт здесь, а не в панели боя: признак нужен и серверу (лист
 * персонажа его отдаёт), и клиенту (подпись в списке выбора), а второй
 * копии этого перечня полей хватило бы одной правки импорта, чтобы
 * разъехаться.
 *
 * Отвечает на вопрос «есть ли машинные поля», а не «дойдёт ли расчёт до
 * числа». Три случая, где поля есть, а урона всё равно не будет,
 * этой функции не касаются: предсказать их до броска нельзя, они
 * зависят от круга ячейки и от разбора костей.
 */
export function hasMachineEffect(spell: MachineEffectFields): boolean {
  return (
    spell.attackType !== null ||
    spell.saveAbility !== null ||
    spell.damageType !== null ||
    spell.damageAtSlotLevel !== null ||
    spell.damageAtLevel !== null ||
    spell.healAtSlotLevel !== null
  );
}
