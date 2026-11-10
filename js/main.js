/* LEE NJIRU RESORT - site scripts
   Navigation, scroll reveal, image fallbacks, gallery filter + lightbox,
   form validation and WhatsApp enquiries. */
(function () {
  'use strict';

  var WA_NUMBER = '254742396855';

  /* Add REAL guest reviews here, e.g.
     { name: 'Guest name', stay: 'Family weekend', text: 'Review text', stars: 5 } */
  var REVIEWS = [];

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function waUrl(msg) { return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg); }
  function icon(name) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }

  /* ---------- Mobile navigation ---------- */
  var tog = $('.toggle');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    if (tog) {
      tog.setAttribute('aria-expanded', String(open));
      tog.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
  }
  if (tog) tog.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
  $$('#nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 1100) setMenu(false); });

  /* ---------- Hero headline: word-by-word entrance ---------- */
  $$('[data-split]').forEach(function (h) {
    var words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map(function (w, i) {
      return '<span class="w" aria-hidden="true" style="--i:' + i + '">' + w + '</span>';
    }).join(' ');
  });

  /* ---------- Image fallback (shows a branded placeholder until photos are added) ---------- */
  function missing(img) { var m = img.closest('.media'); if (m) m.classList.add('no-img'); }
  $$('img').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) missing(img);
    img.addEventListener('error', function () { missing(img); });
  });

  /* ---------- Scroll reveal ---------- */
  var revealEls = $$('.reveal, .reveal-img');
  revealEls.forEach(function (el) { if (el.dataset.d) el.style.setProperty('--d', el.dataset.d + 's'); });
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Guest reviews (rendered only from real reviews above) ---------- */
  var rv = $('#reviews');
  if (rv) {
    if (REVIEWS.length) {
      rv.innerHTML = '';
      REVIEWS.forEach(function (r, i) {
        var card = document.createElement('figure');
        card.className = 'review reveal';
        card.style.margin = '0';
        card.dataset.d = i * 0.1;
        var stars = '';
        for (var s = 0; s < (r.stars || 5); s++) stars += icon('star');
        card.innerHTML = '<div class="stars" aria-label="' + (r.stars || 5) + ' out of 5 stars">' + stars + '</div>';
        var q = document.createElement('blockquote'); q.textContent = r.text; card.appendChild(q);
        var c = document.createElement('cite'); c.textContent = r.name + (r.stay ? ' · ' + r.stay : ''); card.appendChild(c);
        rv.appendChild(card);
        requestAnimationFrame(function () { card.classList.add('in'); });
      });
    } else {
      rv.innerHTML = '<div class="review-empty reveal in"><h3>Your stay, in your words</h3>' +
        '<p>Stayed or celebrated with us? We would love to hear about your visit.</p>' +
        '<a class="link-arrow" target="_blank" rel="noopener" href="' +
        waUrl('Hello Lee Njiru Resort, I would like to share feedback about my visit.') +
        '">Share your experience ' + icon('arrow') + '</a></div>';
    }
  }

  /* ---------- Gallery filter ---------- */
  var fbtns = $$('.filters button');
  fbtns.forEach(function (b) {
    b.addEventListener('click', function () {
      fbtns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      var f = b.dataset.f;
      $$('.g-item').forEach(function (it) { it.classList.toggle('hide', f !== 'all' && it.dataset.cat !== f); });
    });
  });

  /* ---------- Lightbox ---------- */
  var lb, lbImg, lbCap, items = [], idx = 0, lastFocus, touchX = null;
  function buildLb() {
    if (lb) return;
    lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML =
      '<button class="x" type="button" aria-label="Close photo viewer">' + icon('close') + '</button>' +
      '<button class="p" type="button" aria-label="Previous photo">' + icon('arrow') + '</button>' +
      '<button class="n" type="button" aria-label="Next photo">' + icon('arrow') + '</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>';
    document.body.appendChild(lb);
    lbImg = $('img', lb); lbCap = $('figcaption', lb);
    $('.x', lb).addEventListener('click', closeLb);
    $('.p', lb).addEventListener('click', function () { show(idx - 1); });
    $('.n', lb).addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.tagName === 'FIGURE') closeLb(); });
    lb.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX; touchX = null;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    });
    lbImg.addEventListener('error', function () { lbImg.style.visibility = 'hidden'; });
    lbImg.addEventListener('load', function () { lbImg.style.visibility = ''; });
  }
  function show(i) {
    idx = (i + items.length) % items.length;
    var a = items[idx];
    lbImg.style.visibility = '';
    lbImg.src = a.getAttribute('href');
    lbImg.alt = a.dataset.cap || '';
    lbCap.textContent = (a.dataset.cap || '') + (items.length > 1 ? '  ·  ' + (idx + 1) + ' / ' + items.length : '');
  }
  function openLb(a) {
    buildLb();
    items = $$('[data-lb]').filter(function (x) { return !x.classList.contains('hide') && x.offsetParent !== null; });
    var i = items.indexOf(a); if (i < 0) { items = [a]; i = 0; }
    lastFocus = document.activeElement;
    show(i);
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    $('.x', lb).focus();
  }
  function closeLb() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-lb]');
    if (a) { e.preventDefault(); openLb(a); }
  });
  document.addEventListener('keydown', function (e) {
    if (!lb || !lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowRight') show(idx + 1);
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'Tab') {
      var f = $$('button', lb), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Dates ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var todayStr = iso(today);
  $$('input[type=date]').forEach(function (i) { i.min = todayStr; });
  $$('form').forEach(function (f) {
    var ci = f.elements.checkin, co = f.elements.checkout;
    if (ci && co) ci.addEventListener('change', function () {
      if (!ci.value) return;
      var n = parse(ci.value); n.setDate(n.getDate() + 1);
      co.min = iso(n);
      if (co.value && co.value <= ci.value) co.value = '';
    });
  });
  function fmt(s) {
    return parse(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* ---------- Home availability bar -> booking form ---------- */
  var av = $('[data-avail]');
  if (av) av.addEventListener('submit', function (e) {
    e.preventDefault();
    var p = new URLSearchParams();
    ['checkin', 'checkout', 'adults'].forEach(function (k) { if (av.elements[k] && av.elements[k].value) p.set(k, av.elements[k].value); });
    location.href = 'contact.html?' + p.toString() + '#booking';
  });

  /* ---------- Prefill booking form from URL (?room=..&checkin=..) ---------- */
  var bf = $('form[data-form="booking"]');
  if (bf) {
    var q = new URLSearchParams(location.search);
    ['room', 'checkin', 'checkout', 'adults'].forEach(function (k) {
      var el = bf.elements[k], v = q.get(k);
      if (el && v) {
        if (el.tagName === 'SELECT') { var ok = $$('option', el).some(function (o) { return o.value === v; }); if (ok) el.value = v; }
        else el.value = v;
      }
    });
    if (bf.elements.checkin && bf.elements.checkin.value && bf.elements.checkout) {
      var n = parse(bf.elements.checkin.value); n.setDate(n.getDate() + 1); bf.elements.checkout.min = iso(n);
    }
  }

  /* ---------- Forms: validation + WhatsApp ---------- */
  function fieldMsg(inp, form) {
    var v = (inp.value || '').trim(), n = inp.name;
    if (inp.dataset.req && !v) return inp.dataset.req;
    if (!v) return '';
    if (inp.dataset.type === 'phone' && !/^\+?[0-9\s\-()]{9,17}$/.test(v)) return 'Please enter a valid phone number, for example 0712 345 678.';
    if (inp.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Please enter a valid email address.';
    if (n === 'name' && v.length < 2) return 'Please enter your full name.';
    if (inp.type === 'date') {
      if (v < todayStr) return 'Please choose a date from today onwards.';
      if (n === 'checkout' && form.elements.checkin.value && v <= form.elements.checkin.value) return 'Check-out must be after your check-in date.';
    }
    if (inp.type === 'number') {
      var num = parseInt(v, 10), min = inp.min !== '' ? +inp.min : null;
      if (isNaN(num) || (min !== null && num < min)) return 'Please enter a number of ' + min + ' or more.';
    }
    return '';
  }
  function setErr(inp, msg) {
    var f = inp.closest('.field'); if (!f) return;
    var e = $('.err', f);
    f.classList.toggle('invalid', !!msg);
    inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (e) e.textContent = msg;
  }

  $$('form[data-form]').forEach(function (form) {
    var status = $('.form-status', form);
    var inputs = $$('input, select, textarea', form).filter(function (i) { return i.name; });

    inputs.forEach(function (inp) {
      var re = function () { if (inp.closest('.field').classList.contains('invalid')) setErr(inp, fieldMsg(inp, form)); };
      inp.addEventListener('input', re); inp.addEventListener('change', re);
      inp.addEventListener('blur', function () { if (inp.value.trim()) setErr(inp, fieldMsg(inp, form)); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = null;
      inputs.forEach(function (inp) {
        var m = fieldMsg(inp, form);
        setErr(inp, m);
        if (m && !first) first = inp;
      });
      if (first) {
        status.className = 'form-status bad';
        status.textContent = 'Please check the highlighted fields and try again.';
        first.focus();
        return;
      }
      var lines = ['*' + form.dataset.title + ' - LEE NJIRU RESORT*', ''];
      inputs.forEach(function (inp) {
        var v = inp.value.trim();
        if (!v || !inp.dataset.label) return;
        if (inp.type === 'date') v = fmt(v);
        lines.push('*' + inp.dataset.label + ':* ' + v);
      });
      var ci = form.elements.checkin, co = form.elements.checkout;
      if (ci && co && ci.value && co.value) {
        var nights = Math.round((parse(co.value) - parse(ci.value)) / 86400000);
        lines.push('*Nights:* ' + nights);
      }
      lines.push('', form.dataset.intro);
      var url = waUrl(lines.join('\n'));
      var w = window.open(url, '_blank', 'noopener');
      status.className = 'form-status';
      status.innerHTML = 'Opening WhatsApp… If nothing happens, <a href="' + url + '" target="_blank" rel="noopener">tap here to send your enquiry</a>.';
      if (!w) location.href = url;
    });
  });
})();
