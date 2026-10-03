/* «Глина» — общий скрипт магазина: данные, корзина (localStorage), выезжающая панель, оформление заказа.
 * Подключается на всех страницах. Данные берутся из data/products.json — это единственный «бэкенд» демо. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'glina-cart-v1', FREE_FROM = 5000;

  /* ---------- данные ---------- */
  let dataPromise = null;
  const load = () => (dataPromise ||= fetch('data/products.json').then((r) => r.json()));

  /* ---------- состояние корзины ---------- */
  let items = [];
  try { items = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { items = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* приватный режим: корзина живёт до перезагрузки */ } };
  const bus = new EventTarget();

  /* ---------- иконки и разметка ---------- */
  const ico = (id, s = 18) => `<svg width="${s}" height="${s}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const cardHTML = (p, data, h = 3) => {
    const c0 = p.colors[0], [main, top] = p.images[c0];
    return `<li class="card is-visible">
      <a class="card__link" href="product.html?id=${p.id}">
        <span class="card__media"><img class="card__img" src="${main}" width="800" height="800" loading="lazy" alt="${esc(p.title)}, глазурь «${esc(data.colors[c0].name)}»"><img class="card__img card__img--alt" src="${top}" width="800" height="800" loading="lazy" alt=""></span>
        ${p.hit ? '<span class="badge">Хит</span>' : p.isNew ? '<span class="badge badge--new">Новинка</span>' : ''}
        <h${h} class="card__title">${esc(p.title)}</h${h}>
      </a>
      <p class="card__meta">${esc(p.size)}</p>
      <div class="card__foot"><p class="price">${p.oldPrice ? `<s>${fmt(p.oldPrice)}</s> ` : ''}<span>от ${fmt(p.price)}</span></p><span class="swatches" role="img" aria-label="Цвета глазури">${p.colors.map((c) => `<i style="--sw:${data.colors[c].hex}" title="${esc(data.colors[c].name)}"></i>`).join('')}</span></div>
      <button class="card__add" type="button" data-add="${p.id}">В корзину ${ico('i-plus')}</button>
    </li>`;
  };

  /* ---------- уведомление ---------- */
  const toastEl = $('[data-toast]');
  let toastT;
  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add('is-show'));
    clearTimeout(toastT);
    toastT = setTimeout(() => { toastEl.classList.remove('is-show'); setTimeout(() => { toastEl.hidden = true; }, 400); }, 2600);
  };

  /* ---------- действия ---------- */
  const add = async (id, color, qty = 1) => {
    const data = await load();
    const p = data.products.find((x) => x.id === +id);
    if (!p) return;
    color ||= p.colors[0];
    const row = items.find((i) => i.id === p.id && i.color === color);
    if (row) row.qty = Math.min(20, row.qty + qty); else items.push({ id: p.id, color, qty });
    save(); render(); bump();
    toast(`«${p.title}» добавлена в корзину`);
    bus.dispatchEvent(new CustomEvent('add', { detail: { id: p.id, color } }));
  };
  const setQty = (id, color, qty) => {
    const row = items.find((i) => i.id === id && i.color === color);
    if (!row) return;
    row.qty = Math.max(1, Math.min(20, qty));
    save(); render();
  };
  const remove = (id, color) => { items = items.filter((i) => !(i.id === id && i.color === color)); save(); render(); };
  const clear = () => { items = []; save(); render(); };
  const bump = () => { const b = $('.cart-btn'); if (!b || reduce) return; b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); };

  /* ---------- отрисовка корзины ---------- */
  const body = $('[data-cart-body]'), foot = $('[data-cart-foot]');
  async function render() {
    const data = await load();
    const lines = items.map((i) => ({ ...i, p: data.products.find((x) => x.id === i.id) })).filter((l) => l.p);
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const total = lines.reduce((n, l) => n + l.qty * l.p.price, 0);
    const cnt = $('[data-cart-count]');
    if (cnt) { cnt.textContent = count; cnt.hidden = !count; }
    $('.cart-btn')?.setAttribute('aria-label', count ? `Открыть корзину, товаров: ${count}` : 'Открыть корзину');
    if (!body) return;
    if (!lines.length) {
      body.innerHTML = `<div class="cart-empty"><svg width="56" height="56" aria-hidden="true"><use href="#i-bag"/></svg><p class="cart-empty__title">В корзине пусто</p><p>Добавьте кружку или вазу, и они появятся здесь.</p><a class="btn btn--ghost" href="catalog.html">Перейти в каталог</a></div>`;
      foot.hidden = true;
      return;
    }
    body.innerHTML = lines.map((l) => `<article class="line" data-line="${l.id}" data-color="${l.color}">
        <img class="line__img" src="${l.p.images[l.color][0]}" width="84" height="84" alt="${esc(l.p.title)}">
        <div><a class="line__name" href="product.html?id=${l.id}">${esc(l.p.title)}</a>
          <p class="line__meta"><i style="--sw:${data.colors[l.color].hex}"></i>${esc(data.colors[l.color].name)}</p>
          <div class="line__row">
            <div class="qty" role="group" aria-label="Количество: ${esc(l.p.title)}"><button class="qty__btn" type="button" data-line-qty="-1" aria-label="Меньше" ${l.qty <= 1 ? 'disabled' : ''}>${ico('i-minus')}</button><output class="qty__value">${l.qty}</output><button class="qty__btn" type="button" data-line-qty="1" aria-label="Больше">${ico('i-plus')}</button></div>
            <span class="line__sum">${fmt(l.qty * l.p.price)}</span>
          </div>
          <button class="line__remove" type="button" data-line-remove aria-label="Удалить «${esc(l.p.title)}» из корзины">${ico('i-trash', 16)}Удалить</button>
        </div></article>`).join('');
    foot.hidden = false;
    $('[data-cart-total]').textContent = fmt(total);
    const left = FREE_FROM - total;
    $('[data-cart-ship]').innerHTML = left > 0
      ? `До бесплатной доставки осталось <strong>${fmt(left)}</strong><span class="ship-bar"><i style="width:${Math.min(100, (total / FREE_FROM) * 100)}%"></i></span>`
      : 'Доставка бесплатная <span class="ship-bar"><i style="width:100%"></i></span>';
    const sum = $('[data-checkout-sum]');
    if (sum) sum.textContent = `Заказ: ${count} шт. на ${fmt(total)}. Оставьте контакты, и мы подтвердим заказ в течение часа.`;
  }

  /* ---------- события ---------- */
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) { add(+addBtn.dataset.add); return; }
    const line = e.target.closest('[data-line]');
    if (line) {
      const id = +line.dataset.line, color = line.dataset.color;
      const q = e.target.closest('[data-line-qty]');
      if (q) { const cur = items.find((i) => i.id === id && i.color === color); setQty(id, color, cur.qty + +q.dataset.lineQty); }
      if (e.target.closest('[data-line-remove]')) remove(id, color);
    }
    if (e.target.closest('[data-cart-clear]')) clear();
  });
  window.addEventListener('storage', (e) => { // корзина синхронизируется между вкладками
    if (e.key !== KEY) return;
    try { items = JSON.parse(e.newValue || '[]'); } catch (err) { items = []; }
    render();
  });
  // после оформления заказа / подписки
  document.addEventListener('form:sent', (e) => {
    const d = e.detail || {};
    const t = $('[data-thanks-text]');
    if (d.phone && e.target.closest('#checkout')) {
      clear();
      if (t) t.textContent = `Заказ принят. Менеджер позвонит на ${d.phone} и подтвердит доставку.`;
    } else if (d.email && !d.phone) {
      if (t) t.textContent = 'Подписка оформлена. Первое письмо придёт в ближайшую среду.';
    }
  });

  document.addEventListener('modal:open', () => { if (toastEl) { toastEl.classList.remove('is-show'); toastEl.hidden = true; } }); // уведомление не перекрывает кнопки панели

  window.Shop = { load, add, items: () => items, fmt, esc, cardHTML, toast, render, on: (n, f) => bus.addEventListener(n, f) };
  render();
})();
