// ============================================================
// CAPITALIS — сетевой клиент (Слой 3, мультиплеер)
// Зависит от data.js (BOARD, GROUP_COLORS)
//
// ВАЖНО: клиент больше НЕ считает игру сам.
// Он: (1) подключается к серверу, (2) шлёт действия (roll/buy/end_turn),
//     (3) рисует состояние, которое прислал сервер.
// Источник правды — сервер. Здесь только отправка и отрисовка.
// ============================================================

// ── Адрес сервера ──────────────────────────────────────────
// Локальная разработка: сервер на том же Mac.
// Позже (на Aeza) заменить на wss://твой-домен
const SERVER_URL = "ws://localhost:8765";

// ── Кто мы (данные игрока из Telegram или заглушка для теста) ──
function getMe(){
  const tg = window.Telegram && window.Telegram.WebApp;
  const u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  if(u) return { id: u.id, name: u.first_name || "Игрок" };
  // Тест в браузере без Telegram: генерим случайного игрока,
  // чтобы два окна были разными людьми
  let id = sessionStorage.getItem("testId");
  if(!id){ id = Math.floor(Math.random()*1e9); sessionStorage.setItem("testId", id); }
  return { id: Number(id), name: "Гость-" + String(id).slice(-3) };
}

// ── Код комнаты из URL (?room=ABC12) ───────────────────────
function getRoom(){
  const p = new URLSearchParams(location.search);
  return (p.get("room") || "TEST").toUpperCase();
}

// ── Локальное зеркало состояния (то, что прислал сервер) ───
let me = getMe();
let room = getRoom();
let socket = null;
let lastState = null;      // последний snapshot от сервера
const tokenEls = {};       // фишки на поле: { user_id: HTMLElement }
let animating = false;     // идёт ли анимация хода (чтобы render не перебивал фишки)

const CELLS = BOARD.length;

// ── Подключение к серверу ──────────────────────────────────
function connect(){
  socket = new WebSocket(SERVER_URL);

  socket.onopen = function(){
    setStatus("Подключено");
    send({ type: "join", room: room, user_id: me.id, name: me.name });
  };

  socket.onmessage = function(e){
    const msg = JSON.parse(e.data);
    if(msg.type === "state"){
      lastState = msg.data;
      render(msg.data);
    } else if(msg.type === "roll_result"){
      showRollResult(msg.data);
    } else if(msg.type === "error"){
      flash(msg.message);
    }
  };

  socket.onclose = function(){
    setStatus("Соединение потеряно. Переподключение…");
    setTimeout(connect, 2000);
  };

  socket.onerror = function(){ setStatus("Ошибка соединения"); };
}

function send(obj){
  if(socket && socket.readyState === WebSocket.OPEN){
    socket.send(JSON.stringify(obj));
  }
}

// ── Действия игрока (только отправка, расчёт — на сервере) ──
function rollDice(){
  send({ type: "action", action: "roll" });
}
function buyCell(cellIndex){
  send({ type: "action", action: "buy", cell: cellIndex });
  closePopup();
}
function endTurn(){
  send({ type: "action", action: "end_turn" });
}

// ── Отрисовка состояния, присланного сервером ──────────────
function render(state){
  // 1. фишки всех игроков.
  // Во время анимации хода НЕ трогаем позиции фишек — иначе анимация
  // перебьётся мгновенным прыжком на финальную клетку.
  if(!animating){
    state.players.forEach(function(p, idx){ placeToken(p.user_id, p.position, p.token, idx); });
  }

  // 2. мой баланс
  const meState = state.players.find(function(p){ return p.user_id === me.id; });
  if(meState){
    document.getElementById("hudBalance").textContent = "$" + meState.balance;
  }

  // 3. чей ход — активна ли кнопка
  const myTurn = state.current_user === me.id;
  const rollBtn = document.getElementById("rollBtn");
  rollBtn.disabled = !myTurn;
  rollBtn.textContent = myTurn ? "Бросить кубики" : "Ход соперника…";

  // 4. подсветка купленных клеток
  Object.entries(state.owners).forEach(function(pair){
    const cellIdx = pair[0], ownerId = pair[1];
    const cell = document.querySelector('[data-cell="' + cellIdx + '"]');
    if(cell){
      cell.classList.add("owned");
      cell.classList.toggle("ownedMine", ownerId === me.id);
    }
  });

  // 5. инфо, чей ход
  renderTurnInfo(state);
}

// ── Позиционирование фишки игрока ──────────────────────────
function placeToken(userId, index, tokenChar, slot){
  let el = tokenEls[userId];
  if(!el){
    el = document.createElement("div");
    el.className = "token";
    el.textContent = tokenChar || "\u265F";
    if(userId === me.id) el.classList.add("myToken");
    document.getElementById("tokensLayer").appendChild(el);
    tokenEls[userId] = el;
  }

  const cell = document.querySelector('[data-cell="' + index + '"]');
  const layer = document.getElementById("tokensLayer");
  if(!cell || !layer) return;

  const cr = cell.getBoundingClientRect();
  const lr = layer.getBoundingClientRect();

  const offset = (slot || 0) * 8 - 4;
  const x = cr.left - lr.left + cr.width/2 + offset;
  const y = cr.top - lr.top + cr.height/2 + offset;

  el.style.left = x + "px";
  el.style.top = y + "px";
}

