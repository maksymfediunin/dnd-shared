import type { SpellMechanic } from './spell-mechanics.js';

/**
 * Механика заклинаний сверх машинных полей SRD — по тексту описания
 * каждого из 319 заклинаний. Запись без полей кроме `gm` значит: всё,
 * что система может посчитать, она уже считает по SRD, а остальное — ведущему.
 * Правила чтения записи — `SpellMechanic` в `spell-mechanics.ts`.
 */
export const SPELL_MECHANICS: Readonly<Record<string, SpellMechanic>> = {
  'acid-arrow': {
    gm: 'Дополнительно 2d4 урона кислотой в конце следующего хода цели; при промахе половина начального урона и без последующего',
  },
  'acid-splash': { targets: { base: 2 }, targetSpread: { withinFeet: 5, from: 'EACH_OTHER' } },
  aid: { targets: { base: 3 }, hitPointBonus: { flat: 5, perSlot: 5 }, override: { heal: false } },
  alarm: {
    outOfCombat:
      'Время сотворения 1 минута, срок 8 часов; только оповещение о входе — разведка и охрана лагеря, следствий в бою нет.',
  },
  'alter-self': {
    gm: 'Выбор формы: водная адаптация, смена внешности или природное оружие 1d6 (+1 к атаке и урону) — решает ведущий',
  },
  'animal-friendship': {
    seen: 'TARGET',
    conditions: ['charmed'],
    targetFilter: { types: ['beast'], maxInt: 3 },
    perceives: ['SEE_CASTER', 'HEAR'],
    endsOnDamage: 'casterSide',
    endsOn: ['HARMED_BY_CASTER_SIDE'],
  },
  'animal-messenger': {
    seen: 'TARGET',
    outOfCombat: 'Доставка сообщения зверем за 24 часа — сюжетное, на поле боя следствий нет.',
  },
  'animal-shapes': { seen: 'TARGET', gm: 'Превращает согласных существ в зверей CR ≤4 — ведущий' },
  'animate-dead': {
    point: true,
    gm: 'Поднимает скелета или зомби под контроль заклинателя — ведущий добавляет вручную',
  },
  'animate-objects': {
    point: true,
    gm: 'Оживляет до десяти предметов как существ под контролем заклинателя — ведущий добавляет их по таблице размеров',
  },
  'antilife-shell': {
    gm: 'Барьер радиусом 10 фт движется с заклинателем и не пускает всех, кроме нежити и конструктов; ведущий следит за проходом',
  },
  'antimagic-field': {
    gm: 'Сфера 10 фт подавляет магию, призванных существ и магические предметы — ведущий',
  },
  'antipathy-sympathy': {
    gm: 'Аура притяжения/отторжения для указанного вида существ: Мдр-спасбросок, при антипатии испуг, повтор спасброска при выходе из зоны',
  },
  'arcane-eye': {
    outOfCombat:
      'Невидимое око для разведки: перенос зрения, ни урона, ни состояний — разведка вне программы.',
  },
  'arcane-hand': {
    seen: 'POINT',
    point: true,
    gm: 'Рука силы (КД 20, хиты = макс. хитам заклинателя): бонусным действием кулак (атака заклинанием, 4d8 силы), толчок, захват (удар 2d6+мод.) или заслон; ведущий управляет вручную',
  },
  'arcane-lock': {
    outOfCombat:
      'Запирает дверь (СЛ взлома +10) — двери и замки на сцене не моделируются, разведка.',
  },
  'arcane-sword': {
    seen: 'POINT',
    gm: 'Меч парит; бонусным действием каждый ход перемещать на 20 фт и повторять атаку заклинанием',
  },
  'arcanists-magic-aura': { outOfCombat: 'Обманывает предсказания и обнаружение — разведка.' },
  'astral-projection': {
    outOfCombat: 'Сотворение 1 час, путешествие по Астральному плану — вне сцены боя.',
  },
  augury: { outOfCombat: 'Предсказание исхода — ответ ведущего, не механика.' },
  awaken: {
    outOfCombat:
      'Сотворение 8 часов; разум зверю или растению — сюжетное (пробуждённый может потом участвовать в бою обычным статблоком `awakened-tree`/`awakened-shrub`).',
  },
  bane: {
    seen: 'TARGET',
    targets: { base: 3, perSlot: 1 },
    modifiers: { attackDice: '-1d4', saveDice: '-1d4' },
  },
  banishment: {
    seen: 'TARGET',
    targets: { base: 1, perSlot: 1 },
    conditions: ['incapacitated'],
    gm: 'Цель убирается с поля (демиплан); если родом из другого плана и концентрация держится минуту — не возвращается',
  },
  barkskin: { modifiers: { acMinimum: 16 } },
  'beacon-of-hope': {
    modifiers: { saveAdvantage: ['wisdom'], deathSaveAdvantage: true, healMaximized: true },
    // «Any number of creatures» — потолок входа.
    targets: { base: 20 },
  },
  'bestow-curse': {
    gm: 'Варианты «действие» (спасбросок Мдр или потеря хода) и «некротический урон» (+1к8 от заклинателя) — ведущий',
    variants: [
      { key: 'str', modifiers: { saveDisadvantage: ['strength'] } },
      { key: 'dex', modifiers: { saveDisadvantage: ['dexterity'] } },
      { key: 'con', modifiers: { saveDisadvantage: ['constitution'] } },
      { key: 'int', modifiers: { saveDisadvantage: ['intelligence'] } },
      { key: 'wis', modifiers: { saveDisadvantage: ['wisdom'] } },
      { key: 'cha', modifiers: { saveDisadvantage: ['charisma'] } },
      { key: 'attacks', modifiers: { ownAttacks: 'DISADVANTAGE', vsSourceOnly: true } },
      { key: 'action' },
      { key: 'necrotic' },
    ],
  },
  'black-tentacles': {
    seen: 'POINT',
    conditions: ['restrained'],
    zone: {
      on: ['ENTER', 'START'],
      conditions: ['restrained'],
      restrainedTakeDamage: true,
      difficult: 2,
      escape: { checks: ['strength', 'dexterity'], economy: 'ACTION' },
    },
  },
  'blade-barrier': {
    gm: 'Стена клинков даёт укрытие три четверти и труднопроходима; 6d10 рубящего при первом входе за ход или в начале хода — ведущий',
    zone: { on: ['ENTER', 'START'] },
  },
  bless: { targets: { base: 3, perSlot: 1 }, modifiers: { attackDice: '1d4', saveDice: '1d4' } },
  blight: {
    seen: 'TARGET',
    targetFilter: { excludeTypes: ['undead', 'construct'] },
    saveByType: { disadvantage: ['plant'] },
    maxDamageVs: ['plant'],
  },
  'blindness-deafness': {
    seen: 'TARGET',
    targets: { base: 1, perSlot: 1 },
    conditions: ['blinded'],
    repeatSave: true,
    variants: [
      { key: 'blinded', conditions: ['blinded'] },
      { key: 'deafened', conditions: ['deafened'] },
    ],
  },
  blink: { gm: 'Бросок d20 в конце хода: при 11+ уходит в Эфирный план до начала следующего хода' },
  blur: {
    selfOnly: true,
    modifiers: { incoming: 'DISADVANTAGE', sightOnlyIncoming: true },
  },
  'branding-smite': {
    selfOnly: true,
    modifiers: { weaponDamage: { dice: '2d6', type: 'radiant', perSlot: 1 } },
    consumedOnOwnAttack: true,
    // Поражённый светится и не может быть невидимым — эффект переходит на него.
    revealInvisible: true,
    light: { bright: 0, dim: 5, on: 'BEARER' },
    override: { damage: false },
  },
  'burning-hands': {},
  'call-lightning': {
    seen: 'POINT',
    gm: 'Каждый ход действием повтор удара в ту же или другую точку; +1d10 урона в грозу',
    override: { saveAbility: 'dexterity', saveHalfOnSuccess: true },
  },
  'calm-emotions': {
    gm: 'Подавляет очарование/испуг у гуманоидов либо делает безразличными к выбранным существам (спасбросок Харизмы, можно провалить намеренно)',
  },
  'chain-lightning': {
    seen: 'TARGET',
    targets: { base: 4, perSlot: 1 },
    targetSpread: { withinFeet: 30, from: 'PRIMARY' },
  },
  'charm-person': {
    seen: 'TARGET',
    targets: { base: 1, perSlot: 1 },
    conditions: ['charmed'],
    targetFilter: { types: ['humanoid'] },
    targetSpread: { withinFeet: 30, from: 'EACH_OTHER' },
    saveAdvIfHostile: true,
    endsOnDamage: 'casterSide',
    endsOn: ['HARMED_BY_CASTER_SIDE'],
  },
  'chill-touch': {
    modifiers: { noHealing: true },
    until: { who: 'CASTER', at: 'START' },
    // Два срока в одном заклинании — два эффекта на нежити (разбор §4).
    vsTypes: {
      types: ['undead'],
      modifiers: { ownAttacks: 'DISADVANTAGE', vsSourceOnly: true },
      until: { who: 'CASTER', at: 'END' },
    },
  },
  clairvoyance: { outOfCombat: 'Сотворение 10 минут; невидимый сенсор — разведка.', point: true },
  clone: { outOfCombat: 'Сотворение 1 час, клон на случай смерти — вне боя.' },
  cloudkill: {
    zone: {
      on: ['ENTER', 'START'],
      obscure: 'HEAVY',
      move: { economy: 'CASTER_TURN_START', feet: 10, direction: 'AWAY_FROM_CASTER' },
      dispersedBy: 'WIND',
    },
  },
  'color-spray': {
    conditions: ['blinded'],
    perceives: ['SEE_CASTER'],
    scripted: true,
    until: { who: 'CASTER', at: 'END' },
  },
  command: {
    seen: 'TARGET',
    targets: { base: 1, perSlot: 1 },
    gm: 'Односложная команда (подойти, бросить, бежать, ничком, стоять); поведение цели решает ведущий; не действует на нежить и не понимающих язык',
  },
  commune: { outOfCombat: 'Сотворение 1 минута, три вопроса божеству — ответ ведущего.' },
  'commune-with-nature': { outOfCombat: 'Сотворение 1 минута, сведения о местности — разведка.' },
  'comprehend-languages': { outOfCombat: 'Понимание языков — общение.' },
  compulsion: {
    seen: 'TARGET',
    gm: 'Любое число целей слышащих заклинателя; бонусным действием задаёт направление, цели обязаны идти туда; повторный спасбросок после движения',
  },
  'cone-of-cold': {},
  confusion: {
    modifiers: { noReactions: true },
    repeatSave: true,
    gm: 'В начале хода цель бросает d10: случайное движение, бездействие, атака ближнего боя по случайной цели или обычные действия',
  },
  'conjure-animals': {
    seen: 'POINT',
    point: true,
    gm: 'Призывает зверей (феи) — ведущий добавляет их вручную',
  },
  'conjure-celestial': {
    seen: 'POINT',
    point: true,
    gm: 'Призывает небожителя CR 4 (CR 5 на 9-м круге) — ведущий добавляет вручную',
  },
  'conjure-elemental': {
    gm: 'Призывает элементаля CR 5 — ведущий добавляет его; при потере концентрации тот становится враждебным',
  },
  'conjure-fey': {
    seen: 'POINT',
    point: true,
    gm: 'Призывает фею CR 6 — ведущий добавляет её; при потере концентрации становится враждебной',
  },
  'conjure-minor-elementals': {
    seen: 'POINT',
    point: true,
    gm: 'Призывает элементалей — ведущий добавляет их вручную',
  },
  'conjure-woodland-beings': {
    seen: 'POINT',
    point: true,
    gm: 'Призывает фей — ведущий добавляет их вручную',
  },
  'contact-other-plane': {
    outOfCombat:
      'Сотворение 1 минута, пять вопросов сущности; самоспасбросок и безумие до долгого отдыха — вне сцены.',
    override: { saveAbility: null },
  },
  contagion: {
    gm: 'Болезнь на выбор (слепота, лихорадка, гниль, огонь разума, припадок, слизистая гибель); в конце каждого хода цели спасбросок Телосложения, три провала — болезнь на срок, три успеха — исцеление',
  },
  contingency: { gm: 'Отложенное заклинание до 5-го круга срабатывает по условию; решает ведущий' },
  'continual-flame': { light: { bright: 20, dim: 20, on: 'OBJECT' } },
  'control-water': { gm: 'Управление водой: наводнение, расступание, перенаправление, водоворот' },
  'control-weather': {
    outOfCombat: 'Сотворение 10 минут, перемена погоды за 1d4×10 минут — вне сцены.',
  },
  counterspell: {
    gm: 'Прерывает чужое заклинание; проверка заклинательной характеристики против 10 + круг — решает ведущий',
    reaction: true,
  },
  'create-food-and-water': { outOfCombat: 'Еда и вода — быт.', point: true },
  'create-or-destroy-water': { gm: 'Создание или уничтожение воды, решает ведущий' },
  'create-undead': {
    point: true,
    gm: 'Превращает до трёх трупов в упырей под контролем заклинателя на 24 часа; только ночью',
  },
  creation: {
    outOfCombat: 'Сотворение 1 минута, неживой предмет — предметы сцены не моделируются.',
    point: true,
    override: { area: null },
  },
  'dancing-lights': {
    point: true,
    zone: { move: { economy: 'BONUS_ACTION', feet: 60, points: 4 } },
    light: { bright: 0, dim: 10, on: 'ZONE' },
  },
  darkvision: { modifiers: { senses: { darkvision: 60 } } },
  daylight: {
    light: { bright: 60, dim: 60, on: 'OBJECT' },
    zone: { dispelDarkness: { upToLevel: 3 } },
  },
  'death-ward': {
    gm: 'Первое падение до 0 хитов вместо этого оставляет 1 хит, и заклинание кончается',
  },
  'delayed-blast-fireball': {
    gm: 'Урон при окончании заклинания, а не при сотворении: база 12d6 (+1d6 за каждый конец хода заклинателя без взрыва); бусину можно коснуться/бросить на 40 фт',
  },
  demiplane: { seen: 'POINT', point: true, gm: 'Дверь в карманное измерение — ведущий' },
  'detect-evil-and-good': { outOfCombat: 'Обнаружение — разведка.' },
  'detect-magic': { outOfCombat: 'Обнаружение — разведка.' },
  'detect-poison-and-disease': { outOfCombat: 'Обнаружение — разведка.' },
  'detect-thoughts': {
    seen: 'TARGET',
    gm: 'Чтение мыслей, зондирование (спасбросок Мудрости) — решает ведущий',
  },
  'dimension-door': {
    teleportFeet: 500,
    gm: 'Можно взять одного согласного союзного существа в пределах 5 фт',
    override: { damage: false },
  },
  'disguise-self': { outOfCombat: 'Иллюзия внешности — общение и проникновение.' },
  disintegrate: {
    seen: 'TARGET',
    gm: 'При доведении до 0 хитов цель обращается в прах; предметы и творения силы уничтожаются автоматически',
    override: { area: null },
  },
  'dispel-evil-and-good': {
    modifiers: {
      incoming: 'DISADVANTAGE',
      incomingFrom: ['aberration', 'celestial', 'elemental', 'fey', 'fiend', 'undead'],
    },
    selfOnly: true,
    gm: 'Действием — изгнание или снятие чар (спасбросок Харизмы) — ведущий',
    override: { saveAbility: null },
  },
  'dispel-magic': { gm: 'Снимает заклинания с цели; проверки для 4-го круга и выше — ведущий' },
  divination: { outOfCombat: 'Ответ о ближайших 7 днях — ведущий.' },
  'divine-favor': {
    modifiers: { weaponDamage: { dice: '1d4', type: 'radiant' } },
    selfOnly: true,
    override: { damage: false },
  },
  'divine-word': {
    seen: 'TARGET',
    gm: 'Эффект по текущим хитам цели на провале Хар (одна ступень — по текущим хитам): ≤50 хп оглохла 1 мин; ≤40 оглохла и ослепла 10 мин; ≤30 ослепла, оглохла и ошеломлена 1 час; ≤20 мгновенная смерть; небожителей, элементалей, фей и исчадий изгоняет в родной план',
  },
  'dominate-beast': {
    seen: 'TARGET',
    conditions: ['charmed'],
    gm: 'Зверь повинуется заклинателю; преимущество на спасбросок при драке с заклинателем; новый спасбросок при каждом уроне; полный контроль действием',
    saveOnDamage: true,
  },
  'dominate-monster': {
    seen: 'TARGET',
    conditions: ['charmed'],
    gm: 'Телепатическое управление очарованным; повторный Мдр-спасбросок при каждом полученном уроне; при спасброске с преимуществом, если заклинатель или союзники сражаются с целью; полный контроль действием до конца следующего хода',
    saveOnDamage: true,
  },
  'dominate-person': {
    seen: 'TARGET',
    conditions: ['charmed'],
    gm: 'Гуманоид очарован; после каждого получения урона новый спасбросок Мудрости, успех снимает; действием полный контроль до конца следующего хода; преимущество на спасбросок, если с ним сражаются',
    saveOnDamage: true,
  },
  dream: {
    outOfCombat: 'Сотворение 1 минута, цель спит — послание и кошмар вне сцены.',
    override: { damage: false, saveAbility: null },
  },
  druidcraft: { outOfCombat: 'Мелкие природные эффекты — без следствий.', point: true },
  earthquake: {
    seen: 'POINT',
    gm: 'Зона 100 фт — труднопроходимая; на земле существа: Тел-спасбросок на сброс концентрации, Лов-спасбросок на сбивание с ног (при сотворении и в конце хода заклинателя); трещины, обрушение построек (50 дробящего) — ведущий',
  },
  'eldritch-blast': { rays: { byCasterLevel: { '1': 1, '5': 2, '11': 3, '17': 4 }, dice: '1d10' } },
  'enhance-ability': {
    targets: { base: 1, perSlot: 1 },
    variants: [
      {
        key: 'bear',
        temporaryHitPoints: { dice: '2d6' },
        modifiers: { checkAdvantage: ['constitution'] },
      },
      { key: 'bull', modifiers: { checkAdvantage: ['strength'] } },
      { key: 'cat', modifiers: { checkAdvantage: ['dexterity'] } },
      { key: 'eagle', modifiers: { checkAdvantage: ['charisma'] } },
      { key: 'fox', modifiers: { checkAdvantage: ['intelligence'] } },
      { key: 'owl', modifiers: { checkAdvantage: ['wisdom'] } },
    ],
  },
  'enlarge-reduce': {
    seen: 'TARGET',
    modifiers: { saveAdvantage: ['strength'] },
    gm: 'Размер фишки на карте ведущий меняет руками',
    willingAllies: true,
    variants: [
      {
        key: 'enlarge',
        modifiers: { saveAdvantage: ['strength'], weaponDamage: { dice: '1d4', type: 'WEAPON' } },
      },
      {
        key: 'reduce',
        modifiers: {
          saveDisadvantage: ['strength'],
          weaponDamage: { dice: '-1d4', type: 'WEAPON' },
        },
      },
    ],
  },
  entangle: {
    conditions: ['restrained'],
    zone: { difficult: 2, ground: true, escape: { checks: ['strength'], economy: 'ACTION' } },
    tags: ['impedingPlants'],
  },
  enthrall: {
    seen: 'TARGET',
    // Помеха Внимательности — ко всем, кроме заклинателя (`vsSourceOnly` здесь не нужен:
    // помеху навыка снимает «против наложившего» само чтение).
    modifiers: { checkDisadvantage: ['perception'] },
    perceives: ['HEAR'],
    saveAdvIfHostile: true,
    targetFilter: { canBeCharmed: true },
    endsOn: ['CASTER_INCAPACITATED'],
  },
  etherealness: { gm: 'Переход в Эфирную границу; не взаимодействует с обычным планом' },
  'expeditious-retreat': { gm: 'Рывок бонусным действием каждый ход, пока длится заклинание' },
  eyebite: {
    seen: 'TARGET',
    conditions: ['frightened'],
    gm: 'Каждый ход действием — новая цель в 60 футах; паника — бегство от заклинателя',
    override: { range: '60 feet' },
    variants: [
      { key: 'asleep', conditions: ['unconscious'], endsOnDamage: true },
      { key: 'panicked', conditions: ['frightened'] },
      { key: 'sickened', modifiers: { ownAttacks: 'DISADVANTAGE' }, repeatSave: true },
    ],
  },
  fabricate: { outOfCombat: 'Сотворение 10 минут, ремесло — быт.', point: true },
  'faerie-fire': {
    modifiers: { incoming: 'ADVANTAGE', incomingNeedsSight: true },
    revealInvisible: true,
    light: { bright: 0, dim: 10, on: 'BEARER' },
  },
  'faithful-hound': {
    seen: 'POINT',
    point: true,
    gm: 'Пёс невидим и неуязвим, лает на приближение, в начале хода заклинателя кусает врага рядом: 4d8 колющего',
    override: { attackType: null, damage: false },
  },
  'false-life': {
    temporaryHitPoints: { dice: '1d4', flat: 4, perSlot: 5 },
    selfOnly: true,
    override: { heal: false },
  },
  fear: {
    conditions: ['frightened'],
    repeatSave: { at: 'END', when: 'NO_LINE_OF_SIGHT' },
    gm: 'Цель роняет удерживаемое и каждый ход бежит от заклинателя (Dash)',
  },
  'feather-fall': {
    // Встроенный ответ окна падения (`FEATHER_FALL`), как «Щит».
    targets: { base: 5 },
    reaction: true,
  },
  feeblemind: {
    seen: 'TARGET',
    gm: 'Провал Инт-спасброска: Инт и Хар становятся 1, не может колдовать и говорить; повтор спасброска раз в 30 дней',
  },
  'find-familiar': { point: true, gm: 'Призывает фамильяра — ведущий добавляет его вручную' },
  'find-steed': { point: true, gm: 'Призывает скакуна — ведущий добавляет его вручную' },
  'find-the-path': { outOfCombat: 'Путь к месту — разведка.' },
  'find-traps': { outOfCombat: 'Обнаружение ловушек — разведка.', selfOnly: true },
  'finger-of-death': {
    seen: 'TARGET',
    gm: 'Гуманоид, убитый заклинанием, встаёт зомби под контролем заклинателя',
  },
  'fire-bolt': {},
  'fire-shield': {
    modifiers: { resistances: ['cold'] },
    gm: 'Атакующий вблизи получает 2к8 огня (тёплый щит) или холода (холодный) — ведущий',
    override: { damage: false, area: null },
    variants: [
      { key: 'warm', modifiers: { resistances: ['cold'] } },
      { key: 'chill', modifiers: { resistances: ['fire'] } },
    ],
  },
  'fire-storm': {
    gm: 'Область — до десяти 10-футовых кубов по выбору заклинателя; поджигает предметы',
  },
  'flame-blade': {
    gm: 'Клинок светит ярко на 10 фт и тускло ещё на 10; отпущенный клинок вызывают снова бонусным действием',
    selfOnly: true,
    bearer: 'CASTER',
    // Атака — не при сотворении, а действием потом (`followUp`); поля
    // атаки нужны ей: ближняя атака заклинанием и кости по кругу ячейки.
    override: { attackType: 'MELEE' },
    followUp: { economy: 'ACTION', kind: 'REPEAT_ATTACK', attack: 'MELEE_SPELL' },
  },
  'flame-strike': { override: { damageTypes: ['fire', 'radiant'] } },
  'flaming-sphere': {
    override: {
      saveAbility: 'dexterity',
      saveHalfOnSuccess: true,
      area: { shape: 'SPHERE', size: 5 },
    },
    zone: { on: ['END'], move: { economy: 'BONUS_ACTION', feet: 30, ram: true } },
    light: { bright: 20, dim: 20, on: 'ZONE' },
  },
  'flesh-to-stone': {
    seen: 'TARGET',
    conditions: ['restrained'],
    gm: 'В конце каждого хода цели спасбросок Телосложения: три успеха снимают, три провала — окаменение (petrified) на срок; счёт ведёт ведущий',
  },
  'floating-disk': { seen: 'POINT', outOfCombat: 'Диск для груза — быт.', point: true },
  fly: {
    targets: { base: 1, perSlot: 1 },
    modifiers: { speeds: { fly: 60 } },
    falls: 'FLY',
  },
  forbiddance: {
    gm: 'Защита от телепорта и пространственных перемещений; выбранные типы существ получают 5d10 излучения или некротики при входе или начале хода',
    override: { area: null },
  },
  forcecage: {
    gm: 'Невидимая клетка/коробка из силы; телепортация изнутри требует Хар-спасбросок — ведущий',
  },
  foresight: {
    modifiers: {
      ownAttacks: 'ADVANTAGE',
      incoming: 'DISADVANTAGE',
      saveAdvantage: [
        'strength',
        'dexterity',
        'constitution',
        'intelligence',
        'wisdom',
        'charisma',
      ],
      checkAdvantage: ['ALL'],
      cannotBeSurprised: true,
    },
  },
  'freedom-of-movement': {
    gm: 'Не замедляется сложной местностью и магией; освобождается за 5 фт движения — решает ведущий',
  },
  'freezing-sphere': {
    gm: 'Замораживает воду на 6 дюймов; можно оставить шар и метнуть позже; взрыв через 1 минуту',
  },
  'gaseous-form': {
    modifiers: { saveAdvantage: ['strength', 'dexterity', 'constitution'] },
    gm: 'Туманное облако: полёт 10 фт, сопротивление немагическому урону, не может атаковать и колдовать',
  },
  gate: {
    seen: 'POINT',
    point: true,
    gm: 'Портал на другой план, может притянуть названное существо — ведущий',
  },
  geas: {
    seen: 'TARGET',
    outOfCombat:
      'Срок 30 дней, служба или запрет; урон за неповиновение раз в день — сюжет. Очарование, если оно важно в бою, переносится как эффект персонажа (`characterEffect`).',
  },
  'gentle-repose': { outOfCombat: 'Сохраняет труп — вне боя.' },
  'giant-insect': {
    point: true,
    gm: 'Превращает насекомых в гигантских — ведущий добавляет их вручную',
  },
  glibness: { outOfCombat: 'Проверки Харизмы и обман детекторов лжи — общение.' },
  'globe-of-invulnerability': {
    selfOnly: true,
    gm: 'Заклинания до 5-го круга извне не действуют на существ внутри сферы 10 фт; ведущий следит за этим',
  },
  'glyph-of-warding': {
    gm: 'Ловушка срабатывает по условию ведущего: взрыв 20 фт либо хранимое заклинание',
  },
  goodberry: { selfOnly: true, items: { code: 'goodberry', count: 10 } },
  grease: {
    conditions: ['prone'],
    zone: {
      on: ['ENTER', 'END'],
      onCast: true,
      conditions: ['prone'],
      difficult: 2,
      ground: true,
    },
  },
  'greater-invisibility': { conditions: ['invisible'] },
  'greater-restoration': {
    removes: { choose: 1, conditions: ['charmed', 'petrified', 'exhaustion'] },
    gm: 'Вместо состояния может снять проклятие, снижение характеристики или максимума хитов — ведущий',
  },
  'guardian-of-faith': {
    seen: 'POINT',
    zone: { on: ['ENTER'], hostileOnly: true, damageCap: 60 },
  },
  'guards-and-wards': {
    outOfCombat:
      'Оборона здания на 24 часа, сотворение 10 минут; боевые части (туман, паутина) ведущий ставит на сцену заготовкой зон соответствующих заклинаний.',
    override: { area: null },
  },
  guidance: { modifiers: { checkDice: '1d4' } },
  'guiding-bolt': {
    modifiers: { incoming: 'ADVANTAGE' },
    consumedOnIncoming: true,
    until: { who: 'CASTER', at: 'END' },
  },
  'gust-of-wind': {
    lineWidthFeet: 10,
    zone: {
      on: ['START'],
      push: { feet: 15, on: ['START'], save: 'strength', direction: 'ALONG_LINE' },
      approachCost: 2,
      disperses: true,
      move: { economy: 'BONUS_ACTION', rotate: true },
    },
  },
  hallow: {
    gm: 'Освящённая зона 60 фт: небожители, элементали, феи, исчадия и нежить не входят, снимает очарование/испуг/одержимость; плюс дополнительный эффект на выбор (мужество, страх, тьма, свет и др.) со спасброском Харизмы при входе',
    override: { saveAbility: null },
  },
  'hallucinatory-terrain': {
    outOfCombat:
      'Сотворение 10 минут, иллюзия местности на сутки — обман путников; физически не меняет проходимость.',
  },
  harm: {
    seen: 'TARGET',
    gm: 'Урон не опускает хиты цели ниже 1; при провале максимум хитов снижается на 1 час на величину урона',
  },
  haste: {
    seen: 'TARGET',
    modifiers: { acBonus: 2, speedMultiplier: 2, saveAdvantage: ['dexterity'] },
    gm: 'Дополнительное действие (атака одним оружием, Dash, Disengage, Hide, Use an Object); по окончании цель теряет ход',
  },
  heal: {
    seen: 'TARGET',
    removesConditions: ['blinded', 'deafened'],
    gm: 'Лечит 70 хитов (+10 за круг выше 6-го); также снимает болезни; не действует на конструктов и нежить',
  },
  'heat-metal': {
    seen: 'TARGET',
    gm: '2d8 огнём существу в контакте с предметом при сотворении и затем бонусным действием каждый ход; держащий/носящий делает спасбросок Телосложения, иначе бросает предмет, а если не бросил — помеха на атаки и проверки',
    override: { saveAbility: null },
  },
  'hellish-rebuke': {
    gm: 'Реакция на получение урона от существа; цель — нанёсшее урон существо',
    reaction: true,
  },
  'heroes-feast': {
    point: true,
    gm: 'Пир на час; до двенадцати существ получают иммунитет к яду и испугу, преимущество на спасброски Мудрости и +2d10 к максимуму хитов на 24 часа',
  },
  heroism: {
    temporaryHitPoints: { addModifier: true },
    removesConditions: ['frightened'],
    temporaryHitPointsEachTurn: { addModifier: true },
    conditionImmunities: ['frightened'],
  },
  'hideous-laughter': {
    seen: 'TARGET',
    conditions: ['prone', 'incapacitated'],
    repeatSave: true,
    saveOnDamage: 'ADVANTAGE',
    modifiers: { cannotStand: true },
    targetFilter: { minInt: 5 },
  },
  'hold-monster': {
    seen: 'TARGET',
    targets: { base: 1, perSlot: 1 },
    conditions: ['paralyzed'],
    repeatSave: true,
    targetFilter: { excludeTypes: ['undead'] },
    targetSpread: { withinFeet: 30, from: 'EACH_OTHER' },
  },
  'hold-person': {
    seen: 'TARGET',
    targets: { base: 1, perSlot: 1 },
    conditions: ['paralyzed'],
    repeatSave: true,
    targetFilter: { types: ['humanoid'] },
    targetSpread: { withinFeet: 30, from: 'EACH_OTHER' },
  },
  'holy-aura': {
    modifiers: {
      saveAdvantage: [
        'strength',
        'dexterity',
        'constitution',
        'intelligence',
        'wisdom',
        'charisma',
      ],
      incoming: 'DISADVANTAGE',
    },
    gm: 'Цели — существа по выбору заклинателя в 30 фт; когда исчадие или нежить попадает ближней атакой — Тел-спасбросок или ослепление до конца заклинания',
    override: { area: null },
    targets: { base: 12 },
  },
  'hypnotic-pattern': {
    conditions: ['charmed', 'incapacitated'],
    modifiers: { speedMultiplier: 0 },
    gm: 'Очнуться можно и встряской союзника — действием; ведущий снимает руками',
    override: { area: { shape: 'CUBE', size: 30 } },
    endsOnDamage: true,
  },
  'ice-storm': {
    override: { damageTypes: ['bludgeoning', 'cold'] },
    zone: { difficult: 2, ground: true, lasts: 'CASTER_NEXT_TURN_END' },
  },
  identify: { outOfCombat: 'Свойства предмета — вне боя.' },
  'illusory-script': { outOfCombat: 'Тайнопись — вне боя.' },
  imprisonment: {
    seen: 'TARGET',
    conditions: ['restrained'],
    gm: 'Форма заточения на выбор: Цепи (опутана, самый боевой вариант), Погребение, Скрытая тюрьма, Миниатюрное заточение, Сон; условие освобождения задаёт заклинатель',
  },
  'incendiary-cloud': {
    zone: {
      on: ['ENTER', 'END'],
      onCast: true,
      obscure: 'HEAVY',
      move: { economy: 'CASTER_TURN_START', feet: 10, direction: 'AWAY_FROM_CASTER' },
      dispersedBy: 'WIND',
    },
  },
  'insect-plague': {
    zone: { on: ['ENTER', 'END'], onCast: true, obscure: 'LIGHT', difficult: 2 },
  },
  'instant-summons': { outOfCombat: 'Вызов предмета в руку — предметы вне механики.' },
  invisibility: {
    targets: { base: 1, perSlot: 1 },
    conditions: ['invisible'],
    endsWhenBearerAttacks: true,
  },
  'irresistible-dance': {
    seen: 'TARGET',
    modifiers: {
      saveDisadvantage: ['dexterity'],
      ownAttacks: 'DISADVANTAGE',
      incoming: 'ADVANTAGE',
    },
    gm: 'Цель тратит всё движение на танец, не покидая клетки; действием делает спасбросок Мудрости, успех кончает заклинание; не действует на тех, кого нельзя очаровать',
  },
  jump: { gm: 'Дальность прыжка утраивается' },
  knock: { outOfCombat: 'Открывает замок — двери вне механики.', point: true },
  'legend-lore': { outOfCombat: 'Знание преданий — вне боя.' },
  'lesser-restoration': {
    removes: { choose: 1, conditions: ['blinded', 'deafened', 'paralyzed', 'poisoned'] },
    gm: 'Вместо состояния может снять болезнь — ведущий',
  },
  levitate: {
    seen: 'TARGET',
    // Спасбросок Телосложения — только у несогласного.
    override: { saveAbility: 'constitution' },
    willingAllies: true,
    modifiers: { levitating: true },
    falls: 'LEVITATE',
  },
  light: {
    // Спасбросок Ловкости — только у враждебного носителя предмета.
    willingAllies: true,
    light: { bright: 20, dim: 20, on: 'OBJECT' },
  },
  'locate-animals-or-plants': { outOfCombat: 'Поиск — разведка.' },
  'locate-creature': { outOfCombat: 'Поиск — разведка.' },
  'locate-object': { outOfCombat: 'Поиск — разведка.' },
  longstrider: { targets: { base: 1, perSlot: 1 }, modifiers: { speedBonusFeet: 10 } },
  'mage-armor': {
    modifiers: { acBase: 13 },
    targetFilter: { noArmor: true },
    endsOn: ['ARMOR_DONNED'],
  },
  'mage-hand': { outOfCombat: 'Атаковать не может, предметы сцены не моделируются.', point: true },
  'magic-circle': {
    seen: 'POINT',
    gm: 'Круг против выбранного типа существ: не входят, помеха атакам по целям внутри, нельзя очаровать/испугать',
    override: { saveAbility: null },
  },
  'magic-jar': {
    gm: 'Вселение души в контейнер и захват тела гуманоида (спасбросок Хар) — ведущий ведёт вручную',
  },
  'magic-missile': {
    seen: 'TARGET',
    targets: { base: 3, perSlot: 1 },
    rays: { base: 3, perSlot: 1, dice: '1d4 + 1' },
  },
  'magic-mouth': { outOfCombat: 'Говорящие уста — сюжет.', point: true },
  'magic-weapon': {
    weaponEnchant: { attack: 1, damage: 1, bySlot: { 4: 2, 6: 3 }, magical: true },
  },
  'magnificent-mansion': { outOfCombat: 'Убежище — вне сцены.' },
  'major-image': {
    seen: 'POINT',
    point: true,
    gm: 'Иллюзия размером до куба 20 фт — ведущий решает, кто её распознал',
  },
  'mass-cure-wounds': {
    targets: { base: 6 },
    override: { area: null },
    targetFilter: { excludeTypes: ['undead', 'construct'] },
    targetSpread: { withinFeet: 30, from: 'POINT' },
  },
  'mass-heal': {
    seen: 'TARGET',
    removesConditions: ['blinded', 'deafened'],
    healPool: { total: 700, distribute: 'CASTER' },
    targetFilter: { excludeTypes: ['undead', 'construct'] },
    gm: 'Излечивает болезни',
    targets: { base: 12 },
  },
  'mass-healing-word': {
    seen: 'TARGET',
    targets: { base: 6 },
    targetFilter: { excludeTypes: ['undead', 'construct'] },
  },
  'mass-suggestion': {
    seen: 'TARGET',
    targets: { base: 12 },
    gm: 'Внушение на 1–2 фразы; отыгрывает ведущий',
    endsOnDamage: 'casterSide',
  },
  maze: {
    seen: 'TARGET',
    gm: 'Изгнание в лабиринт, цель действием пытается сбежать: проверка Инт СЛ 20 — ведущий',
  },
  'meld-into-stone': {
    gm: 'Заклинатель сливается с камнем и скрыт; урон при разрушении камня — ведущий',
  },
  mending: { outOfCombat: 'Починка — вне боя.' },
  message: { outOfCombat: 'Шёпот — общение.' },
  'meteor-swarm': {
    seen: 'POINT',
    gm: 'Четыре точки взрыва, области могут пересекаться — существо получает урон один раз; урон двух типов: 20d6 огня и 20d6 дробящего; сфера обходит углы; поджигает предметы',
    override: { damageTypes: ['fire', 'bludgeoning'] },
  },
  'mind-blank': {
    modifiers: { damageImmunities: ['psychic'] },
    conditionImmunities: ['charmed'],
  },
  'minor-illusion': {
    point: true,
    gm: 'Иллюзия звука или образа; проверка Расследования против СЛ заклинателя',
  },
  'mirage-arcane': { outOfCombat: 'Иллюзия местности на 10 дней — вне сцены.' },
  'mirror-image': {
    gm: 'Три двойника перенаправляют атаки по d20 (6+/8+/11+ по числу двойников), КД двойника 10 + Лов, ломаются от попадания',
  },
  mislead: {
    conditions: ['invisible'],
    endsWhenBearerAttacks: true,
    selfOnly: true,
    gm: 'Иллюзорный двойник заклинателя; ведущий двигает его вручную',
  },
  'misty-step': { seen: 'POINT', teleportFeet: 30 },
  'modify-memory': {
    seen: 'TARGET',
    conditions: ['charmed', 'incapacitated'],
    saveAdvIfHostile: true,
    endsOnDamage: true,
    endsOn: ['TARGETED_BY_SPELL'],
  },
  moonbeam: {
    // Тусклый свет на клетках луча; сдвиг действием на 60 фт — не «вход» (Р14).
    zone: { on: ['ENTER', 'START'], move: { economy: 'ACTION', feet: 60 }, heightFeet: 40 },
    light: { bright: 0, dim: 0, on: 'ZONE' },
  },
  'move-earth': {
    outOfCombat: 'Перекройка земли раз в 10 минут — вне боя.',
    point: true,
    override: { area: null },
  },
  nondetection: { outOfCombat: 'Защита от прорицаний — вне боя.' },
  'pass-without-trace': {
    selfOnly: true,
    // Аура 30 футов: союзники в ней получают +10 к Скрытности (читает проверка).
    modifiers: { checkBonus: { stealth: 10 } },
  },
  passwall: { seen: 'POINT', point: true, gm: 'Проход в стене 5×8×20 фт; сюжетное' },
  'phantasmal-killer': {
    seen: 'TARGET',
    conditions: ['frightened'],
    repeatSave: {
      at: 'START',
      ability: 'wisdom',
      onFail: { damage: '4d10', type: 'psychic', perSlot: '1d10' },
    },
    override: { damage: false },
  },
  'phantom-steed': {
    point: true,
    gm: 'Призрачный конь (скорость 100 фт) — ведущий добавляет вручную',
  },
  'planar-ally': {
    outOfCombat:
      'Сотворение 10 минут, торг о службе — сюжет; пришедший союзник выходит в бой обычным участником.',
    point: true,
  },
  'planar-binding': { outOfCombat: 'Сотворение 1 час — вне боя.' },
  'plane-shift': {
    gm: 'Перенос на другой план; на недобровольную цель — атака заклинанием ближнего боя, при попадании Хар-спасбросок и изгнание на выбранный план',
  },
  'plant-growth': {
    point: true,
    // Вариант «за действие»: заросли сферой 100 фт, шаг вчетверо; восьмичасовой
    // вариант — вне боя. Стены, пропасти, лава и глубокая вода не зарастают.
    override: { area: { shape: 'SPHERE', size: 100 } },
    zone: { difficult: 4, ground: true },
    tags: ['impedingPlants'],
  },
  polymorph: {
    seen: 'TARGET',
    gm: 'Превращение в зверя: ведущий подменяет статы и хиты цели вручную; при 0 хитов форма спадает',
  },
  'power-word-kill': { seen: 'TARGET', killThreshold: 100 },
  'power-word-stun': {
    seen: 'TARGET',
    conditions: ['stunned'],
    repeatSave: 'constitution',
    hpThreshold: 150,
  },
  'prayer-of-healing': {
    seen: 'TARGET',
    outOfCombat:
      'Сотворение 10 минут — в бою не сотворяется (`combatCastingTime` = null); вне сцены лечение уже считается.',
    targets: { base: 6 },
  },
  prestidigitation: { outOfCombat: 'Фокусы — без следствий.', point: true },
  'prismatic-spray': {
    gm: 'Для каждой цели d8 определяет луч: 1 огонь, 2 кислота, 3 электричество, 4 яд, 5 холод — по 10d6 (Лов, половина); 6 Индиго — опутана, 3 Тел-спасброска до окаменения/снятия; 7 Фиолетовый — ослеплена, Мдр-спасбросок, перенос на другой план; 8 — два луча',
  },
  'prismatic-wall': {
    seen: 'POINT',
    gm: 'Стена из семи слоёв: ослепление Тел-спасброском при приближении, каждый слой при прохождении — Лов-спасбросок (огонь/кислота/электричество/яд/холод 10d6, опутывание, ослепление и перенос) — ведущий',
  },
  'private-sanctum': { outOfCombat: 'Охрана помещения на сутки — разведка и защита.' },
  'produce-flame': {
    gm: 'Пламя в руке 10 минут как источник света; бросок пламени завершает заклинание',
    override: { range: '30 feet' },
  },
  'programmed-illusion': {
    outOfCombat:
      'Иллюзия по условию — заготовка обмана; в бою — та же иллюзия, что и `major-image`, а её восприятие NPC — игра ведущего.',
  },
  'project-image': { point: true, gm: 'Иллюзорная копия на расстоянии 500 миль — вне боя' },
  'protection-from-energy': {
    modifiers: { resistances: ['fire'] },
    variants: [
      { key: 'acid', modifiers: { resistances: ['acid'] } },
      { key: 'cold', modifiers: { resistances: ['cold'] } },
      { key: 'fire', modifiers: { resistances: ['fire'] } },
      { key: 'lightning', modifiers: { resistances: ['lightning'] } },
      { key: 'thunder', modifiers: { resistances: ['thunder'] } },
    ],
  },
  'protection-from-evil-and-good': {
    modifiers: {
      incoming: 'DISADVANTAGE',
      incomingFrom: ['aberration', 'celestial', 'elemental', 'fey', 'fiend', 'undead'],
      conditionImmunitiesFrom: {
        conditions: ['charmed', 'frightened'],
        sourceTypes: ['aberration', 'celestial', 'elemental', 'fey', 'fiend', 'undead'],
      },
    },
  },
  'protection-from-poison': {
    removesConditions: ['poisoned'],
    modifiers: { resistances: ['poison'] },
    gm: 'Нейтрализует один яд; на 1 час преимущество на спасброски от отравления',
  },
  'purify-food-and-drink': { outOfCombat: 'Очищение еды — быт.', point: true },
  'raise-dead': { outOfCombat: 'Сотворение 1 час — вне боя.' },
  'ray-of-enfeeblement': {
    repeatSave: 'constitution',
    modifiers: { weaponDamageMultiplier: { ability: 'strength', factor: 0.5 } },
  },
  'ray-of-frost': { modifiers: { speedBonusFeet: -10 }, until: { who: 'CASTER', at: 'START' } },
  regenerate: {
    gm: 'Лечение 4d8+15 сразу, затем +1 хит в начале каждого хода цели; отращивает конечности через 2 минуты',
  },
  reincarnate: { outOfCombat: 'Сотворение 1 час — вне боя.' },
  'remove-curse': { gm: 'Снимает проклятия с существа или предмета' },
  'resilient-sphere': {
    gm: 'Сфера силы заключает цель; ничто не проходит сквозь неё, цель катит её на полскорости; ведущий отслеживает вручную',
  },
  resistance: { modifiers: { saveDice: '1d4' }, consumedOnSave: true },
  resurrection: { outOfCombat: 'Сотворение 1 час — вне боя.' },
  'reverse-gravity': {
    gm: 'Существа и предметы в цилиндре падают вверх; Лов-спасбросок, чтобы ухватиться за неподвижный предмет; урон от падения по обычным правилам — ведущий',
  },
  revivify: { revive: { withinRounds: 10, hp: 1 } },
  'rope-trick': { gm: 'Внепространственное убежище по верёвке — сюжетное' },
  'sacred-flame': { seen: 'TARGET', ignoresCover: true },
  sanctuary: { endsWhenBearerAttacks: true, sanctuary: true },
  'scorching-ray': {
    targets: { base: 3, perSlot: 1 },
    rays: { base: 3, perSlot: 1, dice: '2d6' },
    override: { attackType: 'RANGED' },
  },
  scrying: { outOfCombat: 'Сотворение 10 минут — разведка.' },
  'secret-chest': { outOfCombat: 'Сундук в Эфире — быт.' },
  'see-invisibility': { modifiers: { senses: { seeInvisible: true } } },
  seeming: { seen: 'TARGET', outOfCombat: 'Иллюзорная внешность — проникновение.' },
  sending: { outOfCombat: 'Послание вдаль — общение.' },
  sequester: { outOfCombat: 'Сокрытие в подвешенной анимации — вне сцены.' },
  shapechange: { gm: 'Превращение заклинателя в существо CR ≤ уровня — ведущий' },
  shatter: { saveByType: { disadvantage: 'INORGANIC' } },
  shield: {
    selfOnly: true,
    modifiers: { acBonus: 5 },
    gm: 'Не получает урона от magic missile',
    reaction: true,
    until: { who: 'CASTER', at: 'START' },
  },
  'shield-of-faith': { modifiers: { acBonus: 2 } },
  shillelagh: {
    selfOnly: true,
    weaponEnchant: {
      weapons: ['club', 'quarterstaff'],
      ability: 'SPELLCASTING',
      die: 'd8',
      magical: true,
    },
  },
  'shocking-grasp': {
    modifiers: { noReactions: true },
    advantageIf: { targetArmor: 'METAL' },
    until: { who: 'TARGET', at: 'START' },
  },
  silence: { zone: { silence: true } },
  'silent-image': {
    gm: 'Зрительная иллюзия до куба 15 фт, двигается действием; распознаётся проверкой Анализа против СЛ',
  },
  simulacrum: { gm: 'Создаёт копию существа с половиной хитов — ведущий' },
  'sleet-storm': {
    override: { saveAbility: 'dexterity' },
    zone: {
      on: ['ENTER', 'START'],
      conditions: ['prone'],
      obscure: 'HEAVY',
      difficult: 2,
      ground: true,
      concentrationSave: { ability: 'constitution', on: ['ENTER', 'START'] },
    },
  },
  slow: {
    targets: { base: 6 },
    modifiers: { speedMultiplier: 0.5, acPenalty: 2, noReactions: true },
    repeatSave: true,
    gm: 'Также -2 к спасброскам Ловкости; действие или бонусное действие, одна атака за ход; сотворение заклинания 1 действия — d20, 11+ откладывает на следующий ход',
    override: { area: null },
  },
  'speak-with-animals': { outOfCombat: 'Разговор со зверями — общение.' },
  'speak-with-dead': { outOfCombat: 'Пять вопросов трупу — разведка.', point: true },
  'speak-with-plants': { gm: 'Растения общаются; меняют проходимость местности — ведущий' },
  'spider-climb': { gm: 'Лазание по стенам и потолку — решает ведущий' },
  'spike-growth': {
    zone: {
      difficult: 2,
      ground: true,
      perMove: { dice: '2d4', perFeet: 5, type: 'piercing' },
      hidden: { check: 'perception' },
    },
    tags: ['impedingPlants'],
  },
  'spirit-guardians': {
    override: {
      saveAbility: 'wisdom',
      saveHalfOnSuccess: true,
      damageType: 'radiant',
      damageAtSlotLevel: {
        '3': '3d8',
        '4': '4d8',
        '5': '5d8',
        '6': '6d8',
        '7': '7d8',
        '8': '8d8',
        '9': '9d8',
      },
    },
    zone: {
      on: ['ENTER', 'START'],
      aura: 15,
      hostileOnly: true,
      // «Speed is halved» — смена скорости, а не трудность (пройденное вычитается).
      inside: { speedMultiplier: 0.5, hostileOnly: true },
    },
  },
  'spiritual-weapon': {
    gm: 'Оружие держится 1 минуту; бонусным действием двигается на 20 фт и повторяет атаку заклинанием 1d8 + мод. силой',
  },
  'stone-shape': {
    outOfCombat:
      'Придание формы камню — местность вне боя (при надобности ведущий правит слой местности в редакторе сцены).',
  },
  stoneskin: {
    modifiers: { resistNonmagical: ['bludgeoning', 'piercing', 'slashing'] },
  },
  'storm-of-vengeance': {
    seen: 'POINT',
    conditions: ['deafened'],
    gm: 'При сотворении Тел-спасбросок: 2d6 звука; далее по раундам — кислотный дождь, 6 молний (10d6, Лов), град 2d6, ветер и холодный дождь; труднопроходимая местность и сильное заслонение обзора',
  },
  suggestion: {
    seen: 'TARGET',
    gm: 'Внушение действия на длительность; ведущий следит за выполнением',
    endsOnDamage: 'casterSide',
  },
  sunbeam: {
    conditions: ['blinded'],
    gm: 'Новую линию можно создавать действием каждый ход; свет солнечный, 30 фт ярко; нежить и слизи с помехой на спасбросок',
    until: { who: 'CASTER', at: 'START' },
  },
  sunburst: {
    conditions: ['blinded'],
    repeatSave: true,
    saveByType: { disadvantage: ['undead', 'ooze'] },
    // Мгновенно и без следа: снимает магическую тьму в области.
    zone: { dispelDarkness: 'ALL' },
  },
  symbol: {
    gm: 'Символ-ловушка по условию; эффект на выбор: смерть (Тел, 10d10 некротика), раздор, страх, безнадёжность, безумие, боль, сон, оглушение — ведущий',
  },
  telekinesis: {
    seen: 'TARGET',
    gm: 'Действием перемещает существо (противопоставленная проверка) или предмет; существо удерживается в захвате (restrained) до конца следующего хода заклинателя',
  },
  'telepathic-bond': {
    outOfCombat: 'Телепатическая связь — общение (переговоры в бою не механика).',
  },
  teleport: {
    gm: 'Телепорт заклинателя и до 8 существ или предмета; результат по таблице знакомства — ведущий',
    override: { area: null },
  },
  'teleportation-circle': {
    outOfCombat:
      'Сотворение 1 минута, портал на 1 раунд к постоянному кругу — путешествие (уход со сцены, если сотворён заранее — `leaveScene`).',
    point: true,
    override: { area: null },
  },
  thaumaturgy: { outOfCombat: 'Знамения — без следствий.', point: true },
  'time-stop': { gm: 'Заклинатель берёт 1d4+1 хода подряд — ведущий' },
  'tiny-hut': { gm: 'Неподвижный купол силового поля, пропускает только внутренних — ведущий' },
  tongues: { outOfCombat: 'Понимание языков — общение.' },
  'transport-via-plants': { point: true, gm: 'Портал между растениями — ведущий' },
  'tree-stride': {
    gm: 'Перемещение через деревья одного вида в пределах 500 фт; ведущий разруливает',
  },
  'true-polymorph': {
    seen: 'TARGET',
    gm: 'Превращение существа/предмета; Мдр-спасбросок у недобровольных — ведущий',
  },
  'true-resurrection': { outOfCombat: 'Сотворение 1 час — вне боя.' },
  'true-seeing': { modifiers: { senses: { truesight: 120 } } },
  'true-strike': {
    modifiers: { ownAttacks: 'ADVANTAGE', vsSourceOnly: 'TARGET' },
    consumedOnOwnAttack: true,
    activeFrom: 'CASTER_NEXT_TURN',
    bearer: 'CASTER',
    until: { who: 'CASTER', at: 'END' },
  },
  'unseen-servant': {
    outOfCombat: 'Слуга не атакует, действует с предметами (вне механики) — быт.',
    point: true,
  },
  'vampiric-touch': {
    gm: 'Повторная атака действием в следующие ходы — ведущий',
    override: { range: 'Touch' },
    lifesteal: 0.5,
  },
  'vicious-mockery': {
    seen: 'TARGET',
    modifiers: { ownAttacks: 'DISADVANTAGE' },
    consumedOnOwnAttack: true,
    // «Need not understand» — язык не проверяется, только слух.
    perceives: ['HEAR'],
    until: { who: 'TARGET', at: 'END' },
  },
  'wall-of-fire': {
    gm: 'Стена огня непрозрачна; 5d8 огня тому, кто оканчивает ход в 10 фт от выбранной стороны или в стене, либо впервые входит в неё за ход — ведущий',
    zone: { on: ['ENTER', 'END'], onCast: true },
  },
  'wall-of-force': {
    point: true,
    gm: 'Невидимая стена силы, неуязвима для урона; ведущий отслеживает форму и положение',
  },
  'wall-of-ice': {
    gm: 'Стена льда (КД 12, 30 хп на секцию, уязвима к огню); холодный воздух при проходе — Тел-спасбросок, 5d6 холода; ведущий',
  },
  'wall-of-stone': {
    point: true,
    gm: 'Каменная стена (КД 15, 30 хитов за дюйм толщины); существо в замкнутом пространстве делает спасбросок Ловкости и реакцией выходит; ведущий',
  },
  'wall-of-thorns': {
    gm: 'Стена блокирует обзор, движение сквозь неё x4 цена',
    zone: { on: ['ENTER', 'END'], onCast: true, damageType: 'slashing' },
  },
  'warding-bond': {
    modifiers: {
      acBonus: 1,
      resistances: [
        'acid',
        'bludgeoning',
        'cold',
        'fire',
        'force',
        'lightning',
        'necrotic',
        'piercing',
        'poison',
        'psychic',
        'radiant',
        'slashing',
        'thunder',
      ],
      saveBonus: 1,
    },
    gm: '+1 к спасброскам; пока цель в 60 фт, заклинатель получает столько же урона, сколько получила цель; рвётся при 0 хитов заклинателя или разрыве дистанции',
  },
  'water-breathing': {
    seen: 'TARGET',
    outOfCombat: 'Дыхание под водой — подводной среды на сцене нет (глубокая вода непроходима).',
    targets: { base: 10 },
  },
  'water-walk': { seen: 'TARGET', targets: { base: 10 }, gm: 'Хождение по жидкости, сюжетное' },
  web: {
    override: { saveAbility: 'dexterity' },
    conditions: ['restrained'],
    // Без onCast (разбор §3): при сотворении спасброска нет, только вход и начало хода.
    zone: {
      on: ['ENTER', 'START'],
      conditions: ['restrained'],
      difficult: 2,
      obscure: 'LIGHT',
      escape: { checks: ['strength'], economy: 'ACTION' },
    },
  },
  weird: {
    conditions: ['frightened'],
    repeatSave: {
      at: 'START',
      ability: 'wisdom',
      onFail: { damage: '4d10', type: 'psychic' },
    },
  },
  'wind-walk': {
    seen: 'TARGET',
    gm: 'Газообразная форма, полёт 300 фт и сопротивление немагическому оружию до 10 согласных существ; возврат 1 минута',
  },
  'wind-wall': {
    gm: 'Стена ветра: снаряды дальнего боя в цель за стеной промахиваются; мелкие летающие не проходят; газы удержаны',
  },
  wish: { gm: 'Дублирует заклинания до 8-го круга или иной эффект по решению ведущего' },
  'word-of-recall': { gm: 'Телепорт заклинателя и до 5 существ в святилище — ведущий' },
  'zone-of-truth': { outOfCombat: 'Невозможность лгать — допрос и общение.' },
  /*
   * Всё боевое у этих заклинаний считают поля SRD или код службы («Сон» —
   * пул хитов, «Метка охотника» — эффект, «Тьма» и «Туман» — зоны): запись
   * пустая, но есть — тест полноты отличает её от забытой.
   */
  'circle-of-death': {},
  'cure-wounds': {},
  darkness: {
    // Тьма — свой слой обзора: дьявольское и истинное зрение её пробивают,
    // а сотворение снимает свет заклинаний до 2-го круга в пересечении.
    zone: { obscure: 'HEAVY', magicalDarkness: true },
  },
  fireball: {},
  'fog-cloud': {
    // Рассеивает ветер («Порыв ветра»); заменяет прежний список OBSCURING_SPELL_CODES.
    zone: { obscure: 'HEAVY', dispersedBy: 'WIND' },
  },
  'healing-word': { seen: 'TARGET' },
  'hunters-mark': { seen: 'TARGET' },
  'inflict-wounds': {},
  'lightning-bolt': {},
  'poison-spray': { seen: 'TARGET' },
  sleep: {},
  'spare-the-dying': {},
  'stinking-cloud': {
    zone: { obscure: 'HEAVY', dispersedBy: 'WIND' },
  },
  thunderwave: {},
};
