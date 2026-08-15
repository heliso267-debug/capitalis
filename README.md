# CAPITALIS — фронтенд (Mini App)

Игровое поле CAPITALIS для Telegram Mini App.
Это статический фронтенд — хостится на GitHub Pages по https.

## Файлы

| Файл | Что это |
|---|---|
| `index.html` | Игровое поле (доска 40 клеток). Главная страница |
| `data.js` | Данные игры: 40 клеток, 16 карт Шанс, 16 карт Казна |
| `logo.svg` | Логотип CAPITALIS |
| `.gitignore` | Что Git игнорирует (мусор macOS и т.д.) |

## Как залить на GitHub Pages (пошагово)

### 1. Создать репозиторий
- Зайти на github.com → New repository
- Имя: `capitalis`
- Тип: **Public** (Pages для приватных требует платный план)
- Создать

### 2. Загрузить файлы
Вариант простой (через сайт):
- На странице репозитория → "Add file" → "Upload files"
- Перетащить `index.html`, `data.js`, `logo.svg`
- Commit changes

Вариант через терминал (если настроен git):
```bash
cd capitalis_frontend
git init
git add .
git commit -m "CAPITALIS frontend"
git branch -M main
git remote add origin https://github.com/ТВОЙ_ЮЗЕР/capitalis.git
git push -u origin main
```

### 3. Включить Pages
- Репозиторий → Settings → Pages
- Source: "Deploy from a branch"
- Branch: `main`, папка `/ (root)` → Save
- Подождать 1-2 минуты

### 4. Получить адрес
Появится ссылка вида:
```
https://ТВОЙ_ЮЗЕР.github.io/capitalis/
```
Открой её в браузере — должна показаться доска CAPITALIS.

### 5. Прописать адрес в боте
В файле бота `config.py` заменить:
```python
MINIAPP_URL: str = "https://ТВОЙ_ЮЗЕР.github.io/capitalis/"
```
на реальный адрес из шага 4.

## Проверка
Открой ссылку GitHub Pages в браузере телефона — если доска видна, Telegram-кнопка "Открыть игру" тоже её откроет.

## Дальше
- Прикрутить боковые панели (игрок, кубики, лог, чат) вокруг доски
- Движение фишек по клеткам
- Связь с ботом по коду комнаты (?room=КОД уже читается)
