import { describe, expect, it } from 'vitest';
import { validateRecovery } from '../rest.js';
import { SPELL_MECHANICS } from '../spell-mechanics.data.js';
import { spellMechanic, spellMechanicFor } from '../spell-mechanics.js';
import {
  isHarmful,
  perceivesOk,
  saveDisadvantageByType,
  spreadOk,
  type TargetInfo,
  targetVerdict,
} from '../spell-targets.js';
import {
  amountOf,
  collectCrit,
  collectDamageRerolls,
  collectDefenses,
  collectModifiers,
  collectOnHit,
  collectSpellModifiers,
  grantedSpells,
  healOtherSelfAmount,
  holds,
  restActions,
  restBudget,
  songOfRestSides,
} from './compute.js';
import type { MechanicsContext, MechanicsHolder, Predicate } from './types.js';

/** Записи и вычислитель волны 8а (план w8, §4–§5.1) на настоящих данных. */

function holderOf(patch: Partial<MechanicsHolder> = {}): MechanicsHolder {
  return {
    level: 9,
    features: new Set(),
    traits: new Set(),
    effects: [],
    proficiencyBonus: 4,
    ancestryDamageType: null,
    ...patch,
  };
}

const greataxe: MechanicsContext = {
  weapon: {
    rangeType: 'MELEE',
    properties: ['HEAVY', 'TWO_HANDED'],
    ability: 'strength',
    offHandWeapon: false,
    itemId: 'axe',
    twoHanded: true,
  },
  attack: { weapon: true, range: 'MELEE' },
};

describe('предикаты волны 8а', () => {
  const check = (p: Predicate, ctx: MechanicsContext) => holds([p], ctx);

  it('без нужного поля — ложь', () => {
    for (const p of [
      'weaponItem',
      'weaponAttack',
      'meleeWeaponAttack',
      'meleeAttack',
      'twoHandedGrip',
      'targetBelowMaxHp',
      'notProficientCheck',
      'spellRestoresHp',
      'cantrip',
      'spellForcesSave',
      'classSpell',
      { checkAbility: ['strength'] },
      { spellLevelAtLeast: 1 },
      { spellSchool: 'evocation' },
    ] as Predicate[]) {
      expect(check(p, {}), JSON.stringify(p)).toBe(false);
    }
  });

  it('удар без оружия — не «предмет-оружие»', () => {
    expect(check('weaponItem', greataxe)).toBe(true);
    expect(check('weaponItem', { weapon: { ...greataxe.weapon!, itemId: 'unarmed' } })).toBe(false);
  });
});

describe('крит, переброс, кости при попадании', () => {
  it('полуорк-варвар 9 с секирой: на крите 2 лишние кости — жестокий крит и свирепые атаки', () => {
    const h = holderOf({
      features: new Set(['brutal-critical-1-die']),
      traits: new Set(['savage-attacks']),
    });
    expect(collectCrit(h, greataxe)).toEqual({ threshold: 20, extraWeaponDice: 2 });
    // Безоружный удар кости оружия не имеет.
    const unarmed = { ...greataxe, weapon: { ...greataxe.weapon!, itemId: 'unarmed' } };
    expect(collectCrit(h, unarmed).extraWeaponDice).toBe(0);
    // Варвар 8 жестокого крита ещё не имеет.
    expect(collectCrit({ ...h, level: 8, traits: new Set() }, greataxe).extraWeaponDice).toBe(0);
  });

  it('бой большим оружием: 1 и 2 — двуручным; длинный меч со щитом — нет', () => {
    const h = holderOf({ features: new Set(['fighting-style-great-weapon-fighting']) });
    expect(collectDamageRerolls(h, greataxe)).toEqual([1, 2]);
    const shielded = { ...greataxe, weapon: { ...greataxe.weapon!, twoHanded: false } };
    expect(collectDamageRerolls(h, shielded)).toEqual([]);
  });

  it('божественный удар — 1к8 излучением атакой оружием, раз в свой ход', () => {
    const h = holderOf({ level: 8, features: new Set(['divine-strike']) });
    const [entry] = collectOnHit(h, greataxe);
    expect(entry?.facet).toMatchObject({ damageType: 'radiant', oncePer: 'ownTurn' });
    expect(amountOf({ table: 'divineStrikeDice' }, h)).toBe(1);
  });

  it('губитель колоссов — только по раненой цели', () => {
    const h = holderOf({ level: 3, features: new Set(['hunters-prey-colossus-slayer']) });
    expect(collectOnHit(h, { ...greataxe, target: { id: 'orc', belowMaxHp: true } })).toHaveLength(
      1,
    );
    expect(collectOnHit(h, { ...greataxe, target: { id: 'orc', belowMaxHp: false } })).toHaveLength(
      0,
    );
  });
});