// ── Показ результата броска ────────────────────────────────
function showRollResult(data){
  const d1 = data.dice[0], d2 = data.dice[1];
  const die1 = document.getElementById("die1");
  const die2 = document.getElementById("die2");
  die1.classList.add("rolling"); die2.classList.add("rolling");
  setTimeout(function(){
    die1.textContent = d1; die2.textContent = d2;
    die1.classList.remove("rolling"); die2.classList.remove("rolling");
  }, 400);

  // Определяем, чью фишку двигаем и какой слот (для сдвига нескольких фишек)
  const mover = data.user_id;
  let slot = 0;
  if(lastState){
    slot = lastState.players.findIndex(function(p){ return p.user_id === mover; });
    if(slot < 0) slot = 0;
  }

  // Пошаговое движение: from → from+1 → … → to (после кубиков)
  setTimeout(function(){
    animating = true;
    const from = data.from;
    const to = data.to;
    // число шагов вперёд по кругу
    let stepsLeft = (to - from + CELLS) % CELLS;
    if(stepsLeft === 0) stepsLeft = data.steps; // на случай полного круга
    let cur = from;

    function stepOnce(){
      cur = (cur + 1) % CELLS;
      placeToken(mover, cur, null, slot);
      stepsLeft--;
      if(stepsLeft > 0){
        setTimeout(stepOnce, 260);           // следующий шаг
      } else {
        // дошли до клетки по кубику
        finishMove(data, mover, slot);
      }
    }
    stepOnce();
  }, 600);
}

// Завершение хода: возможный телепорт картой + показ события
function finishMove(data, mover, slot){
  // Если карта увела дальше (final != to) — отдельный мгновенный скачок
  if(typeof data.final === "number" && data.final !== data.to){
    setTimeout(function(){
      placeToken(mover, data.final, null, slot);
      setTimeout(function(){ animating = false; showEventForRoll(data); }, 350);
    }, 400);
  } else {
    animating = false;
    showEventForRoll(data);
  }
}

// Показ события клетки (после того, как фишка доехала)
function showEventForRoll(data){
  const ev = data.event;
  if(!ev){ return; }

  if(ev.kind === "offer_buy" && lastState && lastState.current_user === me.id){
    offerPurchase(ev);
  } else if(ev.kind === "rent"){
    showEvent(ev.name, "Аренда", "Вы заплатили $" + ev.amount + " владельцу.");
    autoEndTurn();
  } else if(ev.kind === "tax"){
    showEvent(ev.name, "Налог", "Списано $" + ev.amount + ".");
    autoEndTurn();
  } else if(ev.kind === "card"){
    showEvent(ev.deck, "Карта", ev.text);
    autoEndTurn();
  } else if(ev.kind === "gotojail"){
    showEvent("В тюрьму", "", "Вы отправляетесь в тюрьму.");
    autoEndTurn();
  } else if(ev.kind === "info" || ev.kind === "own"){
    autoEndTurn();
  }
}

function autoEndTurn(){
  if(lastState && lastState.current_user === me.id){
    setTimeout(endTurn, 900);
  }
}

// ── Попап покупки ──────────────────────────────────────────
function offerPurchase(ev){
  document.getElementById("popupBody").innerHTML =
    '<div class="popTitle">' + ev.name + '</div>' +
    '<div class="popType">Цена: $' + ev.price + '</div>';

  const actions = document.getElementById("popupActions");
  actions.innerHTML = "";

  const buy = document.createElement("button");
  buy.className = "actBtn buy";
  buy.textContent = "Купить за $" + ev.price;
  buy.onclick = function(){ buyCell(ev.cell); autoEndTurn(); };
  actions.appendChild(buy);

  const skip = document.createElement("button");
  skip.className = "actBtn skip";
  skip.textContent = "Пропустить";
  skip.onclick = function(){ closePopup(); endTurn(); };
  actions.appendChild(skip);

  openPopup();
}

// ── Простое событие ────────────────────────────────────────
function showEvent(title, subtitle, text){
  document.getElementById("popupBody").innerHTML =
    '<div class="popTitle">' + title + '</div>' +
    (subtitle ? '<div class="popType">' + subtitle + '</div>' : "") +
    '<div class="popSub">' + text + '</div>';
  document.getElementById("popupActions").innerHTML = "";
  openPopup();
  setTimeout(closePopup, 2000);
}

// ── Инфо, чей ход ──────────────────────────────────────────
function renderTurnInfo(state){
  const info = document.getElementById("turnInfo");
  if(!info) return;
  const cur = state.players.find(function(p){ return p.user_id === state.current_user; });
  info.textContent = cur ? ("Ход: " + cur.name) : "";
}

// ── Утилиты ────────────────────────────────────────────────
function setStatus(text){
  const el = document.getElementById("connStatus");
  if(el) el.textContent = text;
}
function flash(text){
  const el = document.getElementById("connStatus");
  if(el){
    const prev = el.textContent;
    el.textContent = text;
    setTimeout(function(){ setStatus(prev); }, 1500);
  }
}
function openPopup(){ document.getElementById("popup").classList.add("show"); }

window.addEventListener("resize", function(){
  if(lastState) lastState.players.forEach(function(p, idx){ placeToken(p.user_id, p.position, p.token, idx); });
});

window.addEventListener("load", connect);
