/**
 * audit-live.js — Live-site mobile/a11y checklist audit (items 1–10).
 *
 * Verifies against any deployed or local URL:
 *   1  no horizontal overflow        6  images have alt attributes
 *   2  banner/navbar clear the hero  7  icon-only buttons are labeled
 *   3  banner dismiss persists       8  hero visible under reduced motion
 *   4  floating buttons placement    9  raster images within 2x display size
 *   5  44px tap targets             10  below-fold lazy loading + timing
 *
 * Usage:
 *   node scripts/audit-live.js [url]
 *   npm run audit:live            # audits https://codebridgecademy.com/
 *   npm run audit:local           # audits the built site via http-server
 *
 * Notes:
 * - Runs a 375x667 mobile viewport with prefers-reduced-motion emulated.
 * - Scrolls through the page first so scroll-reveal elements settle into
 *   their final state before geometry measurements.
 * - alt="" on decorative images counts as PASS (the correct pattern);
 *   only a missing attribute fails.
 */
const { chromium } = require('@playwright/test');

const BASE = process.argv[2] || 'https://codebridgecademy.com/';
const results = [];
const ok = (n, pass, ev) => results.push({ n, pass, ev });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();

  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(2000);

  // Scroll through the page so scroll-reveal elements settle into their
  // final (translateX(0)) state before any geometry measurements.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1000);

  // ── Item 1: no horizontal scroll / no clipped content ──
  const overflow = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const offenders = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > docW + 1 || r.left < -1)) {
        let a = el.parentElement, inFixed = false;
        while (a) { if (getComputedStyle(a).position === 'fixed') { inFixed = true; break; } a = a.parentElement; }
        if (inFixed) return; // inside fixed container (e.g. closed mobile menu)
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        offenders.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} right=${Math.round(r.right)} left=${Math.round(r.left)}`);
      }
    });
    return {
      scrollW: document.documentElement.scrollWidth,
      clientW: docW,
      offenders: offenders.slice(0, 8),
    };
  });
  ok(1, overflow.scrollW <= overflow.clientW + 1,
    `scrollWidth ${overflow.scrollW} vs viewport ${overflow.clientW}` +
    (overflow.offenders.length ? `; offenders: ${overflow.offenders.join(' | ')}` : ''));

  // ── Item 2: banner + navbar do not cover hero headline ──
  // Force scroll to top first — the overlap test compares viewport rects.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  const overlap = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    if (!h1) return { err: 'no h1' };
    const hr = h1.getBoundingClientRect();
    const blockers = [];
    for (const sel of ['.announcement-bar', '.dreelio-pill', '#navbar', '#dreelioNav']) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      const intersects = !(r.bottom <= hr.top || r.top >= hr.bottom || r.right <= hr.left || r.left >= hr.right);
      blockers.push(`${sel}: rect(t${Math.round(r.top)},b${Math.round(r.bottom)}) ${intersects ? 'INTERSECTS h1' : 'clear'}`);
    }
    return { h1Top: Math.round(hr.top), h1Bottom: Math.round(hr.bottom), blockers };
  });
  const covers = (overlap.blockers || []).some(b => b.includes('INTERSECTS'));
  ok(2, !covers && !overlap.err, `h1 y=${overlap.h1Top}-${overlap.h1Bottom}; ${(overlap.blockers || []).join('; ') || overlap.err}`);

  // ── Item 4: floating bottom buttons don't sit over important content ──
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  const floatOverContent = await page.evaluate(() => {
    const floats = [];
    document.querySelectorAll('[class*="floating"],[class*="fab"]').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && cs.display !== 'none') floats.push(el);
    });
    const hits = [];
    floats.forEach(f => {
      const fr = f.getBoundingClientRect();
      document.elementsFromPoint(fr.left + fr.width / 2, fr.top + fr.height / 2).slice(0, 4).forEach(el => {
        if (el !== f && !f.contains(el) && !el.contains(f) && ['A', 'BUTTON', 'P', 'H2', 'H3'].includes(el.tagName)) {
          hits.push(`${f.className.toString().slice(0, 25)} over ${el.tagName}.${(el.className || '').toString().slice(0, 25)}`);
        }
      });
    });
    return hits;
  });
  ok(4, floatOverContent.length === 0,
    `content overlaps at page bottom: ${floatOverContent.length ? floatOverContent.join('; ') : 'none detected'}`);

  // ── Item 5: tap targets >= 44px ──
  const tap = await page.evaluate(() => {
    const small = [];
    const seen = new Set();
    document.querySelectorAll('a, button, [role="button"], input[type="submit"]').forEach(el => {
      if (seen.has(el)) return; seen.add(el);
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.top < -200 || r.top > window.innerHeight + 200) return;
      if (r.width < 44 || r.height < 44) {
        small.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${(el.className || '').toString().split(' ')[0]} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    });
    return small.slice(0, 12);
  });
  ok(5, tap.length === 0, tap.length ? `${tap.length} small targets: ${tap.join(' | ')}` : 'all visible targets >= 44px');

  // ── Item 6: every <img> has an alt attribute ──
  // alt="" is the CORRECT pattern for decorative images (e.g. map tiles
  // beneath a titled iframe) — only a MISSING attribute is a failure.
  const alts = await page.evaluate(() => {
    const missing = [];
    let decorative = 0;
    document.querySelectorAll('img').forEach(img => {
      const a = img.getAttribute('alt');
      if (a === null) missing.push(img.src.split('/').pop() || '(src empty)');
      else if (a.trim() === '') decorative++;
    });
    return { total: document.querySelectorAll('img').length, missing, decorative };
  });
  ok(6, alts.missing.length === 0, `${alts.total} imgs — ${alts.missing.length} missing alt attribute${alts.missing.length ? ': ' + alts.missing.join(', ') : ''}; ${alts.decorative} intentional-empty (decorative)`);

  // ── Item 7: icon-only buttons have accessible names ──
  const iconBtns = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('button, a[role="button"]').forEach(b => {
      const cs = getComputedStyle(b);
      if (cs.display === 'none') return;
      const txt = (b.textContent || '').trim();
      const label = b.getAttribute('aria-label') || b.getAttribute('title') || b.getAttribute('aria-labelledby');
      if (txt.length === 0) out.push({ cls: (b.className || '').toString().slice(0, 30), label: label || null });
    });
    return out;
  });
  const unlabeled = iconBtns.filter(b => !b.label);
  ok(7, unlabeled.length === 0, `${iconBtns.length} icon-only buttons, ${unlabeled.length} unlabeled`);

  // ── Item 8: hero visible immediately (reduced motion respected) ──
  const heroVis = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const p = document.querySelector('h1 + p, .hero-matrix-subtitle');
    const vis = el => {
      if (!el) return 'missing';
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return `opacity=${s.opacity} visibility=${s.visibility} h=${Math.round(r.height)}`;
    };
    return { h1: vis(h1), p: vis(p), rm: matchMedia('(prefers-reduced-motion: reduce)').matches };
  });
  const h1Op = parseFloat((heroVis.h1.match(/opacity=([\d.]+)/) || [])[1] ?? '0');
  ok(8, h1Op >= 0.99 && !heroVis.h1.includes('missing'),
    `reducedMotion=reduce → h1: ${heroVis.h1}; prefers-reduced-motion matched: ${heroVis.rm}`);

  // ── Item 9: intrinsic vs displayed raster image sizes ──
  const imgSizes = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('img').forEach(img => {
      if (!img.src || img.src.startsWith('data:')) return;
      if (!img.complete || !img.naturalWidth) return;
      const isSvg = /\.svg($|\?)/i.test(img.currentSrc);
      const rect = img.getBoundingClientRect();
      const dispW = Math.round(rect.width * (window.devicePixelRatio || 1));
      out.push({
        file: img.currentSrc.split('/').pop(),
        nat: img.naturalWidth,
        disp: dispW,
        ratio: dispW ? +(img.naturalWidth / dispW).toFixed(2) : null,
        lazy: img.loading,
        svg: isSvg,
      });
    });
    return out;
  });
  const oversized = imgSizes.filter(i => !i.svg && i.ratio && i.ratio > 2.05);
  ok(9, oversized.length === 0, oversized.length
    ? `oversized rasters: ${oversized.map(i => `${i.file} nat=${i.nat} disp=${i.disp} ratio=${i.ratio}`).join('; ')}`
    : `checked ${imgSizes.length} imgs — all rasters within 2x (${imgSizes.filter(i => i.svg).length} SVGs exempt as resolution-independent)`);

  // ── Item 10: below-fold lazy loading ──
  const lazyCount = imgSizes.filter(i => i.lazy === 'lazy').length;
  const eager = imgSizes.filter(i => i.lazy !== 'lazy').map(i => i.file);
  ok(10, null, `${lazyCount}/${imgSizes.length} imgs loading=lazy; eager: ${eager.join(', ') || 'none'}`);

  // ── Item 3: banner close button dismisses permanently (LAST — mutates state) ──
  const bannerBefore = await page.evaluate(() => {
    const b = document.querySelector('.announcement-bar');
    return !!b && getComputedStyle(b).display !== 'none';
  });
  const hasClose = await page.evaluate(() => !!document.querySelector('#announcementClose'));
  let dismissOk = false, dismissEv = 'close button missing';
  if (bannerBefore && hasClose) {
    await page.click('#announcementClose');
    await page.waitForTimeout(600);
    const goneNow = await page.evaluate(() => {
      const b = document.querySelector('.announcement-bar');
      return !b || getComputedStyle(b).display === 'none';
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const goneAfterReload = await page.evaluate(() => {
      const b = document.querySelector('.announcement-bar');
      return !b || getComputedStyle(b).display === 'none';
    });
    const storageKeys = await page.evaluate(() => Object.keys(localStorage).filter(k => /announce|banner|dismiss/i.test(k)));
    dismissOk = goneNow && goneAfterReload;
    dismissEv = `closed: ${goneNow}; after reload: ${goneAfterReload}; ls keys: [${storageKeys}]`;
  } else if (!bannerBefore) {
    dismissOk = true;
    dismissEv = 'banner not visible at check time (possibly dismissed earlier on this profile)';
  }
  ok(3, dismissOk, dismissEv);

  // ── Item 10b: load timing (unthrottled reference) ──
  const nav = await page.evaluate(() => {
    const navs = performance.getEntriesByType('navigation');
    return navs[0] ? { dcl: Math.round(navs[0].domContentLoadedEventEnd), load: Math.round(navs[0].loadEventEnd) } : {};
  });
  ok('10b', null, `unthrottled reference: DCL ${nav.dcl}ms, load ${nav.load}ms (local timing ${loadMs}ms incl. network)`);

  await browser.close();
  console.log(JSON.stringify(results, null, 1));
})().catch(e => { console.error('AUDIT ERROR:', e.message); process.exit(1); });
