/* «Глина» — страница товара: открывается по ?id=, галерея с увеличением, выбор цвета и количества, вкладки, похожие товары. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const { fmt, esc } = window.Shop;
  const VIEWS = ['Вид спереди', 'Вид сверху', 'Крупный план'];

  window.Shop.load().then((data) => {
    const id = +new URLSearchParams(location.search).get('id');
    const p = data.products.find((x) => x.id === id);
    if (!p) { $('[data-product]').hidden = true; $('.related').hidden = true; $('[data-not-found]').hidden = false; document.title = 'Изделие не найдено | Глина'; return; }

    let color = p.colors[0], view = 0, qty = 1;
    const main = $('[data-main-img]'), thumbs = $('[data-thumbs]'), zoomImg = $('[data-zoom-img]');

    /* ---------- тексты ---------- */
    document.title = `${p.title} — купить керамику ручной работы | Глина`;
    $('meta[name=description]').setAttribute('content', `${p.title}: ${p.size}. ${p.desc.slice(0, 110)}…`);
    $('[data-p-cat]').textContent = data.categories[p.cat];
    $('[data-p-title]').textContent = p.title;
    $('[data-p-size]').textContent = p.size;
    $('[data-p-price]').innerHTML = (p.oldPrice ? `<s>${fmt(p.oldPrice)}</s>` : '') + fmt(p.price);
    $('[data-p-desc]').textContent = p.desc;
    $('[data-p-care]').textContent = p.care;
    $('[data-p-delivery]').textContent = p.delivery;
    $('[data-p-specs]').innerHTML = [['Размер', p.size], ['Материал', 'Керамика, обжиг 1 240 °C'], ['Покрытие', 'Пищевая глазурь'], ['Артикул', 'GL-' + String(p.id).padStart(3, '0')]].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
    const crumbs = $('[data-crumbs]');
    crumbs.innerHTML = `<li><a href="index.html">Главная</a></li><li><a href="catalog.html">Каталог</a></li><li><a href="catalog.html?cat=${p.cat}">${data.categories[p.cat]}</a></li><li aria-current="page">${esc(p.title)}</li>`;

    /* ---------- микроразметка Product ---------- */
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product', name: p.title, description: p.desc, sku: 'GL-' + String(p.id).padStart(3, '0'),
      image: Object.values(p.images).flat().slice(0, 3), brand: { '@type': 'Brand', name: 'Глина' },
      offers: { '@type': 'Offer', priceCurrency: 'RUB', price: p.price, availability: 'https://schema.org/InStock', url: location.href.split('#')[0] },
    });
    document.head.appendChild(ld);

    /* ---------- галерея и цвета ---------- */
    const imgs = () => p.images[color];
    const alt = (v) => `${p.title}, глазурь «${data.colors[color].name}»: ${VIEWS[v].toLowerCase()}`;
    const showView = (v) => {
      view = v;
      main.src = imgs()[v]; main.alt = alt(v);
      $$('.gallery__thumb', thumbs).forEach((b, i) => b.setAttribute('aria-current', String(i === v)));
    };
    const drawThumbs = () => {
      thumbs.innerHTML = imgs().map((src, i) => `<li><button class="gallery__thumb" type="button" data-view="${i}" aria-current="${i === view}" aria-label="${VIEWS[i]}"><img src="${src}" width="800" height="800" loading="lazy" alt=""></button></li>`).join('');
    };
    const setColor = (c) => {
      color = c;
      $$('.color-pick__btn').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.color === c)));
      $('[data-p-color]').textContent = data.colors[c].name;
      drawThumbs(); showView(view);
      history.replaceState(null, '', `?id=${p.id}&color=${c}` + location.hash);
    };
    $('[data-colors]').innerHTML = p.colors.map((c) => `<button class="color-pick__btn" type="button" role="radio" aria-checked="false" data-color="${c}" style="--sw:${data.colors[c].hex}" aria-label="${esc(data.colors[c].name)}" title="${esc(data.colors[c].name)}"></button>`).join('');
    const urlColor = new URLSearchParams(location.search).get('color');
    if (urlColor && p.colors.includes(urlColor)) color = urlColor;
    setColor(color);
    $('[data-colors]').addEventListener('click', (e) => { const b = e.target.closest('[data-color]'); if (b) setColor(b.dataset.color); });
    thumbs.addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (b) showView(+b.dataset.view); });

    /* ---------- увеличение ---------- */
    const showZoom = (v) => { view = (v + 3) % 3; zoomImg.src = imgs()[view]; zoomImg.alt = alt(view); showView(view); };
    $('[data-zoom]').addEventListener('click', () => { zoomImg.src = imgs()[view]; zoomImg.alt = alt(view); window.Core.openModal('zoom', $('[data-zoom]')); });
    $('[data-zoom-prev]').addEventListener('click', () => showZoom(view - 1));
    $('[data-zoom-next]').addEventListener('click', () => showZoom(view + 1));
    $('#zoom').addEventListener('click', (e) => { if (e.target.classList.contains('zoom__fig')) window.Core.closeModal(); });
    document.addEventListener('keydown', (e) => { if (!$('#zoom').hidden && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) showZoom(view + (e.key === 'ArrowRight' ? 1 : -1)); });

    /* ---------- количество и покупка ---------- */
    const qv = $('[data-qty-value]');
    $$('[data-qty]').forEach((b) => b.addEventListener('click', () => {
      qty = Math.max(1, Math.min(20, qty + +b.dataset.qty));
      qv.textContent = qty;
      $('[data-qty="-1"]').disabled = qty <= 1; $('[data-qty="1"]').disabled = qty >= 20;
    }));
    $('[data-qty="-1"]').disabled = true;
    $('[data-add-current]').addEventListener('click', () => window.Shop.add(p.id, color, qty));
    // кнопка «В корзину» из карточек обрабатывается в shop.js; здесь — открыть корзину после добавления с этой страницы
    window.Shop.on('add', () => setTimeout(() => window.Core.openModal('cart'), 350));

    /* ---------- вкладки по якорю (#tab-care) ---------- */
    if (location.hash.startsWith('#tab-')) $(location.hash)?.click();

    /* ---------- похожие товары ---------- */
    const rel = data.products.filter((x) => x.cat === p.cat && x.id !== p.id);
    const more = data.products.filter((x) => x.cat !== p.cat && x.id !== p.id).sort((a, b) => b.pop - a.pop);
    $('[data-related]').innerHTML = [...rel, ...more].slice(0, 4).map((x) => window.Shop.cardHTML(x, data)).join('');
  });
})();
