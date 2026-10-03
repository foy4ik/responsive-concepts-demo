/* «Северный дом» — скрипты проекта: цены, фильтры каталога, калькулятор, этапы, слайдер, квиз, параллакс. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
  const plural = (n, [a, b, c]) => { const m = n % 100, d = n % 10; return m > 10 && m < 20 ? c : d === 1 ? a : d > 1 && d < 5 ? b : c; };

  /* ---------- Единая формула цены: каталог и калькулятор считают одинаково ---------- */
  const BASE = { material: 42000, finish: 18000 };
  const FLOOR_K = { '1': 1.08, '1.5': 1, '2': 0.97 };
  const price = (area, material, floorK, finish) => Math.round((area * (material + finish) * floorK) / 1000) * 1000;

  /* ---------- Каталог: цены карточек и фильтры ---------- */
  const houses = $$('.house');
  houses.forEach((h) => {
    const p = price(+h.dataset.area, BASE.material, FLOOR_K[h.dataset.floors], BASE.finish);
    $('[data-price]', h).textContent = fmt(p);
  });
  const filters = $('[data-catalog-filters]');
  if (filters) {
    const countEl = $('[data-count]', filters), countWrap = countEl.parentElement, empty = $('[data-empty]');
    const grid = $('[data-houses]');
    const apply = () => {
      const area = $('input[name=f-area]:checked', filters).value;
      const floors = $('input[name=f-floors]:checked', filters).value;
      const [lo, hi] = area === 'all' ? [0, 9999] : area.split('-').map(Number);
      let n = 0;
      houses.forEach((h) => {
        const a = +h.dataset.area;
        const show = (area === 'all' || (a >= lo && a < hi)) && (floors === 'all' || h.dataset.floors === floors);
        if (show) n++;
        if (show && h.hidden) { h.hidden = false; h.classList.add('is-visible', 'is-entering'); setTimeout(() => h.classList.remove('is-entering'), 600); }
        if (!show) h.hidden = true;
      });
      countEl.textContent = n;
      countWrap.lastChild.textContent = ' ' + plural(n, ['проект', 'проекта', 'проектов']);
      empty.hidden = n !== 0;
      grid.hidden = n === 0;
    };
    filters.addEventListener('change', apply);
    $('[data-filters-reset]').addEventListener('click', () => {
      $$('input[value=all]', filters).forEach((i) => { i.checked = true; });
      apply();
    });
  }

  /* ---------- Калькулятор ---------- */
  const calc = $('[data-calc]');
  if (calc) {
    const areaIn = $('#calc-area'), out = $('[data-out-area]');
    const q = (name) => $(`input[name=${name}]:checked`, calc);
    const totalEl = $('[data-total]');
    let shown = 0, raf = 0, last = null;
    const tween = (to) => {
      cancelAnimationFrame(raf);
      if (reduce) { totalEl.textContent = fmt(to); shown = to; return; }
      const from = shown, t0 = performance.now(), dur = 450;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        shown = from + (to - from) * e;
        totalEl.textContent = fmt(shown);
        if (k < 1) raf = requestAnimationFrame(step); else shown = to;
      };
      raf = requestAnimationFrame(step);
    };
    const months = (area, material, finish) => {
      const base = { 42000: 2.2, 34000: 1.9, 28000: 1.3 }[material];
      const fin = { 0: 0, 9000: 0.5, 18000: 1 }[finish];
      return Math.max(2, Math.round(base + area / 150 + fin));
    };
    const update = () => {
      const area = +areaIn.value, material = +q('material').value, floorK = +q('floors').value, finish = +q('finish').value;
      const total = price(area, material, floorK, finish);
      out.textContent = area;
      areaIn.style.setProperty('--p', ((area - areaIn.min) / (areaIn.max - areaIn.min)) * 100 + '%');
      $('[data-line-area]').textContent = area + ' м²';
      $('[data-line-material]').textContent = q('material').dataset.name;
      $('[data-line-floors]').textContent = q('floors').dataset.name;
      $('[data-line-finish]').textContent = q('finish').dataset.name;
      $('[data-line-sqm]').textContent = fmt((material + finish) * floorK) + ' ₽';
      const m = months(area, material, finish);
      $('[data-term]').textContent = m + ' ' + plural(m, ['месяц', 'месяца', 'месяцев']);
      $('[data-mortgage]').textContent = fmt(Math.round((total * 0.8 * 0.011011) / 100) * 100);
      tween(total);
      last = { area, material: q('material').dataset.name, floors: q('floors').dataset.name, finish: q('finish').dataset.name, total, term: m };
    };
    calc.addEventListener('input', update);
    calc.addEventListener('change', update);
    update();
    $('[data-calc-submit]').addEventListener('click', () => {
      const s = `Расчёт: ${last.area} м², ${last.material.toLowerCase()}, ${last.floors.toLowerCase()}, ${last.finish.toLowerCase()} — ${fmt(last.total)} ₽, срок ${last.term} мес.`;
      $('[data-modal-summary]').textContent = s + ' Менеджер уточнит детали и пришлёт точную смету.';
      $('[data-project]').value = s;
    });
  }
  // «Получить проект» из карточки каталога
  $$('.house__btn').forEach((b) => b.addEventListener('click', () => {
    $('[data-modal-summary]').textContent = `Проект «${b.dataset.service}»: пришлём планировки, фасады и точную смету.`;
    $('[data-project]').value = 'Проект «' + b.dataset.service + '»';
  }));
  $$('.header__cta, .empty [data-modal-open]').forEach((b) => b.addEventListener('click', () => {
    $('[data-modal-summary]').textContent = 'Перезвоним в течение 15 минут и ответим на вопросы по проекту.';
    $('[data-project]').value = '';
  }));

  /* ---------- Параллакс первого экрана ---------- */
  const img = $('[data-parallax]');
  if (img && !reduce) {
    const hero = img.closest('.hero');
    let ticking = false;
    const apply = () => {
      ticking = false;
      const y = scrollY;
      if (y < hero.offsetHeight + 100) img.style.setProperty('--py', (y * 0.28).toFixed(1) + 'px');
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }, { passive: true });
  }

  /* ---------- Этапы: линия заполняется по мере прокрутки ---------- */
  const tl = $('[data-timeline]');
  if (tl) {
    const steps = $$('.step', tl);
    let ticking = false;
    const apply = () => {
      ticking = false;
      const r = tl.getBoundingClientRect(), mid = innerHeight * 0.55;
      const p = Math.min(1, Math.max(0, (mid - r.top) / r.height));
      tl.style.setProperty('--tl', reduce ? 1 : p.toFixed(3));
      steps.forEach((s) => s.classList.toggle('is-done', reduce || s.getBoundingClientRect().top < mid));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }, { passive: true });
    addEventListener('resize', apply);
    apply();
  }

  /* ---------- Слайдер объектов ---------- */
  const slider = $('[data-slider]');
  if (slider) {
    const track = $('.slider__track', slider), slides = $$('.object', track), dots = $('.slider__dots', slider);
    const prev = $('[data-prev]'), next = $('[data-next]');
    slides.forEach(() => { const d = document.createElement('span'); d.className = 'slider__dot'; dots.appendChild(d); });
    const step = () => slides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 24);
    const update = () => {
      const i = Math.round(track.scrollLeft / step());
      $$('.slider__dot', dots).forEach((d, k) => d.classList.toggle('is-active', k === Math.min(i, slides.length - 1)));
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    };
    const go = (dir) => track.scrollBy({ left: dir * step(), behavior: reduce ? 'auto' : 'smooth' });
    prev && prev.addEventListener('click', () => go(-1));
    next && next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
    addEventListener('resize', update);
    update();
  }

  /* ---------- Квиз ---------- */
  const quiz = $('[data-quiz]');
  if (quiz) {
    const boxes = $$('.quiz__step-box', quiz), total = boxes.length;
    const bar = $('[data-bar]', quiz), barWrap = $('.quiz__bar', quiz), now = $('[data-step-now]', quiz);
    const nextBtn = $('[data-next-step]', quiz), prevBtn = $('[data-prev-step]', quiz), submit = $('[data-submit]', quiz), err = $('[data-quiz-error]', quiz);
    let cur = 0;
    const show = (i) => {
      cur = i;
      boxes.forEach((b, k) => { b.hidden = k !== i; });
      now.textContent = i + 1;
      const pct = ((i + 1) / total) * 100;
      bar.style.width = pct + '%';
      barWrap.setAttribute('aria-valuenow', pct);
      prevBtn.hidden = i === 0;
      nextBtn.hidden = i === total - 1;
      submit.hidden = i !== total - 1;
      err.hidden = true;
    };
    const go = (dir) => {
      if (dir > 0 && cur < total - 1 && !$('input:checked', boxes[cur])) { err.hidden = false; return; }
      show(Math.min(total - 1, Math.max(0, cur + dir)));
      const first = $('input', boxes[cur]);
      first && first.type !== 'radio' && first.focus({ preventScroll: true });
    };
    nextBtn.addEventListener('click', () => go(1));
    prevBtn.addEventListener('click', () => go(-1));
    quiz.addEventListener('change', (e) => { if (e.target.type === 'radio') { err.hidden = true; if (cur < total - 1 && !reduce) setTimeout(() => { if ($('input:checked', boxes[cur]) && !boxes[cur].hidden) go(1); }, 380); } });
    quiz.addEventListener('form:sent', () => show(0));
    show(0);
  }
})();
