/* «Лаванда» — скрипты проекта: лайтбокс галереи, слайдер отзывов, дата записи. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Дата записи: нельзя выбрать прошедший день */
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $$('input[data-min-today]').forEach((i) => { i.min = today; });

  /* ---------- Лайтбокс ---------- */
  const lb = $('#lightbox');
  const items = $$('.gallery__btn');
  if (lb && items.length) {
    const img = $('.lightbox__img', lb), cap = $('.lightbox__cap', lb);
    let idx = 0, lastFocus = null;
    const show = (i) => {
      idx = (i + items.length) % items.length;
      const b = items[idx];
      img.src = b.dataset.full;
      img.alt = $('img', b).alt;
      cap.textContent = b.dataset.caption || '';
    };
    const open = (i, trigger) => {
      lastFocus = trigger;
      show(i);
      lb.hidden = false;
      requestAnimationFrame(() => lb.classList.add('is-open'));
      window.Core.lockScroll();
      $('[data-lb-close]', lb).focus();
    };
    const close = () => {
      lb.classList.remove('is-open');
      setTimeout(() => { lb.hidden = true; }, reduce ? 0 : 300);
      window.Core.unlockScroll();
      lastFocus && lastFocus.focus({ preventScroll: true });
    };
    const isOpen = () => !lb.hidden;
    items.forEach((b, i) => b.addEventListener('click', () => open(i, b)));
    $('[data-lb-close]', lb).addEventListener('click', close);
    $('[data-lb-prev]', lb).addEventListener('click', () => show(idx - 1));
    $('[data-lb-next]', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lightbox__fig')) close(); });
    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'Tab') { // фокус остаётся внутри окна
        const f = $$('button', lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // свайп на телефоне
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  /* ---------- Слайдер отзывов ---------- */
  const slider = $('[data-slider]');
  if (slider) {
    const track = $('.slider__track', slider);
    const slides = $$('.review', track);
    const dots = $('.slider__dots', slider);
    const prev = $('[data-prev]'), next = $('[data-next]');
    slides.forEach((_, i) => { const d = document.createElement('span'); d.className = 'slider__dot'; dots.appendChild(d); });
    const step = () => slides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 16);
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      const i = Math.round(track.scrollLeft / step());
      $$('.slider__dot', dots).forEach((d, k) => d.classList.toggle('is-active', k === Math.min(i, slides.length - 1)));
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
    };
    const go = (dir) => track.scrollBy({ left: dir * step(), behavior: reduce ? 'auto' : 'smooth' });
    prev && prev.addEventListener('click', () => go(-1));
    next && next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
    addEventListener('resize', update);
    update();
  }
})();
