/* IKEA RACE · shared track data + geometry
 * Used by the server (require) and by the browser (window.IKEA_TRACKS). */
(function (root) {
  'use strict';
  const WORLD = { w: 3600, h: 2250 };

  // Power-ups: weight = spawn probability in % (sum = 100, gold = 5%)
  const ITEMS = {
    KOTTBULLAR_1:    { label: 'KÖTTBULLAR',       weight: 21 },
    KOTTBULLAR_GOLD: { label: 'KÖTTBULLAR ORO',   weight: 5 },
    PILLOW_GREEN:    { label: 'CUSCINO VERDE',    weight: 15 },
    PILLOW_RED:      { label: 'CUSCINO ROSSO',    weight: 9 },
    PILLOW_BLUE:     { label: 'CUSCINO BLU',      weight: 5 },   // always hits the leader; never given to whoever is 1st
    MASH_POTATO:     { label: 'PURÈ',             weight: 12 },
    HOTDOG:          { label: 'HOT DOG',          weight: 4 },
    CART:            { label: 'CARRELLO RAZZO',   weight: 6 },
    FRAKTA_BAG:      { label: 'BORSA FRAKTA',     weight: 8 },
    SWEDISH_FLAG:    { label: 'BANDIERA SVEDESE', weight: 5 },
    DAJLIEN_BOX:     { label: 'SCATOLA DAJLIEN',  weight: 10 }
  };

  const EVENTS = {
    forklift: 'MULETTO IN TRANSITO!',
    shelf:    'CROLLA UNO SCAFFALE!',
    cart:     'CARRELLO IMPAZZITO!',
    icecream: 'GELATO IN VOLO! CATCH!',
    blackout: 'BLACKOUT!',
    cleaning: 'PULIZIE IN CORSO'
  };

  /* Track definitions — the route runs through the store like the real IKEA path.
   * pts: closed centerline [x, y, width?] in layout units (× SCALE = world units); first point = start/finish.
   * width: road width in world units (wide, Mario-Kart style). Edges are solid walls (shelves, partitions).
   * zones: fraction ranges of the lap; wall = style of the walls/furniture in 3D; deco = furniture set.
   * rows: where the item-box rows sit (fraction of the lap). */
  const SCALE = 2.25;
  // off-road shoulder (carpet) on both sides: you can leave the road a few metres, slower, then hit the wall
  const SHOULDER = 70;
  // height of a bridge deck (world units); cars on different levels never touch each other
  const BRIDGE_H = 82;
  const DEFS = [
    {
      id: 'showroom', name: 'SHOWROOM', desc: 'Tra soggiorni, cucine e camere · curve strette',
      width: 170, radius: 60, grip: 9, speed: 1, finish: 'START', signature: 'shelf',
      events: ['shelf', 'blackout', 'cart', 'cleaning'],
      rows: [.1, .3, .5, .68, .86],
      pts: [[150,700],[150,480],[260,370],[400,420],[420,600],[560,700],[700,600],[680,350],[560,210],
            [700,100],[900,150],[1000,320],[900,480],[1050,620],[1250,560],[1300,350],[1200,190],[1400,110],
            [1510,300],[1480,600],[1400,860],[1100,910],[700,880],[400,920],[150,890]],
      zones: [
        { a: 0,   b: .26, name: 'SOGGIORNI',       tint: '#DCE6F0', wall: 'room', color: '#FFFFFF', deco: ['sofa', 'rug', 'lamp', 'shelf'] },
        { a: .26, b: .5,  name: 'CUCINE',          tint: '#F0E6D2', wall: 'room', color: '#F4EBDD', deco: ['kitchen', 'table', 'plant'] },
        { a: .5,  b: .76, name: 'CAMERE DA LETTO', tint: '#E7E0F0', wall: 'room', color: '#ECE6F3', deco: ['bed', 'wardrobe', 'lamp', 'rug'] },
        { a: .76, b: 1,   name: 'ILLUMINAZIONE',   tint: '#F3EDCB', wall: 'room', color: '#FFF8DC', deco: ['lamp', 'lamp', 'shelf', 'plant'] }
      ]
    },
    {
      id: 'magazzino', name: 'MAGAZZINO SELF-SERVICE', desc: 'Corsie del magazzino · rettilinei veloci',
      width: 186, radius: 90, grip: 9, speed: 1, finish: 'START', signature: 'forklift',
      events: ['forklift', 'cart', 'shelf', 'cleaning'],
      rows: [.08, .27, .45, .63, .82],
      pts: [[150,600],[150,150],[1450,150],[1450,450],[1100,450,121],[560,450,121],[420,550],[560,650,121],
            [1000,650,121],[1450,650],[1450,860],[150,860]],
      zones: [
        { a: 0,   b: .3,  name: 'CORSIA 07',      tint: '#E2DCCF', wall: 'rack', color: '#0058A3', deco: ['pallet', 'box'] },
        { a: .3,  b: .5,  name: 'SCAFFALI ALTI',  tint: '#E6DDC8', wall: 'rack', color: '#F28C00', deco: ['pallet', 'cart'] },
        { a: .5,  b: .72, name: 'CORSIA 23',      tint: '#DDDDE4', wall: 'rack', color: '#0058A3', deco: ['box', 'pallet'] },
        { a: .72, b: 1,   name: 'RITIRO MERCI',   tint: '#D9E6DC', wall: 'rack', color: '#F28C00', deco: ['cart', 'box'] }
      ]
    },
    {
      id: 'ristorante', name: 'RISTORANTE', laps: 3, desc: 'Pavimento scivoloso · slalom tra i tavoli',
      width: 172, radius: 80, grip: 2.8, speed: 0.86, finish: 'START', signature: 'icecream',
      events: ['icecream', 'cleaning', 'cart', 'blackout'],
      rows: [.08, .28, .48, .66, .86],
      pts: [[200,600],[200,250],[450,140],[740,250,288],[1160,250,288],[1420,360,237],[1420,740,237],
            [1150,860],[820,740],[500,860],[200,820]],
      obstacles: [
        { x: 820, y: 226, r: 22, kind: 'table' }, { x: 900, y: 274, r: 22, kind: 'table' },
        { x: 980, y: 226, r: 22, kind: 'table' }, { x: 1060, y: 274, r: 22, kind: 'table' },
        { x: 1398, y: 490, r: 20, kind: 'table' }, { x: 1442, y: 620, r: 20, kind: 'table' }
      ],
      zones: [
        { a: 0,   b: .2,  name: 'BUFFET',      tint: '#EFE3D0', wall: 'rail', color: '#5D4037', deco: ['counter', 'table'] },
        { a: .2,  b: .45, name: 'SALA TAVOLI', tint: '#DCE9EC', wall: 'rail', color: '#5D4037', deco: ['table', 'table', 'plant'] },
        { a: .45, b: .72, name: 'DOLCI',       tint: '#F2DCE4', wall: 'rail', color: '#C2185B', deco: ['icecream', 'table'] },
        { a: .72, b: 1,   name: 'CAFFÈ',       tint: '#E8DFD4', wall: 'rail', color: '#5D4037', deco: ['table', 'plant', 'counter'] }
      ]
    },
    {
      id: 'smaland', name: 'SMÅLAND', desc: 'Area bimbi · rampe, boost, ostacoli morbidi',
      width: 152, radius: 65, grip: 7, speed: 0.85, finish: 'START', signature: 'cart',
      events: ['cart', 'icecream', 'blackout', 'shelf'],
      rows: [.12, .3, .52, .7, .88],
      pts: [[150,560],[150,350],[320,180],[600,150],[720,400],[900,170],[1200,150],[1450,330],[1300,540],
            [1450,790],[1120,880],[900,660],[700,880],[400,860],[150,760]],
      pads: [
        { at: .06, off: 0, r: 30, type: 'boost' }, { at: .48, off: -26, r: 30, type: 'boost' },
        { at: .95, off: 24, r: 30, type: 'boost' }
      ],
      obstacles: [
        { at: .17, off: 38, r: 18, kind: 'soft' }, { at: .21, off: -40, r: 18, kind: 'soft' },
        { at: .44, off: 24, r: 18, kind: 'soft' }, { at: .46, off: -43, r: 18, kind: 'soft' },
        { at: .66, off: 40, r: 18, kind: 'soft' }, { at: .69, off: -24, r: 18, kind: 'soft' },
        { at: .76, off: -40, r: 18, kind: 'soft' }, { at: .78, off: 30, r: 18, kind: 'soft' }
      ],
      zones: [
        { a: 0,   b: .25, name: 'PISCINA PALLINE', tint: '#F8DDD5', wall: 'soft', color: '#E4002B', deco: ['balls', 'toy'] },
        { a: .25, b: .5,  name: 'SCIVOLI',         tint: '#D7ECDA', wall: 'soft', color: '#00A651', deco: ['toy', 'balls'] },
        { a: .5,  b: .75, name: 'ANGOLO PELUCHE',  tint: '#F3E4C8', wall: 'soft', color: '#FFB300', deco: ['bear', 'rug'] },
        { a: .75, b: 1,   name: 'TEATRINO',        tint: '#DEDBF2', wall: 'soft', color: '#7E57C2', deco: ['balls', 'bear'] }
      ]
    },
    {
      id: 'casse', name: 'CASSE', desc: 'Mercato e casse · bivio corto-stretto o lungo-largo',
      width: 167, radius: 70, grip: 8, speed: 0.8, finish: 'TACK!', signature: 'blackout',
      events: ['blackout', 'forklift', 'cleaning', 'icecream', 'cart'],
      rows: [.1, .28, .45, .66, .86],
      pts: [[150,620],[150,200],[600,150],[800,380],[1000,150],[1450,200],[1450,520,216],[1450,880,216],
            [900,880,216],[620,700],[350,880],[150,850]],
      branch: [[1450,540],[1150,620],[900,860]], branchWidth: 103,
      zones: [
        { a: 0,   b: .3,  name: 'MERCATO',      tint: '#D9EBD6', wall: 'room', color: '#FFFFFF', deco: ['plant', 'box', 'table'] },
        { a: .3,  b: .5,  name: 'SELF-SERVICE', tint: '#E6DDC8', wall: 'rack', color: '#0058A3', deco: ['pallet', 'cart'] },
        { a: .5,  b: .78, name: 'CASSE',        tint: '#DCE6F0', wall: 'counter', color: '#0058A3', deco: ['register', 'cart'] },
        { a: .78, b: 1,   name: 'BISTRO',       tint: '#F3EDCB', wall: 'rail', color: '#5D4037', deco: ['table', 'counter'] }
      ]
    },
    {
      // extra track for the tie-break: from A to B (not a loop), with bridges and a level crossing.
      // Not in the evening's plan: the host starts it only when the final ranking ends in a tie.
      id: 'spareggio', name: 'SPAREGGIO', extra: true, open: true, laps: 1, scale: 2.6, desc: 'Da A a B · due ponti e un incrocio',
      width: 166, radius: 70, grip: 8.5, speed: 0.7, start: 'PARTENZA', finish: 'ARRIVO', signature: 'forklift',
      events: ['forklift', 'cart', 'cleaning', 'blackout'],
      rows: [.07, .22, .5, .69, .8],
      // [x, y, width?, level] — level 1 = on a bridge (the 2D physics keeps the two levels apart)
      pts: [[110,900,0,0],[640,900,0,0],[860,720,0,0],[860,300,0,0],[700,120,0,0],[230,120,0,0],[110,250,0,0],[200,420,0,0],
            [420,420,0,0],[640,420,0,1],[1080,420,0,1],[1300,420,0,0],[1490,300,0,0],[1490,120,0,0],[1360,120,0,0],[1360,300,0,0],[1220,300,0,0],[1220,120,0,0],[1100,120,0,0],[1000,260,0,0],
            [1060,560,0,0],[1490,560,0,0],[1490,740,0,0],[1180,740,0,0],[1180,930,0,0],[1000,930,0,0],[760,790,0,1],[560,680,0,1],
            [400,680,0,0],[300,600,0,0],[300,420,0,0],[300,260,0,0],[640,260,0,0]],
      zones: [
        { a: 0,   b: .2,  name: 'PARCHEGGIO',   tint: '#DDE3E8', wall: 'counter', color: '#0058A3', deco: ['cart', 'box', 'pallet'] },
        { a: .2,  b: .42, name: 'SOPPALCO',     tint: '#E6DDC8', wall: 'room', color: '#FFFFFF', deco: ['sofa', 'lamp', 'shelf'] },
        { a: .42, b: .72, name: 'MAGAZZINO',    tint: '#E2DCCF', wall: 'counter', color: '#F28C00', deco: ['pallet', 'box', 'cart'] },
        { a: .72, b: 1,   name: 'USCITA',       tint: '#F3EDCB', wall: 'room', color: '#F4EBDD', deco: ['plant', 'table', 'counter'] }
      ]
    }
  ];

  /* ---------- geometry ---------- */
  const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

  // round every corner with a quadratic curve
  function fillet(raw, r, closed) {
    const n = raw.length, out = [];
    for (let i = 0; i < n; i++) {
      const P = raw[i];
      if (!closed && (i === 0 || i === n - 1)) { out.push(P); continue; }
      const A = raw[(i - 1 + n) % n], B = raw[(i + 1) % n];
      const la = dist(P.x, P.y, A.x, A.y), lb = dist(P.x, P.y, B.x, B.y);
      const ux = (A.x - P.x) / la, uy = (A.y - P.y) / la, vx = (B.x - P.x) / lb, vy = (B.y - P.y) / lb;
      if (ux * vx + uy * vy < -0.985) { out.push(P); continue; } // straight
      const k = Math.min(r, la * 0.48, lb * 0.48);
      const sx = P.x + ux * k, sy = P.y + uy * k, ex = P.x + vx * k, ey = P.y + vy * k;
      for (let j = 0; j <= 10; j++) {
        const t = j / 10, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
        out.push({ x: a * sx + b * P.x + c * ex, y: a * sy + b * P.y + c * ey, w: P.w, z: P.z });
      }
    }
    return out;
  }

  function densify(pts, closed, step) {
    const out = [], n = pts.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const a = pts[i], b = pts[(i + 1) % n], d = dist(a.x, a.y, b.x, b.y);
      if (d < 0.5) continue;
      const k = Math.max(1, Math.ceil(d / step));
      for (let j = 0; j < k; j++) {
        const t = j / k;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, z: (a.z || 0) + ((b.z || 0) - (a.z || 0)) * t });
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }

  function makePath(pts, closed) {
    const n = pts.length, m = closed ? n : n - 1, cum = [0];
    let L = 0;
    for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n]; L += dist(a.x, a.y, b.x, b.y); cum.push(L); }
    return { pts, cum, L, closed, n };
  }

  // nearest point on a path → { s (distance along), d (distance from center), hw (half width), ang }
  // q (optional): { z: level of the car → only the road on that level counts; s: where the car was → only that part of the road }
  function projectPath(path, x, y, q) {
    const { pts, cum, n, closed } = path, m = closed ? n : n - 1;
    let best = { d: 1e9, s: 0, hw: 0, ang: 0, px: x, py: y, i: 0, t: 0, side: 1, path };
    for (let i = 0; i < m; i++) {
      const a = pts[i], b = pts[(i + 1) % n], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
      if (!l2) continue;
      if (q) {
        if (q.z != null && Math.abs(((a.z || 0) + (b.z || 0)) / 2 - q.z) > 0.55) continue;
        if (q.s != null && Math.abs(cum[i] - q.s) > 700) continue;
      }
      let t = ((x - a.x) * dx + (y - a.y) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = a.x + dx * t, py = a.y + dy * t, d = Math.hypot(x - px, y - py);
      if (d < best.d) best = { d, s: cum[i] + t * Math.sqrt(l2), hw: (a.w + (b.w - a.w) * t) / 2, ang: Math.atan2(dy, dx), px, py, i, t,
        side: (dx * (y - a.y) - dy * (x - a.x)) >= 0 ? 1 : -1, path };
    }
    return best;
  }

  function pointAt(path, s) {
    const { pts, cum, n, L } = path;
    s = path.closed ? ((s % L) + L) % L : Math.max(0, Math.min(L, s));
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
    const a = pts[lo], b = pts[(lo + 1) % n], segL = (cum[lo + 1] - cum[lo]) || 1, t = (s - cum[lo]) / segL;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, z: (a.z || 0) + ((b.z || 0) - (a.z || 0)) * t, ang: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  function place(t, o) {
    if (o.at == null) return Object.assign({}, o);
    const p = pointAt(t.main, o.at * t.L), off = o.off || 0;
    return Object.assign({}, o, { x: p.x - Math.sin(p.ang) * off, y: p.y + Math.cos(p.ang) * off, ang: p.ang });
  }

  function build(def) {
    // a track can be drawn bigger than the others (scale): its store floor grows with it
    const S = def.scale || SCALE;
    const closed = !def.open;
    const raw = def.pts.map(p => ({ x: p[0] * S, y: p[1] * S, w: p[2] || def.width, z: p[3] || 0 }));
    const main = makePath(densify(fillet(raw, def.radius * S, closed), closed, 24), closed);
    const t = Object.assign({}, def, { main, L: main.L, branch: null, closed,
      world: { w: Math.round(WORLD.w * S / SCALE), h: Math.round(WORLD.h * S / SCALE) } });
    // where the race starts and ends along the road (a loop: on the line at s = 0; A→B: a bit in, so the grid fits behind)
    t.startS = closed ? 0 : 400;
    t.finishS = closed ? main.L : main.L - 260;
    t.lapL = t.finishS - t.startS;
    t.crossings = findCrossings(t);
    t.layered = t.crossings.length > 0;
    if (def.branch) {
      const br = def.branch.map(p => ({ x: p[0] * S, y: p[1] * S, w: p[2] || def.branchWidth }));
      t.branch = makePath(densify(fillet(br, def.radius * S, false), false, 24), false);
      const a = br[0], b = br[br.length - 1];
      t.fork = { sF: projectPath(main, a.x, a.y).s, sM: projectPath(main, b.x, b.y).s };
    }
    t.ramps = findRamps(t);
    computeShoulders(t);
    t.obstacles = (def.obstacles || []).map(o => place(t, o.at == null ? Object.assign({}, o, { x: o.x * S, y: o.y * S }) : o));
    t.pads = (def.pads || []).map(o => place(t, o));
    return t;
  }

  // usable off-road width on each side of every road point: SHOULDER, less where another road is close
  function computeShoulders(t) {
    const paths = [t.main, t.branch].filter(Boolean), segs = [];
    for (const p of paths) {
      const m = p.closed ? p.n : p.n - 1;
      for (let i = 0; i < m; i++) {
        const a = p.pts[i], b = p.pts[(i + 1) % p.n];
        segs.push({ p, i, a, b, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, len: Math.hypot(b.x - a.x, b.y - a.y) });
      }
    }
    for (const p of paths) {
      p.pts.forEach((q, i) => {
        // only nearby segments of *other* parts of the road can limit the shoulder
        const cand = segs.filter(g => {
          if (g.p === p) { let ds = Math.abs(p.cum[g.i] - p.cum[i]); if (p.closed) ds = Math.min(ds, p.L - ds); if (ds < 420) return false; }
          if (Math.abs(((g.a.z || 0) + (g.b.z || 0)) / 2 - (q.z || 0)) > 0.55) return false;      // a bridge above/below: not in the way
          return Math.hypot(g.mx - q.x, g.my - q.y) < q.w / 2 + SHOULDER * 2 + g.len + 200;
        });
        const a = p.pts[p.closed ? (i - 1 + p.n) % p.n : Math.max(0, i - 1)], b = p.pts[p.closed ? (i + 1) % p.n : Math.min(p.n - 1, i + 1)];
        let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        q.sh = {};
        for (const side of [1, -1]) {
          let sh = SHOULDER;
          for (let k = 0; cand.length && k <= SHOULDER * 2; k += 10) {
            const x = q.x - dy * side * (q.w / 2 + k), y = q.y + dx * side * (q.w / 2 + k);
            let c = 1e9;
            for (const g of cand) {
              const ex = g.b.x - g.a.x, ey = g.b.y - g.a.y, l2 = ex * ex + ey * ey;
              if (!l2) continue;
              let u = ((x - g.a.x) * ex + (y - g.a.y) * ey) / l2; u = u < 0 ? 0 : u > 1 ? 1 : u;
              c = Math.min(c, Math.hypot(x - g.a.x - ex * u, y - g.a.y - ey * u) - (g.a.w + (g.b.w - g.a.w) * u) / 2);
            }
            if (c < k + 10) { sh = Math.max(0, Math.min(SHOULDER, k / 2 - 6)); break; }
          }
          q.sh[side] = sh;
        }
      });
    }
  }
  function shoulderAt(e) {
    const p = e.path, a = p.pts[e.i], b = p.pts[(e.i + 1) % p.n];
    return a.sh[e.side] + (b.sh[e.side] - a.sh[e.side]) * e.t;
  }

  // jumps go on the 3 straightest stretches (like Turbo Kartz): low curvature before and after the ramp
  function findRamps(t) {
    const L = t.L, step = 40, cand = [];
    const ang = s => pointAt(t.main, s).ang;
    for (let s = (t.closed ? 300 : t.startS + 500); s < (t.closed ? L - 500 : t.finishS - 600); s += step) {
      if (t.fork && s > t.fork.sF - 300 && s < t.fork.sM + 100) continue;
      if (!t.closed && [-200, 0, 200, 400].some(k => pointAt(t.main, s + k).z > 0.02)) continue;
      if (t.crossings.some(c => [c.s1, c.s2].some(cs => Math.abs(cs - s) < 500))) continue;
      if (t.rows.some(f => Math.abs(f * L - s) < 260)) continue;
      let bend = 0;
      for (let k = -80; k < 420; k += 40) bend += Math.abs(Math.atan2(Math.sin(ang(s + k + 40) - ang(s + k)), Math.cos(ang(s + k + 40) - ang(s + k))));
      cand.push({ s, bend });
    }
    cand.sort((a, b) => a.bend - b.bend);
    const out = [];
    for (const c of cand) {
      if (out.length >= 3) break;
      if (c.bend > 0.9) break;
      if (out.some(o => Math.min(Math.abs(o.s - c.s), t.closed ? L - Math.abs(o.s - c.s) : 1e9) < L / 5)) continue;
      const p = pointAt(t.main, c.s);
      out.push({ s: c.s, x: p.x, y: p.y, ang: p.ang, w: p.w });
    }
    return out.sort((a, b) => a.s - b.s);
  }

  // where the road passes over/under itself or crosses itself at the same level
  function findCrossings(t) {
    const { pts, cum, n, closed } = t.main, m = closed ? n : n - 1, out = [];
    for (let i = 0; i < m; i++) for (let j = i + 2; j < m; j++) {
      if (cum[j] - cum[i] < 600) continue;
      const a = pts[i], b = pts[i + 1], c = pts[j], d = pts[(j + 1) % n];
      const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
      if (!den) continue;
      const u = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den, v = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;
      const z1 = a.z + (b.z - a.z) * u, z2 = c.z + (d.z - c.z) * v, x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u;
      if (out.some(o => Math.hypot(o.x - x, o.y - y) < 60)) continue;          // same crossing seen from two segments
      out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, s1: cum[i] + (cum[i + 1] - cum[i]) * u, s2: cum[j] + (cum[j + 1] - cum[j]) * v, z1, z2, bridge: Math.abs(z1 - z2) > 0.5 });
    }
    return out;
  }
  // level (0 ground … 1 bridge) at a distance along the road
  const levelAt = (t, s) => pointAt(t.main, s).z || 0;

  const list = DEFS.map(build);
  const byId = {};
  list.forEach(t => { byId[t.id] = t; });

  // progress along the lap (the shortcut branch is mapped onto the section it bypasses)
  function progressS(t, x, y, q) {
    const a = projectPath(t.main, x, y, t.layered ? q : null);
    if (t.branch) {
      const b = projectPath(t.branch, x, y);
      if (b.d < a.d) return { s: t.fork.sF + (b.s / t.branch.L) * (t.fork.sM - t.fork.sF), d: b.d, hw: b.hw, ang: b.ang, branch: true };
    }
    return a;
  }
  // distance outside the track edge (negative = inside)
  function clearance(t, x, y, q) {
    const a = projectPath(t.main, x, y, t.layered && q ? { z: q.z } : null);
    let c = a.d - a.hw;
    if (t.branch) { const b = projectPath(t.branch, x, y); c = Math.min(c, b.d - b.hw); }
    return c;
  }
  const onTrack = (t, x, y, margin, q) => clearance(t, x, y, q) <= (margin || 0);
  // the path piece the point is most "inside" of → used to push cars back from the walls
  function nearestEdge(t, x, y, q) {
    const a = projectPath(t.main, x, y, t.layered && q ? { z: q.z } : null);
    if (!t.branch) return a;
    const b = projectPath(t.branch, x, y);
    return (b.d - b.hw) < (a.d - a.hw) ? b : a;
  }
  function zoneAt(t, s) {
    const f = t.closed ? (((s % t.L) + t.L) % t.L) / t.L : Math.max(0, Math.min(0.9999, s / t.L));
    return t.zones.find(z => f >= z.a && f < z.b) || t.zones[t.zones.length - 1];
  }

  const API = { BRIDGE_H, levelAt, shoulderAt, WORLD, SCALE, SHOULDER, ITEMS, EVENTS, list, byId, projectPath, pointAt, progressS, clearance, onTrack, nearestEdge, zoneAt };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.IKEA_TRACKS = API;
})(typeof window !== 'undefined' ? window : globalThis);
