/* ==========================================================================
   Borderless Studio — main.js
   i18n · nav · cookie consent · scroll reveal · contact form
   ========================================================================== */
(function () {
  'use strict';

  var SUPPORTED = ['en', 'nl', 'pl'];
  var DEFAULT = 'en';
  var STORE_LANG = 'bs_lang';
  var STORE_COOKIE = 'bs_cookie_ok';

  /* ---------- helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  // Resolve "a.b.c" or "a.items.0" against the locale object
  function resolve(obj, path) {
    return path.split('.').reduce(function (acc, key) {
      return (acc && acc[key] !== undefined) ? acc[key] : undefined;
    }, obj);
  }

  /* ---------- i18n ---------- */
  var cache = {};    // lang -> fully-resolved dict (sync access, e.g. contact form)
  var loading = {};  // lang -> in-flight Promise<dict> (dedupes concurrent loads)
  var reqSeq = 0;    // monotonic token: only the latest setLang() may touch the DOM

  // CMS-managed content lives in data/*.json (one file per section, keyed by
  // language). These are edited through /admin/ and overlaid on top of the
  // locales/ base at runtime, so an edit in the CMS shows up on the live site
  // after the next GitHub Pages deploy. Everything the CMS does not manage
  // (nav, work, service details, footer, cookie, meta…) keeps coming from
  // locales/.
  var DATA_SECTIONS = ['hero', 'services', 'pricing', 'contact'];

  function detectLang() {
    var stored = localStorage.getItem(STORE_LANG);
    if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    var nav = (navigator.language || navigator.userLanguage || DEFAULT).slice(0, 2).toLowerCase();
    return SUPPORTED.indexOf(nav) !== -1 ? nav : DEFAULT;
  }

  // Overlay a CMS section slice onto the base locale dict. Only defined,
  // non-empty values override, so a blank CMS field never wipes good copy.
  function overlaySection(base, section, slice) {
    if (!slice || typeof slice !== 'object') return;
    base[section] = base[section] || {};
    Object.keys(slice).forEach(function (key) {
      var val = slice[key];
      if (val !== undefined && val !== null && val !== '') base[section][key] = val;
    });
  }

  function loadLocale(lang) {
    if (cache[lang]) return Promise.resolve(cache[lang]);
    // Reuse an in-flight load for the same language so overlapping switches
    // (e.g. a rapid PL→EN click, or the boot load racing an early click) don't
    // kick off duplicate fetches that resolve out of order.
    if (loading[lang]) return loading[lang];
    var p = fetch('locales/' + lang + '.json')
      .then(function (r) {
        if (!r.ok) throw new Error('locale ' + lang + ' not found');
        return r.json();
      })
      .then(function (base) {
        return Promise.all(DATA_SECTIONS.map(function (name) {
          return fetch('data/' + name + '.json')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (json) { return { name: name, json: json }; })
            .catch(function () { return { name: name, json: null }; });
        })).then(function (results) {
          results.forEach(function (res) {
            if (!res.json) return;
            overlaySection(base, res.name, res.json[lang] || res.json[DEFAULT]);
          });
          // pricing.list is authored as a newline-separated string in the CMS,
          // but the markup addresses it as pricing.list.0..n — normalize to an array.
          if (base.pricing && typeof base.pricing.list === 'string') {
            base.pricing.list = base.pricing.list
              .split('\n')
              .map(function (s) { return s.trim(); })
              .filter(Boolean);
          }
          cache[lang] = base;
          return base;
        });
      });
    // Track the in-flight load for de-duplication, and always release the slot
    // once it settles so a failed load can be retried later.
    loading[lang] = p;
    p.catch(function () {}).then(function () {
      if (loading[lang] === p) delete loading[lang];
    });
    return p;
  }

  function applyTranslations(dict) {
    // text content
    $all('[data-i18n]').forEach(function (el) {
      var val = resolve(dict, el.getAttribute('data-i18n'));
      if (typeof val === 'string') el.textContent = val;
    });
    // attributes: data-i18n-attr="placeholder:contact.name"
    $all('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(',').forEach(function (pair) {
        var parts = pair.split(':');
        var attr = parts[0].trim();
        var val = resolve(dict, parts[1].trim());
        if (typeof val === 'string') el.setAttribute(attr, val);
      });
    });
    // hrefs: data-i18n-href="work.case1.link"
    $all('[data-i18n-href]').forEach(function (el) {
      var val = resolve(dict, el.getAttribute('data-i18n-href'));
      if (typeof val === 'string') {
        el.setAttribute('href', val);
        if (val === '#') { el.removeAttribute('target'); el.style.pointerEvents = 'none'; el.style.opacity = '0.55'; }
      }
    });
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT;
    // Claim a request token. If another setLang() starts before this load
    // resolves, our token goes stale and we bail out below instead of
    // overwriting fresher content — that out-of-order overwrite is what left
    // the page half-rendered / blank when the locale and data/*.json fetches
    // came back in the wrong order.
    var token = ++reqSeq;
    return loadLocale(lang).then(function (dict) {
      if (token !== reqSeq) return; // a newer switch superseded us
      applyTranslations(dict);
      document.documentElement.setAttribute('lang', lang);
      localStorage.setItem(STORE_LANG, lang);
      // update the <title> and meta description explicitly
      var meta = resolve(dict, 'meta');
      if (meta) {
        if (meta.title) document.title = meta.title;
        var md = $('meta[name="description"]');
        if (md && meta.desc) md.setAttribute('content', meta.desc);
      }
      // active state on switcher
      $all('.lang button').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-lang') === lang);
      });
    }).catch(function (err) {
      if (token !== reqSeq) return; // a newer switch superseded us
      // Fall back to the default locale on failure, but never clear the DOM:
      // whatever locale was last rendered stays on screen instead of going
      // blank while (or if) new content fails to arrive.
      if (lang !== DEFAULT) return setLang(DEFAULT);
      console.error(err);
    });
  }

  /* ---------- navigation ---------- */
  function initNav() {
    var nav = $('.nav');
    if (!nav) return;
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 20); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var toggle = $('.nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () { nav.classList.toggle('open'); });
      $all('.nav-links a').forEach(function (a) {
        a.addEventListener('click', function () { nav.classList.remove('open'); });
      });
    }
  }

  /* ---------- language switcher ---------- */
  function initLangSwitcher() {
    $all('.lang button').forEach(function (btn) {
      btn.addEventListener('click', function () { setLang(btn.getAttribute('data-lang')); });
    });
  }

  /* ---------- cookie consent ---------- */
  function initCookie() {
    var banner = $('.cookie');
    if (!banner) return;
    if (!localStorage.getItem(STORE_COOKIE)) {
      setTimeout(function () { banner.classList.add('show'); }, 900);
    }
    var btn = $('.cookie .btn');
    if (btn) btn.addEventListener('click', function () {
      localStorage.setItem(STORE_COOKIE, '1');
      banner.classList.remove('show');
    });
  }

  /* ---------- scroll reveal ---------- */
  function initReveal() {
    var els = $all('[data-reveal]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- contact form (Web3Forms) ---------- */
  function initForm() {
    var form = $('#contact-form');
    if (!form) return;
    var note = $('.form-note', form.parentNode) || $('.form-note');
    var btn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // honeypot
      var hp = form.querySelector('input[name="botcheck"]');
      if (hp && hp.checked) return;

      var origText = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '…'; }
      if (note) note.className = 'form-note';

      var data = new FormData(form);
      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: data
      })
        .then(function (r) { return r.json(); })
        .then(function (json) {
          var dict = cache[localStorage.getItem(STORE_LANG) || DEFAULT] || {};
          if (json.success) {
            if (note) {
              note.textContent = resolve(dict, 'contact.success') || 'Thanks! We\'ll be in touch.';
              note.className = 'form-note ok show';
            }
            form.reset();
          } else {
            throw new Error('web3forms error');
          }
        })
        .catch(function () {
          var dict = cache[localStorage.getItem(STORE_LANG) || DEFAULT] || {};
          if (note) {
            note.textContent = resolve(dict, 'contact.error') || 'Something went wrong. Email hello@borderless.studio.';
            note.className = 'form-note err show';
          }
        })
        .finally(function () {
          if (btn) { btn.disabled = false; btn.textContent = origText; }
        });
    });
  }

  /* ---------- year ---------- */
  function initYear() {
    $all('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initLangSwitcher();
    initCookie();
    initReveal();
    initForm();
    initYear();
    setLang(detectLang());
  });
})();
