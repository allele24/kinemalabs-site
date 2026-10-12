// The hero illustration: a 16-second loop drawn on a canvas. Three students take turns on the court, each set flies
// into the coach's inbox, the coach talks, then each student comes back in turn to receive a written note.
// One draw(t) function, re-run each frame while the canvas is on screen (a still frame with reduced motion).
(() => {
  const canvas = document.querySelector("[data-court]");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const LIME = "#c8ff3d", INK = "#eef1ea", BG = "#0a0b0a";
  const W = 600, H = 480, PERIOD = 16;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MONO = '"Geist Mono", ui-monospace, monospace';

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (t, a, b) => clamp((t - a) / (b - a));
  const out3 = (p) => 1 - (1 - p) ** 3;
  const inOut = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
  const lime = (a) => `rgba(200,255,61,${a})`;

  const S = 13;
  const iso = (x, y, z = 0) => ({ x: 384 + (x - y) * S, y: 150 + (x + y) * S * 0.5 - z });
  const COURT_W = 11, COURT_L = 24;
  const spot = { x: 5.2, y: 21.6 };
  const feeder = { x: 5.5, y: 3 };
  const inbox = { x: 14.5, y: 13 };

  const students = [
    { name: "ALEX", shirt: "#8b9cff" },
    { name: "MAYA", shirt: "#ff8f6b" },
    { name: "SAM", shirt: "#e8e8e2" },
  ];
  const TURN = 2.6;                       // each student's practice turn
  const SEND = 10.4, NOTE = 1.55;         // notes go back one student at a time

  const captions = [
    [0, 7.8, "Each student practices on their own."],
    [7.8, 10.4, "You say what you see."],
    [10.4, 15.3, "Kinema writes it up. You send."],
  ];

  const poly = (pts, fill) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  };
  const box = (x, y, w, d, h, z, top, left, right) => {
    const a = iso(x, y, z), b = iso(x + w, y, z), c = iso(x + w, y + d, z), e = iso(x, y + d, z);
    const up = (p) => ({ x: p.x, y: p.y - h });
    poly([e, c, up(c), up(e)], left); poly([c, b, up(b), up(c)], right); poly([up(a), up(b), up(c), up(e)], top);
  };
  const glow = (x, y, r, a) => {
    if (a <= 0.002) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, lime(a)); g.addColorStop(1, lime(0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  };

  const court = () => {
    for (let i = -2; i < COURT_W + 2; i++) for (let j = -2; j < COURT_L + 2; j++)
      poly([iso(i, j), iso(i + 1, j), iso(i + 1, j + 1), iso(i, j + 1)], (i + j) % 2 ? "#101210" : "#0d0f0d");
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(236,240,232,0.22)";
    const line = (a, b) => { const p = iso(...a), q = iso(...b); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); };
    line([0, 0], [COURT_W, 0]); line([0, COURT_L], [COURT_W, COURT_L]);
    line([0, 0], [0, COURT_L]); line([COURT_W, 0], [COURT_W, COURT_L]);
    line([1.4, 0], [1.4, COURT_L]); line([COURT_W - 1.4, 0], [COURT_W - 1.4, COURT_L]);
    line([1.4, 5.5], [COURT_W - 1.4, 5.5]); line([1.4, COURT_L - 5.5], [COURT_W - 1.4, COURT_L - 5.5]);
    line([COURT_W / 2, 5.5], [COURT_W / 2, COURT_L - 5.5]);
    const n1 = iso(-0.5, 12), n2 = iso(COURT_W + 0.5, 12);
    ctx.fillStyle = "rgba(236,240,232,0.05)";
    ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y); ctx.lineTo(n2.x, n2.y - 14); ctx.lineTo(n1.x, n1.y - 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(236,240,232,0.5)";
    ctx.beginPath(); ctx.moveTo(n1.x, n1.y - 14); ctx.lineTo(n2.x, n2.y - 14); ctx.stroke();
  };

  // A player: shadow, legs, shirt, head, and a racket arm. swing goes 0 (racket back) to 1 (follow-through).
  const person = (f, s, swing, alpha, lit) => {
    const K = 1.5;
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.translate(f.x, f.y); ctx.scale(K, K); ctx.translate(-f.x, -f.y);
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.beginPath(); ctx.ellipse(f.x, f.y, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (lit > 0) glow(f.x, f.y - 26, 46, 0.25 * lit);
    const step = Math.sin(swing * Math.PI) * 3;
    ctx.strokeStyle = "#2a2f29"; ctx.lineWidth = 4.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(f.x - 2, f.y - 18); ctx.lineTo(f.x - 6 - step, f.y - 1);
    ctx.moveTo(f.x + 2, f.y - 18); ctx.lineTo(f.x + 6 + step, f.y - 1); ctx.stroke();
    ctx.fillStyle = lit > 0.5 ? LIME : s.shirt;
    ctx.beginPath(); ctx.roundRect(f.x - 7, f.y - 37, 14, 20, 5); ctx.fill();
    ctx.fillStyle = "#d8c3a5"; ctx.beginPath(); ctx.arc(f.x, f.y - 43, 5.5, 0, Math.PI * 2); ctx.fill();
    // Arm and racket swing around the shoulder, from behind the body to across it.
    const sh = { x: f.x + 4, y: f.y - 33 };
    const ang = (-150 + 230 * inOut(swing)) * Math.PI / 180;
    const hand = { x: sh.x + Math.cos(ang) * 11, y: sh.y + Math.sin(ang) * 6 + 6 };
    ctx.strokeStyle = "#d8c3a5"; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(hand.x, hand.y); ctx.stroke();
    const head = { x: hand.x + Math.cos(ang) * 14, y: hand.y + Math.sin(ang) * 8 - 2 };
    ctx.strokeStyle = "#b8bdb4"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(head.x, head.y); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(head.x + Math.cos(ang) * 5, head.y + Math.sin(ang) * 3, 6, 4, ang, 0, Math.PI * 2);
    ctx.strokeStyle = lit > 0.5 ? LIME : "#c9cec5"; ctx.stroke();
    if (s.name) {
      ctx.font = `500 10px ${MONO}`; ctx.fillStyle = lit > 0.5 ? LIME : "rgba(236,240,232,0.7)";
      ctx.fillText(s.name, f.x - ctx.measureText(s.name).width / 2, f.y - 56);
    }
    ctx.restore();
    return { x: f.x + (head.x - f.x) * K, y: f.y + (head.y - f.y) * K };
  };

  const bezier = (from, to, lift, f) => {
    const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - lift }, q = 1 - f;
    return { x: q * q * from.x + 2 * q * f * mid.x + f * f * to.x, y: q * q * from.y + 2 * q * f * mid.y + f * f * to.y };
  };

  const draw = (t) => {
    ctx.globalAlpha = 1; ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    const fadeAll = 1 - span(t, 15.3, 16);
    ctx.globalAlpha = fadeAll;
    court();

    // The inbox: one slab per student's set that has arrived.
    const arrived = students.filter((_, i) => t > i * TURN + 2.35).length;
    const talk = span(t, 7.8, 8.2) * (1 - span(t, 10.1, 10.5));
    const ib = iso(inbox.x + 1, inbox.y + 1);
    glow(ib.x, ib.y - 30, 120, 0.13 * talk + 0.03 * arrived);
    box(inbox.x, inbox.y, 2.2, 2.2, 6, 0, "#1a1e1a", "#121512", "#0f120f");
    for (let s = 0; s < arrived; s++) box(inbox.x + 0.2, inbox.y + 0.2, 1.8, 1.8, 5, 6 + s * 6, s === arrived - 1 ? lime(0.9) : lime(0.4), lime(0.2), lime(0.12));
    ctx.font = `500 10px ${MONO}`; ctx.fillStyle = "rgba(236,240,232,0.45)";
    ctx.fillText("INBOX", ib.x - 15, ib.y + 18);

    if (talk > 0) {
      const top = iso(inbox.x + 1.1, inbox.y + 1.1, 14 + arrived * 6);
      for (let r = 0; r < 3; r++) {
        const ph = (t * 0.9 + r / 3) % 1;
        ctx.strokeStyle = lime(0.35 * (1 - ph) * talk); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(top.x, top.y, 18 + 60 * ph, (18 + 60 * ph) * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      }
      for (let b = 0; b < 9; b++) {
        const hgt = (6 + 22 * (0.5 + 0.5 * Math.sin(t * 9 + b * 1.7)) * (0.5 + 0.5 * Math.sin(t * 3.1 + b))) * talk;
        ctx.fillStyle = lime(0.95); ctx.fillRect(top.x - 26 + b * 6.5, top.y - 14 - hgt, 3.5, hgt);
      }
    }

    const foot = iso(spot.x + 0.4, spot.y + 0.4);

    // Practice turns: each student walks on, hits two balls, their set flies to the inbox, they step off.
    students.forEach((s, i) => {
      const local = t - i * TURN;
      if (local < 0 || local > TURN) return;
      const alpha = span(local, 0, 0.3) * (1 - span(local, TURN - 0.3, TURN));
      const hitsAt = [0.85, 1.65];
      let swing = 0;
      hitsAt.forEach((h) => { const p = span(local, h - 0.25, h + 0.3); if (p > 0 && p < 1) swing = p; });
      const slide = (1 - out3(span(local, 0, 0.3))) * -14;
      const head = person({ x: foot.x + slide, y: foot.y }, s, swing, alpha, 0);
      hitsAt.forEach((h) => {
        const u = span(local, h - 0.6, h);
        if (u > 0 && u < 1) for (let k = 5; k >= 0; k--) {
          const v = out3(Math.max(0, u - k * 0.025));
          const a = iso(feeder.x, feeder.y, 10);
          const x = a.x + (head.x - a.x) * v, y = a.y + (head.y - a.y) * v - Math.sin(Math.PI * v) * 70;
          ctx.fillStyle = lime(k ? 0.12 * (6 - k) : 1);
          ctx.beginPath(); ctx.arc(x, y, k ? 2.5 : 4, 0, Math.PI * 2); ctx.fill();
        }
        const ring = span(local, h, h + 0.45);
        if (ring > 0 && ring < 1) {
          ctx.strokeStyle = lime(0.8 * (1 - ring)); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(head.x, head.y, 4 + 16 * ring, 0, Math.PI * 2); ctx.stroke();
        }
      });
      // The set becomes a clip and arcs into the inbox.
      const f = inOut(span(local, 1.9, 2.4));
      if (local > 1.7 && f < 1) {
        const p = bezier({ x: foot.x, y: foot.y - 96 }, iso(inbox.x + 1.1, inbox.y + 1.1, 12 + i * 6), 70, f);
        ctx.fillStyle = lime(0.9 * span(local, 1.7, 1.9)); ctx.fillRect(p.x - 10, p.y - 3.5, 20, 7);
        ctx.fillStyle = BG; ctx.fillRect(p.x - 7, p.y - 1, 3, 2);
      }
    });

    // Notes: each student comes back in turn and their note flies from the inbox to them.
    students.forEach((s, i) => {
      const end = i === students.length - 1 ? NOTE + 0.4 : NOTE;
      const local = t - (SEND + i * NOTE);
      if (local < 0 || local > end) return;
      const alpha = span(local, 0, 0.25) * (1 - span(local, end - 0.25, end));
      const f = inOut(span(local, 0.15, 0.95));
      person(foot, s, 0, alpha, span(local, 0.9, 1.05));
      if (f > 0 && f < 1) {
        const p = bezier(iso(inbox.x + 1.1, inbox.y + 1.1, 40 + arrived * 6), { x: foot.x, y: foot.y - 104 }, 90, f);
        ctx.fillStyle = "#171a17"; ctx.strokeStyle = lime(0.75); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(p.x - 20, p.y - 13, 40, 26, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(236,240,232,0.75)"; ctx.fillRect(p.x - 14, p.y - 7, 28, 2.5); ctx.fillRect(p.x - 14, p.y - 1, 22, 2.5);
        ctx.fillStyle = lime(0.9); ctx.fillRect(p.x - 14, p.y + 5, 12, 2.5);
      }
    });

    ctx.globalAlpha = 1;
    ctx.font = `500 19px ${MONO}`;
    for (const [a, b, text] of captions) {
      const vis = span(t, a, a + 0.2) * (1 - span(t, b - 0.25, b));
      if (vis <= 0) continue;
      const typed = text.slice(0, Math.round(text.length * span(t, a, a + 0.9)));
      const x = (W - ctx.measureText(text).width) / 2;
      ctx.globalAlpha = vis; ctx.fillStyle = INK; ctx.fillText(typed, x, 52);
      if ((t * 2) % 2 < 1.2) { ctx.fillStyle = LIME; ctx.fillRect(x + ctx.measureText(typed).width + 3, 37, 10, 19); }
    }
    ctx.globalAlpha = 1;
  };

  let visible = true;
  const frame = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    if (canvas.width !== w) { canvas.width = w; canvas.height = Math.round((H * w) / W); }
    if (visible) { ctx.setTransform(canvas.width / W, 0, 0, canvas.width / W, 0, 0); draw(still ? 11.5 : (performance.now() / 1000) % PERIOD); }
    if (!still) requestAnimationFrame(frame);
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  new ResizeObserver(() => { if (still) frame(); }).observe(canvas);
  frame();
})();
