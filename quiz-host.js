/* IKEA QUIZ · TV / projector: the presentation, driven by the server ('quiz' events).
 * Visual language taken from the store itself: blue and yellow fields, the yellow highlighter of the
 * original PowerPoint for the right answer, the assembly booklet for the rules, the receipt for rankings. */
(function () {
  'use strict';
  const TR = window.IKEA_TRACKS, R = window.IKEA_RENDER;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const L = ['A', 'B', 'C', 'D', 'E'];
  let v = null, endAt = 0, lastKey = '';

  const av = (p, px) => R.avatarURL(p.color, p.avatar || 'lampada', px || 120);
  const byId = id => (v && v.standings.find(s => s.id === id)) || { name: '?', color: '#999', avatar: 'lampada' };
  const trackName = id => (TR.byId[id] ? TR.byId[id].name : id);
  const pts = n => n.toLocaleString('it-CH');

  /* ---------- the route through the store ----------
   * The evening is the one-way walk through an IKEA store: the races are its departments
   * (Showroom, Magazzino, Ristorante, Småland, Casse) and the floor arrows lead from one to the next.
   * The red "Sei qui" dot of the store maps shows where the evening is. */
  function stopsFromPlan(plan) {
    const out = [];
    (plan || []).forEach((x, i) => {
      if (x.t === 'race') out.push({ i, kind: 'race', name: trackName(x.track), sub: x.final ? 'gara finale, punti doppi' : 'gara' });
      else if (x.t === 'part') out.push({ i, kind: 'part', name: x.title, sub: 'parte ' + x.n });
      else if (x.t === 'final') out.push({ i, kind: 'end', name: 'Scontrino finale', sub: 'la classifica' });
    });
    return out;
  }
  const currentStop = (stops, stepIndex) => { let c = -1; stops.forEach((st, k) => { if (st.i <= stepIndex) c = k; }); return c; };
  function routeHtml(stops, cur, opts) {
    opts = opts || {};
    const here = '<em class="here">Sei qui</em>';
    return `<ol class="route" aria-label="Il percorso della serata">
      ${opts.entrance ? `<li class="ent ${cur < 0 ? 'now' : 'past'}"><span class="floor"><i></i></span><span class="nm"><b>Ingresso</b></span>${cur < 0 ? here : ''}</li>` : ''}
      ${stops.map((st, k) => `<li class="${st.kind} ${k < cur ? 'past' : ''} ${k === cur ? 'now' : ''}"><span class="floor"><i></i></span>
        <span class="nm"><b>${esc(st.name)}</b> <small>${esc(st.sub)}</small></span>${k === cur ? here : ''}</li>`).join('')}
    </ol>`;
  }
  // the same route, small, in the header of every screen
  function miniRoute() {
    const stops = stopsFromPlan(v.plan), cur = currentStop(stops, v.stepIndex);
    if (!stops.length) return '';
    return `<ol class="mini" aria-label="${cur >= 0 ? 'Sei qui: ' + esc(stops[cur].name) : 'Ingresso'}">${stops.map((st, k) =>
      `<li class="${st.kind} ${k < cur ? 'past' : ''} ${k === cur ? 'now' : ''}" title="${esc(st.name)}"></li>`).join('')}</ol>`;
  }

  /* ---------- skeleton: field colour per moment ---------- */
  const FIELD = { welcome: 'f-blue', partIntro: 'f-yellow', powers: 'f-ink', reading: 'f-white', answering: 'f-white',
    reveal: 'f-white', standings: 'f-blue', raceWait: 'f-blue', raceSkipped: 'f-blue', final: 'f-blue', extraVote: 'f-blue', wheel: 'f-ink' };
  function frame(body, foot, opts) {
    opts = opts || {};
    const p = v.part, q = v.question;
    const where = [p ? `Parte ${p.n} · ${esc(p.title)}` : '', q && opts.count !== false ? `domanda ${q.index} di ${p.count}` : ''].filter(Boolean).join(', ');
    const timer = v.deadline > 0 ? `<div class="tbar"><i id="tfill"></i></div>` : '';
    return `<header class="qtop"><div class="wm">IKEA <span>quiz</span></div><div class="where">${where}</div>${miniRoute()}
        ${v.deadline > 0 ? '<div class="tnum" id="tnum"></div>' : ''}</header>${timer}
      <main class="qbody ${opts.cls || ''}">${body}</main>
      <footer class="qfoot">${foot}</footer>`;
  }
  function who(flag) {
    return `<div class="who">${v.standings.map(s => {
      const w = v.who ? v.who.find(x => x.id === s.id) : null;
      const done = flag && w ? w[flag] : false;
      return `<figure class="chip ${flag && !done ? 'wait' : ''} ${done ? 'done' : ''} ${s.connected === false && !s.bot ? 'off' : ''}"><img src="${av(s, 104)}" alt=""><figcaption>${esc(s.name)}</figcaption></figure>`;
    }).join('')}</div>`;
  }
  const next = (label, cls) => `<button class="go ${cls || ''}" id="qnext">${label}</button>`;
  const note = t => `<p class="fnote">${t}</p>`;

  /* ---------- per stage ---------- */
  function render() {
    const s = v.stage;
    if (s === 'welcome') return frame(`
        <div class="welcome">
          <h1 class="mega">IKEA quiz <span>& race</span></h1>
          <div class="wl">
            <p class="lede">Quattro parti di domande, una gara di kart prima di ognuna e una gara finale che vale doppio.</p>
            <div class="crowd ${v.standings.length > 8 ? 'many' : ''}">${v.standings.map(p => `<figure><img src="${av(p, 200)}" alt=""><figcaption>${esc(p.name)}</figcaption></figure>`).join('')}</div>
          </div>
          ${routeHtml(stopsFromPlan(v.plan), -1, { entrance: true })}
        </div>`,
      `${note(`${v.standings.length} giocatori in negozio. Si parte dalla prima gara.`)}${next('Si parte')}`);
    if (s === 'partIntro') {
      const p = v.part;
      return frame(`
        <div class="booklet">
          <div class="cover">
            <p class="partn">Parte ${p.n} di 4</p>
            <h1 class="mega">${esc(p.title)}</h1>
            <p class="lede">${esc(p.subtitle)}. ${p.count} domande.</p>
          </div>
          <ol class="steps">${p.rules.map(r => `<li>${esc(r)}</li>`).join('')}
            <li>Dalla seconda domanda, prima di leggere, ognuno può lanciare un potere: 30 secondi per scegliere.</li></ol>
        </div>`,
        `${who()}${next('Prima domanda')}`);
    }
    if (s === 'powers') {
      const only = v.powerOnly && v.powerOnly.length ? v.powerOnly : null;
      return frame(`
        <div class="powers">
          <h1 class="mega">${only ? `Potere bonus per ${esc(only.join(', '))}` : 'Fase poteri: ognuno ne ha tre sul telefono'}</h1>
          ${only ? '<p class="lede only">Ha fatto il giro più veloce in gara: solo lui sceglie un potere per questa domanda.</p>' : ''}
          ${powerCatalogue()}
        </div>`,
        `${who('power')}${note(`${v.counts.powers} di ${v.counts.players} hanno scelto`)}${next('Salta', 'quiet')}`);
    }
    if (s === 'reading') return frame(`
        ${questionHtml(false)}${attacksHtml()}`,
      `${who('ready')}${note(`Pronti: ${v.counts.ready} di ${v.counts.players}`)}${next('Mostra le risposte', 'quiet')}`, { cls: 'ask' });
    if (s === 'answering') return frame(`
        ${questionHtml(true)}${answersHtml(false)}`,
      `${who('answered')}${note(`Risposte: ${v.counts.answered} di ${v.counts.players}`)}${next('Stop', 'quiet')}`, { cls: 'ask' });
    if (s === 'reveal') {
      const q = v.question, img = q.revealImg;
      return frame(`
        <div class="reveal ${img ? 'withimg' : ''}">
          ${img ? `<figure class="photo"><img src="${esc(img)}" alt=""></figure>` : ''}
          <div class="rcol">
            ${q.word ? `<h1 class="tag">${esc(q.word)}</h1>` : `<h1 class="qline small">${esc(q.q)}</h1>`}
            ${answersHtml(true)}
          </div>
        </div>
        <div class="gains">${gainsHtml()}</div>${twistsHtml()}`,
        `${note('I punti li vede ognuno sul proprio telefono. La classifica arriva a fine parte.')}${next('Avanti')}`, { cls: 'ask' });
    }
    if (s === 'standings' && !v.boardVisible) return frame(`
        <div class="secret">
          <h1 class="mega">La classifica resta segreta</h1>
          <p class="lede">Ora la gara finale, a punti doppi. Poi lo scontrino finale, dall'ultimo al primo.</p>
        </div>
        <div class="crowd ${v.standings.length > 8 ? 'many' : ''}">${v.standings.map(p => `<figure><img src="${av(p, 200)}" alt=""><figcaption>${esc(p.name)}</figcaption></figure>`).join('')}</div>`,
      `${note(`Fine della parte ${v.part.n}`)}${next('Alla gara finale')}`);
    if (s === 'standings') {
      const lead = v.standings[0];
      return frame(`
        <div class="tally">
          <div class="leader">
            <img src="${av(lead, 360)}" alt="">
            <h1 class="mega">${esc(lead.name)} è in testa</h1>
            <p class="lede">Dopo la parte ${v.part.n}. Nella prossima gara parte in pole: la griglia segue questa classifica.</p>
          </div>
          ${receipt(v.standings, `Parte ${v.part.n} · ${esc(v.part.title)}`)}
        </div>`,
        `${note(v.grid ? `${esc(v.grid.by)} sta decidendo la griglia della prossima gara sul suo telefono` : 'Tra poco la prossima gara')}${next('Alla gara')}`);
    }
    if (s === 'raceWait' || s === 'raceSkipped') {
      const r = v.race || {};
      return frame(`
        <div class="secret">
          <h1 class="mega">${r.final ? 'Gara finale' : `Gara ${r.number || ''}`}: ${esc(trackName(r.track))}</h1>
          <p class="lede">${s === 'raceSkipped' ? esc((v.lastRace && v.lastRace.error) || 'Gara non disponibile') + '. Aggiungi un giocatore o salta la gara.' : 'La gara è stata interrotta.'}</p>
        </div>`,
        `<button class="go quiet" id="qskip">Salta la gara</button>${next(s === 'raceWait' ? 'Riavvia la gara' : 'Riprova')}`);
    }
    if (s === 'final' && v.final && v.final.shown < v.final.total) {
      const st = v.standings, n = st.length, latest = st.find(p => !p.hidden && (p.pos || p.rank) === n - v.final.shown + 1);
      return frame(`
        <div class="tally">
          <div class="leader spot">
            ${latest ? `<p class="bigrank">${latest.rank}°</p><img class="rise" src="${av(latest, 360)}" alt=""><h1 class="mega">${esc(latest.name)}</h1><p class="lede">${pts(latest.score)} punti${latest.tie ? ', a pari merito' : ''}</p>`
              : `<p class="bigrank">?</p><h1 class="mega">Si parte dall'ultimo posto</h1>`}
          </div>
          ${receipt(st, 'Classifica finale')}
        </div>`,
        `${note(v.final.total - v.final.shown <= 3 ? 'Ed ora il podio' : 'Lo scontrino si sta stampando…')}${next('Mostra tutto', 'quiet')}`);
    }
    if (s === 'final') {
      const st = v.standings, p3 = [st[1], st[0], st[2]], h = { 1: 18, 2: 12, 3: 8 };
      const tie = v.final.ties && v.final.ties[0], done = v.final.tbDone;
      const top = st.filter(p => p.rank === 1);
      const msg = tie
        ? `Pari merito al ${tie.rank}° posto: ${esc(tie.names.join(' e '))}, ${pts(tie.score)} punti. Lo decide una gara di spareggio, da A a B.`
        : top.length > 1 ? `Pari merito in testa: ${esc(top.map(p => p.name).join(' e '))}.` : `${done ? `Spareggio vinto da ${esc(done.winner)}. ` : ''}${v.extra && v.extra.note ? esc(v.extra.note) + ' ' : ''}Vince ${esc(st[0] ? st[0].name : '')}. Tack för idag!`;
      const canExtra = !tie && !done && !v.extra && st.length >= 2;
      return frame(`
        <div class="tally">
          <div class="podium">${p3.map(p => p ? `<div class="pl r${p.rank}"><img src="${av(p, 300)}" alt=""><b>${esc(p.name)}</b><span>${pts(p.score)}</span>
            <div class="cube" style="height:calc(var(--u) * ${h[p.rank] || 6})">${p.rank}</div></div>` : '').join('')}</div>
          ${receipt(st, 'Classifica finale', !tie)}
        </div>`,
        `${note(canExtra ? msg + ' Tra poco si vota un ultimo giro.' : msg)}${tie ? `<button class="go" id="qtb">Gara di spareggio</button>` : ''}${canExtra ? `<button class="go quiet" id="qxskip">Niente ultimo giro</button>${next('Vota l\'ultimo giro')}` : `<button class="go quiet" id="qreset">Nuova partita</button>`}`);
    }
    if (s === 'extraVote') {
      const x = v.extra || {}, c = x.vote || { yes: 0, no: 0 }, left = Math.max(0, (x.voters || 0) - c.yes - c.no);
      return frame(`
        <div class="xvote">
          <div class="xq">
            <p class="partn">Gran finale</p>
            <h1 class="mega">Un ultimo giro sulla pista 6?</h1>
            <p class="lede">Non vale punti. Si parte nell'ordine della classifica finale, e chi vince gira la ruota: può cambiare la classifica.</p>
            <div class="tallyv"><div class="yes"><b>${c.yes}</b><span>Sì</span></div><div class="no"><b>${c.no}</b><span>No</span></div></div>
            <p class="lede small">${left ? `Si vota dal telefono · mancano ${left}` : 'Hanno votato tutti'}. Basta la metà dei voti per correre.</p>
          </div>
          <div class="xwheel"><canvas id="wheel" width="900" height="900" aria-label="La ruota"></canvas></div>
        </div>`,
        `${note('Pista ' + esc(trackName(x.track || 'spareggio')) + ', da A a B')}${next('Chiudi il voto')}`, { count: false });
    }
    if (s === 'wheel') return wheelScreen();
    return '';
  }

  /* ---------- the wheel (gran finale) ---------- */
  const SLICE_COLORS = ['#E4002B', '#FF7A00', '#FFDB00', '#00A651', '#00A3E0', '#0058A3', '#7B2D8E', '#E6007E', '#8DC63F'];
  // slices can be thinner than others: where each one starts, as a share of the whole wheel
  function geom(slices) {
    const total = slices.reduce((a, x) => a + (x.w || 1), 0); let acc = 0;
    return slices.map(x => { const g = { a: acc / total * TAU, s: (x.w || 1) / total * TAU }; acc += x.w || 1; return g; });
  }
  let wheelRot = 0, anim = null;
  function wheelScreen() {
    const w = v.wheel || {}, win = w.winner ? byId(w.winner.id) : { name: '?' };
    let side = '', foot = '';
    if (w.phase === 'ready') {
      side = w.again
        ? `<p class="partn">La ruota dice</p><h1 class="mega xres">Gira ancora!</h1><img class="xav" src="${av(win, 300)}" alt=""><p class="lede">${esc(win.name)} gira di nuovo dal telefono.</p>`
        : `<p class="partn">Ha vinto l'ultimo giro</p><img class="xav" src="${av(win, 300)}" alt=""><h1 class="mega">${esc(win.name)}</h1>
        <p class="lede">Gira la ruota dal suo telefono.</p>`;
      foot = `${note('Più è grande il premio, meno spicchi ha sulla ruota')}${next('Gira per lui')}`;
    } else if (w.phase === 'spinning') {
      side = `<p class="partn">${esc(win.name)} gira la ruota</p><img class="xav" src="${av(win, 300)}" alt=""><h1 class="mega">Gira…</h1>`;
      foot = note('Tutti gli occhi sulla ruota');
    } else if (w.phase === 'edit') {
      const k = w.kinds[w.kind];
      side = `<p class="partn">${esc(k.label)}</p><h1 class="mega small">${esc(k.long)}</h1>
        ${w.moves != null ? `<p class="lede">Mosse usate: ${w.used} di ${w.moves}</p>` : ''}
        <ol class="xorder">${w.order.map((p, i) => `<li class="${p.id === win.id ? 'me' : ''} ${w.before[i] !== p.id ? 'moved' : ''}"><span class="rk">${i + 1}</span><img src="${av(p, 64)}" alt=""><span>${esc(p.name)}</span></li>`).join('')}</ol>`;
      foot = `${note(esc(win.name) + ' sta decidendo sul telefono')}${next('Conferma per lui')}`;
    } else {
      const k = w.kinds[w.kind] || { label: '', long: '' };
      side = `<p class="partn">La ruota dice</p><h1 class="mega xres">${esc(k.label)}</h1><p class="lede">${esc(w.note || k.long)}</p>
        ${w.kind === 'RICKROLL' ? `<div class="xrick"><iframe src="https://www.youtube.com/embed/_6HzLIJPH2A?autoplay=1&controls=0&rel=0&playsinline=1" allow="autoplay; encrypted-media" title="Rick roll"></iframe></div>` : ''}`;
      foot = next('Alla classifica finale');
    }
    return frame(`<div class="xwheelscr"><div class="xwheel big"><canvas id="wheel" width="1000" height="1000" aria-label="La ruota"></canvas></div><div class="xside">${side}</div></div>`, foot, { count: false });
  }
  const TAU = Math.PI * 2;
  // rotation that puts the middle of slice seg under the pointer
  const restFor = (seg, slices) => { const g = geom(slices)[seg]; return -(g.a + g.s / 2); };
  function drawWheel(cv, rot) {
    const slices = (v.wheel && v.wheel.slices) || (window.__slices || []);
    const n = slices.length; if (!n) return;
    const x = cv.getContext('2d'), W = cv.width, c = W / 2, R0 = W * 0.47, G = geom(slices);
    x.clearRect(0, 0, W, W);
    // outer ring with lights
    x.fillStyle = '#1A1A1A'; x.beginPath(); x.arc(c, c, R0 + W * 0.025, 0, TAU); x.fill();
    for (let i = 0; i < n * 2; i++) {
      const a = i * TAU / (n * 2) - Math.PI / 2;
      x.fillStyle = i % 2 ? '#FFDB00' : '#FFF6C2';
      x.beginPath(); x.arc(c + Math.cos(a) * (R0 + W * 0.012), c + Math.sin(a) * (R0 + W * 0.012), W * 0.006, 0, TAU); x.fill();
    }
    x.save(); x.translate(c, c); x.rotate(rot);
    for (let i = 0; i < n; i++) {
      const a0 = G[i].a - Math.PI / 2, sa = G[i].s, kk = slices[i].k, special = kk === 'DECIDI', rick = kk === 'RICKROLL';
      x.fillStyle = special ? '#111111' : rick ? '#FFFFFF' : SLICE_COLORS[i % SLICE_COLORS.length];
      x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R0, a0, a0 + sa); x.closePath(); x.fill();
      x.strokeStyle = '#FFFFFF'; x.lineWidth = W * 0.004; x.stroke();
      // label along the radius, reading from the rim inwards
      x.save(); x.rotate(a0 + sa / 2);
      const dark = ['#FFDB00', '#00A3E0', '#FF7A00'].includes(SLICE_COLORS[i % SLICE_COLORS.length]) && !special;
      x.fillStyle = special ? '#FFDB00' : rick ? '#E4002B' : dark ? '#111111' : '#FFFFFF';
      x.font = `800 ${Math.round(W * 0.036 * Math.max(0.72, Math.min(1, (slices[i].w || 1))))}px "Noto Sans", system-ui, sans-serif`;
      x.textBaseline = 'middle';
      // on the left half of the wheel the text is turned round, so it never reads upside down
      if (Math.cos(rot + a0 + sa / 2) < 0) { x.rotate(Math.PI); x.textAlign = 'left'; x.fillText(slices[i].label.toUpperCase(), -(R0 - W * 0.04), 0); }
      else { x.textAlign = 'right'; x.fillText(slices[i].label.toUpperCase(), R0 - W * 0.04, 0); }
      x.restore();
      // peg at the edge of each slice
      x.fillStyle = '#E8C547';
      x.beginPath(); x.arc(Math.cos(a0) * (R0 - W * 0.012), Math.sin(a0) * (R0 - W * 0.012), W * 0.009, 0, TAU); x.fill();
    }
    x.restore();
    // hub
    x.fillStyle = '#0058A3'; x.beginPath(); x.arc(c, c, W * 0.12, 0, TAU); x.fill();
    x.lineWidth = W * 0.012; x.strokeStyle = '#FFDB00'; x.stroke();
    x.fillStyle = '#FFDB00'; x.font = `900 ${Math.round(W * 0.07)}px "Noto Sans", system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('IKEA', c, c + W * 0.004);
    // pointer at the top
    x.fillStyle = '#FFDB00'; x.strokeStyle = '#111111'; x.lineWidth = W * 0.008;
    x.beginPath(); x.moveTo(c - W * 0.04, W * 0.005); x.lineTo(c + W * 0.04, W * 0.005); x.lineTo(c, W * 0.1); x.closePath(); x.fill(); x.stroke();
  }
  const easeOut = t => 1 - Math.pow(1 - t, 4);
  (function loop() {
    requestAnimationFrame(loop);
    const cv = document.getElementById('wheel'); if (!cv || !v) return;
    const w = v.wheel;
    if (w && w.phase === 'spinning') {
      const key = w.seg + ':' + w.spins + ':' + v.stepIndex + ':' + w.spinMs;
      if (!anim || anim.key !== key) {
        const target = restFor(w.seg, w.slices), from = wheelRot;
        let end = target; while (end < from + TAU * 9) end += TAU;          // at least nine full turns
        anim = { key, from, end, start: performance.now() - (w.spinMs - w.spinLeft), dur: w.spinMs };
      }
      const t = Math.min(1, (performance.now() - anim.start) / anim.dur);
      wheelRot = anim.from + (anim.end - anim.from) * easeOut(t);
    } else if (w && (w.phase === 'edit' || w.phase === 'done') && w.seg != null) {
      wheelRot = restFor(w.seg, w.slices);
    } else {
      wheelRot += 0.0025;                                                   // idle: turns slowly
    }
    drawWheel(cv, wheelRot);
  })();

  // the ranking as an IKEA receipt
  function receipt(list, title, done) {
    const total = list.filter(p => !p.hidden).reduce((a, p) => a + (p.score || 0), 0);
    return `<section class="receipt" aria-label="${esc(title)}">
      <h2>IKEA Lugano · ${esc(title)}</h2>
      <ol>${list.map(p => p.hidden
        ? `<li class="hid"><span class="rk">${p.rank}</span><span class="nm">· · ·</span><span class="sc"></span></li>`
        : `<li class="${p.rank === 1 ? 'top' : ''} ${p.tie ? 'tie' : ''}"><span class="rk">${p.rank}</span><img src="${av(p, 72)}" alt=""><span class="nm">${esc(p.name)}${p.tie ? ' <em>pari</em>' : ''}</span><span class="sc">${pts(p.score)}</span></li>`).join('')}</ol>
      <p class="sum"><span>Punti in gioco</span><span>${pts(total)}</span></p>
      <p class="tack">${done ? 'Tack! Arrivederci' : 'Tack!'}</p>
    </section>`;
  }
  // the powers as a catalogue page: for you, against someone, and the rare ones
  function powerCatalogue() {
    const all = Object.entries(v.powers).filter(([k, d]) => !d.parts || (v.part && d.parts.includes(v.part.n)));
    const item = ([k, d]) => `<li class="${d.kind}"><b>${esc(d.label)}</b><span>${esc(d.desc)}</span></li>`;
    return `<div class="pcat">
      <section><h2>Per te</h2><ul>${all.filter(([k, d]) => !d.special && d.kind === 'bonus').map(item).join('')}</ul></section>
      <section><h2>Contro un avversario</h2><ul>${all.filter(([k, d]) => !d.special && d.kind === 'obstacle').map(item).join('')}</ul></section>
      <section class="rare"><h2>Rari, li dà il quiz</h2><ul>${all.filter(([k, d]) => d.special).map(item).join('')}</ul></section>
    </div>`;
  }
  function planHtml() {
    return v.plan.filter(x => x.t === 'race' || x.t === 'part').map(x => x.t === 'race'
      ? `<li class="race">${x.final ? 'Gara finale, punti doppi' : 'Gara'} · ${esc(trackName(x.track))}</li>`
      : `<li>Parte ${x.n} · ${esc(x.title)}</li>`).join('');
  }
  function questionHtml(withAnswers) {
    const q = v.question;
    if (q.word) return `<p class="qline small muted">${esc(q.q)}</p><h1 class="tag">${esc(q.word)}</h1>`;
    if (q.type === 'order') return `<h1 class="qline">${esc(q.q)}</h1>${!withAnswers ? `<p class="lede">${esc(q.hint || '')}</p>` : ''}`;
    if (q.img) return `<div class="qrow"><figure class="photo ${withAnswers ? '' : 'big'}"><img src="${esc(q.img)}" alt=""></figure><h1 class="qline">${esc(q.q)}</h1></div>`;
    return `<h1 class="qline">${esc(q.q)}</h1>`;
  }
  function answersHtml(reveal) {
    const q = v.question;
    if (q.type === 'order') {
      const list = reveal ? q.correct : q.items;
      return `<ol class="logos ${reveal ? 'done' : ''}">${list.map(it => `<li><img src="${esc(it.img)}" alt="">${reveal ? `<b>${esc(it.label)}</b>` : ''}</li>`).join('')}</ol>`;
    }
    const n = q.answers.length;
    return `<ol class="answers n${n}">${q.answers.map((a, i) => {
      const cls = reveal ? (i === q.correct ? 'ok' : 'no') : '';
      const pickers = reveal && v.results ? v.results.filter(r => r.a === i).map(r => `<img src="${av(byId(r.id), 68)}" alt="">`).join('') : '';
      return `<li class="ans ${cls}"><span class="l">${n === 2 ? '' : L[i]}</span><span class="t"><mark>${esc(a)}</mark></span>${reveal ? `<span class="pk">${pickers}</span>` : ''}</li>`;
    }).join('')}</ol>`;
  }
  function attacksHtml() {
    if (!v.attacks || !v.attacks.length) return '';
    return `<ul class="attacks">${v.attacks.map((a, i) => {
      const from = byId(a.from), to = byId(a.to), d = v.powers[a.power] || { label: a.power, kind: 'obstacle' };
      return d.kind === 'bonus'
        ? `<li class="bonus" style="--i:${i}"><img src="${av(from, 80)}" alt="">${esc(from.name)} usa <b>${esc(d.label)}</b></li>`
        : `<li class="${a.blocked ? 'blocked' : ''}" style="--i:${i}"><img src="${av(from, 80)}" alt="">${esc(from.name)} lancia <b>${esc(d.label)}</b> a <img src="${av(to, 80)}" alt="">${esc(to.name)}${a.blocked ? ', ma lo scudo lo ferma' : ''}</li>`;
    }).join('')}</ul>`;
  }
  // steals and swaps are public moments (without the numbers)
  function twistsHtml() {
    if (!v.results) return '';
    const t = [];
    for (const r of v.results) {
      if (r.robbedBy) t.push(`${r.robbedBy.map(id => esc(byId(id).name)).join(' e ')} ruba i punti di ${esc(byId(r.id).name)}`);
      if (r.swapped) t.push(`${esc(byId(r.id).name)} scambia il suo totale con ${esc(byId(r.swapped).name)}`);
    }
    return t.length ? `<ul class="attacks">${t.map((x, i) => `<li style="--i:${i}">${x}</li>`).join('')}</ul>` : '';
  }
  // who got it right (never the points: those stay private on each phone)
  function gainsHtml() {
    if (!v.results) return '';
    const order = v.question.type === 'order';
    return v.results.slice().sort((a, b) => (b.correct - a.correct) || ((b.right || 0) - (a.right || 0))).map(r => {
      const p = byId(r.id);
      const tagline = r.a == null ? 'nessuna risposta' : order ? `${r.right || 0} su 6` : r.correct ? 'giusto' : 'sbagliato';
      return `<figure class="gain ${r.correct ? 'ok' : ''}"><img src="${av(p, 80)}" alt=""><figcaption>${esc(p.name)} <span>${tagline}</span></figcaption></figure>`;
    }).join('');
  }

  /* ---------- wiring ---------- */
  let lastScene = '';
  function paint() {
    const el = $('quiz');
    // a new moment of the evening (not just a vote coming in) enters in steps: title, text, content
    const scene = v.stage + ':' + v.stepIndex + ':' + (v.wheel ? v.wheel.phase : '');
    const enter = scene !== lastScene; lastScene = scene;
    el.className = 'screen on ' + (FIELD[v.stage] || 'f-white') + (enter ? ' enter' : '');
    el.innerHTML = render();
    const nb = $('qnext'); if (nb) nb.onclick = () => socket.emit('quiz_next');
    const sk = $('qskip'); if (sk) sk.onclick = () => socket.emit('quiz_skip_race');
    const tb = $('qtb'); if (tb) tb.onclick = () => socket.emit('quiz_tiebreak');
    const xs = $('qxskip'); if (xs) xs.onclick = () => socket.emit('quiz_extra_skip');
    const rs = $('qreset'); if (rs) rs.onclick = () => { if (confirm('Ricominciare da zero? I punti verranno azzerati.')) socket.emit('quiz_reset'); };
  }
  setInterval(() => {                         // timer: a thick yellow bar that empties, plus the seconds
    const num = $('tnum'), fill = $('tfill'); if (!num || !v || !v.total) return;
    const left = Math.max(0, endAt - performance.now());
    num.textContent = Math.ceil(left / 1000) + ' s';
    fill.style.transform = `scaleX(${left / v.total})`;
    fill.classList.toggle('low', left < 5000);
  }, 100);

  window.IKEA_QUIZ_HOST = {
    routeHtml,
    onQuiz(view) {
      v = view; endAt = performance.now() + (v.deadline || 0);
      if (v.wheel) window.__slices = v.wheel.slices;
      const key = JSON.stringify([v.stage, v.stepIndex, v.counts, v.who, v.final, v.powerOnly, v.tiebreak, v.grid && v.grid.by, v.extra,
        v.wheel && [v.wheel.phase, v.wheel.seg, v.wheel.spins, v.wheel.order && v.wheel.order.map(p => p.id).join()], v.standings.map(s => [s.id, s.score, s.connected, s.avatar]), v.attacks && v.attacks.length]);
      if (key !== lastKey) { lastKey = key; paint(); }
    },
    handlesStage(stage) { return !['race', 'raceResults', 'lobby'].includes(stage); }
  };
  addEventListener('keydown', e => {
    if (!v || !document.getElementById('quiz').classList.contains('on')) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'PageDown') { e.preventDefault(); socket.emit('quiz_next'); }
  });
})();
