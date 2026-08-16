// ============================================================
// CAPITALIS — данные игры
// Единый источник правды: доска, карточки.
// Порядок клеток — обход по кругу от СТАРТ (индекс 0) по часовой.
// type: start | city | airport | utility | tax | chance | chest | jail | parking | gotojail
// group — цветовая группа для городов (для рендера полосы)
// ============================================================

const BOARD = [
  { i: 0,  type: "start",    name: "Старт", short: "Старт", sub: "Получи $200" },
  { i: 1,  type: "city",     name: "Каир",           price: 60,  group: "brown" },
  { i: 2,  type: "chest",    name: "Казна" },
  { i: 3,  type: "city",     name: "Лагос",          price: 60,  group: "brown" },
  { i: 4,  type: "tax",      name: "Подоходный сбор", short: "Налог", amount: 200 },
  { i: 5,  type: "airport",  name: "Хитроу",         price: 200 },
  { i: 6,  type: "city",     name: "Мумбаи",         price: 100, group: "lblue" },
  { i: 7,  type: "chance",   name: "Шанс" },
  { i: 8,  type: "city",     name: "Бангкок",        price: 100, group: "lblue" },
  { i: 9,  type: "city",     name: "Джакарта",       price: 120, group: "lblue" },
  { i: 10, type: "jail",     name: "Тюрьма", short: "Тюрьма", sub: "Просто в гостях" },
  { i: 11, type: "city",     name: "Стамбул",        price: 140, group: "pink" },
  { i: 12, type: "utility",  name: "Мировая энергосеть", short: "Энергосеть", price: 150 },
  { i: 13, type: "city",     name: "Афины",          price: 140, group: "pink" },
  { i: 14, type: "city",     name: "Лиссабон",       price: 160, group: "pink" },
  { i: 15, type: "airport",  name: "JFK",            price: 200 },
  { i: 16, type: "city",     name: "Прага",          price: 180, group: "orange" },
  { i: 17, type: "chest",    name: "Казна" },
  { i: 18, type: "city",     name: "Варшава",        price: 180, group: "orange" },
  { i: 19, type: "city",     name: "Будапешт",       price: 200, group: "orange" },
  { i: 20, type: "parking",  name: "Отдых", short: "Отдых", sub: "Бесплатная стоянка" },
  { i: 21, type: "city",     name: "Рим",            price: 220, group: "red" },
  { i: 22, type: "chance",   name: "Шанс" },
  { i: 23, type: "city",     name: "Мадрид",         price: 220, group: "red" },
  { i: 24, type: "city",     name: "Берлин",         price: 240, group: "red" },
  { i: 25, type: "airport",  name: "Чанги",          price: 200 },
  { i: 26, type: "city",     name: "Амстердам",      price: 260, group: "yellow" },
  { i: 27, type: "city",     name: "Вена",           price: 260, group: "yellow" },
  { i: 28, type: "utility",  name: "Глобальная сеть воды", short: "Водосеть", price: 150 },
  { i: 29, type: "city",     name: "Стокгольм",      price: 280, group: "yellow" },
  { i: 30, type: "gotojail", name: "В тюрьму", short: "В тюрьму", sub: "Отправляйся в тюрьму" },
  { i: 31, type: "city",     name: "Париж",          price: 300, group: "green" },
  { i: 32, type: "city",     name: "Дубай",          price: 300, group: "green" },
  { i: 33, type: "chest",    name: "Казна" },
  { i: 34, type: "city",     name: "Сингапур",       price: 320, group: "green" },
  { i: 35, type: "airport",  name: "Дубай Интл", short: "Дубай ✈", price: 200 },
  { i: 36, type: "chance",   name: "Шанс" },
  { i: 37, type: "city",     name: "Лондон",         price: 350, group: "dblue" },
  { i: 38, type: "tax",      name: "Налог на роскошь", short: "Налог", amount: 100 },
  { i: 39, type: "city",     name: "Токио",          price: 400, group: "dblue" },
];

