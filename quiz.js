'use strict';
/*
 * IKEA QUIZ – regia della serata (stile "Sapere è Potere").
 *
 * Sequenza: benvenuto → gara 1 → PARTE 1 → gara 2 → PARTE 2 → gara 3 → PARTE 3 → gara 4 → PARTE 4
 *           → GARA FINALE (punti ×2) → classifica finale.
 * Ogni domanda: [poteri 15 s, dalla 2ª domanda della parte] → lettura + PRONTO → risposte (definitive) → soluzione.
 *
 * Tutto lo stato vive sul server (e viene salvato su disco), quindi chi chiude il telefono o la pagina
 * rientra esattamente dov'era, con punti, risposta già data e potere già scelto.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const DATA = require('./quiz-data');

const SAVE_FILE = process.env.QUIZ_SAVE || path.join(os.tmpdir(), 'ikea-quiz-state.json');
const RACE_POINTS = 800;                 // 1° in gara = +800 … ultimo = 0 (gara finale ×2)
const AVATAR_ITEMS = ['lampada', 'brugola', 'polpette', 'FRAKTA_BAG', 'HOTDOG', 'SWEDISH_FLAG', 'bear', 'icecream', 'box', 'cart', 'pianta', 'sedia'];

function createQuiz(ctx) {
  const { game, io, hooks } = ctx;
  const now = () => Date.now();
  const FAST = Number(process.env.QUIZ_FAST) || 1;          // test only: QUIZ_FAST=10 runs the timers 10× faster
  const rnd = (a, b) => (a + Math.random() * (b - a)) / FAST;
  if (FAST !== 1) for (const k in DATA.TIMES) DATA.TIMES[k] = Math.round(DATA.TIMES[k] / FAST);

  /* ---------- the evening's script ---------- */
  const steps = [{ t: 'welcome' }];
  DATA.PARTS.forEach((part, pi) => {
    const race = DATA.RACES.findIndex(r => r.before === part.n);
    if (race >= 0) steps.push({ t: 'race', race });
    steps.push({ t: 'part', p: pi });
    part.questions.forEach((_, qi) => steps.push({ t: 'q', p: pi, q: qi }));
    steps.push({ t: 'standings', p: pi });
  });
  DATA.RACES.forEach((r, i) => { if (r.before == null) steps.push({ t: 'race', race: i }); });
  steps.push({ t: 'final' });

  const flow = {
    started: false, step: -1, stage: 'lobby', deadline: 0, stageAt: 0,
    cur: null,                 // per-question state
    lastRace: null,            // results of the last race (with points)
    log: []                    // per-question summary for the final screen
  };
  let timer = null;
  const players = () => [...game.players.values()];
  const humans = () => players().filter(p => !p.bot);
  // who we wait for: everyone, also whoever just closed the phone (they can come back and still answer
  // until the timer ends); after 60 s offline we stop waiting for them so the game doesn't stall
  const active = () => players().filter(p => p.bot || p.connected || now() - (p.offlineAt || 0) < 60000);

  // quiz fields on every player (kept across races and reconnects)
  function ensure(p) {
    if (p.score == null) p.score = 0;
    if (!p.avatar) p.avatar = AVATAR_ITEMS[Math.floor(Math.random() * AVATAR_ITEMS.length)];
    if (!p.history) p.history = [];
  }

  const stepObj = () => steps[flow.step] || null;
  const qData = () => { const s = stepObj(); return s && s.t === 'q' ? DATA.PARTS[s.p].questions[s.q] : null; };

  /* ---------- persistence ---------- */
  let saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const data = {
        at: now(), code: game.code,
        flow: { started: flow.started, step: flow.step, stage: flow.stage, lastRace: flow.lastRace, log: flow.log,
          cur: flow.cur && { ...flow.cur, ready: [...flow.cur.ready] } },
        players: players().map(p => ({ id: p.id, name: p.name, color: p.color, bot: p.bot, avatar: p.avatar, score: p.score, history: p.history }))
      };
      try { fs.writeFileSync(SAVE_FILE, JSON.stringify(data)); } catch (e) { /* ignore */ }
    }, 200);
  }
  function restore(newPlayerFn) {
    try {
      const d = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
      if (!d || now() - d.at > 8 * 3600 * 1000 || !d.flow.started) return false;
      game.code = d.code;
      for (const s of d.players) {
        const p = newPlayerFn({ id: s.id, name: s.name, color: s.color, bot: s.bot });
        Object.assign(p, { avatar: s.avatar, score: s.score, history: s.history || [], connected: !!s.bot });
        game.players.set(p.id, p);
      }
      Object.assign(flow, { started: true, step: d.flow.step, lastRace: d.flow.lastRace, log: d.flow.log || [] });
      const st = stepObj();
      if (st && st.t === 'q') {
        flow.cur = d.flow.cur ? { ...d.flow.cur, ready: new Set(d.flow.cur.ready) } : null;
        // resume the question from the reading phase (answers already given are kept)
        if (flow.cur && d.flow.stage === 'reveal') setStage('reveal');
        else if (flow.cur) setStage('reading', DATA.TIMES.reading);
        else enterStep();
      } else if (st && st.t === 'race') { flow.stage = 'raceWait'; }       // host presses AVANTI to restart that race
      else enterStep();
      console.log(`  Partita ripristinata: passo ${flow.step + 1}/${steps.length}`);
      return true;
    } catch (e) { return false; }
  }

  /* ---------- stage machine ---------- */
  function setStage(stage, ms) {
    clearTimeout(timer);
    flow.stage = stage; flow.stageAt = now();
    flow.deadline = ms ? now() + ms : 0;
    if (ms) timer = setTimeout(() => onTimeout(stage), ms + 150);
    if (stage === 'answering') flow.cur.answersAt = now();
    botsAct(stage);
    broadcast(); save();
  }

  function enterStep() {
    const s = stepObj();
    if (!s) return;
    flow.cur = null;
    if (s.t === 'welcome') return setStage('welcome');
    if (s.t === 'part') return setStage('partIntro');
    if (s.t === 'standings') return setStage('standings');
    if (s.t === 'final') { flow.stage = 'final'; broadcast(); save(); return; }
    if (s.t === 'race') return startRaceStep(s);
    if (s.t === 'q') {
      const q = qData();
      flow.cur = { ready: new Set(), answers: {}, powers: {}, effects: {}, answersAt: 0,
        shuffle: q.type === 'order' ? shuffled(q.items.length) : null };
      const powersOn = s.q > 0;                         // powers start from the 2nd question of each part
      if (powersOn) return setStage('powers', DATA.TIMES.powers);
      return setStage('reading', DATA.TIMES.reading);
    }
  }

  function next() {
    if (flow.step >= steps.length - 1) return;
    flow.step++;
    enterStep();
  }

  function onTimeout(stage) {
    if (flow.stage !== stage) return;
    if (stage === 'powers') return endPowers();
    if (stage === 'reading') return setStage('answering', answerTime());
    if (stage === 'answering') return reveal();
  }
  const answerTime = () => (qData() && qData().type === 'order' ? DATA.TIMES.order : DATA.TIMES.answer);

  // host "AVANTI": go on, or skip the current wait
  function advance() {
    if (!flow.started) return start();
    switch (flow.stage) {
      case 'powers': return endPowers();
      case 'reading': return setStage('answering', answerTime());
      case 'answering': return reveal();
      case 'race': return;                                      // the race ends on its own (or ANNULLA)
      case 'raceWait': return startRaceStep(stepObj());
      case 'final': return;
      default: return next();
    }
  }

  function start() {
    if (flow.started) return;
    players().forEach(ensure);
    flow.started = true; flow.step = 0;
    enterStep();
  }
  function reset() {
    clearTimeout(timer);
    Object.assign(flow, { started: false, step: -1, stage: 'lobby', deadline: 0, cur: null, lastRace: null, log: [] });
    for (const p of players()) { p.score = 0; p.history = []; }
    try { fs.unlinkSync(SAVE_FILE); } catch (e) { /* ignore */ }
    broadcast();
  }

  /* ---------- races ---------- */
  function startRaceStep(s) {
    const r = DATA.RACES[s.race];
    flow.raceIndex = s.race;
    if (game.phase !== 'lobby') ctx.backToLobby();
    const err = ctx.startRace(r.trackId);
    if (err) {                                    // e.g. only 1 player: skip the race
      flow.stage = 'raceSkipped'; flow.lastRace = { skipped: true, final: !!r.final, error: err };
      broadcast(); save(); return;
    }
    flow.stage = 'race'; flow.deadline = 0; broadcast(); save();
  }
  // grid for every race: best quiz score starts in pole position
  hooks.getStartingGrid = (list) => list.slice().sort((a, b) => (b.score || 0) - (a.score || 0) || Math.random() - 0.5);
  hooks.decorateResults = (results) => {
    const r = DATA.RACES[flow.raceIndex] || {}, n = results.length, mul = r.final ? 2 : 1;
    for (const x of results) {
      const pts = n > 1 ? Math.round(RACE_POINTS * (n - x.rank) / (n - 1) / 10) * 10 * mul : 0;
      const p = game.players.get(x.playerId);
      x.pts = pts;
      if (p) { ensure(p); p.score += pts; p.history.push({ race: flow.raceIndex, rank: x.rank, pts }); x.score = p.score; }
    }
    flow.lastRace = { final: !!r.final, results };
    flow.stage = 'raceResults'; save();
  };
  hooks.onContinue = () => { if (flow.started && (flow.stage === 'raceResults' || flow.stage === 'race')) next(); };
  hooks.applyWinnerBonus = () => {};                // race points already given by decorateResults

  /* ---------- powers ---------- */
  function choosePower(p, power, target) {
    if (flow.stage !== 'powers' || !flow.cur || flow.cur.powers[p.id]) return;
    const def = DATA.POWERS[power];
    if (power !== 'SKIP' && !def) return;
    if (def && def.kind === 'obstacle') {
      const t = game.players.get(target);
      if (!t || t === p) return;
      flow.cur.powers[p.id] = { power, target };
    } else flow.cur.powers[p.id] = { power };
    broadcast(); save();
    if (active().every(x => flow.cur.powers[x.id])) endPowers();
  }
  function endPowers() {
    if (flow.stage !== 'powers') return;
    // resolve: obstacles land on their target unless it chose SCUDO
    const eff = {};
    for (const [from, c] of Object.entries(flow.cur.powers)) {
      const def = DATA.POWERS[c.power]; if (!def) continue;
      if (def.kind === 'bonus') (eff[from] = eff[from] || []).push({ power: c.power, from, self: true });
    }
    for (const [from, c] of Object.entries(flow.cur.powers)) {
      const def = DATA.POWERS[c.power]; if (!def || def.kind !== 'obstacle') continue;
      const shield = (eff[c.target] || []).some(e => e.power === 'SCUDO');
      (eff[c.target] = eff[c.target] || []).push({ power: c.power, from, blocked: shield });
    }
    flow.cur.effects = eff;
    setStage('reading', DATA.TIMES.reading);
  }

  /* ---------- reading + answering ---------- */
  function setReady(p) {
    if (flow.stage !== 'reading' || !flow.cur) return;
    flow.cur.ready.add(p.id); broadcast(); save();
    if (active().every(x => flow.cur.ready.has(x.id))) setStage('answering', answerTime());
  }
  function answer(p, a) {
    if (flow.stage !== 'answering' || !flow.cur || flow.cur.answers[p.id]) return;    // definitive: no second answer
    const q = qData(), t = now() - flow.cur.answersAt;
    if (q.type === 'choice') {
      const i = Number(a); if (!(i >= 0 && i < q.answers.length)) return;
      flow.cur.answers[p.id] = { a: i, t };
    } else {
      // order: array of item indices (original = chronological) in the player's chosen order
      if (!Array.isArray(a) || a.length !== q.items.length) return;
      const ok = a.map(Number); if (new Set(ok).size !== q.items.length || ok.some(x => !(x >= 0 && x < q.items.length))) return;
      flow.cur.answers[p.id] = { a: ok, t };
    }
    broadcast(); save();
    if (active().every(x => flow.cur.answers[x.id])) reveal();
  }
  function scoreFor(q, ans, effects) {
    if (!ans) return { pts: 0, correct: false };
    const T = q.type === 'order' ? DATA.TIMES.order : DATA.TIMES.answer;
    const speed = Math.max(0, Math.min(1, ans.t / T));
    const dbl = (effects || []).some(e => e.power === 'DOPPIO') ? 2 : 1;
    if (q.type === 'choice') {
      const correct = ans.a === q.correct;
      return { pts: correct ? Math.round((1000 - 500 * speed) / 10) * 10 * dbl : 0, correct };
    }
    const right = ans.a.filter((v, i) => v === i).length;
    const pts = Math.round((1000 - 500 * speed) * right / q.items.length / 10) * 10 * dbl;
    return { pts, correct: right === q.items.length, right };
  }
  function reveal() {
    if (flow.stage !== 'answering' && flow.stage !== 'reading') return;
    const q = qData(), s = stepObj(), res = {};
    for (const p of players()) {
      ensure(p);
      const r = scoreFor(q, flow.cur.answers[p.id], flow.cur.effects[p.id]);
      p.score += r.pts; res[p.id] = r;
      p.history.push({ part: s.p, q: s.q, pts: r.pts, correct: r.correct });
    }
    flow.cur.results = res;
    flow.log.push({ p: s.p, q: s.q, correct: Object.values(res).filter(r => r.correct).length });
    setStage('reveal');
  }

  /* ---------- demo bots ---------- */
  function botsAct(stage) {
    const bots = players().filter(p => p.bot);
    if (!bots.length || !flow.cur) return;
    const stamp = flow.stageAt;
    const later = (ms, fn) => setTimeout(() => { if (flow.stageAt === stamp && flow.stage === stage) fn(); }, ms);
    for (const b of bots) {
      if (stage === 'powers') later(rnd(1500, 7000), () => {
        const keys = Object.keys(DATA.POWERS), k = Math.random() < 0.25 ? 'SKIP' : keys[Math.floor(Math.random() * keys.length)];
        const others = players().filter(p => p !== b);
        choosePower(b, k, others.length ? others[Math.floor(Math.random() * others.length)].id : null);
        if (!flow.cur.powers[b.id]) choosePower(b, 'SKIP');
      });
      if (stage === 'reading') later(rnd(1500, 5000), () => setReady(b));
      if (stage === 'answering') later(rnd(1800, 11000), () => {
        const q = qData();
        if (q.type === 'choice') answer(b, Math.random() < 0.55 ? q.correct : Math.floor(Math.random() * q.answers.length));
        else { const a = q.items.map((_, i) => i); for (let i = 0; i < 2; i++) { const x = Math.floor(Math.random() * a.length), y = Math.floor(Math.random() * a.length); [a[x], a[y]] = [a[y], a[x]]; } answer(b, a); }
      });
    }
  }

  /* ---------- views (what each screen needs, rebuilt from server state at any time) ---------- */
  function shuffled(n) { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function standings() {
    return players().slice().sort((a, b) => (b.score || 0) - (a.score || 0)).map((p, i) => ({
      id: p.id, name: p.name, color: p.color, avatar: p.avatar, score: p.score || 0, rank: i + 1, bot: p.bot, connected: p.connected
    }));
  }
  function base() {
    const s = stepObj(), q = qData();
    const v = {
      started: flow.started, stage: flow.stage, stepIndex: flow.step, steps: steps.length,
      deadline: flow.deadline ? flow.deadline - now() : 0, total: flow.deadline ? flow.deadline - flow.stageAt : 0,
      code: game.code, powers: DATA.POWERS, avatars: AVATAR_ITEMS, standings: standings(),
      plan: steps.map(x => x.t === 'race' ? { t: 'race', track: DATA.RACES[x.race].trackId, final: !!DATA.RACES[x.race].final }
                                         : x.t === 'part' ? { t: 'part', n: DATA.PARTS[x.p].n, title: DATA.PARTS[x.p].title } : { t: x.t })
    };
    if (s && (s.t === 'part' || s.t === 'q' || s.t === 'standings')) {
      const part = DATA.PARTS[s.p];
      v.part = { n: part.n, title: part.title, subtitle: part.subtitle, rules: part.rules, count: part.questions.length };
    }
    if (s && s.t === 'race') {
      const r = DATA.RACES[s.race];
      v.race = { track: r.trackId, final: !!r.final, number: s.race + 1, of: DATA.RACES.length };
    }
    if (flow.lastRace && (flow.stage === 'raceResults' || flow.stage === 'raceSkipped')) v.lastRace = flow.lastRace;
    if (q) {
      const showQ = flow.stage !== 'powers';
      v.question = {
        index: s.q + 1, type: q.type, powersOn: s.q > 0,
        q: showQ ? q.q : null, word: showQ ? q.word || null : null, img: showQ ? q.img || null : null, hint: q.hint || null
      };
      if (flow.stage === 'answering' || flow.stage === 'reveal') {
        if (q.type === 'choice') v.question.answers = q.answers;
        else v.question.items = flow.cur.shuffle.map(i => ({ id: i, img: q.items[i].img }));
      }
      if (flow.stage === 'reveal') {
        v.question.correct = q.type === 'choice' ? q.correct : q.items.map((it, i) => ({ id: i, img: it.img, label: it.label }));
        v.question.revealImg = q.revealImg || q.img || null;
      }
      v.counts = {
        players: active().length,
        ready: flow.cur.ready.size, answered: Object.keys(flow.cur.answers).length, powers: Object.keys(flow.cur.powers).length
      };
    }
    return v;
  }
  function hostView() {
    const v = base();
    if (flow.cur) {
      const q = qData();
      v.who = players().map(p => ({
        id: p.id, ready: flow.cur.ready.has(p.id), answered: !!flow.cur.answers[p.id], power: !!flow.cur.powers[p.id]
      }));
      if (flow.stage === 'reveal') {
        v.results = players().map(p => ({ id: p.id, ...flow.cur.results[p.id], a: flow.cur.answers[p.id] ? flow.cur.answers[p.id].a : null }));
        if (q.type === 'choice') v.tally = q.answers.map((_, i) => Object.values(flow.cur.answers).filter(x => x.a === i).length);
      }
      if (flow.stage !== 'powers') {
        v.attacks = [];
        for (const [to, list] of Object.entries(flow.cur.effects || {})) for (const e of list) v.attacks.push({ to, ...e });
      }
    }
    return v;
  }
  function playerView(p) {
    ensure(p);
    const v = base();
    const st = v.standings.find(x => x.id === p.id);
    v.me = { id: p.id, name: p.name, color: p.color, avatar: p.avatar, score: p.score, rank: st ? st.rank : 0 };
    if (flow.cur) {
      v.me.ready = flow.cur.ready.has(p.id);
      v.me.answer = flow.cur.answers[p.id] ? flow.cur.answers[p.id].a : null;
      v.me.power = flow.cur.powers[p.id] || null;
      if (flow.stage === 'answering' || flow.stage === 'reveal') v.me.effects = flow.cur.effects[p.id] || [];
      if (flow.stage === 'reveal') v.me.result = flow.cur.results[p.id];
    }
    return v;
  }
  function broadcast() {
    io.to('host').emit('quiz', hostView());
    for (const p of players()) if (p.socketId && p.connected) io.to(p.socketId).emit('quiz', playerView(p));
  }
  const sendTo = (s, p) => s.emit('quiz', p ? playerView(p) : hostView());

  /* ---------- sockets ---------- */
  function attach(s, me, isHost) {
    s.on('quiz_hello', () => { const p = me(); if (isHost()) sendTo(s); else if (p) sendTo(s, p); });
    s.on('quiz_next', () => { if (isHost()) advance(); });
    s.on('quiz_reset', () => { if (isHost()) { if (game.phase !== 'lobby') ctx.backToLobby(); reset(); ctx.broadcastLobby(); } });
    s.on('quiz_avatar', (d = {}) => { const p = me(); if (p && AVATAR_ITEMS.includes(d.avatar)) { p.avatar = d.avatar; ctx.broadcastLobby(); broadcast(); save(); } });
    s.on('quiz_ready', () => { const p = me(); if (p) setReady(p); });
    s.on('quiz_answer', (d = {}) => { const p = me(); if (p) answer(p, d.a); });
    s.on('quiz_power', (d = {}) => { const p = me(); if (p) choosePower(p, String(d.power || ''), d.target); });
  }

  // anyone leaving or coming back changes who we wait for
  function onPresence() {
    if (!flow.cur) return broadcast();
    if (flow.stage === 'powers' && active().every(x => flow.cur.powers[x.id])) return endPowers();
    if (flow.stage === 'reading' && active().length && active().every(x => flow.cur.ready.has(x.id))) return setStage('answering', answerTime());
    if (flow.stage === 'answering' && active().length && active().every(x => flow.cur.answers[x.id])) return reveal();
    broadcast();
  }

  return { attach, start, advance, reset, restore, ensure, broadcast, onPresence, save, flow, AVATAR_ITEMS, sendTo, playerView };
}

module.exports = { createQuiz };
