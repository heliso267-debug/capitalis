// ============================================================
// CAPITALIS — игровая механика, Слой 1 (локально, один игрок)
// Зависит от data.js (BOARD, CHANCE_CARDS, CHEST_CARDS)
//
// Архитектура:
//   state          — единый источник правды об игре (позже уедет на сервер)
//   rollDice()     — бросок кубиков + ход
//   moveTo()/step  — движение фишки по клеткам с анимацией
//   handleLanding()— что происходит, когда фишка встала на клетку
// ============================================================

// ── Игровое состояние ──────────────────────────────────────
const state = {
  position: 0,        // индекс клетки, где стоит фишка (0 = Старт)
  balance: 1500,      // капитал игрока
  owned: {},          // купленные клетки: { индекс: true }
  jailFreeCards: 0,   // карты "выход из тюрьмы"
  isMoving: false,    // идёт ли сейчас анимация хода (блок кнопки)
  token: "\u265F",    // фишка (пешка) — потом дадим выбор
};

const CELLS = BOARD.length; // 40

// ── Инициализация: создаём фишку на Старте ─────────────────
let tokenEl = null;

function initGame(){
  tokenEl = document.createElement("div");
  tokenEl.className = "token";
  tokenEl.textContent = state.token;
  document.getElementById("tokensLayer").appendChild(tokenEl);
  placeToken(state.position);
  updateHUD();
  // при ресайзе окна фишка должна остаться на своей клетке
  window.addEventListener("resize", ()=>placeToken(state.position));
}

// ── Позиционирование фишки на клетке по индексу ────────────
// Фишка берёт координаты центра нужной клетки — браузер считает сам.
function placeToken(index){
  const cell = document.querySelector(`[data-cell="${index}"]`);
  const layer = document.getElementById("tokensLayer");
  if(!cell || !layer) return;

  const cellRect = cell.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();

  // центр клетки относительно слоя фишек
  const x = cellRect.left - layerRect.left + cellRect.width / 2;
  const y = cellRect.top - layerRect.top + cellRect.height / 2;

  tokenEl.style.left = x + "px";
  tokenEl.style.top = y + "px";
}

// ── HUD ────────────────────────────────────────────────────
function updateHUD(){
  document.getElementById("hudBalance").textContent = "$" + state.balance;
}

function changeBalance(delta){
  state.balance += delta;
  updateHUD();
}

// ── Бросок кубиков ─────────────────────────────────────────
function rollDice(){
  if(state.isMoving) return; // защита от повторных нажатий во время хода

  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  const total = d1 + d2;

  // анимация кубиков
  const die1 = document.getElementById("die1");
  const die2 = document.getElementById("die2");
  die1.classList.add("rolling");
  die2.classList.add("rolling");
  setTimeout(()=>{
    die1.textContent = d1;
    die2.textContent = d2;
    die1.classList.remove("rolling");
    die2.classList.remove("rolling");
  }, 400);

  // после показа кубиков — двигаем фишку
  setTimeout(()=> moveBy(total), 550);
}

// ── Движение фишки на N клеток, по шагу ────────────────────
function moveBy(steps){
  state.isMoving = true;
  document.getElementById("rollBtn").disabled = true;

  let done = 0;
  const stepOnce = () => {
    const prev = state.position;
    state.position = (state.position + 1) % CELLS;

    // прошли Старт (перешли через 0) — начисляем $200
    if(state.position === 0 && prev !== 0){
      changeBalance(200);
    }

    placeToken(state.position);
    done++;

    if(done < steps){
      setTimeout(stepOnce, 300); // следующий шаг после анимации
    } else {
      setTimeout(()=>{
        state.isMoving = false;
        document.getElementById("rollBtn").disabled = false;
        handleLanding(state.position);
      }, 320);
    }
  };
  stepOnce();
}

