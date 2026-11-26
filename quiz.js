'use strict';
/*
 * IKEA QUIZ – regia della serata (stile "Sapere è Potere").
 *
 * Sequenza: benvenuto → gara 1 → PARTE 1 → gara 2 → PARTE 2 → gara 3 → PARTE 3 → gara 4 → PARTE 4
 *           → GARA FINALE (punti ×2) → classifica finale.
 * Ogni domanda: [poteri 30 s, dalla 2ª domanda della parte] → lettura + PRONTO → risposte (definitive) → soluzione.
 *
 * Tutto lo stato vive sul server (e viene salvato su disco), quindi chi chiude il telefono o la pagina
 * rientra esattamente dov'era, con punti, risposta già data e potere già scelto.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const DATA = require('./quiz-data');

const SAVE_FILE = process.env.QUIZ_SAVE || path.join(os.tmpdir(), 'ikea-quiz-state.json');
/* Points scale with the number of players (N): the best gets N × 10, then 10 less each place.
 * Quiz: fastest right answer N×10, second (N−1)×10 … wrong or no answer 0.
 * Race: 1st N×10 … last 10 (final race ×2). Fastest lap: +10 and a bonus power at the next part's 1st question. */
const STEP = 10;
const FASTEST_LAP_BONUS = 10;
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
    if (!p.powerUses) p.powerUses = {};
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
        flow: { started: flow.started, step: flow.step, stage: flow.stage, lastRace: flow.lastRace, log: flow.log, finalShown: flow.finalShown, bonus: flow.bonus,
          cur: flow.cur && { ...flow.cur, ready: [...flow.cur.ready] } },
        players: players().map(p => ({ id: p.id, name: p.name, color: p.color, bot: p.bot, avatar: p.avatar, score: p.score, history: p.history, powerUses: p.powerUses, noPowerNext: !!p.noPowerNext })),
        raceMods: flow.raceMods, tb: flow.tb || {}, special: flow.special || null, gridBy: flow.gridBy || null, gridOrder: flow.gridOrder || null,
        finalOverride: flow.finalOverride || null, extraDone: flow.extra && flow.extra.phase === 'over' ? flow.extra : null
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
        Object.assign(p, { avatar: s.avatar, score: s.score, history: s.history || [], powerUses: s.powerUses || {}, noPowerNext: !!s.noPowerNext, connected: !!s.bot });
        game.players.set(p.id, p);
      }
      flow.raceMods = d.raceMods || null;
      flow.tb = d.tb || {};
      flow.special = d.special || planSpecials();
      flow.gridBy = d.gridBy || null; flow.gridOrder = d.gridOrder || null;
      flow.finalOverride = d.finalOverride || null; flow.extra = d.extraDone || null;    // an unfinished gran finale starts again from the vote
      Object.assign(flow, { started: true, step: d.flow.step, lastRace: d.flow.lastRace, log: d.flow.log || [], bonus: d.flow.bonus || null });
      const st = stepObj();
      if (st && st.t === 'q') {
        flow.cur = d.flow.cur ? { ...d.flow.cur, ready: new Set(d.flow.cur.ready) } : null;
        // resume the question from the reading phase (answers already given are kept)
        if (flow.cur && d.flow.stage === 'reveal') setStage('reveal');
        else if (flow.cur) setStage('reading', DATA.TIMES.reading);
        else enterStep();
      } else if (st && st.t === 'race') { flow.stage = 'raceWait'; }       // host presses AVANTI to restart that race
      else if (st && st.t === 'final') { flow.stage = 'final'; flow.finalShown = players().length; flow.tiebreak = null; }
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
    if (s.t === 'standings') {
      // a bot that won "Decidi la griglia" shuffles it
      const owner = flow.gridBy && flow.gridBy.p === s.p && game.players.get(flow.gridBy.id);
      if (owner && owner.bot) flow.gridOrder = { p: s.p, order: players().map(p => p.id).sort(() => Math.random() - 0.5) };
      return setStage('standings');
    }
    if (s.t === 'final') { flow.stage = 'final'; flow.finalShown = 0; broadcast(); save(); finalReveal(2500); return; }
    if (s.t === 'race') return startRaceStep(s);
    if (s.t === 'q') {
      const q = qData();
      flow.cur = { ready: new Set(), answers: {}, powers: {}, effects: {}, answersAt: 0,
        shuffle: q.type === 'order' ? shuffled(q.items.length) : null,
        // answers in random order (in the PowerPoint the right one was always first); PERSONA/MOBILE stays fixed
        perm: q.type === 'choice' ? (q.answers.length > 2 ? shuffled(q.answers.length) : q.answers.map((_, i) => i)) : null };
      // powers from the 2nd question of each part; at the 1st only for whoever made the fastest lap
      const bonus = s.q === 0 && flow.bonus && flow.bonus.p === s.p && game.players.has(flow.bonus.id);
      flow.cur.powerOnly = bonus ? [flow.bonus.id] : null;
      if (s.q > 0 || bonus) { makeOffers(q); return setStage('powers', DATA.TIMES.powers); }
      return setStage('reading', DATA.TIMES.reading);
    }
  }

  // final ranking: from the last to the first, slower and slower for the podium
  function finalReveal(delay) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const n = players().length;
      if (flow.stage !== 'final' || flow.finalShown >= n) return;
      flow.finalShown++; broadcast(); save();
      const nextRank = n - flow.finalShown;           // rank revealed next
      if (nextRank >= 1) finalReveal(nextRank > 3 ? 1800 : nextRank === 3 ? 3000 : nextRank === 2 ? 3500 : 5000);
      else if (extraEligible()) { clearTimeout(timer); timer = setTimeout(() => { if (flow.stage === 'final') openVote(); }, 7000 / FAST); }
    }, delay / FAST);
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
    if (stage === 'extraVote') return closeVote();
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
      case 'final':                                             // AVANTI = show all, then the vote for the last lap
        clearTimeout(timer);
        if ((flow.finalShown || 0) >= players().length && extraEligible()) return openVote();
        flow.finalShown = players().length; broadcast(); save();
        if (extraEligible()) timer = setTimeout(() => { if (flow.stage === 'final') openVote(); }, 7000 / FAST);
        return;
      case 'extraVote': return closeVote();
      case 'wheel': return wheelAdvance();
      default: return next();
    }
  }

  function start() {
    if (flow.started) return;
    players().forEach(ensure);
    flow.special = planSpecials();
    flow.gridBy = null; flow.gridOrder = null;
    flow.started = true; flow.step = 0;
    enterStep();
  }
  function reset() {
    clearTimeout(timer);
    Object.assign(flow, { started: false, step: -1, stage: 'lobby', deadline: 0, cur: null, lastRace: null, log: [], bonus: null, racePts: null, tb: {}, tiebreak: null, tbDone: null, extra: null, finalOverride: null });
    for (const p of players()) { p.score = 0; p.history = []; p.powerUses = {}; p.noPowerNext = false; }
    flow.special = null; flow.gridBy = null; flow.gridOrder = null;
    flow.raceMods = null;
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
  // "Decidi la griglia": the order chosen on the phone at the end of the part (pole / last bought still win)
  function gridNow() {
    const def = players().slice().sort((a, b) => (b.score || 0) - (a.score || 0)).map(p => p.id);
    const ord = flow.gridOrder ? flow.gridOrder.order.filter(id => game.players.has(id)) : [];
    let ids = ord.concat(def.filter(id => !ord.includes(id)));
    const mods = flow.raceMods || { first: [], last: [] };
    const first = mods.first.filter(id => ids.includes(id)), last = mods.last.filter(id => ids.includes(id) && !first.includes(id));
    ids = first.concat(ids.filter(id => !first.includes(id) && !last.includes(id)), last);
    return ids.map(id => { const p = game.players.get(id); return { id, name: p.name, color: p.color, avatar: p.avatar, lock: first.includes(id) ? 'pole' : last.includes(id) ? 'ultimo' : null }; });
  }
  const gridActive = () => { const s = stepObj(); return !!(flow.gridBy && s && s.t === 'standings' && flow.gridBy.p === s.p && flow.stage === 'standings'); };
  function setGrid(p, order) {
    if (!gridActive() || flow.gridBy.id !== p.id || !Array.isArray(order)) return;
    flow.gridOrder = { p: flow.gridBy.p, order: order.map(String).filter(id => game.players.has(id)) };
    broadcast(); save();
  }
  hooks.getStartingGrid = (list) => {
    // gran finale: the grid is the final ranking, the winner in pole
    if (flow.extra && flow.extra.phase === 'race') { const ord = finalOrder().map(p => p.id); return list.slice().sort((a, b) => ord.indexOf(a.id) - ord.indexOf(b.id)); }
    let grid = list.slice().sort((a, b) => (b.score || 0) - (a.score || 0) || Math.random() - 0.5);
    if (flow.gridOrder && !flow.tiebreak && flow.started) {
      const ord = flow.gridOrder.order;
      grid = ord.map(id => grid.find(p => p.id === id)).filter(Boolean).concat(grid.filter(p => !ord.includes(p.id)));
      flow.gridOrder = null;                                   // for the next race only
    }
    const mods = flow.raceMods || { first: [], last: [] };
    const take = id => { const i = grid.findIndex(p => p.id === id); return i >= 0 ? grid.splice(i, 1)[0] : null; };
    const first = mods.first.map(take).filter(Boolean), last = mods.last.filter(id => !mods.first.includes(id)).map(take).filter(Boolean);
    flow.raceMods = { first: [], last: [] };                 // bought for one race only
    return [...first, ...grid, ...last];
  };
  hooks.decorateResults = (results) => {
    if (flow.tiebreak) return tiebreakResults(results);
    if (flow.extra && flow.extra.phase === 'race') return extraResults(results);
    const r = DATA.RACES[flow.raceIndex] || {}, n = results.length, mul = r.final ? 2 : 1;
    flow.racePts = {};
    // fastest single lap of the race
    let fast = null;
    for (const x of results) for (const t of x.lapTimes || []) if (!fast || t < fast.time) fast = { id: x.playerId, name: x.name, time: t };
    for (const x of results) {
      const pts = (n - x.rank + 1) * STEP * mul + (fast && fast.id === x.playerId ? FASTEST_LAP_BONUS : 0);
      const p = game.players.get(x.playerId);
      flow.racePts = flow.racePts || {}; flow.racePts[x.playerId] = pts;     // private: only the player sees it
      if (p) { ensure(p); p.score += pts; p.history.push({ race: flow.raceIndex, rank: x.rank, pts }); }
    }
    flow.lastRace = { final: !!r.final, fastest: fast, results: results.map(x => ({ playerId: x.playerId, rank: x.rank, name: x.name })) };
    // the fastest lap earns a power at the first question of the part that follows this race
    flow.bonus = fast && r.before ? { id: fast.id, name: fast.name, p: r.before - 1 } : null;
    flow.stage = 'raceResults'; save();
  };
  hooks.onContinue = () => {
    if (!flow.started || (flow.stage !== 'raceResults' && flow.stage !== 'race')) return;
    if (flow.tiebreak) return endTiebreak();
    if (flow.extra && (flow.extra.phase === 'race' || flow.extra.phase === 'results')) return openWheel();
    next();
  };
  hooks.applyWinnerBonus = () => {};                // race points already given by decorateResults

  /* ---------- tie-break ----------
   * Same points at the end → the host can start an extra race (the A→B track) between the tied players only.
   * Nobody gains points: the order of arrival decides who goes ahead in the final ranking. */
  const TIEBREAK_TRACK = 'spareggio';
  function finalOrder() {
    const tb = flow.tb || {};
    const byScore = players().slice().sort((a, b) => ((b.score || 0) - (a.score || 0)) || ((tb[b.id] || 0) - (tb[a.id] || 0)));
    if (!flow.finalOverride) return byScore;
    // the wheel changed the ranking: that order wins over the points
    const ord = flow.finalOverride.filter(id => game.players.has(id));
    return ord.map(id => game.players.get(id)).concat(byScore.filter(p => !ord.includes(p.id)));
  }
  const sameSpot = (a, b) => !flow.finalOverride && (a.score || 0) === (b.score || 0) && ((flow.tb || {})[a.id] || 0) === ((flow.tb || {})[b.id] || 0);
  // groups of players still tied, best position first
  function ties() {
    const list = finalOrder(), out = [];
    for (let i = 0; i < list.length; i++) {
      let j = i;
      while (j + 1 < list.length && sameSpot(list[i], list[j + 1])) j++;
      if (j > i) out.push({ rank: i + 1, ids: list.slice(i, j + 1).map(p => p.id), names: list.slice(i, j + 1).map(p => p.name), score: list[i].score || 0 });
      i = j;
    }
    return out;
  }
  function startTiebreak() {
    if (flow.stage !== 'final' || (flow.finalShown || 0) < players().length) return;
    const t = ties()[0];
    if (!t) return;
    clearTimeout(timer);
    if (game.phase !== 'lobby') ctx.backToLobby();
    flow.tiebreak = { ids: t.ids, names: t.names, rank: t.rank };
    const err = ctx.startRace(TIEBREAK_TRACK, t.ids);
    if (err) { flow.tiebreak = null; broadcast(); return; }
    flow.stage = 'race'; flow.deadline = 0; broadcast(); save();
  }
  function tiebreakResults(results) {
    const tb = flow.tb = flow.tb || {}, n = results.length;
    const base = Math.max(0, ...results.map(x => tb[x.playerId] || 0)) * 100;   // they were tied, so they all had the same value
    for (const x of results) tb[x.playerId] = base + (n - x.rank + 1);
    flow.racePts = null;
    flow.lastRace = { tiebreak: true, results: results.map(x => ({ playerId: x.playerId, rank: x.rank, name: x.name })) };
    flow.tiebreak.winner = results[0] && results[0].name;
    flow.stage = 'raceResults'; save();
  }
  function endTiebreak() {
    const last = flow.tiebreak;
    if (game.phase !== 'lobby') ctx.backToLobby();
    flow.tiebreak = null;
    flow.tbDone = last && last.winner ? { winner: last.winner, names: last.names, rank: last.rank } : null;
    flow.stage = 'final'; flow.finalShown = players().length;
    broadcast(); save();
  }

  /* ---------- gran finale: vote → last lap on track 6 → the winner spins the wheel ----------
   * Only when the ranking has a clear winner without a tie-break. The last lap gives no points:
   * its winner spins the wheel, and the wheel may change the final ranking (see DATA.WHEEL). */
  const X = DATA.EXTRA;
  const after = (ms, fn) => setTimeout(fn, ms);                 // ms already scaled (rnd) or divided by FAST
  const extraEligible = () => flow.stage === 'final' && !flow.extra && !flow.tbDone && !ties().length && players().length >= 2;
  function openVote() {
    if (!extraEligible()) return;
    clearTimeout(timer);
    flow.extra = { phase: 'vote', votes: {} };
    setStage('extraVote', X.voteMs / FAST);
    for (const b of active().filter(p => p.bot)) after(rnd(1500, 6000), () => vote(b, Math.random() < 0.7));
  }
  function vote(p, yes) {
    if (flow.stage !== 'extraVote' || !flow.extra) return;
    flow.extra.votes[p.id] = !!yes;
    if (active().every(x => flow.extra.votes[x.id] != null)) return closeVote();
    broadcast(); save();
  }
  const voteCount = () => { const v = Object.values((flow.extra && flow.extra.votes) || {}); return { yes: v.filter(Boolean).length, no: v.filter(x => !x).length }; };
  function closeVote() {
    if (flow.stage !== 'extraVote') return;
    clearTimeout(timer);
    const c = voteCount();
    // half or more of those who voted say yes → we race
    if (c.yes > 0 && c.yes * 2 >= c.yes + c.no) {
      if (game.phase !== 'lobby') ctx.backToLobby();
      flow.extra.phase = 'race'; flow.extra.vote = c;
      const err = ctx.startRace(X.track);
      if (err) return endExtra('Non si può fare l\'ultimo giro: ' + err);
      flow.stage = 'race'; flow.deadline = 0; broadcast(); save();
      return;
    }
    endExtra(`Niente ultimo giro (${c.yes} sì, ${c.no} no): la classifica resta questa.`, c);
  }
  function extraResults(results) {
    const w = results[0];
    flow.racePts = null;
    flow.lastRace = { extra: true, results: results.map(x => ({ playerId: x.playerId, rank: x.rank, name: x.name })) };
    flow.extra.phase = 'results';
    flow.extra.winner = w ? { id: w.playerId, name: w.name } : null;
    flow.stage = 'raceResults'; save();
  }
  function openWheel() {
    if (game.phase !== 'lobby') ctx.backToLobby();
    if (!flow.extra || !flow.extra.winner || !game.players.has(flow.extra.winner.id)) return endExtra('Ultimo giro senza vincitore: la classifica resta questa.');
    flow.extra.phase = 'ready';
    flow.stage = 'wheel'; flow.deadline = 0;
    broadcast(); save();
    const w = game.players.get(flow.extra.winner.id);
    if (w.bot) after(2500 / FAST, () => spin(w));
  }
  function spin(p) {
    const e = flow.extra;
    if (flow.stage !== 'wheel' || !e || e.phase !== 'ready' || (p && p.id !== e.winner.id)) return;
    // the chance of a slice is its width (thin slices are rarer)
    const ws = DATA.WHEEL.map(k => (DATA.WHEEL_W && DATA.WHEEL_W[k]) || 1);
    let r = Math.random() * ws.reduce((a, b) => a + b, 0), i = 0;
    for (; i < ws.length - 1; i++) { r -= ws[i]; if (r < 0) break; }
    e.seg = i; e.kind = DATA.WHEEL[i]; e.spins = (e.spins || 0) + 1;
    e.phase = 'spinning'; e.spinUntil = now() + X.spinMs / FAST;
    broadcast(); save();
    clearTimeout(timer);
    timer = setTimeout(applyWheel, X.spinMs / FAST + 400);
  }
  function applyWheel() {
    const e = flow.extra;
    if (flow.stage !== 'wheel' || !e || e.phase !== 'spinning') return;
    const order = finalOrder().map(p => p.id), me = e.winner.id, i = order.indexOf(me);
    e.before = order.slice();
    if (e.kind === 'GIRA') {                                          // spin again
      e.phase = 'ready'; e.again = true; e.note = null;
      broadcast(); save();
      const w = game.players.get(me);
      if (w && w.bot) after(2500 / FAST, () => spin(w));
      return;
    }
    e.again = false;
    if (e.kind === 'RICKROLL') {
      e.note = `${e.winner.name} viene rick rollato! La classifica resta com'è.`;
      e.phase = 'done'; broadcast(); save(); return;
    }
    if (e.kind === 'SCAMBIO') {
      if (i > 0) { [order[i - 1], order[i]] = [order[i], order[i - 1]]; e.note = `${e.winner.name} scambia posto con ${game.players.get(order[i]).name}: ora è ${i}°.`; }
      else e.note = `${e.winner.name} è già primo: non c'è nessuno sopra con cui scambiare.`;
      flow.finalOverride = order; e.phase = 'done';
    } else if (e.kind === 'SPOSTA3' || e.kind === 'DECIDI') {
      e.order = order.slice(); e.phase = 'edit';
      e.moves = e.kind === 'SPOSTA3' ? X.moves : null;
      const w = game.players.get(me);
      if (w && w.bot) after(3000 / FAST, () => { const o = e.order.slice(); const k = o.indexOf(me); if (k > 0) { o.splice(k, 1); o.splice(Math.max(0, k - (e.moves || 99)), 0, me); } setWheelOrder(w, o); confirmWheel(w); });
    } else {
      e.note = e.kind === 'CIOCCOLATINO' ? `${e.winner.name} ha vinto un cioccolatino! La classifica resta com'è.` : 'Non succede niente: la classifica resta com\'è.';
      e.phase = 'done';
    }
    broadcast(); save();
  }
  // moves = how many swaps of two neighbours turn one order into the other
  function swapsBetween(a, b) {
    const pos = new Map(b.map((id, i) => [id, i])), arr = a.map(id => pos.get(id));
    let n = 0; for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) if (arr[i] > arr[j]) n++;
    return n;
  }
  function setWheelOrder(p, order) {
    const e = flow.extra;
    if (flow.stage !== 'wheel' || !e || e.phase !== 'edit' || !p || p.id !== e.winner.id || !Array.isArray(order)) return;
    const ids = order.map(String).filter(id => e.before.includes(id));
    if (ids.length !== e.before.length || new Set(ids).size !== ids.length) return;
    if (e.moves != null && swapsBetween(e.before, ids) > e.moves) return;      // Sposta 3: at most 3 moves
    e.order = ids; broadcast(); save();
  }
  function confirmWheel(p) {
    const e = flow.extra;
    if (flow.stage !== 'wheel' || !e || e.phase !== 'edit' || (p && p.id !== e.winner.id)) return;
    flow.finalOverride = e.order.slice();
    const changed = e.before.filter((id, i) => e.order[i] !== id).length;
    e.note = changed ? `${e.winner.name} ha cambiato la classifica finale.` : `${e.winner.name} ha lasciato la classifica com'era.`;
    e.phase = 'done'; broadcast(); save();
  }
  // AVANTI during the wheel: spin for the winner, confirm the edit, then back to the final ranking
  function wheelAdvance() {
    const e = flow.extra; if (!e) return;
    if (e.phase === 'ready') return spin(null);
    if (e.phase === 'spinning') return applyWheel();
    if (e.phase === 'edit') return confirmWheel(null);
    if (e.phase === 'done') return endExtra(e.note);
  }
  function endExtra(note, vote) {
    clearTimeout(timer);
    if (game.phase !== 'lobby') ctx.backToLobby();
    const e = flow.extra || {};
    flow.extra = { phase: 'over', note: note || e.note || '', kind: e.kind || null, winner: e.winner || null, vote: vote || e.vote || null };
    flow.stage = 'final'; flow.finalShown = players().length; flow.deadline = 0;
    broadcast(); save();
  }
  const wheelSlices = () => DATA.WHEEL.map(k => ({ k, label: DATA.WHEEL_KINDS[k].label, w: (DATA.WHEEL_W && DATA.WHEEL_W[k]) || 1 }));
  function wheelView(forId) {
    const e = flow.extra; if (!e) return null;
    const pub = id => { const p = game.players.get(id); return p ? { id, name: p.name, color: p.color, avatar: p.avatar } : null; };
    const w = { phase: e.phase, winner: e.winner, slices: wheelSlices(),
      kinds: DATA.WHEEL_KINDS, note: e.note || null, spins: e.spins || 0, again: !!e.again };
    if (e.phase === 'spinning' || e.phase === 'edit' || e.phase === 'done') { w.seg = e.seg; w.kind = e.kind; }
    if (e.phase === 'spinning') { w.spinMs = X.spinMs / FAST; w.spinLeft = Math.max(0, e.spinUntil - now()); }
    if (e.phase === 'edit') { w.order = e.order.map(pub).filter(Boolean); w.before = e.before; w.moves = e.moves; w.used = e.moves != null ? swapsBetween(e.before, e.order) : null; }
    if (forId) w.mine = !!(e.winner && e.winner.id === forId);
    return w;
  }

  /* ---------- powers ---------- */
  // every player gets POWER_OFFER random powers to choose from (not always the same list)
  /* Special powers are not drawn at random: the quiz decides in advance at which questions they appear,
   * and each time it gives them to one person only.
   * RICKROLL: once in every part.  VIAGIUSTA: RARE_MIN…RARE_MAX times in the whole quiz (only multiple-choice questions). */
  function planSpecials() {
    const plan = {}, add = (key, k) => { (plan[key] = plan[key] || []).push(k); };
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const slots = [];
    DATA.PARTS.forEach((part, pi) => {
      const qs = part.questions.map((q, qi) => ({ q, qi })).filter(x => x.qi > 0);          // powers start at the 2nd question
      if (qs.length) add(pi + ':' + pick(qs).qi, 'RICKROLL');
      for (const x of qs) if (x.q.type === 'choice') slots.push(pi + ':' + x.qi);
    });
    const n = DATA.RARE_MIN + Math.floor(Math.random() * (DATA.RARE_MAX - DATA.RARE_MIN + 1));
    for (let i = 0; i < n && slots.length; i++) add(slots.splice(Math.floor(Math.random() * slots.length), 1)[0], 'VIAGIUSTA');
    return plan;
  }
  const FUN = ['GNAM', 'SCATOLE', 'POLPETTE'];   // at least one of these in every offer
  function makeOffers(q) {
    const s = stepObj(), part = DATA.PARTS[s.p];
    const ranked = players().slice().sort((a, b) => (b.score || 0) - (a.score || 0)), n = Math.max(1, ranked.length - 1);
    flow.cur.offers = {}; flow.cur.penalty = {}; flow.cur.special = {};
    const gridTaken = flow.gridBy && flow.gridBy.p === s.p;
    for (const p of players()) {
      ensure(p);
      // penitenza: last time the rick roll came out for you and you didn't use it → no powers this turn
      if (flow.cur.powerOnly && !flow.cur.powerOnly.includes(p.id)) { flow.cur.offers[p.id] = []; continue; }   // bonus question: only the fastest lap
      if (p.noPowerNext) { p.noPowerNext = false; flow.cur.penalty[p.id] = true; flow.cur.offers[p.id] = []; continue; }
      const f = ranked.indexOf(p) / n;                    // 0 = leader … 1 = last
      const pool = Object.entries(DATA.POWERS).filter(([k, d]) =>
        !d.special &&
        !(d.parts && !d.parts.includes(part.n)) &&
        !(k === 'GRIGLIA' && gridTaken) &&
        !(d.maxUses && (p.powerUses[k] || 0) >= d.maxUses) &&
        !(d.cost && (p.score || 0) < d.cost) &&
        !(d.needsChoices && !(q.type === 'choice' && q.answers.length >= d.needsChoices)) &&
        !(d.weightLow && f === 0)
      ).map(([k, d]) => [k, d.weightLow ? 0.3 + 2 * f : (d.weight || 1)]);
      const funPool = pool.filter(([k]) => FUN.includes(k));   // Sback, Scatoloni, Polpette that can come out now
      const pick = [];
      while (pick.length < DATA.POWER_OFFER && pool.length) {
        let r = Math.random() * pool.reduce((a, x) => a + x[1], 0), i = 0;
        for (; i < pool.length - 1; i++) { r -= pool[i][1]; if (r < 0) break; }
        pick.push(pool.splice(i, 1)[0][0]);
      }
      // always at least one of Sback / Scatoloni / Polpette among the three
      if (funPool.length && !pick.some(k => FUN.includes(k))) {
        const k = funPool[Math.floor(Math.random() * funPool.length)][0];
        if (pick.length >= DATA.POWER_OFFER) pick.splice(Math.floor(Math.random() * pick.length), 1, k); else pick.push(k);
      }
      flow.cur.offers[p.id] = pick;
    }
    // this question's specials: each one to a different person, in place of one of their three
    const specials = (flow.special && flow.special[s.p + ':' + s.q]) || [];
    const taken = new Set();
    for (const k of specials) {
      const d = DATA.POWERS[k];
      if (d.needsChoices && !(q.type === 'choice' && q.answers.length >= d.needsChoices)) continue;
      const who = active().filter(p => !flow.cur.penalty[p.id] && !taken.has(p.id) && canPower(p));
      if (!who.length) continue;
      const p = who[Math.floor(Math.random() * who.length)];
      taken.add(p.id); flow.cur.special[p.id] = k;
      const list = flow.cur.offers[p.id];
      // the special takes the place of one of the others, never of the only Sback / Scatoloni / Polpette
      const funIdx = list.map((x, i) => FUN.includes(x) ? i : -1).filter(i => i >= 0);
      const free = list.map((x, i) => i).filter(i => !(funIdx.length === 1 && funIdx[0] === i));
      const at = free.length ? free[Math.floor(Math.random() * free.length)] : Math.floor(Math.random() * Math.max(1, list.length));
      list.splice(at, list.length >= DATA.POWER_OFFER ? 1 : 0, k);
    }
  }
  const canPower = p => !flow.cur || !flow.cur.powerOnly || flow.cur.powerOnly.includes(p.id);
  // who we wait for in the powers phase (not whoever is serving the penitenza)
  const powerers = () => active().filter(p => canPower(p) && !(flow.cur && flow.cur.penalty && flow.cur.penalty[p.id]));
  function choosePower(p, power, target) {
    if (flow.stage !== 'powers' || !flow.cur || flow.cur.powers[p.id] || !canPower(p)) return;
    const def = DATA.POWERS[power];
    if (power !== 'SKIP' && (!def || !(flow.cur.offers && (flow.cur.offers[p.id] || []).includes(power)))) return;
    if (def && def.cost && (p.score || 0) < def.cost) return;
    if (power === 'GRIGLIA' && flow.gridBy && flow.gridBy.p === stepObj().p) return;      // one per part: someone was faster
    if (def && def.kind === 'obstacle') {
      const t = game.players.get(target);
      if (!t || t === p) return;
      flow.cur.powers[p.id] = { power, target };
    } else flow.cur.powers[p.id] = { power };
    if (def) {
      if (def.cost) p.score -= def.cost;                       // paid right away
      p.powerUses[power] = (p.powerUses[power] || 0) + 1;
    }
    if (power === 'GRIGLIA') flow.gridBy = { id: p.id, name: p.name, p: stepObj().p };
    broadcast(); save();
    if (powerers().every(x => flow.cur.powers[x.id])) endPowers();
  }
  function endPowers() {
    if (flow.stage !== 'powers') return;
    // the rick roll came out for you and you didn't use it: no powers next turn
    for (const [pid, k] of Object.entries(flow.cur.special || {})) {
      const c = flow.cur.powers[pid], p = game.players.get(pid);
      if (k === 'RICKROLL' && p && !(c && c.power === 'RICKROLL')) p.noPowerNext = true;
    }
    // resolve: obstacles land on their target unless it chose SCUDO
    const eff = {};
    for (const [from, c] of Object.entries(flow.cur.powers)) {
      const def = DATA.POWERS[c.power]; if (!def) continue;
      if (def.kind === 'bonus') (eff[from] = eff[from] || []).push({ power: c.power, from, self: true });
    }
    for (const [from, c] of Object.entries(flow.cur.powers)) {
      const def = DATA.POWERS[c.power]; if (!def || def.kind !== 'obstacle') continue;
      const shield = (eff[c.target] || []).some(e => e.power === 'SCUDO');
      // the same obstacle more than once adds up: every extra copy counts +0.5 on the phone (see quiz-data)
      (eff[c.target] = eff[c.target] || []).push({ power: c.power, from, blocked: shield });
    }
    flow.cur.effects = eff;
    // effects that need a decision now
    const q = qData();
    flow.cur.removed = {};
    flow.raceMods = flow.raceMods || { first: [], last: [] };
    for (const [pid, list] of Object.entries(eff)) for (const e of list) {
      if (e.blocked) continue;
      if (e.power === 'TOGLI' && q.type === 'choice') {
        const wrong = flow.cur.perm.map((orig, i) => (orig === q.correct ? -1 : i)).filter(i => i >= 0);
        (flow.cur.removed[pid] = flow.cur.removed[pid] || []).push({ i: wrong[Math.floor(Math.random() * wrong.length)], why: 'togli' });
      }
      if (e.power === 'VIAGIUSTA' && q.type === 'choice') {
        const right = flow.cur.perm.indexOf(q.correct), list = (flow.cur.removed[pid] = flow.cur.removed[pid] || []);
        const t = list.find(x => x.i === right);
        if (t) { t.why = 'via'; t.from = e.from; } else list.push({ i: right, why: 'via', from: e.from });
      }
      if (e.power === 'POLE' && !flow.raceMods.first.includes(pid)) flow.raceMods.first.push(pid);
      if (e.power === 'ULTIMO' && !flow.raceMods.last.includes(pid)) flow.raceMods.last.push(pid);
    }
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
      if ((flow.cur.removed && flow.cur.removed[p.id] || []).some(x => x.i === i)) return;      // that answer is gone from your phone
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
  function judge(q, ans, perm) {
    if (!ans) return { correct: false, right: 0 };
    if (q.type === 'choice') { const ok = (perm ? perm[ans.a] : ans.a) === q.correct; return { correct: ok, right: ok ? 1 : 0 }; }
    const right = ans.a.filter((v, i) => v === i).length;
    return { correct: right === q.items.length, right };
  }
  function reveal() {
    if (flow.stage !== 'answering' && flow.stage !== 'reading') return;
    const q = qData(), s = stepObj(), res = {}, N = players().length;
    // who is right (and for the logos question: how many in the right place)
    for (const p of players()) res[p.id] = judge(q, flow.cur.answers[p.id], flow.cur.perm);
    // points by speed order among the right answers: N×10, (N−1)×10, … ; wrong = 0
    const scorers = players().filter(p => res[p.id].right > 0)
      .sort((a, b) => res[b.id].right - res[a.id].right || flow.cur.answers[a.id].t - flow.cur.answers[b.id].t);
    scorers.forEach((p, k) => {
      const r = res[p.id], share = q.type === 'order' ? r.right / q.items.length : 1;
      const dbl = (flow.cur.effects[p.id] || []).some(e => e.power === 'DOPPIO') ? 2 : 1;
      const half = q.type === 'choice' && q.answers.length === 2 ? 0.5 : 1;     // persona/mobile: half points (N/2)
      r.pts = Math.round((N - k) * STEP * share * half) * dbl; r.order = k + 1;
    });
    for (const p of players()) res[p.id].pts = res[p.id].pts || 0;
    const live = (pid, power) => (flow.cur.effects[pid] || []).filter(e => e.power === power && !e.blocked);
    // RUBA: the target's points of this question go to whoever stole them (split if several)
    for (const p of players()) {
      const thieves = live(p.id, 'RUBA').map(e => e.from).filter(id => res[id]);
      if (!thieves.length || !res[p.id].pts) { if (thieves.length) res[p.id].robbedBy = thieves; continue; }
      const loot = res[p.id].pts, share = Math.floor(loot / thieves.length);
      res[p.id].pts = 0; res[p.id].robbedBy = thieves; res[p.id].lost = loot;
      for (const t of thieves) { res[t].pts += share; res[t].stolen = (res[t].stolen || 0) + share; }
    }
    for (const p of players()) {
      ensure(p);
      const r = res[p.id];
      p.score += r.pts;
      p.history.push({ part: s.p, q: s.q, pts: r.pts, correct: r.correct });
    }
    // SCAMBIO: after the question, the two totals are swapped
    for (const p of players()) for (const e of live(p.id, 'SCAMBIO')) {
      const a = game.players.get(e.from); if (!a) continue;
      [a.score, p.score] = [p.score, a.score];
      res[a.id].swapped = p.id; res[p.id].swappedBy = a.id;
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
      if (stage === 'powers' && canPower(b)) later(rnd(1500, 7000), () => {
        const keys = (flow.cur.offers && flow.cur.offers[b.id]) || [], k = Math.random() < 0.25 || !keys.length ? 'SKIP' : keys[Math.floor(Math.random() * keys.length)];
        const others = players().filter(p => p !== b);
        choosePower(b, k, others.length ? others[Math.floor(Math.random() * others.length)].id : null);
        if (!flow.cur.powers[b.id]) choosePower(b, 'SKIP');
      });
      if (stage === 'reading') later(rnd(1500, 5000), () => setReady(b));
      if (stage === 'answering') later(rnd(1800, 11000), () => {
        const q = qData();
        if (q.type === 'choice') {
          const gone = (flow.cur.removed && flow.cur.removed[b.id] || []).map(x => x.i), ok = q.answers.map((_, i) => i).filter(i => !gone.includes(i));
          const c = shownCorrect(q);
          answer(b, Math.random() < 0.55 && ok.includes(c) ? c : ok[Math.floor(Math.random() * ok.length)]);
        }
        else { const a = q.items.map((_, i) => i); for (let i = 0; i < 2; i++) { const x = Math.floor(Math.random() * a.length), y = Math.floor(Math.random() * a.length); [a[x], a[y]] = [a[y], a[x]]; } answer(b, a); }
      });
    }
  }

  /* ---------- views (what each screen needs, rebuilt from server state at any time) ---------- */
  function shuffled(n) { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const shownAnswers = q => (flow.cur && flow.cur.perm ? flow.cur.perm.map(i => q.answers[i]) : q.answers);
  const shownCorrect = q => (flow.cur && flow.cur.perm ? flow.cur.perm.indexOf(q.correct) : q.correct);

  /* ---------- who may see the scores ----------
   * During the quiz nobody sees the others' points (only their own on their phone).
   * The ranking appears only after parts 1, 2 and 3, and at the very end (revealed from last to first). */
  function boardVisible() {
    const s = stepObj();
    return flow.stage === 'standings' && s && DATA.PARTS[s.p].n <= 3;
  }
  function standings() {
    const pub = p => ({ id: p.id, name: p.name, color: p.color, avatar: p.avatar, bot: p.bot, connected: p.connected });
    if (flow.stage === 'final' || flow.tiebreak || flow.stage === 'extraVote' || flow.stage === 'wheel' || (flow.extra && flow.extra.phase !== 'over')) {
      const sorted = finalOrder(), n = sorted.length;
      let rank = 0;
      return sorted.map((p, i) => {
        const tie = (i > 0 && sameSpot(p, sorted[i - 1])) || (i < n - 1 && sameSpot(p, sorted[i + 1]));
        if (!(i > 0 && sameSpot(p, sorted[i - 1]))) rank = i + 1;          // tied players share the rank
        return (i + 1 > n - (flow.finalShown || 0)) ? { ...pub(p), score: p.score || 0, rank, pos: i + 1, tie } : { ...pub(p), hidden: true, rank, pos: i + 1 };
      }).map(x => x.hidden ? { id: 'h' + x.pos, name: '?', color: '#BDBDBD', avatar: null, hidden: true, rank: x.pos, pos: x.pos } : x);
    }
    if (boardVisible()) {
      return players().slice().sort((a, b) => (b.score || 0) - (a.score || 0)).map((p, i) => ({ ...pub(p), score: p.score || 0, rank: i + 1 }));
    }
    return players().map(pub);             // join order, no points, no ranking
  }
  function base() {
    const s = stepObj(), q = qData();
    const v = {
      started: flow.started, stage: flow.stage, stepIndex: flow.step, steps: steps.length,
      deadline: flow.deadline ? flow.deadline - now() : 0, total: flow.deadline ? flow.deadline - flow.stageAt : 0,
      code: game.code, powers: DATA.POWERS, rickrollMs: DATA.RICKROLL_MS, avatars: AVATAR_ITEMS, standings: standings(), boardVisible: boardVisible(),
      final: flow.stage === 'final' ? { shown: flow.finalShown || 0, total: players().length,
        ties: (flow.finalShown || 0) >= players().length ? ties() : [], tbDone: flow.tbDone || null } : null,
      tiebreak: flow.tiebreak ? { ids: flow.tiebreak.ids, names: flow.tiebreak.names, rank: flow.tiebreak.rank, track: TIEBREAK_TRACK } : null,
      extra: flow.extra ? { phase: flow.extra.phase, note: flow.extra.note || null, winner: flow.extra.winner || null, vote: flow.stage === 'extraVote' ? voteCount() : flow.extra.vote || null,
        voters: flow.stage === 'extraVote' ? active().length : null, track: X.track } : null,
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
    if (flow.tiebreak) v.race = { track: TIEBREAK_TRACK, tiebreak: true };
    if (flow.extra && (flow.extra.phase === 'race' || flow.extra.phase === 'results')) v.race = { track: X.track, extra: true };
    if (flow.stage === 'wheel') v.wheel = wheelView();
    if (flow.stage === 'extraVote') v.wheel = { phase: 'preview', slices: wheelSlices(), kinds: DATA.WHEEL_KINDS };
    if (gridActive()) v.grid = { by: flow.gridBy.name, byId: flow.gridBy.id, order: gridNow(), set: !!flow.gridOrder };
    if (q) {
      const showQ = flow.stage !== 'powers';
      v.question = {
        index: s.q + 1, type: q.type, powersOn: s.q > 0 || !!flow.cur.powerOnly,
        q: showQ ? q.q : null, word: showQ ? q.word || null : null, img: showQ ? q.img || null : null, hint: q.hint || null
      };
      if (flow.stage === 'answering' || flow.stage === 'reveal') {
        if (q.type === 'choice') v.question.answers = shownAnswers(q);
        else v.question.items = flow.cur.shuffle.map(i => ({ id: i, img: q.items[i].img }));
      }
      if (flow.stage === 'reveal') {
        v.question.correct = q.type === 'choice' ? shownCorrect(q) : q.items.map((it, i) => ({ id: i, img: it.img, label: it.label }));
        v.question.revealImg = q.revealImg || q.img || null;
      }
      v.powerOnly = flow.cur.powerOnly ? flow.cur.powerOnly.map(id => (game.players.get(id) || {}).name) : null;
      v.counts = {
        players: flow.stage === 'powers' ? powerers().length : active().length,
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
        // the TV is public: who answered what and who got it right, but never the points
        v.results = players().map(p => { const r = flow.cur.results[p.id] || {}; return { id: p.id, correct: !!r.correct, right: r.right, a: flow.cur.answers[p.id] ? flow.cur.answers[p.id].a : null, robbedBy: r.robbedBy || null, swapped: r.swapped || null }; });
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
    v.me = { id: p.id, name: p.name, color: p.color, avatar: p.avatar, score: p.score, rank: st && st.rank && !st.hidden ? st.rank : null, tie: !!(st && st.tie) };
    if (flow.stage === 'raceResults' && flow.racePts) v.me.racePts = flow.racePts[p.id];
    if (flow.stage === 'extraVote' && flow.extra) v.me.vote = flow.extra.votes[p.id] != null ? flow.extra.votes[p.id] : null;
    if (flow.stage === 'wheel') v.wheel = wheelView(p.id);
    if (flow.cur) {
      v.me.ready = flow.cur.ready.has(p.id);
      v.me.answer = flow.cur.answers[p.id] ? flow.cur.answers[p.id].a : null;
      v.me.power = flow.cur.powers[p.id] || null;
      v.me.canPower = canPower(p);
      v.me.offers = flow.cur.offers ? flow.cur.offers[p.id] || [] : [];
      if (flow.cur.removed && flow.cur.removed[p.id] && flow.stage === 'answering')
        v.me.removed = flow.cur.removed[p.id].map(x => ({ i: x.i, why: x.why, from: x.from ? (game.players.get(x.from) || {}).name : null }));
      v.me.penalty = !!(flow.cur.penalty && flow.cur.penalty[p.id]);
      v.me.special = (flow.cur.special && flow.cur.special[p.id]) || null;
      // Sbircia la classifica: the current ranking, only for this player
      if ((flow.cur.effects[p.id] || []).some(e => e.power === 'CLASSIFICA') && flow.stage !== 'powers')
        v.me.peek = players().slice().sort((a, b) => (b.score || 0) - (a.score || 0)).map((x, i) => ({ name: x.name, score: x.score || 0, rank: i + 1, me: x.id === p.id }));
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
    s.on('quiz_tiebreak', () => { if (isHost()) startTiebreak(); });
    s.on('quiz_grid', (d = {}) => { const p = me(); if (p) setGrid(p, d.order); });
    s.on('quiz_vote', (d = {}) => { const p = me(); if (p) vote(p, !!d.yes); });
    s.on('quiz_spin', () => { const p = me(); if (p) spin(p); });
    s.on('quiz_wheel_order', (d = {}) => { const p = me(); if (p) setWheelOrder(p, d.order); });
    s.on('quiz_wheel_done', () => { const p = me(); if (p) confirmWheel(p); });
    s.on('quiz_extra_skip', () => { if (isHost() && flow.stage === 'final' && extraEligible()) { flow.extra = null; endExtra('Niente ultimo giro: la classifica resta questa.'); } });
    s.on('quiz_reset', () => { if (isHost()) { if (game.phase !== 'lobby') ctx.backToLobby(); reset(); ctx.broadcastLobby(); } });
    s.on('quiz_avatar', (d = {}) => { const p = me(); if (p && AVATAR_ITEMS.includes(d.avatar)) { p.avatar = d.avatar; ctx.broadcastLobby(); broadcast(); save(); } });
    s.on('quiz_ready', () => { const p = me(); if (p) setReady(p); });
    s.on('quiz_answer', (d = {}) => { const p = me(); if (p) answer(p, d.a); });
    s.on('quiz_power', (d = {}) => { const p = me(); if (p) choosePower(p, String(d.power || ''), d.target); });
  }

  // anyone leaving or coming back changes who we wait for
  function onPresence() {
    if (flow.stage === 'extraVote' && flow.extra && active().length && active().every(x => flow.extra.votes[x.id] != null)) return closeVote();
    if (!flow.cur) return broadcast();
    if (flow.stage === 'powers' && powerers().every(x => flow.cur.powers[x.id])) return endPowers();
    if (flow.stage === 'reading' && active().length && active().every(x => flow.cur.ready.has(x.id))) return setStage('answering', answerTime());
    if (flow.stage === 'answering' && active().length && active().every(x => flow.cur.answers[x.id])) return reveal();
    broadcast();
  }

  return { attach, start, advance, reset, restore, ensure, broadcast, onPresence, save, flow, AVATAR_ITEMS, sendTo, playerView, endTiebreak, endExtra };
}

module.exports = { createQuiz };
