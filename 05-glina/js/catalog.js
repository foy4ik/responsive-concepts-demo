/* «Глина» — каталог: фильтры (категория, цена, цвет), сортировка, пагинация. Состояние хранится в адресной строке (?cat=&color=&min=&max=&sort=&page=). */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const PER_PAGE = 9;
  const grid = $('[data-grid]'), pager = $('[data-pager]'), empty = $('[data-empty]');
  const filtersEl = $('[data-filters]'), overlay = $('[data-filters-overlay]');
  const state = { cat: [], color: [], min: '', max: '', sort: 'pop', page: 1 };
  let data;

  const readUrl = () => {
    const q = new URLSearchParams(location.search);
    state.cat = (q.get('cat') || '').split(',').filter(Boolean);
    state.color = (q.get('color') || '').split(',').filter(Boolean);
    state.min = q.get('min') || ''; state.max = q.get('max') || '';
    state.sort = q.get('sort') || 'pop';
    state.page = Math.max(1, +q.get('page') || 1);
  };
  const writeUrl = () => {
    const q = new URLSearchParams();
    if (state.cat.length) q.set('cat', state.cat.join(','));
    if (state.color.length) q.set('color', state.color.join(','));
    if (state.min) q.set('min', state.min);
    if (state.max) q.set('max', state.max);
    if (state.sort !== 'pop') q.set('sort', state.sort);
    if (state.page > 1) q.set('page', state.page);
    const s = q.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
  };
  const syncControls = () => {
    $$('input[name=f-cat]').forEach((i) => { i.checked = state.cat.includes(i.value); });
    $$('input[name=f-color]').forEach((i) => { i.checked = state.color.includes(i.value); });
    $('input[name=pmin]').value = state.min; $('input[name=pmax]').value = state.max;
    $('[data-sort]').value = state.sort;
  };

  const filtered = () => {
    const min = state.min === '' ? 0 : +state.min, max = state.max === '' ? Infinity : +state.max;
    let list = data.products.filter((p) =>
      (!state.cat.length || state.cat.includes(p.cat)) &&
      p.price >= min && p.price <= max &&
      (!state.color.length || p.colors.some((c) => state.color.includes(c))));
    const by = { pop: (a, b) => b.pop - a.pop, 'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price, new: (a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.pop - a.pop }[state.sort];
    return list.sort(by);
  };

  const plural = (n, [a, b, c]) => { const m = n % 100, d = n % 10; return m > 10 && m < 20 ? c : d === 1 ? a : d > 1 && d < 5 ? b : c; };

  function render() {
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > pages) state.page = pages;
    const slice = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
    grid.innerHTML = slice.map((p) => window.Shop.cardHTML(p, data, 2)).join('');
    grid.hidden = !slice.length; empty.hidden = !!slice.length;
    $('[data-count]').nextSibling.textContent = ' ' + plural(list.length, ['изделие', 'изделия', 'изделий']);
    $('[data-count]').textContent = list.length;
    $('[data-count-btn]').textContent = list.length;
    // счётчики категорий считаем без учёта фильтра по категориям
    $$('[data-n-cat]').forEach((el) => { el.textContent = data.products.filter((p) => p.cat === el.dataset.nCat).length; });
    const active = state.cat.length + state.color.length + (state.min !== '' ? 1 : 0) + (state.max !== '' ? 1 : 0);
    const badge = $('[data-active-count]'); badge.textContent = active; badge.hidden = !active;
    // заголовок
    const one = state.cat.length === 1 ? data.categories[state.cat[0]] : null;
    $('[data-catalog-title]').textContent = one || 'Каталог';
    document.title = (one ? `${one} — каталог` : 'Каталог керамики — кружки, тарелки, вазы, наборы') + ' | Глина';
    // пагинация
    if (pages > 1) {
      pager.hidden = false;
      const mk = (n, label = n, extra = '') => `<a href="#" data-goto="${n}" ${n === state.page && !extra ? 'aria-current="page"' : ''} ${extra} aria-label="${extra ? label : 'Страница ' + n}">${extra ? label : n}</a>`;
      pager.innerHTML = mk(Math.max(1, state.page - 1), '←', state.page === 1 ? 'aria-disabled="true" tabindex="-1"' : 'rel="prev"')
        + Array.from({ length: pages }, (_, i) => mk(i + 1)).join('')
        + mk(Math.min(pages, state.page + 1), '→', state.page === pages ? 'aria-disabled="true" tabindex="-1"' : 'rel="next"');
    } else pager.hidden = true;
    writeUrl();
  }

  /* ---------- события ---------- */
  const read = () => {
    state.cat = $$('input[name=f-cat]:checked').map((i) => i.value);
    state.color = $$('input[name=f-color]:checked').map((i) => i.value);
    state.min = $('input[name=pmin]').value; state.max = $('input[name=pmax]').value;
    state.page = 1;
  };
  filtersEl.addEventListener('change', () => { read(); render(); });
  filtersEl.addEventListener('input', (e) => { if (e.target.type === 'number') { read(); render(); } });
  $('[data-sort]').addEventListener('change', (e) => { state.sort = e.target.value; state.page = 1; render(); });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-filters-reset]')) { Object.assign(state, { cat: [], color: [], min: '', max: '', page: 1 }); syncControls(); render(); }
    const pg = e.target.closest("[data-goto]");
    if (pg) { e.preventDefault(); if (pg.getAttribute('aria-disabled')) return; state.page = +pg.dataset.goto; render(); $('.catalog__bar').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
  });

  /* ---------- панель фильтров на мобильном ---------- */
  const openBtn = $('[data-filters-open]');
  let open = false;
  const setPanel = (v) => {
    if (v === open) return;
    open = v;
    filtersEl.classList.toggle('is-open', v); overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.toggle('is-open', v));
    if (!v) setTimeout(() => { if (!open) overlay.hidden = true; }, 300);
    openBtn.setAttribute('aria-expanded', String(v));
    v ? window.Core.lockScroll() : window.Core.unlockScroll();
    if (v) $('input', filtersEl).focus({ preventScroll: true }); else openBtn.focus({ preventScroll: true });
  };
  openBtn.addEventListener('click', () => setPanel(true));
  overlay.addEventListener('click', () => setPanel(false));
  $$('[data-filters-close]').forEach((b) => b.addEventListener('click', () => setPanel(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) setPanel(false); });
  matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setPanel(false); });

  window.Shop.load().then((d) => { data = d; readUrl(); syncControls(); render(); });
})();
