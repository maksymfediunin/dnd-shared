import { describe, expect, it } from 'vitest';
import {
  attackAdvantage,
  autoCritOn,
  combineConditions,
  effectiveSpeed,
  effectsOf,
  NO_EFFECTS,
} from './conditions.js';

describe('следствия одного состояния', () => {
  // По лежачему вблизи бьют с преимуществом, издали — с помехой. Это
  // единственное место, где две оси входящих атак действительно
  // расходятся, и ради него они и заведены.
  it('лежачий: вблизи преимущество, издали помеха', () => {
    const effects = effectsOf({ code: 'prone' });

    expect(effects.incomingNear).toBe('ADVANTAGE');
    expect(effects.incomingFar).toBe('DISADVANTAGE');
    expect(effects.ownAttacks).toBe('DISADVANTAGE');
  });

  it('невидимый бьёт с преимуществом, а по нему — с помехой', () => {
    const effects = effectsOf({ code: 'invisible' });

    expect(effects.ownAttacks).toBe('ADVANTAGE');
    expect(effects.incomingNear).toBe('DISADVANTAGE');
  });

  it('парализованный не действует, стоит и получает криты вблизи', () => {
    const effects = effectsOf({ code: 'paralyzed' });

    expect(effects.cannotAct).toBe(true);
    expect(effects.speed).toBe('ZERO');
    expect(effects.meleeAutoCrit).toBe(true);
  });

  // Глухота и очарование заводятся состояниями, но следствий в бою у
  // них нет: их предмета — слуха и социального взаимодействия — в
  // приложении не существует (§2 дизайна).
  it('глухота в бою не значит ничего', () => {
    expect(effectsOf({ code: 'deafened' })).toEqual(effectsOf({ code: 'charmed' }));
  });
});

describe('свёртка нескольких состояний', () => {
  it('ноль скорости бьёт половину', () => {
    const effects = combineConditions([{ code: 'exhaustion', level: 2 }, { code: 'grappled' }]);

    expect(effects.speed).toBe('ZERO');
  });

  it('запрет действовать приходит от любого источника', () => {
    expect(combineConditions([{ code: 'poisoned' }, { code: 'stunned' }]).cannotAct).toBe(true);
  });

  // Правило книги: преимущество и помеха гасят друг друга, сколько бы
  // их ни было. Слепой невидимка бьёт обычным броском.
  it('преимущество и помеха гасятся', () => {
    const effects = combineConditions([{ code: 'invisible' }, { code: 'poisoned' }]);

    expect(effects.ownAttacks).toBe('NORMAL');
  });

  it('пустой список — ничего не меняет', () => {
    expect(combineConditions([])).toEqual(NO_EFFECTS);
  });
});

describe('effectiveSpeed', () => {
  it('половина округляется вниз', () => {
    expect(effectiveSpeed(35, combineConditions([{ code: 'exhaustion', level: 2 }]))).toBe(17);
  });

  it('ноль остаётся нулём', () => {
    expect(effectiveSpeed(30, combineConditions([{ code: 'restrained' }]))).toBe(0);
  });
});

describe('attackAdvantage', () => {
  const normal = combineConditions([]);

  it('без состояний решает ручной выбор', () => {
    expect(
      attackAdvantage({
        manual: 'ADVANTAGE',
        attacker: normal,
        target: normal,
        isNear: true,
      }),
    ).toBe('ADVANTAGE');
  });

  // Ручной выбор — такой же источник, как состояние, а не последнее
  // слово: иначе отравленный бил бы с преимуществом, потому что игрок
  // так выбрал, и правило состояния ничего бы не значило.
  it('ручное преимущество гасится помехой от состояния', () => {
    expect(
      attackAdvantage({
        manual: 'ADVANTAGE',
        attacker: combineConditions([{ code: 'poisoned' }]),
        target: normal,
        isNear: true,
      }),
    ).toBe('NONE');
  });

  it('состояние цели считается по расстоянию', () => {
    const target = combineConditions([{ code: 'prone' }]);

    expect(attackAdvantage({ manual: 'NONE', attacker: normal, target, isNear: true })).toBe(
      'ADVANTAGE',
    );
    expect(attackAdvantage({ manual: 'NONE', attacker: normal, target, isNear: false })).toBe(
      'DISADVANTAGE',
    );
  });
});

describe('autoCritOn', () => {
  it('парализованный получает крит только вблизи', () => {
    const target = combineConditions([{ code: 'paralyzed' }]);

    expect(autoCritOn(target, true)).toBe(true);
    expect(autoCritOn(target, false)).toBe(false);
  });
});
