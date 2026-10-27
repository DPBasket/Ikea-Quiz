/* IKEA QUIZ · TV / projector: the presentation, driven by the server ('quiz' events). */
(function () {
  'use strict';
  const TR = window.IKEA_TRACKS, R = window.IKEA_RENDER;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const L = ['A', 'B', 'C', 'D', 'E'];
  let v = null, endAt = 0, lastKey = '';

  const av = (p, px) => R.avatarURL(p.color, p.avatar || 'lampada', px || 120);
  const byId = id => (v && v.standings.find(s => s.id === id)) || { name: '?', color: '#999', avatar: 'lamp' };
  const trackName = id => (TR.byId[id] ? TR.byId[id].name : id);

  /* ---------- skeleton ---------- */
  function frame(top, body, foot) {
    return `<div class="qtop">${top}</div><div class="qbody">${body}</div><div class="qfoot">${foot}</div>`;
  }
  function topBar(extra) {
    const p = v.part;
    return `<div class="brand"><b>IKEA</b> QUIZ</div>
      ${p ? `<div class="part"><small>PARTE ${p.n}</small>${esc(p.title)}</div>` : ''}
      <div class="sp"></div>${extra || ''}
      ${v.deadline > 0 ? `<div class="timer" id="qtimer"><svg viewBox="0 0 64 64"><circle class="bg" cx="32" cy="32" r="27"/><circle class="fg" id="qtfg" cx="32" cy="32" r="27" stroke-dasharray="170" stroke-dashoffset="0"/></svg><span id="qtnum"></span></div>` : ''}`;
  }
  function who(flag) {
    // avatars along the bottom, with a ✓ for who is done
    return v.standings.filter(s => true).map(s => {
      const w = v.who ? v.who.find(x => x.id === s.id) : null;
      const done = flag && w ? w[flag] : false;
      return `<div class="chip ${flag && !done ? 'dim' : ''} ${s.connected === false && !s.bot ? 'off' : ''}"><img src="${av(s, 104)}"><div class="nm">${esc(s.name)}</div>${done ? '<div class="ok">✓</div>' : ''}</div>`;
    }).join('');
  }
  function next(label, cls) { return `<button class="btn ${cls || 'y'}" id="qnext">${label}</button>`; }

  /* ---------- per stage ---------- */
  function render() {
    const s = v.stage;
    if (s === 'welcome') return frame(topBar(), `
        <div class="big-title"><b>IKEA</b> QUIZ<br><span style="font-size:.45em">& RACE</span></div>
        <div class="partsub">La serata: 4 parti di quiz, una gara prima di ogni parte e la gara finale che vale doppio</div>
        <div class="plan">${planHtml()}</div>
        <div class="avgrid">${v.standings.map(p => `<div class="chip"><img src="${av(p, 172)}"><div class="nm">${esc(p.name)}</div></div>`).join('')}</div>`,
      `<div class="who"><b style="font-size:18px">Pronti? Si parte con la prima gara!</b></div>${next('VIA ▶')}`);
    if (s === 'partIntro') {
      const p = v.part;
      return frame(topBar(), `
        <div class="partno">PARTE ${p.n} DI 4</div>
        <div class="parttitle">${esc(p.title)}</div>
        <div class="partsub">${esc(p.subtitle)} · ${p.count} domande</div>
        <div class="rules">${p.rules.map((r, i) => `<div><i>${i + 1}</i>${esc(r)}</div>`).join('')}
          <div><i>⚡</i>Dalla 2ª domanda: prima di ogni domanda puoi lanciare un potere (15 s)</div>
          <div><i>🏁</i>Dopo la parte ${p.n < 4 ? 'c\'è la prossima gara' : 'arriva la GARA FINALE (punti ×2)'}</div></div>`,
        `<div class="who">${who()}</div>${next('INIZIA ▶')}`);
    }
    if (s === 'powers') return frame(topBar(qnum()), `
        <div class="powers-title">⚡ FASE POTERI</div>
        <div class="powers-sub">Sul telefono: scegli un potere (o nessuno). Gli ostacoli vanno lanciati contro un avversario.</div>
        <div class="plist">${Object.entries(v.powers).map(([k, d]) => `<div class="pcard ${d.kind}"><b>${esc(d.label)}</b><span>${esc(d.desc)}</span></div>`).join('')}</div>
        <div class="qhint">${v.counts.powers}/${v.counts.players} hanno scelto</div>`,
      `<div class="who">${who('power')}</div>${next('SALTA ▶', 'ghost')}`);
    if (s === 'reading') return frame(topBar(qnum()), `
        ${questionHtml(false)}
        ${attacksHtml()}
        <div class="qhint">Leggete la domanda e premete <b>PRONTO</b> sul telefono · ${v.counts.ready}/${v.counts.players}</div>`,
      `<div class="who">${who('ready')}</div>${next('MOSTRA RISPOSTE ▶', 'ghost')}`);
    if (s === 'answering') return frame(topBar(qnum()), `
        ${questionHtml(true)}
        ${answersHtml(false)}`,
      `<div class="who">${who('answered')}</div><div class="qhint" style="margin-right:12px">${v.counts.answered}/${v.counts.players} hanno risposto</div>${next('STOP ▶', 'ghost')}`);
    if (s === 'reveal') return frame(topBar(qnum()), `
        <div class="qrow">${v.question.revealImg ? `<img class="qimg ${v.question.type === 'choice' && !v.question.img ? 'big' : ''}" src="quiz/${esc(v.question.revealImg)}">` : ''}
          <div style="display:flex;flex-direction:column;gap:14px;align-items:center;flex:1;min-width:0">
            ${v.question.word ? `<div class="qword" style="font-size:clamp(50px,7vw,110px)">${esc(v.question.word)}</div>` : `<div class="qtitle" style="font-size:clamp(22px,2.4vw,38px)">${esc(v.question.q)}</div>`}
            ${answersHtml(true)}
          </div></div>
        <div class="gains">${gainsHtml()}</div>`,
      `<div class="who"><div class="board compact" style="flex-direction:row;display:flex;gap:8px">${v.standings.slice(0, 5).map(p => `<div class="gain"><img src="${av(p, 80)}">${p.rank}° ${esc(p.name)} ${p.score}</div>`).join('')}</div></div>${next('AVANTI ▶')}`);
    if (s === 'standings') {
      const top = Math.max(1, v.standings[0] ? v.standings[0].score : 1);
      return frame(topBar(), `
        <div class="partno">FINE PARTE ${v.part.n}</div>
        <div class="board">${boardHtml(top)}</div>`,
        `<div class="who"><b style="font-size:18px">${v.part.n < 4 ? 'Ora: la prossima gara! La griglia di partenza segue la classifica.' : 'Ora: la GARA FINALE, punti doppi!'}</b></div>${next('ALLA GARA ▶')}`);
    }
    if (s === 'raceWait' || s === 'raceSkipped') {
      const r = v.race || {};
      return frame(topBar(), `
        <div class="partno">${r.final ? 'GARA FINALE' : `GARA ${r.number || ''} DI ${r.of || 5}`}</div>
        <div class="parttitle">${esc(trackName(r.track))}</div>
        <div class="raceinfo">${s === 'raceSkipped' ? esc((v.lastRace && v.lastRace.error) || 'Gara non disponibile') + ' — aggiungi un giocatore o salta la gara' : 'La gara è stata interrotta.'}</div>`,
        `<div class="who"></div><button class="btn ghost" id="qskip">SALTA GARA</button>${s === 'raceWait' ? next('RIAVVIA GARA ▶') : next('RIPROVA ▶')}`);
    }
    if (s === 'final') {
      const st = v.standings, p3 = [st[1], st[0], st[2]];
      const h = { 1: 230, 2: 160, 3: 110 };
      return frame(topBar(), `
        <div class="partno">CLASSIFICA FINALE</div>
        <div class="podium">${p3.map(p => p ? `<div class="pl" style="animation-delay:${p.rank === 1 ? 1.2 : p.rank === 2 ? .6 : 0}s">
          <img src="${av(p, 300)}"><div class="nm">${esc(p.name)}</div><div class="sc">${p.score} punti</div>
          <div class="blk" style="height:${h[p.rank]}px">${p.rank}</div></div>` : '').join('')}</div>
        <div class="board compact" style="width:min(900px,100%)">${boardHtml(Math.max(1, st[0] ? st[0].score : 1), 3)}</div>
        <div class="confetti" id="confetti"></div>`,
        `<div class="who"><b style="font-size:20px">TACK! Grazie per aver giocato 💛</b></div><button class="btn ghost" id="qreset">NUOVA PARTITA</button>`);
    }
    return '';
  }

  function qnum() {
    const q = v.question; if (!q) return '';
    return `<div class="qnum">DOMANDA ${q.index} / ${v.part.count}</div>${q.powersOn ? '<div class="qnum" style="background:#E4002B;color:#fff">⚡ POTERI</div>' : ''}`;
  }
  function planHtml() {
    let part = 0;
    return v.plan.filter(x => x.t === 'race' || x.t === 'part').map(x => {
      if (x.t === 'race') return `<div class="race">🏁 ${x.final ? 'GARA FINALE ×2' : 'GARA'} · ${esc(trackName(x.track))}</div>`;
      part++; return `<div>PARTE ${x.n} · ${esc(x.title)}</div>`;
    }).join('');
  }
  function questionHtml(withAnswers) {
    const q = v.question;
    if (q.word) return `<div class="qhint" style="font-size:26px">${esc(q.q)}</div><div class="qword">${esc(q.word)}</div>`;
    if (q.type === 'order') return `<div class="qtitle">${esc(q.q)}</div>${!withAnswers ? `<div class="qhint">${esc(q.hint || '')}</div>` : ''}`;
    if (q.img) return `<div class="qrow"><img class="qimg ${withAnswers ? '' : 'big'}" src="quiz/${esc(q.img)}"><div class="qtitle" style="max-width:40vw">${esc(q.q)}</div></div>`;
    return `<div class="qtitle">${esc(q.q)}</div>`;
  }
  function answersHtml(reveal) {
    const q = v.question;
    if (q.type === 'order') {
      const list = reveal ? q.correct : q.items;
      return `<div class="logos">${list.map((it, i) => `<div class="logo ${reveal ? 'ok' : ''}"><img src="quiz/${esc(it.img)}">${reveal ? `${i + 1}° · ${esc(it.label)}` : ''}</div>`).join('')}</div>
        ${!reveal ? `<div class="qhint">Ordinate i loghi sul telefono, dal più vecchio al più recente</div>` : ''}`;
    }
    const n = q.answers.length;
    return `<div class="answers n${n}">${q.answers.map((a, i) => {
      const cls = reveal ? (i === q.correct ? 'ok' : 'no') : '';
      const pickers = reveal && v.results ? v.results.filter(r => r.a === i).map(r => `<img src="${av(byId(r.id), 68)}">`).join('') : '';
      return `<div class="ans ${cls}"><div class="l L${i}">${n === 2 ? (i ? '🪑' : '🧑') : L[i]}</div><div class="t">${esc(a)}</div>
        ${reveal ? `<div class="who">${pickers}</div>` : ''}</div>`;
    }).join('')}</div>`;
  }
  function attacksHtml() {
    if (!v.attacks || !v.attacks.length) return '';
    return `<div class="attacks">${v.attacks.map((a, i) => {
      const from = byId(a.from), to = byId(a.to), d = v.powers[a.power] || { label: a.power, kind: 'obstacle' };
      return d.kind === 'bonus'
        ? `<div class="attack" style="animation-delay:${i * .15}s"><img src="${av(from, 80)}">${esc(from.name)} <span class="pw bonus">${esc(d.label)}</span></div>`
        : `<div class="attack ${a.blocked ? 'blocked' : ''}" style="animation-delay:${i * .15}s"><img src="${av(from, 80)}">${esc(from.name)} <span class="pw">${esc(d.label)}</span> → <img src="${av(to, 80)}">${esc(to.name)}${a.blocked ? ' 🛡' : ''}</div>`;
    }).join('')}</div>`;
  }
  function gainsHtml() {
    if (!v.results) return '';
    return v.results.slice().sort((a, b) => (b.pts || 0) - (a.pts || 0)).map(r => {
      const p = byId(r.id);
      const extra = v.question.type === 'order' && r.right != null ? ` (${r.right}/6)` : '';
      return `<div class="gain ${r.pts ? 'ok' : ''}"><img src="${av(p, 80)}">${esc(p.name)} <span class="p">${r.pts ? '+' + r.pts : r.a == null ? '—' : '0'}</span>${extra}</div>`;
    }).join('');
  }
  function boardHtml(top, skip) {
    return v.standings.slice(skip || 0).map((p, i) => `<div class="brow ${p.rank === 1 ? 'first' : ''}" style="animation-delay:${i * .07}s">
      <div class="rk">${p.rank}°</div><img src="${av(p, 104)}"><div>${esc(p.name)}<div class="bar" style="width:${Math.round(100 * p.score / top)}%"></div></div><div>${p.score}</div></div>`).join('');
  }

  /* ---------- wiring ---------- */
  function paint() {
    const el = $('quiz');
    el.innerHTML = render();
    const nb = $('qnext'); if (nb) nb.onclick = () => socket.emit('quiz_next');
    const sk = $('qskip'); if (sk) sk.onclick = () => socket.emit('quiz_skip_race');
    const rs = $('qreset'); if (rs) rs.onclick = () => { if (confirm('Ricominciare da zero? I punti verranno azzerati.')) socket.emit('quiz_reset'); };
    if (v.stage === 'final') confetti();
  }
  function confetti() {
    const box = $('confetti'); if (!box) return;
    const cs = ['#0058A3', '#FFDB00', '#E4002B', '#00A651', '#FFFFFF'];
    for (let i = 0; i < 140; i++) {
      const c = document.createElement('i');
      c.style.left = Math.random() * 100 + '%'; c.style.background = cs[i % cs.length];
      c.style.animationDuration = 2.5 + Math.random() * 3 + 's'; c.style.animationDelay = Math.random() * 2 + 's';
      box.append(c);
    }
  }
  setInterval(() => {                         // countdown ring
    const num = $('qtnum'), fg = $('qtfg'); if (!num || !v || !v.total) return;
    const left = Math.max(0, endAt - performance.now());
    num.textContent = Math.ceil(left / 1000);
    fg.setAttribute('stroke-dashoffset', String(170 * (1 - left / v.total)));
    $('qtimer').classList.toggle('low', left < 5000);
  }, 200);

  window.IKEA_QUIZ_HOST = {
    onQuiz(view) {
      v = view; endAt = performance.now() + (v.deadline || 0);
      // only repaint the whole screen when something visible changed
      const key = JSON.stringify([v.stage, v.stepIndex, v.counts, v.who, v.standings.map(s => [s.id, s.score, s.connected, s.avatar]), v.attacks && v.attacks.length]);
      if (key !== lastKey) { lastKey = key; paint(); }
    },
    handlesStage(stage) { return !['race', 'raceResults', 'lobby'].includes(stage); }
  };
  addEventListener('keydown', e => {
    if (!v || !document.getElementById('quiz').classList.contains('on')) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'PageDown') { e.preventDefault(); socket.emit('quiz_next'); }
  });
})();