describe('выдающийся атлет', () => {
  const h = holderOf({ level: 7, proficiencyBonus: 3, features: new Set(['remarkable-athlete']) });

  it('+2 к проверке Силы без владения; с владением — нет', () => {
    const value = (proficient: boolean) =>
      collectModifiers(h, 'skill', { check: { ability: 'strength', proficient } }).map(
        (m) => m.value,
      );
    expect(value(false)).toEqual([2]);
    expect(value(true)).toEqual([]);
    expect(
      collectModifiers(h, 'skill', { check: { ability: 'wisdom', proficient: false } }),
    ).toEqual([]);
  });

  it('+2 к инициативе', () => {
    expect(collectModifiers(h, 'initiative').map((m) => m.value)).toEqual([2]);
  });
});

describe('поправки заклинаний', () => {
  const spell = (patch: Partial<NonNullable<MechanicsContext['spell']>>): MechanicsContext => ({
    spell: {
      code: 'cure-wounds',
      level: 1,
      school: 'evocation',
      restoresHp: true,
      forcesSave: false,
      classSpell: true,
      damageType: null,
      ...patch,
    },
  });

  it('ученик жизни: 1 круг +3, ячейка 2 — +4', () => {
    const h = holderOf({ level: 1, features: new Set(['disciple-of-life']) });
    const [entry] = collectSpellModifiers(h, spell({}));
    const effect = entry?.facet.effect as { healingBonus: Parameters<typeof amountOf>[0] };
    expect(amountOf(effect.healingBonus, h, { spellLevel: 1 })).toBe(3);
    expect(amountOf(effect.healingBonus, h, { spellLevel: 2 })).toBe(4);
    // Заговор лечения не бывает, но условие «круг ≥ 1» держит и его.
    expect(collectSpellModifiers(h, spell({ level: 0 }))).toEqual([]);
  });

  it('благословенный целитель: себе 2 + круг', () => {
    const h = holderOf({ level: 6, features: new Set(['blessed-healer']) });
    expect(healOtherSelfAmount(h, spell({}), 1)).toBe(3);
    expect(healOtherSelfAmount(h, spell({ level: 3 }), 3)).toBe(5);
    expect(healOtherSelfAmount(h, spell({ restoresHp: false }), 1)).toBe(0);
  });

  it('мощный заговор — заговор со спасброском; усиленное воплощение — воплощение класса', () => {
    const h = holderOf({ level: 10, features: new Set(['potent-cantrip', 'empowered-evocation']) });
    const kinds = (ctx: MechanicsContext) => collectSpellModifiers(h, ctx).map(({ code }) => code);
    expect(
      kinds(spell({ level: 0, forcesSave: true, school: 'conjuration', restoresHp: false })),
    ).toEqual(['potent-cantrip']);
    expect(kinds(spell({ level: 3, restoresHp: false }))).toEqual(['empowered-evocation']);
    expect(kinds(spell({ level: 3, restoresHp: false, classSpell: false }))).toEqual([]);
  });

  it('воззвания «Таинственного взрыва» — только на него', () => {
    const h = holderOf({
      level: 5,
      features: new Set([
        'eldritch-invocation-agonizing-blast',
        'eldritch-invocation-eldritch-spear',
      ]),
    });
    expect(collectSpellModifiers(h, spell({ code: 'eldritch-blast' }))).toHaveLength(2);
    expect(collectSpellModifiers(h, spell({ code: 'fire-bolt' }))).toHaveLength(0);
  });
});

describe('дарованные заклинания и отдых', () => {
  it('воззвания: неограниченно — без ячейки, «раз ячейкой» — договор и счётчик', () => {
    const h = holderOf({
      level: 5,
      features: new Set([
        'eldritch-invocation-armor-of-shadows',
        'eldritch-invocation-thief-of-five-fates',
      ]),
    });
    expect(
      grantedSpells(h).map(({ facet }) => [facet.spell, facet.slot, facet.uses ?? null]),
    ).toEqual([
      ['mage-armor', 'none', null],
      ['bane', 'pact', 'THIEF_OF_FIVE_FATES'],
    ]);
    // Каждое дарованное есть в реестре заклинаний.
    expect(grantedSpells(h).every(({ facet }) => facet.spell in SPELL_MECHANICS)).toBe(true);
  });

  it('волшебник 5: бюджет 3; 3 + 1 — сверх бюджета; 6 круг — нельзя', () => {
    const h = holderOf({ level: 5, features: new Set(['arcane-recovery']) });
    const [entry] = restActions(h);
    expect(entry && restBudget(entry.facet, h)).toBe(3);
    expect(validateRecovery([3], 3, 5)).toBeNull();
    expect(validateRecovery([1, 2], 3, 5)).toBeNull();
    expect(validateRecovery([3, 1], 3, 5)).toBe('RECOVERY_BUDGET_EXCEEDED');
    expect(validateRecovery([6], 10, 5)).toBe('RECOVERY_BUDGET_EXCEEDED');
  });

  it('песнь отдыха: бард 2 — к6, бард 9 — к8', () => {
    const bard = (level: number) => holderOf({ level, features: new Set(['song-of-rest-d6']) });
    expect(songOfRestSides(bard(2))).toBe(6);
    expect(songOfRestSides(bard(9))).toBe(8);
    expect(songOfRestSides(holderOf())).toBe(0);
  });

  it('исчадная стойкость: выбранный вид; магическое оружие её гасит', () => {
    const h = holderOf({
      level: 10,
      features: new Set(['fiendish-resilience']),
      fiendishResilienceType: 'slashing',
    });
    expect(collectDefenses(h, { attack: { weapon: true } }).resistances).toEqual(['slashing']);
    expect(
      collectDefenses(h, { attack: { weapon: true, magicalWeapon: true } }).resistances,
    ).toEqual([]);
    expect(collectDefenses({ ...h, fiendishResilienceType: null }).resistances).toEqual([]);
  });
});

