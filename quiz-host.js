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

  /* ---------- skeleton: field colour per moment ---------- */
  const FIELD = { welcome: 'f-blue', partIntro: 'f-yellow', powers: 'f-ink', reading: 'f-white', answering: 'f-white',
    reveal: 'f-white', standings: 'f-blue', raceWait: 'f-blue', raceSkipped: 'f-blue', final: 'f-blue' };
  function frame(body, foot, opts) {
    opts = opts || {};
    const p = v.part, q = v.question;
    const where = [p ? `Parte ${p.n} · ${esc(p.title)}` : '', q && opts.count !== false ? `domanda ${q.index} di ${p.count}` : ''].filter(Boolean).join(', ');
    const timer = v.deadline > 0 ? `<div class="tbar"><i id="tfill"></i></div>` : '';
    return `<header class="qtop"><div class="wm">IKEA <span>quiz</span></div><div class="where">${where}</div>
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
          <ol class="timetable">${planHtml()}</ol>
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
            <li>Dalla seconda domanda, prima di leggere, ognuno può lanciare un potere: 15 secondi per scegliere.</li></ol>
        </div>`,
        `${who()}${next('Prima domanda')}`);
    }
    if (s === 'powers') {
      const only = v.powerOnly && v.powerOnly.length ? v.powerOnly : null;
      return frame(`
        <div class="powers">
          <h1 class="mega">${only ? `Potere bonus per ${esc(only.join(', '))}` : 'Fase poteri'}</h1>
          <p class="lede">${only ? 'Ha fatto il giro più veloce in gara: solo lui sceglie un potere per questa domanda.' : 'Sul telefono: scegli un potere o nessuno. Gli ostacoli si lanciano contro un avversario.'}</p>
          <dl class="plist">${Object.entries(v.powers).map(([k, d]) => `<div class="${d.kind}"><dt>${esc(d.label)}</dt><dd>${esc(d.desc)}</dd></div>`).join('')}</dl>
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
        <div class="gains">${gainsHtml()}</div>`,
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
        `${note('Tra poco la prossima gara')}${next('Alla gara')}`);
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
      const st = v.standings, n = st.length, latest = st.find(p => !p.hidden && p.rank === n - v.final.shown + 1);
      return frame(`
        <div class="tally">
          <div class="leader spot">
            ${latest ? `<p class="bigrank">${latest.rank}°</p><img class="rise" src="${av(latest, 360)}" alt=""><h1 class="mega">${esc(latest.name)}</h1><p class="lede">${pts(latest.score)} punti</p>`
              : `<p class="bigrank">?</p><h1 class="mega">Si parte dall'ultimo posto</h1>`}
          </div>
          ${receipt(st, 'Classifica finale')}
        </div>`,
        `${note(v.final.total - v.final.shown <= 3 ? 'Ed ora il podio' : 'Lo scontrino si sta stampando…')}${next('Mostra tutto', 'quiet')}`);
    }
    if (s === 'final') {
      const st = v.standings, p3 = [st[1], st[0], st[2]], h = { 1: 18, 2: 12, 3: 8 };
      return frame(`
        <div class="tally">
          <div class="podium">${p3.map(p => p ? `<div class="pl r${p.rank}"><img src="${av(p, 300)}" alt=""><b>${esc(p.name)}</b><span>${pts(p.score)}</span>
            <div class="cube" style="height:calc(var(--u) * ${h[p.rank]})">${p.rank}</div></div>` : '').join('')}</div>
          ${receipt(st, 'Classifica finale', true)}
        </div>`,
        `${note(`Vince ${esc(st[0] ? st[0].name : '')}. Tack för idag!`)}<button class="go quiet" id="qreset">Nuova partita</button>`);
    }
    return '';
  }

  // the ranking as an IKEA receipt
  function receipt(list, title, done) {
    const total = list.filter(p => !p.hidden).reduce((a, p) => a + (p.score || 0), 0);
    return `<section class="receipt" aria-label="${esc(title)}">
      <h2>IKEA Lugano · ${esc(title)}</h2>
      <ol>${list.map(p => p.hidden
        ? `<li class="hid"><span class="rk">${p.rank}</span><span class="nm">· · ·</span><span class="sc"></span></li>`
        : `<li class="${p.rank === 1 ? 'top' : ''}"><span class="rk">${p.rank}</span><img src="${av(p, 72)}" alt=""><span class="nm">${esc(p.name)}</span><span class="sc">${pts(p.score)}</span></li>`).join('')}</ol>
      <p class="sum"><span>Punti in gioco</span><span>${pts(total)}</span></p>
      <p class="tack">${done ? 'Tack! Arrivederci' : 'Tack!'}</p>
    </section>`;
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
  function paint() {
    const el = $('quiz');
    el.className = 'screen on ' + (FIELD[v.stage] || 'f-white');
    el.innerHTML = render();
    const nb = $('qnext'); if (nb) nb.onclick = () => socket.emit('quiz_next');
    const sk = $('qskip'); if (sk) sk.onclick = () => socket.emit('quiz_skip_race');
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
    onQuiz(view) {
      v = view; endAt = performance.now() + (v.deadline || 0);
      const key = JSON.stringify([v.stage, v.stepIndex, v.counts, v.who, v.final, v.powerOnly, v.standings.map(s => [s.id, s.score, s.connected, s.avatar]), v.attacks && v.attacks.length]);
      if (key !== lastKey) { lastKey = key; paint(); }
    },
    handlesStage(stage) { return !['race', 'raceResults', 'lobby'].includes(stage); }
  };
  addEventListener('keydown', e => {
    if (!v || !document.getElementById('quiz').classList.contains('on')) return;
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'PageDown') { e.preventDefault(); socket.emit('quiz_next'); }
  });
})();
