/*
 * core.js — общее ядро интерактива (чистый JS, без библиотек).
 * Подключается в каждый проект; поведение включается data-атрибутами:
 *   [data-burger] + [data-nav]      бургер-меню с блокировкой скролла
 *   [data-header]                    класс is-scrolled у шапки после прокрутки
 *   [data-modal-open="id"]           открыть модальное окно #id
 *   [data-modal] / [data-modal-close] модалка; закрытие по Esc, клику на фон и крестику
 *   [data-reveal]                    появление блока при скролле (IntersectionObserver)
 *   input[data-phone]                маска телефона +7 (___) ___-__-__
 *   form[data-form]                  валидация и имитация отправки
 *   [data-tabs] [data-tab] [data-panel]  вкладки (стрелки, Home/End)
 */
(() => {
  'use strict';
  const doc = document, root = doc.documentElement;
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => [...c.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- блокировка прокрутки (учитывает ширину скроллбара, без «прыжка» вёрстки) ---------- */
  let locks = 0;
  const lockScroll = () => {
    if (locks++ === 0) {
      root.style.setProperty('--scrollbar', innerWidth - root.clientWidth + 'px');
      root.classList.add('is-locked');
    }
  };
  const unlockScroll = () => {
    if (locks > 0 && --locks === 0) root.classList.remove('is-locked');
  };

  /* ---------- бургер-меню ---------- */
  const burger = $('[data-burger]');
  const nav = $('[data-nav]');
  let menuOpen = false;
  const setMenu = (open) => {
    if (!burger || open === menuOpen) return;
    menuOpen = open;
    root.classList.toggle('is-menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    open ? lockScroll() : unlockScroll();
  };
  if (burger && nav) {
    burger.addEventListener('click', () => setMenu(!menuOpen));
    nav.addEventListener('click', (e) => { if (e.target.closest('a, button[data-modal-open]')) setMenu(false); });
    matchMedia('(min-width: 1024px)').addEventListener('change', (e) => e.matches && setMenu(false));
  }

  /* ---------- плавный скролл к якорям ---------- */
  doc.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const target = doc.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); // отступ под шапку — scroll-margin-top в CSS
    history.replaceState(null, '', a.getAttribute('href'));
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------- шапка при прокрутке ---------- */
  const header = $('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 24);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- модальные окна ---------- */
  let activeModal = null, lastFocus = null;
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const openModal = (id, trigger) => {
    const modal = doc.getElementById(id);
    if (!modal) return;
    if (activeModal && activeModal !== modal) closeModal(true);
    setMenu(false);
    lastFocus = trigger || doc.activeElement;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    activeModal = modal;
    lockScroll();
    const first = $('[data-autofocus]', modal) || $(FOCUSABLE, modal);
    setTimeout(() => first && first.focus({ preventScroll: true }), 30);
    modal.dispatchEvent(new CustomEvent('modal:open', { bubbles: true }));
  };
  const closeModal = (silent) => {
    if (!activeModal) return;
    const modal = activeModal;
    activeModal = null;
    modal.classList.remove('is-open');
    const done = () => { modal.hidden = true; };
    reduceMotion ? done() : setTimeout(done, 280);
    unlockScroll();
    if (!silent && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    modal.dispatchEvent(new CustomEvent('modal:close', { bubbles: true }));
  };
  doc.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-modal-open]');
    if (opener) {
      e.preventDefault();
      const service = opener.dataset.service; // необязательно: предвыбрать услугу/тариф в форме модалки
      openModal(opener.dataset.modalOpen, opener);
      if (service) {
        const sel = $(`#${opener.dataset.modalOpen} select[name="service"]`);
        if (sel) sel.value = service;
      }
      return;
    }
    if (activeModal && (e.target === activeModal || e.target.closest('[data-modal-close]'))) closeModal();
  });
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (activeModal) closeModal();
      else if (menuOpen) { setMenu(false); burger.focus(); }
    }
    if (e.key === 'Tab' && activeModal) { // фокус не уходит за пределы модалки
      const items = $$(FOCUSABLE, activeModal).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- появление блоков при скролле ---------- */
  const revealEls = $$('[data-reveal]');
  if (revealEls.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('is-visible'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      revealEls.forEach((el) => {
        if (el.dataset.revealDelay) el.style.setProperty('--reveal-delay', el.dataset.revealDelay + 'ms');
        io.observe(el);
      });
    }
  }

  /* ---------- маска телефона ---------- */
  const formatPhone = (raw) => {
    let d;
    if (raw.startsWith('+7')) {
      d = raw.slice(2).replace(/\D/g, ''); // после префикса +7 берём только набранные цифры
      if (d.length === 1 && (d === '7' || d === '8')) d = ''; // привычное «8» или «7» первой цифрой — это не код города
    } else {
      d = raw.replace(/\D/g, '');
      if (d[0] === '8' || d[0] === '7') d = d.slice(1); // вставка «8 916…» или «7916…»
    }
    d = d.slice(0, 10);
    if (!d && !raw.replace(/\D/g, '')) return '';
    let out = '+7';
    if (d.length) out += ' (' + d.slice(0, 3);
    if (d.length >= 3) out += ')';
    if (d.length > 3) out += ' ' + d.slice(3, 6);
    if (d.length > 6) out += '-' + d.slice(6, 8);
    if (d.length > 8) out += '-' + d.slice(8, 10);
    return out;
  };
  // capture-фаза: маска применяется раньше, чем форма проверяет значение (иначе ошибка «мигает» и сдвигает вёрстку)
  doc.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.matches || !el.matches('input[data-phone]')) return;
    const deleting = e.inputType && e.inputType.startsWith('delete');
    const digits = el.value.replace(/\D/g, '');
    el.value = deleting && digits.length <= 1 ? '' : formatPhone(el.value);
  }, true);
  doc.addEventListener('focusin', (e) => {
    const el = e.target;
    if (el.matches && el.matches('input[data-phone]') && !el.value) el.value = '+7 (';
  });
  doc.addEventListener('focusout', (e) => {
    const el = e.target;
    if (el.matches && el.matches('input[data-phone]') && el.value.replace(/\D/g, '').length <= 1) el.value = '';
  });

  /* ---------- валидация форм ---------- */
  const RULES = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Введите имя — минимум 2 буквы'),
    phone: (v) => (v.replace(/\D/g, '').length === 11 ? '' : 'Введите телефон полностью: +7 (900) 000-00-00'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Проверьте почту: например, name@example.ru'),
    required: (v) => (v.trim() ? '' : 'Заполните это поле'),
  };
  const fieldError = (field) => {
    const box = field.closest('[data-field]');
    return box ? $('[data-error]', box) : null;
  };
  const validateField = (field) => {
    if (field.disabled || field.type === 'hidden') return true;
    let msg = '';
    const rule = field.dataset.validate;
    const value = field.type === 'checkbox' ? (field.checked ? '1' : '') : field.value;
    if (field.required && !value.trim()) msg = field.type === 'checkbox' ? 'Подтвердите согласие' : (field.tagName === 'SELECT' ? 'Выберите вариант из списка' : (RULES[rule] && rule !== 'required' ? RULES[rule]('') : 'Заполните это поле'));
    else if (value && RULES[rule]) msg = RULES[rule](value);
    const out = fieldError(field);
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (out) { out.textContent = msg; out.hidden = !msg; if (!out.id) out.id = 'err-' + Math.random().toString(36).slice(2, 8); field.setAttribute('aria-describedby', out.id); }
    field.closest('[data-field]')?.classList.toggle('has-error', !!msg);
    return !msg;
  };
  $$('form[data-form]').forEach((form) => {
    form.noValidate = true;
    form.addEventListener('focusout', (e) => { if (e.target.matches('input, select, textarea') && e.target.getAttribute('aria-invalid') === 'true') validateField(e.target); });
    form.addEventListener('input', (e) => { if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true') validateField(e.target); });
    form.addEventListener('change', (e) => { if (e.target.getAttribute && e.target.getAttribute('aria-invalid') === 'true') validateField(e.target); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = $$('input, select, textarea', form);
      const bad = fields.filter((f) => !validateField(f));
      if (bad.length) { bad[0].focus(); return; }
      const btn = $('[type="submit"]', form);
      btn && btn.classList.add('is-loading');
      btn && (btn.disabled = true);
      const payload = Object.fromEntries(new FormData(form).entries());
      /*
       * ПОДКЛЮЧЕНИЕ ОБРАБОТЧИКА: здесь бэкенда нет, отправка имитируется.
       * Чтобы принимать заявки, замените setTimeout на запрос, например:
       *   fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
       *     .then((r) => r.ok ? done() : fail());
       * или направьте форму на CRM / Telegram-бота / почтовый сервис.
       */
      setTimeout(() => {
        btn && btn.classList.remove('is-loading');
        btn && (btn.disabled = false);
        form.reset();
        $$('[data-field]', form).forEach((f) => f.classList.remove('has-error'));
        $$('[aria-invalid]', form).forEach((f) => f.removeAttribute('aria-invalid'));
        form.dispatchEvent(new CustomEvent('form:sent', { bubbles: true, detail: payload }));
        openModal(form.dataset.form || 'thanks');
      }, reduceMotion ? 0 : 700);
    });
  });

  /* ---------- вкладки ---------- */
  $$('[data-tabs]').forEach((box) => {
    const tabs = $$('[data-tab]', box);
    const panels = $$('[data-panel]', box);
    const select = (key, focus) => {
      tabs.forEach((t) => {
        const on = t.dataset.tab === key;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        t.classList.toggle('is-active', on);
        if (on && focus) t.focus();
      });
      panels.forEach((p) => {
        const on = p.dataset.panel === key;
        p.hidden = !on;
        p.classList.toggle('is-active', on);
      });
      box.dispatchEvent(new CustomEvent('tabs:change', { detail: key }));
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t.dataset.tab));
      t.addEventListener('keydown', (e) => {
        const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length].dataset.tab, true); }
        if (e.key === 'Home') { e.preventDefault(); select(tabs[0].dataset.tab, true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1].dataset.tab, true); }
      });
    });
  });

  window.Core = { openModal, closeModal, lockScroll, unlockScroll, reduceMotion };
})();
