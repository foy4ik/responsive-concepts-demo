/* «Зерно» — скрипты проекта: статус «открыто», дата и гости в брони, заказ зерна. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Чек в первом экране: подсвечиваем сегодняшний день и считаем «открыто / закрыто» ---------- */
  const receipt = $('.receipt');
  if (receipt) {
    const now = new Date();
    const day = now.getDay(); // 0 — воскресенье
    const hours = ([1, 2, 3, 4, 5].includes(day)) ? [8, 21] : [9, 22];
    $$('[data-days]', receipt).forEach((row) => row.classList.toggle('is-today', row.dataset.days.split(',').includes(String(day))));
    const h = now.getHours() + now.getMinutes() / 60;
    const open = h >= hours[0] && h < hours[1];
    receipt.classList.toggle('is-closed', !open);
    $('[data-open-text]', receipt).textContent = open ? `Открыто до ${hours[1]}:00` : `Откроемся в ${h >= hours[1] ? 'завтра в 9:00' : hours[0] + ':00'}`;
  }

  /* ---------- Дата брони: нельзя выбрать прошедший день ---------- */
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $$('input[data-min-today]').forEach((i) => { i.min = today; });

  /* ---------- Счётчик гостей ---------- */
  const out = $('[data-guests]'), input = $('[data-guests-input]'), hint = $('[data-guests-hint]');
  if (out && input) {
    const MIN = 1, MAX = 10;
    const words = (n) => (n === 1 ? 'столик на одного' : n === 2 ? 'за столиком на двоих' : n <= 4 ? 'уютный стол на ' + n : n <= 6 ? 'большой стол на ' + n : 'сдвинем столы для ' + n + ' гостей');
    const set = (n) => {
      n = Math.min(MAX, Math.max(MIN, n));
      out.textContent = n;
      input.value = n;
      hint.textContent = words(n);
      $$('.stepper__btn').forEach((b) => { b.disabled = (+b.dataset.step < 0 && n <= MIN) || (+b.dataset.step > 0 && n >= MAX); });
    };
    $$('.stepper__btn').forEach((b) => b.addEventListener('click', () => set(+input.value + +b.dataset.step)));
    $('[data-form]', document).addEventListener('form:sent', () => set(2));
    set(2);
  }

  /* ---------- Заказ зерна: подставляем выбранный сорт в окно ---------- */
  $$('[data-bean]').forEach((b) => b.addEventListener('click', () => {
    $('[data-bean-summary]').textContent = `Сорт: ${b.dataset.bean}. Подготовим пакет к вашему приходу или отправим доставкой.`;
    $('[data-bean-input]').value = b.dataset.bean;
  }));
})();
