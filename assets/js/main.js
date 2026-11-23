/* Pinch of Salt · small behaviours, no libraries.
   Every block checks that its elements exist, so one file serves every page. */
(function () {
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var params = new URLSearchParams(window.location.search);

  /* ---------- Header: hairline and small logo once the big logo has scrolled away ---------- */
  var nav = $('#nav');
  var brand = $('.brand');
  function onScroll() {
    var limit = brand ? brand.offsetTop + brand.offsetHeight - nav.offsetHeight : 10;
    nav.classList.toggle('is-stuck', window.scrollY > limit);
  }
  if (nav) {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile menu ---------- */
  var menu = $('#menu');
  var menuOpen = $('#menuOpen');
  var menuClose = $('#menuClose');
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle('is-open', open);
    menuOpen.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (menu && menuOpen && menuClose) {
    menuOpen.addEventListener('click', function () { setMenu(true); });
    menuClose.addEventListener('click', function () { setMenu(false); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  }

  /* ---------- Search overlay ---------- */
  var search = $('#search');
  var searchInput = $('#searchInput');
  function setSearch(open) {
    if (!search) return;
    search.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) searchInput.focus();
  }
  if (search) {
    $('#searchOpen').addEventListener('click', function () { setSearch(true); });
    $('#searchClose').addEventListener('click', function () { setSearch(false); });
    search.addEventListener('click', function (e) { if (e.target === search) setSearch(false); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setSearch(false); setMenu(false); }
  });

  /* ---------- Featured posts row: side arrows move one block at a time ---------- */
  $$('[data-carousel]').forEach(function (root) {
    var track = $('.carousel__track', root);
    var prev = $('[data-prev]', root);
    var next = $('[data-next]', root);
    function step() {
      var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      return track.firstElementChild.getBoundingClientRect().width + gap;
    }
    function update() {   /* hide an arrow when there is nothing more that way */
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    }
    prev.addEventListener('click', function () { track.scrollBy({ left: -step() }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step() }); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ---------- Homepage: latest recipes filter ---------- */
  var homeFilters = $$('.filters button[data-filter]');
  homeFilters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var want = btn.dataset.filter;
      homeFilters.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      $$('#grid .card').forEach(function (card) {
        card.hidden = want !== 'all' && card.dataset.cat !== want;
      });
    });
  });

  /* ---------- Recipe index: meal, time and search, also from the address bar ---------- */
  var indexGrid = $('#indexGrid');
  if (indexGrid) {
    var cards = $$('.card', indexGrid);
    var catButtons = $$('#indexCats button');
    var timeSelect = $('#indexTime');
    var searchField = $('#indexSearch');
    var count = $('#indexCount');
    var empty = $('#indexEmpty');
    var pager = $('.pager');
    var state = { cat: 'all', time: 0, q: '' };

    var apply = function () {
      var shown = 0;
      cards.forEach(function (card) {
        var ok = (state.cat === 'all' || card.dataset.cat === state.cat) &&
                 (!state.time || Number(card.dataset.time) <= state.time) &&
                 (!state.q || card.textContent.toLowerCase().indexOf(state.q) !== -1);
        card.hidden = !ok;
        if (ok) shown += 1;
      });
      var filtered = state.cat !== 'all' || state.time || state.q;
      catButtons.forEach(function (b) { b.classList.toggle('is-active', b.dataset.cat === state.cat); });
      count.textContent = filtered
        ? shown + (shown === 1 ? ' recipe' : ' recipes')
        : 'Showing ' + shown + ' of 128 recipes';
      empty.hidden = shown > 0;
      if (pager) pager.hidden = Boolean(filtered);
    };

    catButtons.forEach(function (btn) {
      btn.addEventListener('click', function () { state.cat = btn.dataset.cat; apply(); });
    });
    timeSelect.addEventListener('change', function () { state.time = Number(timeSelect.value); apply(); });
    searchField.addEventListener('input', function () { state.q = searchField.value.trim().toLowerCase(); apply(); });
    $('#indexReset').addEventListener('click', function () {
      state = { cat: 'all', time: 0, q: '' };
      timeSelect.value = '0';
      searchField.value = '';
      apply();
    });

    if (params.get('cat') && $('#indexCats [data-cat="' + params.get('cat') + '"]')) state.cat = params.get('cat');
    if (params.get('time')) { state.time = Number(params.get('time')) || 0; timeSelect.value = String(state.time); }
    if (params.get('q')) { state.q = params.get('q').trim().toLowerCase(); searchField.value = params.get('q'); }
    apply();
  }

  /* ---------- Shop: product filter and a pretend cart ---------- */
  var shopGrid = $('#shopGrid');
  var shopButtons = $$('#shopCats button');
  shopButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      shopButtons.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      $$('.pcard', shopGrid).forEach(function (p) {
        p.hidden = btn.dataset.cat !== 'all' && p.dataset.cat !== btn.dataset.cat;
      });
    });
  });
  var cartCount = $('#cartCount');
  $$('[data-cart]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var added = btn.classList.toggle('is-added');
      btn.textContent = added ? 'Added ✓' : 'Add to cart';
      if (cartCount) {
        var n = $$('[data-cart].is-added').length;
        cartCount.textContent = n ? n + (n === 1 ? ' item' : ' items') + ' in your cart' : 'Your cart is empty';
      }
    });
  });

  /* ---------- Recipe card: scale, print, save ---------- */
  var FRACTIONS = [[0, ''], [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.5, '½'], [0.667, '⅔'], [0.75, '¾'], [1, '']];
  function pretty(n) {
    if (n >= 20) return String(Math.round(n / 5) * 5);
    var whole = Math.floor(n + 1e-9);
    var rest = n - whole;
    var best = FRACTIONS[0];
    FRACTIONS.forEach(function (f) { if (Math.abs(f[0] - rest) < Math.abs(best[0] - rest)) best = f; });
    if (best[0] === 1) { whole += 1; best = FRACTIONS[0]; }
    if (!whole && !best[1]) return '⅛';
    return (whole ? String(whole) : '') + (whole && best[1] ? ' ' : '') + best[1];
  }
  var scaleButtons = $$('[data-scale]');
  scaleButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var by = Number(btn.dataset.scale);
      scaleButtons.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      $$('[data-qty]').forEach(function (el) { el.textContent = pretty(Number(el.dataset.qty) * by); });
      $$('[data-yield]').forEach(function (el) { el.textContent = pretty(Number(el.dataset.base) * by); });
    });
  });
  $$('[data-print]').forEach(function (btn) {
    btn.addEventListener('click', function () { window.print(); });
  });
  $$('[data-save]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? 'Saved ✓' : 'Save';
    });
  });

  /* ---------- Forms: a friendly thank you in place of a real send ---------- */
  $$('form[data-thanks]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = document.createElement('p');
      note.className = 'form__ok';
      note.setAttribute('role', 'status');
      note.textContent = form.dataset.thanks;
      form.innerHTML = '';
      form.appendChild(note);
    });
  });
})();
