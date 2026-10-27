/* IKEA QUIZ · phone: quiz screens, powers, obstacles. Everything is rebuilt from the server view,
 * so closing the page and coming back shows exactly the same state (answer, ready, power…). */
(function () {
  'use strict';
  const R = window.IKEA_RENDER;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const L = ['A', 'B', 'C', 'D', 'E'], COL = ['#0058A3', '#E4002B', '#00A651', '#FF7A00', '#8E44AD'];
  let v = null, endAt = 0, lastKey = '', pickPower = null, order = null, orderKey = -1;
  const fx = { key: -1, ice: 0, blobs: null, boxesUntil: 0, shown: false };
  const av = (p, px) => R.avatarURL(p.color, p.avatar || 'lampada', px || 96);
  const vib = ms => { if (navigator.vibrate) navigator.vibrate(ms); };

  function header() {
    const m = v.me;
    return `<div class="qh"><img src="${av(m, 88)}"><div class="nm">${esc(m.name)}<small>${v.part ? 'PARTE ' + v.part.n + ' · ' + esc(v.part.title) : 'IKEA QUIZ'}</small></div>
      <div class="sp"></div><div class="sc">${m.score}<small>${m.rank}° POSTO</small></div></div>
      <div class="qbar"><i id="pbar" style="width:${v.deadline > 0 ? 100 : 0}%"></i></div>`;
  }
  function center(html) { return `<div class="center">${html}</div>`; }

  function body() {
    const s = v.stage, q = v.question, m = v.me;
    if (s === 'welcome') return center(`<div class="lab">BENVENUTO</div><img src="${av(m, 240)}" style="width:150px;height:150px"><div class="huge">${esc(m.name)}</div><div class="note">Guarda lo schermo grande: si parte con la prima gara!</div>`);
    if (s === 'partIntro') return center(`<div class="lab">PARTE ${v.part.n} DI 4</div><div class="huge">${esc(v.part.title)}</div>
      <div class="note" style="text-align:left">${v.part.rules.map(r => '• ' + esc(r)).join('<br>')}<br>• Dalla 2ª domanda puoi lanciare un potere</div>`);
    if (s === 'standings') return center(`<div class="lab">FINE PARTE ${v.part.n}</div><div class="huge">${m.rank}° posto</div><div style="font-weight:900;font-size:22px">${m.score} punti</div><div class="note">Tra poco la prossima gara: chi è più in alto parte davanti!</div>`);
    if (s === 'raceWait' || s === 'raceSkipped' || s === 'raceResults' || s === 'race') return center(`<div class="lab">GARA</div><div class="huge">Guarda lo schermo</div><div class="note">La gara sta per (ri)partire…</div>`);
    if (s === 'final') return center(`<div class="lab">CLASSIFICA FINALE</div><img src="${av(m, 240)}" style="width:150px;height:150px"><div class="huge">${m.rank}°</div><div style="font-weight:900;font-size:24px">${m.score} punti</div><div class="note">TACK! Grazie per aver giocato</div>`);
    if (s === 'powers') return powersHtml();
    if (s === 'reading') return `
      ${questionHtml()}
      ${m.ready ? `<div class="lockmsg">PRONTO ✓ · aspetto gli altri (${v.counts.ready}/${v.counts.players})</div>`
                : `<button class="btn y bigbtn" id="qready">PRONTO ✓</button><div class="note">Premi quando hai letto la domanda</div>`}`;
    if (s === 'answering') return `${questionHtml(true)}${q.type === 'order' ? orderHtml() : answersHtml()}`;
    if (s === 'reveal') return revealHtml();
    return center('<div class="note">…</div>');
  }

  function questionHtml(small) {
    const q = v.question;
    if (q.word) return `<div class="lab" style="text-align:center">${esc(q.q)}</div><div class="word">${esc(q.word)}</div>`;
    return `${q.img ? `<img class="pimg" src="quiz/${esc(q.img)}" style="${small ? 'max-height:18vh' : ''}">` : ''}<div class="qq">${esc(q.q)}</div>`;
  }
  function answersHtml() {
    const q = v.question, mine = v.me.answer, n = q.answers.length;
    return `<div class="pans n${n}">${q.answers.map((a, i) => {
      const cls = mine == null ? '' : mine === i ? 'picked' : 'off';
      return `<button class="pa ${cls}" data-a="${i}" style="background:${COL[i]}"><span class="l">${n === 2 ? (i ? '🪑' : '🧑') : L[i]}</span><span>${esc(a)}</span></button>`;
    }).join('')}</div>
    ${mine != null ? `<div class="lockmsg">RISPOSTA INVIATA 🔒 definitiva</div>` : ''}`;
  }

  /* ---------- order question (drag or ▲▼, then CONFERMA) ---------- */
  function orderHtml() {
    const q = v.question;
    if (v.me.answer != null) return `<div class="lockmsg">ORDINE INVIATO 🔒 definitivo</div>`;
    if (orderKey !== v.stepIndex || !order) { order = q.items.map(x => x.id); orderKey = v.stepIndex; }
    const img = id => q.items.find(x => x.id === id).img;
    return `<div class="note">${esc(q.hint || 'Dal più vecchio (in alto) al più recente (in basso)')}</div>
      <div class="olist" id="olist">${order.map((id, i) => `<div class="oitem" data-id="${id}"><div class="n">${i + 1}</div><img src="quiz/${esc(img(id))}">
        <div class="mv"><button data-up="${id}">▲</button><button data-dn="${id}">▼</button></div></div>`).join('')}</div>
      <button class="btn y bigbtn" id="oconfirm">CONFERMA 🔒</button>`;
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
    if (m.power) {
      const d = v.powers[m.power.power], t = m.power.target && v.standings.find(s => s.id === m.power.target);
      return center(`<div class="lab">⚡ FASE POTERI</div><div class="huge">${d ? esc(d.label) : 'Nessun potere'}</div>
        ${t ? `<div style="font-weight:900;font-size:18px">contro</div><img src="${av(t, 160)}" style="width:96px;height:96px"><div style="font-weight:900">${esc(t.name)}</div>` : ''}
        <div class="note">Fatto! Aspetto gli altri (${v.counts.powers}/${v.counts.players})</div>`);
    }
    if (pickPower) {
      const d = v.powers[pickPower];
      return `<div class="lab">${esc(d.label)} · CONTRO CHI?</div>
        <div class="tgrid">${v.standings.filter(s => s.id !== m.id).map(s => `<button data-t="${s.id}"><img src="${av(s, 120)}">${esc(s.name)}<span style="color:var(--grey)">${s.rank}° · ${s.score}</span></button>`).join('')}</div>
        <button class="btn ghost" id="pback">← CAMBIA POTERE</button>`;
    }
    return `<div class="lab">⚡ FASE POTERI · scegli prima del tempo</div>
      <div class="pgrid">${Object.entries(v.powers).map(([k, d]) => `<button class="pbtn ${d.kind}" data-p="${k}"><b>${esc(d.label)}</b><span>${d.kind === 'obstacle' ? 'OSTACOLO · ' : 'BONUS · '}${esc(d.desc)}</span></button>`).join('')}
        <button class="pbtn skip" data-p="SKIP"><b>NESSUN POTERE</b></button></div>`;
  }

  /* ---------- reveal ---------- */
  function revealHtml() {
    const q = v.question, r = v.me.result || { pts: 0 }, mine = v.me.answer;
    const head = mine == null ? `<div class="res none"><div class="pts">—</div>Nessuna risposta</div>`
      : r.pts > 0 ? `<div class="res ok"><div class="pts">+${r.pts}</div>${r.correct ? 'GIUSTO!' : `${r.right}/6 al posto giusto`}${(v.me.effects || []).some(e => e.power === 'DOPPIO') ? ' · PUNTI ×2' : ''}</div>`
      : `<div class="res no"><div class="pts">0</div>SBAGLIATO</div>`;
    let detail;
    if (q.type === 'order') {
      detail = `<div class="lab">ORDINE GIUSTO</div><div class="olist">${q.correct.map((it, i) => {
        const ok = Array.isArray(mine) && mine[i] === it.id;
        return `<div class="oitem ${Array.isArray(mine) ? (ok ? 'ok' : 'no') : ''}"><div class="n">${i + 1}</div><img src="quiz/${esc(it.img)}"><div class="yr">${esc(it.label)}</div></div>`;
      }).join('')}</div>`;
    } else {
      detail = `<div class="lab">RISPOSTA GIUSTA</div><div class="pans n${q.answers.length}">${q.answers.map((a, i) => `<div class="pa ${i === q.correct ? 'ok' : 'off'} ${mine === i ? 'picked' : ''}" style="background:${COL[i]}"><span class="l">${q.answers.length === 2 ? (i ? '🪑' : '🧑') : L[i]}</span><span>${esc(a)}</span></div>`).join('')}</div>`;
    }
    return `${head}${q.revealImg ? `<img class="pimg" src="quiz/${esc(q.revealImg)}">` : ''}${detail}
      <div class="note">${v.me.rank}° posto · ${v.me.score} punti</div>`;
  }

  /* ---------- obstacles on my screen during the answers ---------- */
  function applyEffects() {
    const qc = $('qc'); if (!qc || v.stage !== 'answering') return;
    const list = (v.me.effects || []);
    if (fx.key !== v.stepIndex) {
      fx.key = v.stepIndex; fx.shown = false;
      fx.ice = list.some(e => e.power === 'GHIACCIO' && !e.blocked) ? 6 : 0;
      const slime = list.filter(e => e.power === 'MELMA' && !e.blocked).length;
      fx.blobs = slime ? [...Array(3 + 2 * slime).keys()].map(i => ({ id: i, x: 5 + Math.random() * 65, y: 30 + Math.random() * 55, r: Math.random() * 40 - 20 })) : [];
      fx.boxesUntil = list.some(e => e.power === 'SCATOLE' && !e.blocked) ? performance.now() + 4000 : 0;
    }
    if (v.me.answer != null) return;
    const names = list.filter(e => !e.self).map(e => {
      const f = v.standings.find(s => s.id === e.from);
      return (e.blocked ? '🛡 ' : '') + (v.powers[e.power] ? v.powers[e.power].label : e.power) + ' da ' + (f ? f.name : '?');
    });
    if (names.length) qc.insertAdjacentHTML('beforeend', `<div class="fxmsg ${list.every(e => e.blocked || e.self) ? 'good' : ''}">${esc(names.join(' · '))}</div>`);
    if (!fx.shown && names.length) { fx.shown = true; vib([80, 40, 80]); }
    if (fx.blobs.length) fx.blobs.forEach(b => qc.insertAdjacentHTML('beforeend',
      `<div class="blob" data-blob="${b.id}" style="left:${b.x}%;top:${b.y}%;transform:rotate(${b.r}deg)">MELMA<br>tocca!</div>`));
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
    if (fx.ice > 0) qc.insertAdjacentHTML('beforeend', `<div class="fx fx-ice" id="ice"><div>❄ GHIACCIO ❄</div><div class="cr">Tocca ${fx.ice} volte per romperlo!</div>
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
    bar.style.width = v.total ? Math.max(0, 100 * (endAt - performance.now()) / v.total) + '%' : '0%';
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