// Цвета групп (неоновая палитра)
const GROUP_COLORS = {
  brown:  "#8d6e63",
  lblue:  "#4fc3f7",
  pink:   "#ff5a7a",
  orange: "#ffa54f",
  red:    "#ff4d4d",
  yellow: "#ffd66d",
  green:  "#29d39a",
  dblue:  "#6d7cff",
};

// ============================================================
// КАРТОЧКИ — механика оригинала, формулировки свои
// money: +/- сумма игроку | action: спец-эффект (обрабатывает логика хода)
// ============================================================

const CHANCE_CARDS = [
  { text: "Совет директоров одобрил ваш план. Вернитесь на Старт и получите $200.", action: "goStart" },
  { text: "Валютная биржа принесла прибыль. Банк выплачивает вам $100.", money: 100 },
  { text: "Аудит выявил нарушения. Отправляйтесь в Тюрьму.", action: "goJail" },
  { text: "Ремонт головного офиса обошёлся дорого. Заплатите $50.", money: -50 },
  { text: "Каждый инвестор отчисляет вам долю. Получите по $10 с каждого игрока.", action: "collect10" },
  { text: "Международный налоговый сбор. Заплатите $150.", money: -150 },
  { text: "Юристы добыли вам иммунитет. Карта освобождения из Тюрьмы.", action: "jailFree" },
  { text: "Логистический сбой. Вернитесь на 3 клетки назад.", action: "back3" },
  { text: "Квартальные дивиденды. Банк начисляет $50.", money: 50 },
  { text: "Штраф за просрочку контрактов. Заплатите каждому игроку по $25.", action: "pay25" },
  { text: "Открыт новый авиахаб. Двигайтесь до ближайшего аэропорта.", action: "nearestAirport" },
  { text: "Модернизация инфраструктуры. Двигайтесь до ближайшего предприятия.", action: "nearestUtility" },
  { text: "Годовая премия совета. Получите $200.", money: 200 },
  { text: "Корпоративный ретрит. Отправляйтесь на Отдых.", action: "goParking" },
  { text: "Выкуп доли партнёра. Заплатите $50 и выйдите из Тюрьмы.", money: -50 },
  { text: "Успешное IPO. Банк переводит вам $100.", money: 100 },
];

const CHEST_CARDS = [
  { text: "Годовая налоговая декларация закрыта в минус. Заплатите $200.", money: -200 },
  { text: "Государственная субсидия одобрена. Получите $50.", money: 50 },
  { text: "Взнос в фонд развития округов. Заплатите $100.", money: -100 },
  { text: "Краудфандинг сработал. Соберите по $5 с каждого игрока.", action: "collect5" },
  { text: "Гранты федерального бюджета. Вернитесь на Старт и получите $200.", action: "goStart" },
  { text: "Оплата коммунальной сети за квартал. Заплатите $100.", money: -100 },
  { text: "Победа в отраслевом конкурсе. Приз $100.", money: 100 },
  { text: "Плановый ремонт активов. Заплатите $75.", money: -75 },
  { text: "Проверка водоканала. Двигайтесь до ближайшего предприятия.", action: "nearestUtility" },
  { text: "Наследство от делового партнёра. Получите $150.", money: 150 },
  { text: "Налог на недвижимость. Заплатите $50.", money: -50 },
  { text: "Компенсация страховой. Получите $75.", money: 75 },
  { text: "Приглашение на профильный форум. Отправляйтесь на Отдых.", action: "goParking" },
  { text: "Членские взносы в ассоциацию. Заплатите каждому игроку по $10.", action: "pay10" },
  { text: "Банковская комиссия. Штраф $50.", money: -50 },
  { text: "Реферальный бонус платформы. Получите $25.", money: 25 },
];

// Экспорт (если понадобится модульно)
if (typeof module !== "undefined") {
  module.exports = { BOARD, GROUP_COLORS, CHANCE_CARDS, CHEST_CARDS };
}
