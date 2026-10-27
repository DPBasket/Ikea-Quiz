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
    if (s === 'raceWait' || s === 'raceSkipped' || s === 'raceResults' || s === 'race') return center(`${big('Guarda lo schermo')}<p class="note">La gara sta per ripartire.</p>`);
    if (s === 'final' && !m.rank) return center(`${big('Guarda lo schermo')}<p class="note">Lo scontrino finale si stampa dall'ultimo al primo. Il tuo nome non è ancora uscito.</p>`);
    if (s === 'final') return center(`<img class="me" src="${av(m, 300)}" alt="">${big(m.rank + '°', 'yl')}<p class="score">${m.score} punti</p><p class="note">Tack! Grazie per aver giocato.</p>`);
    if (s === 'powers') return powersHtml();
    if (s === 'reading') return `
      ${questionHtml()}
      ${m.ready ? `<p class="lockmsg">Pronto. Aspettiamo gli altri: ${v.counts.ready} di ${v.counts.players}</p>`
                : `<button class="act" id="qready">Pronto</button><p class="note">Premi quando hai letto la domanda.</p>`}`;
    if (s === 'answering') return `${questionHtml(true)}${q.type === 'order' ? orderHtml() : answersHtml()}`;
    if (s === 'reveal') return revealHtml();
    return center('<p class="note">Un attimo…</p>');
  }

  function questionHtml(small) {
    const q = v.question;
    if (q.word) return `<p class="note">${esc(q.q)}</p><h1 class="word">${esc(q.word)}</h1>`;
    return `${q.img ? `<img class="pimg" src="${esc(q.img)}" alt="" style="${small ? 'max-height:18vh' : ''}">` : ''}<h1 class="qq">${esc(q.q)}</h1>`;
  }
  function answersHtml() {
    const q = v.question, mine = v.me.answer, n = q.answers.length;
    return `<ol class="pans n${n}">${q.answers.map((a, i) => {
      const cls = mine == null ? '' : mine === i ? 'picked' : 'off';
      return `<li><button class="pa ${cls}" data-a="${i}">${n === 2 ? '' : `<span class="l">${L[i]}</span>`}<span>${esc(a)}</span></button></li>`;
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
    const c = $('oconfirm'); if (c) c.onclick = () => { socket.emit('quiz_answer', { a: order }); vib(30); };
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
      <div class="pgrid">${Object.entries(v.powers).map(([k, d]) => `<button class="pbtn ${d.kind}" data-p="${k}"><b>${esc(d.label)}</b><span>${d.kind === 'obstacle' ? 'Contro un avversario. ' : 'Per te. '}${esc(d.desc)}</span></button>`).join('')}
        <button class="pbtn skip" data-p="SKIP"><b>Nessun potere</b></button></div>`;
  }

  /* ---------- reveal ---------- */
  function revealHtml() {
    const q = v.question, r = v.me.result || { pts: 0 }, mine = v.me.answer;
    const dbl = (v.me.effects || []).some(e => e.power === 'DOPPIO') ? ', punti doppi' : '';
    const head = mine == null ? `<div class="res none"><p class="pts">0</p><p>Nessuna risposta</p></div>`
      : r.pts > 0 ? `<div class="res ok"><p class="pts">+${r.pts}</p><p>${r.correct ? 'Giusto' : `${r.right} loghi su 6 al posto giusto`}${r.order ? ` · ${r.order}° più veloce` : ''}${dbl}</p></div>`
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
    return `${head}${q.revealImg ? `<img class="pimg" src="${esc(q.revealImg)}" alt="">` : ''}${detail}
      <p class="note">Totale: ${v.me.score} punti. Li vedi solo tu.</p>`;
  }

  /* ---------- obstacles on my screen during the answers ---------- */
  function applyEffects() {
    const qc = $('qc'); if (!qc || v.stage !== 'answering') return;
    const list = (v.me.effects || []);
    if (fx.key !== v.stepIndex) {
      fx.key = v.stepIndex; fx.shown = false; fx.msgUntil = 0;
      fx.ice = list.some(e => e.power === 'GHIACCIO' && !e.blocked) ? 6 : 0;
      const slime = list.filter(e => e.power === 'MELMA' && !e.blocked).length;
      fx.blobs = slime ? [...Array(3 + 2 * slime).keys()].map(i => ({ id: i, x: 5 + Math.random() * 65, y: 30 + Math.random() * 55, r: Math.random() * 40 - 20 })) : [];
      fx.boxesUntil = list.some(e => e.power === 'SCATOLE' && !e.blocked) ? performance.now() + 4000 : 0;
    }
    if (v.me.answer != null) return;
    const names = list.filter(e => !e.self).map(e => {
      const f = v.standings.find(s => s.id === e.from);
      return (v.powers[e.power] ? v.powers[e.power].label : e.power) + ' da ' + (f ? f.name : '?') + (e.blocked ? ', fermato dallo scudo' : '');
    });
    // banner with who hit you: visible only for the first 2 seconds
    if (!fx.msgUntil) { fx.msgUntil = performance.now() + 2000; setTimeout(() => { if (fx.key === v.stepIndex) paint(true); }, 2050); }
    if (names.length && performance.now() < fx.msgUntil) qc.insertAdjacentHTML('beforeend', `<div class="fxmsg ${list.every(e => e.blocked || e.self) ? 'good' : ''}">${esc(names.join(' · '))}</div>`);
    if (!fx.shown && names.length) { fx.shown = true; vib([80, 40, 80]); }
    if (fx.blobs.length) fx.blobs.forEach(b => qc.insertAdjacentHTML('beforeend',
      `<div class="blob" data-blob="${b.id}" style="left:${b.x}%;top:${b.y}%;transform:rotate(${b.r}deg)">Melma<br>toccala</div>`));
    if (fx.boxesUntil > performance.now()) {
      const pans = qc.querySelector('.pans, .olist');
      if (pans) {
        const r = pans.getBoundingClientRect(), qr = qc.getBoundingClientRect();
        const n = 6;
        for (let i = 0; i < n; i++) {
          const w = r.width / 2, h = r.height / 3;
          qc.insertAdjacentHTML('beforeend', `<div class="cbox" style="left:${r.left - qr.left + (i % 2) * w}px;top:${r.top - qr.top + qc.scrollTop + Math.floor(i / 2) * h}px;width:${w}px;height:${h}px">DAJLIEN</div>`);
        }
        setTimeout(() => { if (fx.key === v.stepIndex) paint(true); }, fx.boxesUntil - performance.now() + 30);
      }
    }
    if (fx.ice > 0) qc.insertAdjacentHTML('beforeend', `<div class="fx fx-ice" id="ice"><div>Ghiaccio</div><div class="cr">Tocca ancora ${fx.ice} volte per romperlo</div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">${[...Array(6 - fx.ice).keys()].map(i => `<path d="M${20 + i * 13} ${10 + (i * 37) % 60} l${(i % 2 ? -1 : 1) * 18} 22 l-8 14 l14 20" stroke="#fff" stroke-width="1.2" fill="none"/>`).join('')}</svg></div>`);
    const ice = $('ice');
    if (ice) ice.addEventListener('pointerdown', e => { e.preventDefault(); fx.ice--; vib(15); paint(true); });
    qc.querySelectorAll('[data-blob]').forEach(b => b.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); fx.blobs = fx.blobs.filter(x => x.id !== Number(b.dataset.blob)); vib(10); paint(true);
    }));
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
      const key = JSON.stringify([v.stage, v.stepIndex, v.me.ready, v.me.answer, v.me.power, v.me.score, v.me.rank, live]);
      if (key !== lastKey) { lastKey = key; paint(prevStage === v.stage + v.stepIndex); }
      if (prevStage !== v.stage + v.stepIndex && (v.stage === 'answering' || v.stage === 'powers')) vib(40);
    },
    handlesStage(stage) { return !['race', 'raceResults'].includes(stage); }
  };
})();
