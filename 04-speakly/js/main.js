/* «Speakly» — скрипты проекта: тест уровня, переключатель тарифов, счётчики, слайдер, подстановка в заявку. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU');

  /* ---------- Мини-тест уровня: 3 вопроса → A2 / B1 / B2 ---------- */
  const test = $('[data-level-test]');
  if (test) {
    const qs = $$('.quiz__q', test), dots = $$('.quiz__dots i', test);
    const now = $('[data-q-now]', test), err = $('[data-q-error]', test);
    const next = $('[data-q-next]', test), prev = $('[data-q-prev]', test), result = $('[data-result]', test);
    const nav = $('.quiz__nav', test), top = $('.quiz__top', test);
    const LEVELS = {
      A2: { title: 'Elementary', text: 'Вы понимаете простые фразы и можете поддержать короткий диалог. Пора расширять словарный запас и учиться говорить в прошедшем и будущем времени.', course: 'Курс «Старт»: группа до 6 человек, 2 урока в неделю', plan: 'Старт' },
      B1: { title: 'Intermediate', text: 'Вы справляетесь с бытовыми ситуациями и понимаете основную мысль. Дальше важно набрать беглость и уверенность в живой речи.', course: 'Курс «Разговор»: мини-группа и клуб с носителем', plan: 'Разговор' },
      B2: { title: 'Upper-Intermediate', text: 'Вы свободно общаетесь и редко задумываетесь над грамматикой. Теперь нужна шлифовка: идиомы, тонкости произношения и профессиональная лексика.', course: 'Курс «Про»: индивидуальные уроки 1 на 1', plan: 'Про' },
    };
    let cur = 0;
    const show = (i) => {
      cur = i;
      qs.forEach((q, k) => { q.hidden = k !== i; });
      now.textContent = i + 1;
      dots.forEach((d, k) => d.classList.toggle('on', k <= i));
      prev.hidden = i === 0;
      $('[data-q-next-text]', next).textContent = i === qs.length - 1 ? 'Узнать уровень' : 'Дальше';
      err.hidden = true;
    };
    const score = () => qs.reduce((sum, q) => sum + +($('input:checked', q) || { value: 0 }).value, 0);
    const finish = () => {
      const s = score(); // 0–5 баллов: ≤1 → A2, 2–3 → B1, ≥4 → B2
      const key = s <= 1 ? 'A2' : s <= 3 ? 'B1' : 'B2';
      const L = LEVELS[key];
      $('[data-r-level]', test).textContent = key;
      $('[data-r-title]', test).textContent = L.title;
      $('[data-r-text]', test).textContent = L.text;
      $('[data-r-course]', test).textContent = L.course;
      const btn = $('[data-level]', test);
      btn.dataset.level = key; btn.dataset.plan = L.plan;
      qs.forEach((q) => { q.hidden = true; });
      [nav, top, err].forEach((e) => { e.hidden = true; });
      result.hidden = false;
    };
    next.addEventListener('click', () => {
      if (!$('input:checked', qs[cur])) { err.hidden = false; return; }
      cur === qs.length - 1 ? finish() : show(cur + 1);
    });
    prev.addEventListener('click', () => show(cur - 1));
    test.addEventListener('change', (e) => { if (e.target.type === 'radio') err.hidden = true; });
    $('[data-q-restart]', test).addEventListener('click', () => {
      $$('input', test).forEach((i) => { i.checked = false; });
      result.hidden = true; top.hidden = false; nav.hidden = false;
      show(0);
    });
    show(0);
  }

  /* ---------- Подстановка выбранного тарифа / уровня в заявку ---------- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-modal-open="trial-modal"]');
    if (!b) return;
    const plan = b.dataset.plan || '', level = b.dataset.level || '';
    $('[data-plan-input]').value = plan;
    $('[data-level-input]').value = level;
    $('[data-trial-note]').textContent = level ? `Ваш уровень по тесту: ${level}. Подберём группу и преподавателя.` : plan ? `Тариф «${plan}». Первый урок бесплатный, оплата после него.` : 'Оставьте контакты, и мы подберём время и преподавателя.';
  });

  /* ---------- Тарифы: помесячно / весь курс ---------- */
  const sw = $('[data-billing]');
  if (sw) {
    const plans = $$('.plan');
    const labelM = $('#bill-m'), labelC = $('#bill-label');
    const render = (course) => {
      sw.setAttribute('aria-checked', String(course));
      labelM.style.opacity = course ? .5 : 1;
      labelC.style.opacity = course ? 1 : .5;
      plans.forEach((p) => {
        const m = +p.dataset.month, c = +p.dataset.course;
        $('[data-price]', p).textContent = fmt(course ? c : m);
        $('[data-per]', p).textContent = course ? '/ 3 мес' : '/ мес';
        $('[data-old]', p).textContent = course ? fmt(m * 3) + ' ₽' : '';
      });
    };
    sw.addEventListener('click', () => render(sw.getAttribute('aria-checked') !== 'true'));
    labelM.addEventListener('click', () => render(false));
    labelC.addEventListener('click', () => render(true));
    render(false);
  }

  /* ---------- Счётчики ---------- */
  const counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const el = en.target, to = +el.dataset.count, div = +(el.dataset.div || 1), dec = +(el.dataset.decimals || 0);
        const t0 = performance.now(), dur = 1600;
        const step = (t) => {
          const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
          const v = (to * e) / div;
          el.textContent = dec ? v.toFixed(dec).replace('.', ',') : fmt(v);
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach((c) => { c.textContent = c.dataset.decimals ? '0,0' : '0'; io.observe(c); });
  }

  /* ---------- Слайдер преподавателей ---------- */
  const slider = $('[data-slider]');
  if (slider) {
    const track = $('.slider__track', slider), slides = $$('.teacher', track), dots = $('.slider__dots', slider);
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
})();
