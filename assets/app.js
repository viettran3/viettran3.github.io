/* Viet Tran site: cursor glow, ⌘K menu, ~ terminal, Ask-my-assistant chat, photo lightbox. No dependencies. */
(function () {
  'use strict';
  const S = window.SITE || { projects: [], faq: [], photos: [], links: {}, booking: {} };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, attrs = {}, html) => { const e = document.createElement(tag); for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); } if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ROOTP = (document.querySelector('meta[name="site-root"]') || {}).content || '/';
  const U = (h) => (h && h[0] === '/' && h[1] !== '/') ? ROOTP + h.slice(1) : h;
  const go = (h) => { location.href = U(h); };
  // Booking helper: one base URL from content/site.json → api.base (same site on tab.bot; the tab.bot helper when served from GitHub Pages).
  const API = (() => { const b = String(S.apiBase || ''); try { return !b || new URL(b).origin === location.origin ? '' : b; } catch (e) { return ''; } })();
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  // site text from content/site.json → ui (the fallbacks are the original words)
  const UI = S.ui || {};
  const TX = (group, key, dflt) => { const g = UI[group]; const v = g && g[key]; return typeof v === 'string' ? v : dflt; };
  const TL = (group, key, dflt) => { const g = UI[group]; const v = g && g[key]; return Array.isArray(v) && v.length ? v : dflt; };
  const fillT = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] !== undefined ? o[k] : m));
  const BOOK = TX('chat', 'bookCall', 'Book a call');
  const isBook = (q) => q === BOOK || q === 'Book a call';

  /* ---------- cursor glow (fine pointers only) ---------- */
  const glow = $('.glow');
  if (glow && matchMedia('(hover:hover) and (pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let x = innerWidth / 2, y = innerHeight / 3, tx = x, ty = y, on = false;
    addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; if (!on) { on = true; document.body.classList.add('has-glow'); } }, { passive: true });
    document.addEventListener('pointerleave', () => { document.body.classList.remove('has-glow'); on = false; });
    (function loop() { x += (tx - x) * 0.12; y += (ty - y) * 0.12; glow.style.transform = `translate3d(${x}px,${y}px,0)`; requestAnimationFrame(loop); })();
  }
  if (!isMac) $$('.kbd-k').forEach((k) => { k.textContent = 'Ctrl K'; });

  /* ---------- assistant: retrieval over Viet's own content ---------- */
  const STOP = new Set('a an the is are was were be of to in on for and or with what whats what\'s who how does do did can could tell me about his him he viet viets viet\'s tran i you your it this that at as by from any some has have had'.split(' '));
  const tok = (s) => String(s).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9+#'\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w));
  const stem = (w) => w.replace(/(ing|ed|es|s)$/, '');
  const docs = [];
  (S.faq || []).forEach((f) => docs.push({ kind: 'faq', title: f.q, text: f.a, keys: f.keywords || [], link: f.link, action: f.action }));
  (S.projects || []).forEach((p) => docs.push({ kind: 'project', title: p.title, text: `${p.summary}`, body: p.plain, keys: [p.slug, ...p.title.toLowerCase().split(/\s+/), ...(p.tags || []).map((t) => t.toLowerCase())], link: `/projects/${p.slug}/` }));
  const R = S.resume || {};
  ['experience', 'projects', 'leadership'].forEach((sec) => (R[sec] || []).forEach((e) => docs.push({ kind: 'resume', title: `${e.title}, ${e.org}`, text: `${e.title} at ${e.org} (${e.when}). ${(e.bullets || []).join(' ')}`.trim(), keys: e.org.toLowerCase().split(/\s+/), link: e.project ? `/projects/${e.project}/` : '/resume/' })));
  docs.forEach((d) => { d.k = new Set(d.keys.flatMap((k) => tok(k).map(stem))); d.phr = d.keys.filter((k) => k.includes(' ')).map((k) => k.toLowerCase()); d.t = new Set(tok(d.title + ' ' + d.text + ' ' + (d.body || '')).map(stem)); });
  function answer(q) {
    const ql = q.toLowerCase();
    if (/\b(book|schedule|set up|setup|meet|call|chat with|talk to|calendar|interview)\b/.test(ql) && !/what|who/.test(ql.split(' ')[0])) return { book: true };
    if (/^(hi|hey|hello|yo|sup|hiya|howdy)\b/.test(ql.trim())) return { text: TX('chat', 'hello', `Hey! I'm Viet's assistant. Ask me about his work, projects, background or skills, or I can book a call with him.`) };
    if (/\b(thanks|thank you|thx|ty)\b/.test(ql)) return { text: TX('chat', 'thanks', 'Anytime! Anything else you want to know about Viet?') };
    const qt = tok(q).map(stem);
    let best = null, bestS = 0;
    for (const d of docs) {
      let s = 0;
      for (const w of qt) { if (d.k.has(w)) s += 3; else if (d.t.has(w)) s += 1; }
      for (const ph of d.phr) if (ql.includes(ph)) s += 4;
      if (d.kind === 'faq') s *= 1.15;
      if (s > bestS) { bestS = s; best = d; }
    }
    if (!best || bestS < 2.5) return { text: TX('chat', 'unknown', `I only know what's on Viet's resume, projects and bio, and I don't have that one. Try asking about DemystifyAI, his app suite, Amazon, his research or skills, or I can set up a call so you can ask him directly.`), offerBook: true };
    return { text: best.text, link: best.link, offerBook: best.action === 'book' };
  }

  /* ---------- booking (slots ≥ minDaysOut days ahead, Central Time) ---------- */
  const B = Object.assign({ minDaysOut: 3, timezone: 'America/Chicago', days: 14, times: ['10:00', '13:00', '15:00'], durationMinutes: 30 }, S.booking || {});
  function tzOffsetMin(date, tz) { // minutes that tz is ahead of UTC at `date`
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date).reduce((a, x) => (a[x.type] = x.value, a), {});
    return (Date.UTC(+p.year, p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - date.getTime()) / 60000;
  }
  function wallToUTC(y, m, d, hh, mm, tz) { let t = Date.UTC(y, m - 1, d, hh, mm); const o1 = tzOffsetMin(new Date(t), tz); t -= o1 * 60000; const o2 = tzOffsetMin(new Date(t), tz); if (o2 !== o1) t += (o1 - o2) * 60000; return new Date(t); }
  function slots() {
    const out = []; const now = Date.now(); const min = now + B.minDaysOut * 86400000;
    const fmtD = new Intl.DateTimeFormat('en-US', { timeZone: B.timezone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
    for (let i = 0; i < B.days + B.minDaysOut + 4 && out.length < 60; i++) {
      const p = fmtD.formatToParts(new Date(now + i * 86400000)).reduce((a, x) => (a[x.type] = x.value, a), {});
      if (p.weekday === 'Sat' || p.weekday === 'Sun') continue;
      for (const t of B.times) { const [hh, mm] = t.split(':').map(Number); const dt = wallToUTC(+p.year, +p.month, +p.day, hh, mm, B.timezone); if (dt.getTime() >= min) out.push(dt); }
    }
    return out.slice(0, 40);
  }
  const fmtSlot = (d) => new Intl.DateTimeFormat('en-US', { timeZone: B.timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d) + ' CT';

  /* ---------- chat UI ---------- */
  function buildChat(host, { floating }) {
    const box = el('div', { class: 'chat', role: floating ? 'dialog' : 'region', 'aria-label': TX('commandMenu', 'ask', 'Ask my assistant') });
    box.innerHTML = `<div class="chat-h"><span class="av" aria-hidden="true">VT</span><div><b>${esc(TX('chat', 'title', "Viet's assistant"))}</b><small>${esc(TX('chat', 'subtitle', '● answers from his resume & projects'))}</small></div>${floating ? '<button class="chat-x" type="button" aria-label="Close chat">✕</button>' : ''}</div>
      <div class="chat-log" aria-live="polite"></div><div class="sugg"></div>
      <form class="chat-f" autocomplete="off"><input name="q" type="text" placeholder="${esc(TX('chat', 'placeholder', 'Ask about Viet…'))}" aria-label="Your question" maxlength="300" enterkeyhint="send"><button type="submit">${esc(TX('chat', 'send', 'Send'))}</button></form>`;
    host.appendChild(box);
    const log = $('.chat-log', box), sugg = $('.sugg', box), form = $('.chat-f', box), input = $('input', form);
    const add = (who, html) => { const m = el('div', { class: `msg ${who}` }, html); log.appendChild(m); log.scrollTop = log.scrollHeight; return m; };
    const setSugg = (arr) => { sugg.innerHTML = ''; arr.forEach((q) => { const b = el('button', { type: 'button' }, esc(q)); b.onclick = () => ask(q); sugg.appendChild(b); }); };
    const DEFAULT = TL('chat', 'suggestions', ['What did he build at DemystifyAI?', 'What is he studying?', 'Tell me about his app suite', 'Book a call']);
    function ask(q) {
      q = String(q || '').trim(); if (!q) return;
      add('me', esc(q)); input.value = '';
      const t = add('bot typing', 'typing…');
      setTimeout(() => {
        t.remove();
        const a = answer(q);
        if (a.book || isBook(q)) return startBooking();
        add('bot', esc(a.text) + (a.link ? `\n<a href="${U(a.link)}">${esc(TX('chat', 'readMore', 'Read more →'))}</a>` : ''));
        setSugg(a.offerBook ? [BOOK, ...DEFAULT.filter((x) => !isBook(x)).slice(0, 2)] : DEFAULT.filter((x) => x.toLowerCase() !== q.toLowerCase()).slice(0, 4));
      }, 380 + Math.min(500, q.length * 8));
    }
    function startBooking() {
      setSugg([]);
      const list = slots();
      const m = add('bot', esc(fillT(TX('chat', 'bookingIntro', `Happy to set that up. Viet takes {minutes}-minute calls at least {days} days out so he can prepare. Pick a time and tell me a bit about you; he'll confirm by email.`), { minutes: B.durationMinutes, days: B.minDaysOut })));
      const f = el('form', { class: 'bk', novalidate: '' });
      const C = (k, d) => esc(TX('chat', k, d));
      f.innerHTML = `<label>${C('timeLabel', 'Time')}<select name="slot" required>${list.map((d) => `<option value="${d.toISOString()}">${fmtSlot(d)}</option>`).join('')}</select></label>
        <span class="tz">${C('tzNote', 'shown in Central Time')}${Intl.DateTimeFormat().resolvedOptions().timeZone !== B.timezone ? ' ' + C('tzAway', '(Viet is in Chicago)') : ''}</span>
        <label>${C('nameLabel', 'Name')}<input name="name" required maxlength="120" autocomplete="name"></label>
        <label>${C('emailLabel', 'Email')}<input name="email" type="email" required maxlength="160" autocomplete="email" inputmode="email"></label>
        <label>${C('companyLabel', 'Company / role')}<input name="company" required maxlength="160" autocomplete="organization" placeholder="${C('companyPlaceholder', 'e.g. Recruiter at Acme')}"></label>
        <label>${C('reasonLabel', 'What would you like to talk about?')}<textarea name="reason" required maxlength="1200"></textarea></label>
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <span class="err" role="alert"></span><button type="submit">${C('submit', 'Request this time')}</button>`;
      m.appendChild(f); log.scrollTop = log.scrollHeight;
      fetch(API + '/api/taken').then((r) => r.ok ? r.json() : null).then((j) => { if (!j || !Array.isArray(j.taken)) return; const t = new Set(j.taken); $$('option', f).forEach((o) => { if (t.has(o.value)) o.remove(); }); }).catch(() => {});
      f.onsubmit = async (e) => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(f).entries()); const err = $('.err', f);
        if (!fd.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.email) || !fd.company.trim() || !fd.reason.trim()) { err.textContent = TX('chat', 'fillAll', 'Please fill in every field with a valid email.'); return; }
        err.textContent = ''; const btn = $('button', f); btn.disabled = true; btn.textContent = TX('chat', 'sending', 'Sending…');
        try {
          const r = await fetch(API + '/api/book', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...fd, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, page: location.pathname }) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || !j.ok) throw new Error(j.error || 'That didn’t go through.');
          f.remove();
          add('bot', esc(fillT(TX('chat', 'confirmed', `You're on the list for {slot}. Viet will confirm by email at {email}. Thanks, {first}!`), { slot: fmtSlot(new Date(fd.slot)), email: fd.email, first: fd.name.split(' ')[0] })));
          setSugg(DEFAULT.slice(0, 3));
        } catch (x) { btn.disabled = false; btn.textContent = TX('chat', 'submit', 'Request this time'); err.textContent = (x && x.message) || 'That didn’t go through. Please try again, or reach Viet on LinkedIn.'; }
      };
    }
    form.onsubmit = (e) => { e.preventDefault(); ask(input.value); };
    add('bot', esc(TX('chat', 'greeting', `Hi! I'm Viet's assistant. Ask me anything about his experience, projects or background, or I can book a call with him.`)));
    setSugg(DEFAULT);
    return { box, ask, input, startBooking };
  }
  let panel = null, panelChat = null;
  const inlineHost = $('[data-chat-inline]');
  const inlineChat = inlineHost ? buildChat(inlineHost, { floating: false }) : null;
  if (inlineHost) inlineHost.classList.add('chat-inline');
  function openChat(q) {
    if (inlineChat) { inlineChat.input.focus(); if (q) (isBook(q) ? inlineChat.startBooking() : inlineChat.ask(q)); return; }
    if (!panel) { panel = el('div', { class: 'chat-panel' }); document.body.appendChild(panel); panelChat = buildChat(panel, { floating: true }); $('.chat-x', panel).onclick = closeChat; }
    panel.hidden = false; document.body.classList.add('chat-open');
    if (q) (isBook(q) ? panelChat.startBooking() : panelChat.ask(q));
    else if (matchMedia('(pointer:fine)').matches) panelChat.input.focus();
  }
  function closeChat() { if (panel) panel.hidden = true; document.body.classList.remove('chat-open'); }
  $$('[data-open-chat]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); openChat(); }));
  $$('[data-ask]').forEach((b) => b.addEventListener('click', () => openChat(b.getAttribute('data-ask'))));
  const params = new URLSearchParams(location.search);
  if (inlineChat && params.get('q')) setTimeout(() => (params.get('q') === 'book' ? inlineChat.startBooking() : inlineChat.ask(params.get('q'))), 300);

  /* ---------- ⌘K command menu ---------- */
  const CMDS = [
    { g: 'Pages', t: TX('nav', 'about', 'About'), ic: '~', run: () => go('/') },
    { g: 'Pages', t: TX('nav', 'resume', 'Resume'), ic: '≡', run: () => go('/resume/') },
    { g: 'Pages', t: TX('nav', 'projects', 'Projects'), ic: '◇', run: () => go('/projects/') },
    { g: 'Pages', t: TX('nav', 'photos', 'Photos'), ic: '▦', run: () => go('/photos/') },
    { g: 'Pages', t: TX('nav', 'music', 'Music'), ic: '♪', run: () => go('/music/') },
    ...S.projects.map((p) => ({ g: 'Projects', t: p.title, sub: p.role, ic: '→', run: () => go(`/projects/${p.slug}/`) })),
    { g: 'Actions', t: TX('commandMenu', 'ask', 'Ask my assistant'), ic: '?', run: () => openChat() },
    { g: 'Actions', t: TX('commandMenu', 'book', 'Book a call with Viet'), ic: '☎', run: () => openChat(BOOK) },
    { g: 'Actions', t: TX('commandMenu', 'download', 'Download resume (PDF)'), ic: '↓', run: () => go(S.links.resumePdf || '/resume/') },
    { g: 'Actions', t: TX('commandMenu', 'linkedin', 'Open LinkedIn'), ic: 'in', run: () => window.open(S.links.linkedin, '_blank', 'noopener') },
    { g: 'Actions', t: TX('commandMenu', 'terminal', 'Terminal mode'), sub: '~', ic: '>_', run: () => openTerm() },
  ];
  let cmdk = null, sel = 0, shown = [];
  function buildCmdk() {
    cmdk = el('div', { class: 'cmdk', hidden: '', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Command menu' });
    cmdk.innerHTML = `<div class="cmdk-box"><div class="cmdk-in"><span class="mono" aria-hidden="true">›</span><input type="text" placeholder="${esc(TX('commandMenu', 'placeholder', 'Jump to a page, project or action…'))}" aria-label="Search commands" role="combobox" aria-expanded="true" aria-controls="cmdk-list" autocomplete="off" spellcheck="false"><span class="mono">esc</span></div><ul class="cmdk-list" id="cmdk-list" role="listbox"></ul></div>`;
    document.body.appendChild(cmdk);
    const inp = $('input', cmdk);
    inp.addEventListener('input', () => { sel = 0; render(inp.value); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (shown[sel]) { closeCmdk(); shown[sel].run(); } }
    });
    cmdk.addEventListener('click', (e) => { if (e.target === cmdk) closeCmdk(); });
  }
  function render(q) {
    const ql = q.trim().toLowerCase();
    shown = CMDS.filter((c) => !ql || (c.t + ' ' + c.g + ' ' + (c.sub || '')).toLowerCase().includes(ql) || ql.split(/\s+/).every((w) => (c.t + ' ' + c.g).toLowerCase().includes(w)));
    const ul = $('.cmdk-list', cmdk); ul.innerHTML = '';
    if (!shown.length) { ul.innerHTML = `<li class="cmdk-empty">${esc(TX('commandMenu', 'empty', 'No match. Try “projects”, “resume” or “ask”.'))}</li>`; return; }
    let g = '';
    shown.forEach((c, i) => {
      if (c.g !== g) { g = c.g; ul.appendChild(el('li', { class: 'cmdk-g', role: 'presentation' }, esc(g))); }
      const li = el('li', { class: 'cmdk-it', role: 'option', 'data-i': i }, `<span class="ic">${esc(c.ic)}</span><span>${esc(c.t)}</span>${c.sub ? `<small>${esc(c.sub)}</small>` : ''}`);
      li.addEventListener('mousemove', () => { if (sel !== i) { sel = i; paint(); } });
      li.addEventListener('click', () => { closeCmdk(); c.run(); });
      ul.appendChild(li);
    });
    paint();
  }
  function paint() { $$('.cmdk-it', cmdk).forEach((li) => { const on = +li.dataset.i === sel; li.setAttribute('aria-selected', on); if (on) li.scrollIntoView({ block: 'nearest' }); }); }
  function openCmdk() { if (!cmdk) buildCmdk(); cmdk.hidden = false; const inp = $('input', cmdk); inp.value = ''; sel = 0; render(''); setTimeout(() => inp.focus(), 10); }
  function closeCmdk() { if (cmdk) cmdk.hidden = true; }
  $$('[data-open-cmdk]').forEach((b) => b.addEventListener('click', openCmdk));

  /* ---------- ~ terminal ---------- */
  let term = null; const hist = []; let hi = 0;
  const TPROMPT = 'guest@viet:~$';
  function buildTerm() {
    term = el('div', { class: 'term', hidden: '', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Terminal' });
    term.innerHTML = `<button class="term-x" type="button">exit</button><div class="term-out" aria-live="polite"></div><form class="term-row"><span class="p">${TPROMPT}</span><input type="text" aria-label="Terminal command" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go"></form>`;
    document.body.appendChild(term);
    const inp = $('input', term);
    $('.term-x', term).onclick = closeTerm;
    $('form', term).onsubmit = (e) => { e.preventDefault(); const v = inp.value; inp.value = ''; if (v.trim()) { hist.push(v); hi = hist.length; } run(v); };
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && hist.length) { e.preventDefault(); hi = Math.max(0, hi - 1); inp.value = hist[hi] || ''; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ''; }
      else if (e.key === 'Tab') { e.preventDefault(); const v = inp.value; const m = v.match(/^(open|cat)\s+(\S*)$/); if (m) { const c = [...S.projects.map((p) => p.slug), 'resume', 'photos', 'music', 'ask'].filter((s) => s.startsWith(m[2])); if (c.length === 1) inp.value = `${m[1]} ${c[0]}`; } }
    });
    term.addEventListener('click', (e) => { if (e.target.closest('.term-out') || e.target === term) inp.focus(); });
    print(`<span class="c">viet-os</span> <span class="d">v1.0 · type</span> help <span class="d">to look around ·</span> exit <span class="d">to leave</span>\n`);
  }
  function print(html) { const o = $('.term-out', term); o.insertAdjacentHTML('beforeend', html + '\n'); o.scrollTop = o.scrollHeight; }
  const PAGES = { resume: '/resume/', projects: '/projects/', photos: '/photos/', music: '/music/', ask: '/ask/', about: '/', home: '/' };
  function run(raw) {
    const v = raw.trim(); print(`<span class="p">${TPROMPT}</span> ${esc(v)}`);
    const [cmd, ...rest] = v.split(/\s+/); const arg = rest.join(' ').toLowerCase();
    switch ((cmd || '').toLowerCase()) {
      case '': return;
      case 'help': return print(`<span class="c">whoami</span>          who is this guy\n<span class="c">ls</span> [projects]     list pages or projects\n<span class="c">open</span> &lt;name&gt;      open a project or page (tab completes)\n<span class="c">cat resume</span>      quick resume\n<span class="c">ask</span> &lt;question&gt;  ask the assistant\n<span class="c">contact</span>         how to reach Viet\n<span class="c">clear</span>           clear the screen\n<span class="c">exit</span>            back to the site`);
      case 'whoami': return print(`<span class="c">Viet Tran</span>\n${esc(S.intro || '')}\n<span class="d">${esc(TX('terminal', 'whoamiLine', 'born in Vietnam · grew up in rural Washington · UChicago ’29'))}</span>`);
      case 'ls':
        if (!arg || arg === '~' || arg === '.') return print(`<span class="c">about/  resume/  projects/  photos/  music/  ask/</span>`);
        if (arg.startsWith('project')) return print(S.projects.map((p) => `<span class="c">${esc(p.slug.padEnd(14))}</span> ${esc(p.title)} <span class="d">· ${esc(p.when)}</span>`).join('\n'));
        return print(`<span class="e">ls: ${esc(arg)}: no such directory</span>`);
      case 'cd': case 'open': {
        const p = S.projects.find((x) => x.slug === arg || x.title.toLowerCase().includes(arg));
        if (arg && p) { print(`<span class="d">opening ${esc(p.slug)}…</span>`); return setTimeout(() => go(`/projects/${p.slug}/`), 350); }
        const key = arg.replace(/\/$/, '');
        if (PAGES[key]) { print(`<span class="d">opening ${esc(key)}…</span>`); return setTimeout(() => go(PAGES[key]), 350); }
        return print(`<span class="e">open: ${esc(arg || '?')}: not found</span> <span class="d">(try: ls projects)</span>`);
      }
      case 'cat':
        if (arg.startsWith('resume')) { const r = S.resume || {}; return print((r.experience || []).map((e) => `<span class="c">${esc(e.when.padEnd(20))}</span> ${esc(e.title)} · ${esc(e.org)}`).join('\n') + `\n<span class="d">full version: open resume</span>`); }
        return print(`<span class="e">cat: ${esc(arg || '?')}: no such file</span>`);
      case 'ask': { if (!arg) return print('<span class="d">usage: ask &lt;question&gt;</span>'); const a = answer(rest.join(' ')); return print(a.book ? 'Sure. Type <span class="c">exit</span> and press “Book a call” in the assistant.' : esc(a.text)); }
      case 'contact': return print(`LinkedIn  <a class="c" href="${esc(S.links.linkedin)}" target="_blank" rel="noopener">${esc(S.links.linkedin.replace(/^https:\/\/(www\.)?/, ''))}</a>${S.links.email ? `\nEmail     ${esc(S.links.email)}` : ''}\nCall      <span class="d">ask the assistant to book one</span>`);
      case 'sudo': return print(arg.includes('hire') ? `<span class="c">[sudo] permission granted.</span> Great choice. Type <span class="c">contact</span>.` : `<span class="e">nice try.</span>`);
      case 'clear': $('.term-out', term).innerHTML = ''; return;
      case 'exit': case 'quit': case 'q': return closeTerm();
      case 'pwd': return print('/home/viet');
      case 'date': return print(new Date().toString());
      case 'echo': return print(esc(rest.join(' ')));
      default: return print(`<span class="e">${esc(cmd)}: command not found</span> <span class="d">(type help)</span>`);
    }
  }
  function openTerm() { if (!term) buildTerm(); term.hidden = false; setTimeout(() => $('input', term).focus(), 10); }
  function closeTerm() { if (term) term.hidden = true; }

  /* ---------- photo lightbox ---------- */
  const lb = $('.lightbox');
  if (lb) {
    const tiles = $$('[data-photo]'); let cur = 0;
    const show = (i) => {
      cur = (i + tiles.length) % tiles.length; const ph = (S.photos || [])[cur] || {};
      $('.lb-media', lb).classList.toggle('land', ph.shape === 'landscape');
      $('.lb-media', lb).innerHTML = ph.src ? `<img src="${esc(U(ph.src))}" alt="${esc(ph.alt || ph.caption)}">` : `<span class="mono">photo slot ${String(cur + 1).padStart(2, '0')} · coming soon</span>`;
      $('.lb-cap', lb).textContent = `${ph.caption || ''}  ·  ${cur + 1}/${tiles.length}`;
    };
    tiles.forEach((t, i) => t.addEventListener('click', () => { show(i); lb.hidden = false; $('.lb-x', lb).focus(); }));
    const close = () => { lb.hidden = true; tiles[cur] && tiles[cur].focus(); };
    $('.lb-x', lb).onclick = close; $('.prev', lb).onclick = () => show(cur - 1); $('.next', lb).onclick = () => show(cur + 1);
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    let sx = null; lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); sx = null; });
    document.addEventListener('keydown', (e) => { if (lb.hidden) return; if (e.key === 'ArrowRight') show(cur + 1); else if (e.key === 'ArrowLeft') show(cur - 1); else if (e.key === 'Escape') close(); });
  }

  /* ---------- global keys ---------- */
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (cmdk && !cmdk.hidden) closeCmdk(); else { closeTerm(); openCmdk(); } return; }
    if (e.key === 'Escape') { if (cmdk && !cmdk.hidden) return closeCmdk(); if (term && !term.hidden) return closeTerm(); if (panel && !panel.hidden) return closeChat(); }
    if (!typing && (e.key === '~' || e.key === '`') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); if (term && !term.hidden) closeTerm(); else openTerm(); }
  });
})();
