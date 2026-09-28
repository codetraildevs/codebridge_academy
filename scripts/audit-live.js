/**
 * audit-live.js — Live-site mobile/a11y/SEO/content checklist audit (items 1–17).
 *
 * Verifies against any deployed or local URL:
 *   1  no horizontal overflow        10  below-fold lazy loading + timing
 *   2  banner/navbar clear the hero  11  meta description (length + locale)
 *   3  banner dismiss persists       12  JSON-LD Organization + Course
 *   4  floating buttons placement    13  OG tags + 1200x630 image + twitter:card
 *   5  44px tap targets              14  heading structure (1x H1, sane H2s)
 *   6  images have alt attributes    15  named testimonials w/ proof links
 *   7  icon-only buttons labeled     16  Kigali/Rwanda keywords + campus map
 *   8  hero visible, reduced motion  17  application CTA / fees / start dates
 *   9  raster imgs within 2x size
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

  // domcontentloaded — the full `load` event also waits for third-party
  // iframes/tiles (Google Maps, basemap CDN) which can hang the audit.
  // The scroll-through + settle waits below cover asset loading.
  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(4000);

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

  // ── Items 11–17: SEO/content checks (live DOM, before the mutating item 3) ──
  const seo = await page.evaluate(async () => {
    const out = {};

    // 11: meta description — length + locale keywords
    const desc = document.querySelector('meta[name="description"]')?.content || '';
    out.desc = { len: desc.length, kigali: /Kigali/i.test(desc), rwanda: /Rwanda/i.test(desc) };

    // 12: JSON-LD — Organization (name/logo/address/contact/socials) + Courses
    const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')];
    const graph = [];
    blocks.forEach(s => {
      try { const j = JSON.parse(s.textContent); (j['@graph'] || [j]).forEach(g => graph.push(g)); } catch (e) { /* malformed block */ }
    });
    const isType = (g, t) => g['@type'] === t || (Array.isArray(g['@type']) && g['@type'].includes(t));
    const org = graph.find(g => isType(g, 'Organization'));
    out.jsonld = {
      blocks: blocks.length,
      types: graph.map(g => Array.isArray(g['@type']) ? g['@type'].join('+') : g['@type']),
      org: org ? {
        name: !!org.name,
        logo: !!org.logo,
        addressKigali: org.address ? /Kigali/i.test(JSON.stringify(org.address)) : false,
        contact: !!(org.telephone || org.email),
        socials: Array.isArray(org.sameAs) ? org.sameAs.length : 0,
      } : null,
      courses: graph.filter(g => isType(g, 'Course')).length,
    };

    // 13: OG completeness + twitter:card + actual og:image pixel size
    const meta = sel => document.querySelector(sel)?.content || null;
    const ogImage = meta('meta[property="og:image"]');
    out.og = {
      title: !!meta('meta[property="og:title"]'),
      desc: !!meta('meta[property="og:description"]'),
      image: ogImage,
      twitterCard: meta('meta[name="twitter:card"]'),
      imgDims: null,
    };
    if (ogImage) {
      try {
        const img = new Image();
        img.src = ogImage;
        await img.decode();
        out.og.imgDims = img.naturalWidth + 'x' + img.naturalHeight;
      } catch (e) { out.og.imgDims = 'load-failed'; }
    }

    // 14: heading structure — one readable H1, H2s for major sections only
    const h1s = [...document.querySelectorAll('h1')];
    out.headings = {
      h1: h1s.length,
      h1Text: h1s[0] ? h1s[0].textContent.trim().replace(/\s+/g, ' ').slice(0, 80) : '',
      h2: document.querySelectorAll('h2').length,
      h3: document.querySelectorAll('h3').length,
    };

    // 15: named testimonials with role + proof (photo or verifiable cert link)
    out.testimonials = [...document.querySelectorAll('.testimonial-card')].map(c => ({
      name: c.querySelector('figcaption strong')?.textContent.trim() || null,
      role: c.querySelector('figcaption span')?.textContent.trim() || null,
      photo: !!c.querySelector('img'),
      certLink: !!c.querySelector('a[href*="verify.html?id="]'),
    }));

    // 16: Kigali/Rwanda in headings + copy, embedded campus map
    const headsText = [...document.querySelectorAll('h1, h2, h3')].map(h => h.textContent).join(' ');
    out.local = {
      kigaliHeadings: /Kigali/i.test(headsText),
      rwandaHeadings: /Rwanda/i.test(headsText),
      kigaliCopy: /Kigali/i.test(document.body.innerText),
      rwandaCopy: /Rwanda/i.test(document.body.innerText),
      mapIframe: !!document.querySelector('iframe[src*="google.com/maps"]'),
    };

    // 17: application CTA + fees/pricing or start dates
    const applyButtons = [...document.querySelectorAll('a, button')]
      .filter(el => /register now|enroll now|\bapply\b/i.test(el.textContent || '')).length;
    const bodyText = document.body.innerText;
    out.cta = {
      applyButtons,
      feesMention: /fees|tuition|pricing/i.test(bodyText),
      startDate: /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}/i.test(bodyText),
    };
    return out;
  });

  ok(11, seo.desc.len >= 70 && seo.desc.len <= 170 && seo.desc.kigali && seo.desc.rwanda,
    `description ${seo.desc.len} chars (target ~155), Kigali:${seo.desc.kigali} Rwanda:${seo.desc.rwanda}`);

  const j = seo.jsonld;
  ok(12, !!(j.org && j.org.name && j.org.logo && j.org.addressKigali && j.org.contact && j.org.socials >= 3 && j.courses >= 1),
    `${j.blocks} JSON-LD block(s) [${j.types.join(', ')}]; Organization: name=${j.org?.name} logo=${j.org?.logo} Kigali-address=${j.org?.addressKigali} contact=${j.org?.contact} socials=${j.org?.socials}; Courses: ${j.courses}`);

  ok(13, seo.og.title && seo.og.desc && !!seo.og.image && seo.og.twitterCard === 'summary_large_image' && seo.og.imgDims === '1200x630',
    `og:title=${seo.og.title} og:description=${seo.og.desc} og:image=${seo.og.image ? 'present' : 'missing'} (${seo.og.imgDims}) twitter:card=${seo.og.twitterCard}`);

  ok(14, seo.headings.h1 === 1 && seo.headings.h1Text.length >= 20 && seo.headings.h2 <= 25 && seo.headings.h3 >= 1,
    `h1=${seo.headings.h1} ("${seo.headings.h1Text}"), h2=${seo.headings.h2}, h3=${seo.headings.h3}`);

  const t = seo.testimonials;
  const tOk = t.length >= 3 && t.length <= 4 && t.every(x => x.name && x.role && (x.photo || x.certLink));
  ok(15, tOk,
    `${t.length} testimonial card(s): ${t.map(x => `${x.name} [${x.role}] photo=${x.photo} cert=${x.certLink}`).join(' | ')}`);

  ok(16, seo.local.kigaliHeadings && seo.local.rwandaHeadings && seo.local.kigaliCopy && seo.local.mapIframe,
    `headings Kigali=${seo.local.kigaliHeadings} Rwanda=${seo.local.rwandaHeadings}; copy Kigali=${seo.local.kigaliCopy} Rwanda=${seo.local.rwandaCopy}; map iframe=${seo.local.mapIframe}`);

  ok(17, seo.cta.applyButtons >= 1 && (seo.cta.feesMention || seo.cta.startDate),
    `${seo.cta.applyButtons} apply/register CTA(s); fees/pricing mentioned=${seo.cta.feesMention}; start date found=${seo.cta.startDate}`);

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

  // CI gate: exit 1 if any hard check failed (INFO items have pass=null
  // and never fail the run). The human-readable summary goes to stderr.
  const fails = results.filter(r => r.pass === false);
  if (fails.length) {
    console.error(`\n✖ ${fails.length} check(s) FAILED: items ${fails.map(f => f.n).join(', ')}`);
    process.exit(1);
  }
  console.error('\n✔ All checklist checks passed.');
})().catch(e => { console.error('AUDIT ERROR:', e.message); process.exit(1); });