// ── Что происходит на клетке ───────────────────────────────
function handleLanding(index){
  const cell = BOARD[index];

  switch(cell.type){
    case "city":
    case "airport":
    case "utility":
      if(state.owned[index]){
        showEvent(cell.name, "Уже куплено вами", "Эта клетка уже в вашей собственности.");
      } else {
        offerPurchase(cell, index);
      }
      break;

    case "tax":
      changeBalance(-cell.amount);
      showEvent(cell.name, "Налог", `Вы заплатили $${cell.amount}.`);
      break;

    case "chance":
      drawCard(CHANCE_CARDS, "Шанс");
      break;

    case "chest":
      drawCard(CHEST_CARDS, "Казна");
      break;

    case "gotojail":
      state.position = 10; // клетка Тюрьмы
      placeToken(10);
      showEvent("В тюрьму", "Наказание", "Вы отправляетесь в Тюрьму.");
      break;

    case "start":
      showEvent("Старт", "", "Вы на Старте. +$200 за круг.");
      break;

    case "jail":
      showEvent("Тюрьма", "Просто в гостях", "Вы просто зашли в гости. Ничего не происходит.");
      break;

    case "parking":
      showEvent("Отдых", "Бесплатная стоянка", "Отдыхаете. Ничего не происходит.");
      break;
  }
}

// ── Покупка клетки ─────────────────────────────────────────
function offerPurchase(cell, index){
  const canAfford = state.balance >= cell.price;
  document.getElementById("popupBody").innerHTML =
    `<div class="popTitle">${cell.name}</div>` +
    `<div class="popType">Цена: $${cell.price}</div>` +
    (canAfford ? "" : `<div class="popSub" style="color:var(--pink)">Недостаточно средств</div>`);

  const actions = document.getElementById("popupActions");
  actions.innerHTML = "";

  if(canAfford){
    const buyBtn = document.createElement("button");
    buyBtn.className = "actBtn buy";
    buyBtn.textContent = `Купить за $${cell.price}`;
    buyBtn.onclick = ()=>{
      changeBalance(-cell.price);
      state.owned[index] = true;
      closePopup();
    };
    actions.appendChild(buyBtn);
  }

  const skipBtn = document.createElement("button");
  skipBtn.className = "actBtn skip";
  skipBtn.textContent = "Пропустить";
  skipBtn.onclick = closePopup;
  actions.appendChild(skipBtn);

  openPopup();
}

// ── Карты Шанс / Казна ─────────────────────────────────────
function drawCard(deck, deckName){
  const card = deck[Math.floor(Math.random() * deck.length)];

  // применяем эффект
  if(typeof card.money === "number"){
    changeBalance(card.money);
  } else if(card.action){
    applyCardAction(card.action);
  }

  showEvent(deckName, "Карта", card.text);
}

function applyCardAction(action){
  switch(action){
    case "goStart":
      state.position = 0; placeToken(0); changeBalance(200); break;
    case "goJail":
      state.position = 10; placeToken(10); break;
    case "goParking":
      state.position = 20; placeToken(20); break;
    case "back3":
      state.position = (state.position - 3 + CELLS) % CELLS; placeToken(state.position); break;
    case "jailFree":
      state.jailFreeCards++; break;
    // collect*/pay* — для мультиплеера (нужны другие игроки), пока просто пропускаем
    // nearestAirport/nearestUtility — добавим при желании
    default:
      break;
  }
}

// ── Показ простого события (без кнопок действий) ───────────
function showEvent(title, subtitle, text){
  document.getElementById("popupBody").innerHTML =
    `<div class="popTitle">${title}</div>` +
    (subtitle ? `<div class="popType">${subtitle}</div>` : "") +
    `<div class="popSub">${text}</div>`;
  document.getElementById("popupActions").innerHTML = "";
  openPopup();
}

function openPopup(){ document.getElementById("popup").classList.add("show"); }

// запуск после загрузки данных и доски
window.addEventListener("load", initGame);