describe('фильтры целей (§4 плана w8)', () => {
  const info = (patch: Partial<TargetInfo> = {}): TargetInfo => ({
    type: 'humanoid',
    intelligence: 10,
    armored: false,
    immuneToCharm: false,
    hears: true,
    seesCaster: true,
    ...patch,
  });

  it('огр под «Удержанием личности» — отказ; гоблин — можно', () => {
    expect(targetVerdict(spellMechanic('hold-person'), info({ type: 'giant' }))).toBe('REJECT');
    expect(targetVerdict(spellMechanic('hold-person'), info())).toBe('ALLOWED');
  });

  it('скелет под «Массовым словом лечения» и зомби под «Удержанием чудовища» — нет эффекта', () => {
    expect(targetVerdict(spellMechanic('mass-healing-word'), info({ type: 'undead' }))).toBe(
      'NO_EFFECT',
    );
    expect(targetVerdict(spellMechanic('hold-monster'), info({ type: 'undead' }))).toBe(
      'NO_EFFECT',
    );
  });

  it('оглохший под «Злой насмешкой» — нет эффекта; волк под «Жутким смехом» — тоже', () => {
    expect(targetVerdict(spellMechanic('vicious-mockery'), info({ hears: false }))).toBe(
      'NO_EFFECT',
    );
    expect(perceivesOk(['HEAR'], { hears: true, seesCaster: false })).toBe(true);
    expect(
      targetVerdict(spellMechanic('hideous-laughter'), info({ type: 'beast', intelligence: 3 })),
    ).toBe('NO_EFFECT');
  });

  it('«Доспехи мага» на воина в кольчуге — отказ', () => {
    expect(targetVerdict(spellMechanic('mage-armor'), info({ armored: true }))).toBe('REJECT');
  });

  it('«Брызги кислоты»: соседи по диагонали — да, через клетку — нет', () => {
    const spread = spellMechanic('acid-splash')?.targetSpread;
    const a = { x: 1, y: 1, size: 'MEDIUM' as const };
    expect(spreadOk(spread, [a, { x: 2, y: 2, size: 'MEDIUM' }], 5)).toBe(true);
    expect(spreadOk(spread, [a, { x: 3, y: 1, size: 'MEDIUM' }], 5)).toBe(false);
  });

  it('«Цепная молния»: 35 футов от первой — нет, а между прочими — не важно', () => {
    const spread = spellMechanic('chain-lightning')?.targetSpread;
    const first = { x: 0, y: 0, size: 'MEDIUM' as const };
    expect(
      spreadOk(spread, [first, { x: 6, y: 0, size: 'MEDIUM' }, { x: 0, y: 6, size: 'MEDIUM' }], 5),
    ).toBe(true);
    expect(spreadOk(spread, [first, { x: 7, y: 0, size: 'MEDIUM' }], 5)).toBe(false);
  });

  it('«Массовое лечение ран»: все в сфере 30 футов от одной точки', () => {
    const spread = spellMechanic('mass-cure-wounds')?.targetSpread;
    const at = (x: number) => ({ x, y: 0, size: 'MEDIUM' as const });
    expect(spreadOk(spread, [at(0), at(12)], 5)).toBe(true);
    expect(spreadOk(spread, [at(0), at(13)], 5)).toBe(false);
  });

  it('«Неодолимый танец» и «Удержание» — вредные; «Невидимость» — нет', () => {
    expect(isHarmful(spellMechanic('irresistible-dance'), 'NONE')).toBe(true);
    expect(isHarmful(spellMechanic('hold-person'), 'SAVE_ONLY')).toBe(true);
    expect(isHarmful(spellMechanic('invisibility'), 'NONE')).toBe(false);
  });

  it('«Дребезги» — помеха оживлённым доспехам, не орку; «Усыхание» — растениям', () => {
    const shatter = spellMechanic('shatter');
    expect(
      saveDisadvantageByType(shatter, { type: 'construct', monsterCode: 'animated-armor' }),
    ).toBe(true);
    expect(saveDisadvantageByType(shatter, { type: 'humanoid', monsterCode: 'orc' })).toBe(false);
    expect(
      saveDisadvantageByType(spellMechanic('blight'), { type: 'plant', monsterCode: 'shrub' }),
    ).toBe(true);
  });

  it('«Усиление характеристики» — преимущество по выбранной характеристике', () => {
    expect(spellMechanicFor('enhance-ability', 'bull')?.modifiers?.checkAdvantage).toEqual([
      'strength',
    ]);
  });
});
