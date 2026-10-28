/* IKEA QUIZ · phone: quiz screens, powers, obstacles. Everything is rebuilt from the server view,
 * so closing the page and coming back shows exactly the same state (answer, ready, power…). */
(function () {
  'use strict';
  const R = window.IKEA_RENDER;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const L = ['A', 'B', 'C', 'D', 'E'];
  let v = null, endAt = 0, lastKey = '', pickPower = null, order = null, orderKey = -1;
  const fx = { key: -1, ice: 0, blobs: null, boxesUntil: 0, shown: false };
  const av = (p, px) => R.avatarURL(p.color, p.avatar || 'lampada', px || 96);
  const vib = ms => { if (navigator.vibrate) navigator.vibrate(ms); };

  function header() {
    const m = v.me, where = v.part ? `Parte ${v.part.n} · ${esc(v.part.title)}` : 'IKEA quiz';
    return `<header class="qh"><img src="${av(m, 88)}" alt=""><p class="nm">${esc(m.name)}<span>${where}</span></p>
      <p class="sc">${m.score}<span>${m.rank ? m.rank + '° posto' : 'i tuoi punti'}</span></p></header>
      <div class="qbar"><i id="pbar" style="transform:scaleX(${v.deadline > 0 ? 1 : 0})"></i></div>`;
  }
  const center = html => `<div class="center">${html}</div>`;
  const big = (t, cls) => `<h1 class="huge ${cls || ''}">${t}</h1>`;

  function body() {
    const s = v.stage, q = v.question, m = v.me;
    if (s === 'welcome') return center(`<img class="me" src="${av(m, 300)}" alt="">${big(esc(m.name))}<p class="note">Guarda lo schermo grande: si parte dalla prima gara.</p>`);
    if (s === 'partIntro') return center(`<p class="kick">Parte ${v.part.n} di 4</p>${big(esc(v.part.title))}
      <ol class="rules">${v.part.rules.map(r => `<li>${esc(r)}</li>`).join('')}<li>Dalla seconda domanda puoi lanciare un potere.</li></ol>`);
    if (s === 'standings' && !v.boardVisible) return center(`${big('La classifica resta segreta')}<p class="score">${m.score} punti</p><p class="note">Ora la gara finale, a punti doppi. La classifica si scopre alla fine.</p>`);
    if (s === 'standings') return center(`<p class="kick">Fine della parte ${v.part.n}</p>${big(m.rank + '° posto', 'yl')}<p class="score">${m.score} punti</p><p class="note">Nella prossima gara chi è più in alto parte davanti.</p>`);
    if (v.tiebreak && (s === 'race' || s === 'raceResults')) return center(`<p class="kick">Gara di spareggio</p>${big(esc(v.tiebreak.names.join(' contro ')))}<p class="note">Erano a pari merito al ${v.tiebreak.rank}° posto. Corrono solo loro: guarda lo schermo.</p>`);
    if (s === 'raceWait' || s === 'raceSkipped' || s === 'raceResults' || s === 'race') return center(`${big('Guarda lo schermo')}<p class="note">La gara sta per ripartire.</p>`);
    if (s === 'final' && !m.rank) return center(`${big('Guarda lo schermo')}<p class="note">Lo scontrino finale si stampa dall'ultimo al primo. Il tuo nome non è ancora uscito.</p>`);
    if (s === 'final') return center(`<img class="me" src="${av(m, 300)}" alt="">${big(m.rank + '°' + (m.tie ? ' pari merito' : ''), 'yl')}<p class="score">${m.score} punti</p><p class="note">${m.tie ? 'Può deciderlo una gara di spareggio: tieni pronto il telefono.' : 'Tack! Grazie per aver giocato.'}</p>`);
    if (s === 'powers') return powersHtml();
    if (s === 'reading') return `
      ${peekHtml()}${questionHtml()}
      ${m.ready ? `<p class="lockmsg">Pronto. Aspettiamo gli altri: ${v.counts.ready} di ${v.counts.players}</p>`
                : `<button class="act" id="qready">Pronto</button><p class="note">Premi quando hai letto la domanda.</p>`}`;
    if (s === 'answering') return `${peekHtml()}${questionHtml(true)}${q.type === 'order' ? orderHtml() : answersHtml()}`;
    if (s === 'reveal') return revealHtml();
    return center('<p class="note">Un attimo…</p>');
  }

  // Sbircia la classifica
  function peekHtml() {
    if (!v.me.peek) return '';
    return `<details class="peek" open><summary>La classifica di adesso (la vedi solo tu)</summary><ol>${v.me.peek.map(p => `<li class="${p.me ? 'you' : ''}"><span>${p.rank}. ${esc(p.name)}</span><b>${p.score}</b></li>`).join('')}</ol></details>`;
  }
  // Mangia lettere: while it lasts the texts are drawn by eatTick() (letters come back one by one)
  const eating = () => v.stage === 'answering' && v.me.answer == null && (v.me.effects || []).some(e => e.power === 'LETTERE' && !e.blocked);
  const txt = t => eating() ? `<span data-eat="${esc(t)}">${esc(eatText(t))}</span>` : esc(t);
  function questionHtml(small) {
    const q = v.question;
    if (q.word) return `<p class="note">${txt(q.q)}</p><h1 class="word">${txt(q.word)}</h1>`;
    return `${q.img ? `<img class="pimg" src="${esc(q.img)}" alt="" style="${small ? 'max-height:18vh' : ''}">` : ''}<h1 class="qq">${txt(q.q)}</h1>`;
  }
  function answersHtml() {
    const q = v.question, mine = v.me.answer, n = q.answers.length;
    return `<ol class="pans n${n}">${q.answers.map((a, i) => {
      if (v.me.removed === i) return `<li><div class="pa gone">${n === 2 ? '' : `<span class="l">${L[i]}</span>`}<span>Tolta: era sbagliata</span></div></li>`;
      const cls = mine == null ? '' : mine === i ? 'picked' : 'off';
      return `<li><button class="pa ${cls}" data-a="${i}">${n === 2 ? '' : `<span class="l">${L[i]}</span>`}<span>${txt(a)}</span></button></li>`;
    }).join('')}</ol>
    ${mine != null ? `<p class="lockmsg">Risposta inviata. Non si può più cambiare.</p>` : ''}`;
  }

  /* ---------- order question (drag or arrows, then confirm) ---------- */
  function orderHtml() {
    const q = v.question;
    if (v.me.answer != null) return `<p class="lockmsg">Ordine inviato. Non si può più cambiare.</p>`;
    if (orderKey !== v.stepIndex || !order) { order = q.items.map(x => x.id); orderKey = v.stepIndex; }
    const img = id => q.items.find(x => x.id === id).img;
    return `<p class="note">Il più vecchio in alto, il più recente in basso. Trascina o usa le frecce.</p>
      <div class="olist" id="olist">${order.map((id, i) => `<div class="oitem" data-id="${id}"><div class="n">${i + 1}</div><img src="${esc(img(id))}" alt="Logo">
        <div class="mv"><button data-up="${id}" aria-label="Sposta su">▲</button><button data-dn="${id}" aria-label="Sposta giù">▼</button></div></div>`).join('')}</div>
      <button class="act" id="oconfirm">Conferma l'ordine</button>`;
  }
  function wireOrder() {
    const list = $('olist'); if (!list) return;
    const renum = () => [...list.children].forEach((el, i) => { el.querySelector('.n').textContent = i + 1; });
    const sync = () => { order = [...list.children].map(el => Number(el.dataset.id)); renum(); };
    list.querySelectorAll('[data-up],[data-dn]').forEach(b => b.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      const el = b.closest('.oitem');
      if (b.dataset.up != null && el.previousElementSibling) list.insertBefore(el, el.previousElementSibling);
      if (b.dataset.dn != null && el.nextElementSibling) list.insertBefore(el.nextElementSibling, el);
      sync(); vib(10);
    }));
    list.querySelectorAll('.oitem').forEach(el => {
      el.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('drag');
        const move = ev => {
          const y = ev.clientY;
          for (const other of list.children) {
            if (other === el) continue;
            const r = other.getBoundingClientRect();
            if (y < r.top + r.height / 2 && other.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) { list.insertBefore(el, other); sync(); break; }
            if (y > r.top + r.height / 2 && other.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) { list.insertBefore(el, other.nextElementSibling); sync(); break; }
          }
        };
        const up = () => { el.classList.remove('drag'); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
        el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      });
    });
    const c = $('oconfirm'); if (c) c.onclick = () => { if (!tryAnswer(order)) return; socket.emit('quiz_answer', { a: order }); vib(30); };
  }

  /* ---------- powers ---------- */
  function powersHtml() {
    const m = v.me;
    if (!m.canPower) return center(`${big('Potere bonus')}<p class="note">${esc((v.powerOnly || []).join(', '))} ha fatto il giro più veloce: solo lui sceglie un potere per questa domanda.</p>`);
    if (m.power) {
      const d = v.powers[m.power.power], t = m.power.target && v.standings.find(s => s.id === m.power.target);
      return center(`${big(d ? esc(d.label) : 'Nessun potere')}
        ${t ? `<p class="note">lanciato a</p><img class="me sm" src="${av(t, 200)}" alt=""><p class="score">${esc(t.name)}</p>` : ''}
        <p class="note">Fatto. Aspettiamo gli altri: ${v.counts.powers} di ${v.counts.players}</p>`);
    }
    if (pickPower) {
      const d = v.powers[pickPower];
      return `<h1 class="qq left">${esc(d.label)}: contro chi?</h1>
        <div class="tlist">${v.standings.filter(s => s.id !== m.id).map(s => `<button data-t="${s.id}"><img src="${av(s, 120)}" alt=""><span>${esc(s.name)}</span><b>Lancia</b></button>`).join('')}</div>
        <button class="act quiet" id="pback">Scegli un altro potere</button>`;
    }
    return `<h1 class="qq left">${(v.powerOnly || []).length ? 'Potere bonus: il giro più veloce è tuo' : 'Scegli un potere'}</h1>
      <p class="note">Ti sono usciti questi tre: ne scegli uno o nessuno.</p>
      <div class="pgrid">${(v.me.offers || []).map(k => [k, v.powers[k]]).filter(x => x[1]).map(([k, d]) => `<button class="pbtn ${d.kind}" data-p="${k}"><b>${esc(d.label)}</b><span>${d.kind === 'obstacle' ? 'Contro un avversario. ' : 'Per te. '}${esc(d.desc)}</span>${d.cost ? `<em>Costa ${d.cost} punti</em>` : ''}</button>`).join('')}
        <button class="pbtn skip" data-p="SKIP"><b>Nessun potere</b></button></div>`;
  }

  /* ---------- reveal ---------- */
  function revealHtml() {
    const q = v.question, r = v.me.result || { pts: 0 }, mine = v.me.answer;
    const dbl = (v.me.effects || []).some(e => e.power === 'DOPPIO') ? ', punti doppi' : '';
    const head = mine == null ? `<div class="res none"><p class="pts">0</p><p>Nessuna risposta</p></div>`
      : r.pts > 0 ? `<div class="res ok"><p class="pts">+${r.pts}</p><p>${r.correct ? 'Giusto' : q.type === 'order' && r.right ? `${r.right} loghi su 6 al posto giusto` : 'Sbagliato, ma con i punti rubati'}${r.order ? ` · ${r.order}° più veloce` : ''}${dbl}</p></div>`
      : `<div class="res no"><p class="pts">0</p><p>Sbagliato</p></div>`;
    let detail;
    if (q.type === 'order') {
      detail = `<div class="olist">${q.correct.map((it, i) => {
        const ok = Array.isArray(mine) && mine[i] === it.id;
        return `<div class="oitem ${Array.isArray(mine) ? (ok ? 'ok' : 'no') : ''}"><div class="n">${i + 1}</div><img src="${esc(it.img)}" alt=""><div class="yr">${esc(it.label)}</div></div>`;
      }).join('')}</div>`;
    } else {
      detail = `<ol class="pans n${q.answers.length}">${q.answers.map((a, i) => `<li><div class="pa ${i === q.correct ? 'ok' : 'off'} ${mine === i ? 'picked' : ''}">${q.answers.length === 2 ? '' : `<span class="l">${L[i]}</span>`}<span><mark>${esc(a)}</mark></span></div></li>`).join('')}</ol>`;
    }
    const nm = id => { const x = v.standings.find(p => p.id === id); return x ? esc(x.name) : '?'; };
    const extra = [
      r.stolen ? `Hai rubato ${r.stolen} punti.` : '',
      r.robbedBy ? `${r.robbedBy.map(nm).join(' e ')} ti ha rubato i punti di questa domanda${r.lost ? ` (${r.lost})` : ''}.` : '',
      r.swapped ? `Il tuo totale è stato scambiato con quello di ${nm(r.swapped)}.` : '',
      r.swappedBy ? `${nm(r.swappedBy)} ha scambiato il suo totale col tuo.` : ''
    ].filter(Boolean).map(t => `<p class="lockmsg">${t}</p>`).join('');
    return `${head}${extra}${q.revealImg ? `<img class="pimg" src="${esc(q.revealImg)}" alt="">` : ''}${detail}
      <p class="note">Totale: ${v.me.score} punti. Li vedi solo tu.</p>`;
  }

  /* ---------- obstacles on my screen during the answers ---------- */
  /* local media: put q-rickroll.mp4 / q-faaah.mp3 in public/ to use your own files, otherwise YouTube is used */
  const media = { rick: null, faaah: null };
  fetch('q-rickroll.mp4', { method: 'HEAD' }).then(r => { media.rick = r.ok; }).catch(() => { media.rick = false; });
  fetch('q-faaah.mp3', { method: 'HEAD' }).then(r => { media.faaah = r.ok; }).catch(() => { media.faaah = false; });
  // overlays that must survive repaints (a video would restart otherwise) live in their own layer
  function layer() {
    let el = $('fxlayer');
    if (!el) { el = document.createElement('div'); el.id = 'fxlayer'; document.body.append(el); }
    return el;
  }
  function clearLayer() { const el = $('fxlayer'); if (el) el.innerHTML = ''; fx.rickOn = fx.meatOn = false; }

  function rickroll(ms) {
    if (fx.rickOn) return; fx.rickOn = true;
    const until = performance.now() + ms;
    fx.blockUntil = until;
    const src = media.rick
      ? `<video src="q-rickroll.mp4" autoplay playsinline></video>`
      : `<iframe src="https://www.youtube.com/embed/_6HzLIJPH2A?autoplay=1&playsinline=1&controls=0&rel=0" allow="autoplay; encrypted-media" title="Rick roll"></iframe>`;
    layer().insertAdjacentHTML('beforeend', `<div class="fx-rick" id="rick">${src}<p id="rickt"></p></div>`);
    const tick = setInterval(() => {
      const left = until - performance.now(), t = $('rickt');
      if (left <= 0 || !t) { clearInterval(tick); const r = $('rick'); if (r) r.remove(); fx.rickOn = false; return; }
      t.textContent = `Rick roll da ${fx.rickFrom}: ancora ${Math.ceil(left / 1000)} s`;
    }, 200);
  }
  function faaah(then) {
    const snd = media.faaah ? `<audio src="q-faaah.mp3" autoplay></audio>`
      : `<iframe class="hiddenframe" src="https://www.youtube.com/embed/nh49oWrwFhM?autoplay=1&controls=0" allow="autoplay" title="faaah"></iframe>`;
    layer().insertAdjacentHTML('beforeend', `<div class="fx-faaah" id="faaah"><img src="q-faaah.jpg" alt="">${snd}</div>`);
    vib([200, 60, 200]);
    setTimeout(() => { const el = $('faaah'); if (el) el.remove(); then(); }, 2600);
  }
  function meatballs() {
    if (fx.meatOn) return; fx.meatOn = true;
    const balls = [...Array(10).keys()].map(i => `<i style="--x:${(i * 37) % 90}vw;--y:${(i * 53) % 80 + 8}vh;--d:${3 + (i % 4) * 1.1}s;--dl:${-(i * .7)}s;--s:${60 + (i % 3) * 26}px"></i>`).join('');
    layer().insertAdjacentHTML('beforeend', `<div class="fx-meat" id="meat">${balls}</div>`);
  }

  // which letters are still eaten: each letter has its own moment to come back (same for the whole question)
  function eatText(t) {
    const start = fx.key === v.stepIndex && fx.eatStart ? fx.eatStart : performance.now();
    const ms = v.lettersMs || 12000, k = Math.min(1, Math.max(0, (performance.now() - start) / ms));
    const gone = 0.75 * (1 - k);                            // at the start 3 letters out of 4 are missing
    let h = 0; for (const c of String(v.stepIndex)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    let out = '';
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      h = (h * 1103515245 + 12345 + c.charCodeAt(0) * 7 + i) >>> 0;
      if (/\s/.test(c) || !/\p{L}|\p{N}/u.test(c)) { out += c; continue; }
      if ((h % 1000) / 1000 >= gone) out += c;
    }
    return out.replace(/ {2,}/g, ' ');
  }
  function eatTick() {
    const els = document.querySelectorAll('#quiz [data-eat]');
    if (!els.length) return;
    if (!eating()) { els.forEach(el => { el.textContent = el.dataset.eat; el.removeAttribute('data-eat'); }); return; }
    els.forEach(el => { const t = eatText(el.dataset.eat); if (el.textContent !== t) el.textContent = t; });
  }
  setInterval(eatTick, 250);

  function applyEffects() {
    const qc = $('qc');
    if (!qc || v.stage !== 'answering') { if (v && v.stage !== 'answering') clearLayer(); return; }
    const list = (v.me.effects || []);
    const on = p => list.find(e => e.power === p && !e.blocked);
    if (fx.key !== v.stepIndex) {
      fx.key = v.stepIndex; fx.shown = false; fx.msgUntil = 0; clearLayer();
      fx.boxesUntil = on('SCATOLE') ? performance.now() + 4000 : 0;
      fx.faaah = !!on('FAAAH');
      fx.eatStart = performance.now();
      const rr = on('RICKROLL');
      if (rr) { const f = v.standings.find(x => x.id === rr.from); fx.rickFrom = f ? f.name : '?'; rickroll(v.rickrollMs || 10000); }
      if (on('POLPETTE')) meatballs();
    }
    if (v.me.answer != null) { clearLayer(); return; }
    const names = list.filter(e => !e.self).map(e => {
      const f = v.standings.find(x => x.id === e.from);
      return (v.powers[e.power] ? v.powers[e.power].label : e.power) + ' da ' + (f ? f.name : '?') + (e.blocked ? ', fermato dallo scudo' : '');
    });
    // banner with who hit you: visible only for the first 2 seconds
    if (!fx.msgUntil) { fx.msgUntil = performance.now() + 2000; setTimeout(() => { if (fx.key === v.stepIndex) paint(true); }, 2050); }
    if (names.length && performance.now() < fx.msgUntil) qc.insertAdjacentHTML('beforeend', `<div class="fxmsg ${list.every(e => e.blocked || e.self) ? 'good' : ''}">${esc(names.join(' · '))}</div>`);
    if (!fx.shown && names.length) { fx.shown = true; vib([80, 40, 80]); }
    if (fx.boxesUntil > performance.now()) {
      const pans = qc.querySelector('.pans, .olist');
      if (pans) {
        const r = pans.getBoundingClientRect(), qr = qc.getBoundingClientRect();
        for (let i = 0; i < 6; i++) {
          const w = r.width / 2, h = r.height / 3;
          qc.insertAdjacentHTML('beforeend', `<div class="cbox" style="left:${r.left - qr.left + (i % 2) * w}px;top:${r.top - qr.top + qc.scrollTop + Math.floor(i / 2) * h}px;width:${w}px;height:${h}px">DAJLIEN</div>`);
        }
        setTimeout(() => { if (fx.key === v.stepIndex) paint(true); }, fx.boxesUntil - performance.now() + 30);
      }
    }
  }
  // the answer tap goes through the obstacles first (rick roll blocks it, faaah eats the first one)
  function tryAnswer(a) {
    if (performance.now() < (fx.blockUntil || 0) && fx.key === v.stepIndex) { vib(40); return false; }
    if (fx.faaah && fx.key === v.stepIndex) { fx.faaah = false; faaah(() => {}); return false; }
    return true;
  }

  /* ---------- paint ---------- */
  function paint(force) {
    const el = $('quiz');
    const keep = $('qc') ? $('qc').scrollTop : 0;
    el.innerHTML = header() + `<div class="qc" id="qc">${body()}</div>`;
    if (force) $('qc').scrollTop = keep;
    const r = $('qready'); if (r) r.onclick = () => { socket.emit('quiz_ready'); vib(20); };
    document.querySelectorAll('#quiz .pa[data-a]').forEach(b => b.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (v.me.answer != null || v.stage !== 'answering') return;
      if (!tryAnswer(Number(b.dataset.a))) return;
      socket.emit('quiz_answer', { a: Number(b.dataset.a) }); vib(30);
      v.me.answer = Number(b.dataset.a); paint(true);            // optimistic: lock immediately
    }));
    document.querySelectorAll('#quiz [data-p]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.p;
      if (k === 'SKIP' || v.powers[k].kind === 'bonus') { socket.emit('quiz_power', { power: k }); pickPower = null; }
      else { pickPower = k; paint(true); }
    }));
    document.querySelectorAll('#quiz [data-t]').forEach(b => b.addEventListener('click', () => {
      socket.emit('quiz_power', { power: pickPower, target: b.dataset.t }); pickPower = null; vib(30);
    }));
    const pb = $('pback'); if (pb) pb.onclick = () => { pickPower = null; paint(true); };
    wireOrder();
    applyEffects();
  }
  setInterval(() => {
    const bar = $('pbar'); if (!bar || !v) return;
    bar.style.transform = `scaleX(${v.total ? Math.max(0, (endAt - performance.now()) / v.total) : 0})`;
  }, 200);

  window.IKEA_QUIZ_PLAYER = {
    onQuiz(view) {
      const prevStage = v ? v.stage + v.stepIndex : '';
      v = view; endAt = performance.now() + (v.deadline || 0);
      if (v.stage !== 'powers') pickPower = null;
      // during the answers only my own state matters (the obstacles must not reset when others answer)
      const live = v.stage === 'answering' ? [] : [v.counts, v.standings.length];
      const key = JSON.stringify([v.stage, v.stepIndex, v.me.ready, v.me.answer, v.me.power, v.me.score, v.me.rank, v.me.tie, !!v.tiebreak, live]);
      if (key !== lastKey) { lastKey = key; paint(prevStage === v.stage + v.stepIndex); }
      if (prevStage !== v.stage + v.stepIndex && (v.stage === 'answering' || v.stage === 'powers')) vib(40);
    },
    // during a tie-break only the tied players race; the others keep the quiz screen
    handlesStage(stage, view) { return !['race', 'raceResults'].includes(stage) || !!(view && view.tiebreak && view.me && !view.tiebreak.ids.includes(view.me.id)); }
  };
})();
