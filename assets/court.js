// The hero illustration: a 14-second loop drawn on a canvas, in four beats. Students hit on an isometric court,
// each set flies into the coach's inbox, the coach talks, and written notes fly back to the students.
// Same approach as a hand-drawn canvas loop: one draw(t) function, re-run each frame while on screen.
(() => {
  const canvas = document.querySelector("[data-court]");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const LIME = "#c8ff3d", INK = "#eef1ea", BG = "#0a0b0a";
  const W = 600, H = 480, PERIOD = 14;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (t, a, b) => clamp((t - a) / (b - a));
  const out3 = (p) => 1 - (1 - p) ** 3;
  const inOut = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
  const lime = (a) => `rgba(200,255,61,${a})`;

  // Isometric projection: court units to canvas pixels.
  const S = 13;
  const iso = (x, y, z = 0) => ({ x: 384 + (x - y) * S, y: 150 + (x + y) * S * 0.5 - z });

  // A doubles court, 11 wide by 24 long, laid diagonally.
  const COURT_W = 11, COURT_L = 24;
  const players = [
    { x: 2.6, y: 22.2 }, { x: 5.5, y: 21.4 }, { x: 8.4, y: 22.2 },
  ];
  const feeder = { x: 5.5, y: 2.5 };
  const inbox = { x: 14.5, y: 13 };
  const hits = [0.55, 1.05, 1.55, 2.05, 2.55, 3.05].map((t, i) => ({ t, p: players[i % 3], k: i }));

  const captions = [
    [0, 3.6, "Students practice on their own."],
    [3.6, 6.6, "Each set lands in your inbox."],
    [6.6, 9.6, "You say what you see."],
    [9.6, 13.4, "Kinema writes it up. You send."],
  ];

  const poly = (pts, fill, stroke) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  };

  // A small box standing on the court: top and two visible sides.
  const box = (x, y, w, d, h, z, top, left, right) => {
    const a = iso(x, y, z), b = iso(x + w, y, z), c = iso(x + w, y + d, z), e = iso(x, y + d, z);
    const up = (p) => ({ x: p.x, y: p.y - h });
    poly([e, c, up(c), up(e)], left);
    poly([c, b, up(b), up(c)], right);
    poly([up(a), up(b), up(c), up(e)], top);
  };

  const glow = (x, y, r, a) => {
    if (a <= 0.002) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, lime(a)); g.addColorStop(1, lime(0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  };

  const court = (t) => {
    ctx.lineWidth = 1;
    // Surface tiles, faintly checked so the plane reads as a floor.
    for (let i = -2; i < COURT_W + 2; i++) for (let j = -2; j < COURT_L + 2; j++) {
      const shade = (i + j) % 2 ? "#101210" : "#0d0f0d";
      poly([iso(i, j), iso(i + 1, j), iso(i + 1, j + 1), iso(i, j + 1)], shade);
    }
    ctx.strokeStyle = "rgba(236,240,232,0.22)";
    const line = (a, b) => { const p = iso(...a), q = iso(...b); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); };
    line([0, 0], [COURT_W, 0]); line([0, COURT_L], [COURT_W, COURT_L]);
    line([0, 0], [0, COURT_L]); line([COURT_W, 0], [COURT_W, COURT_L]);
    line([1.4, 0], [1.4, COURT_L]); line([COURT_W - 1.4, 0], [COURT_W - 1.4, COURT_L]);
    line([1.4, 5.5], [COURT_W - 1.4, 5.5]); line([1.4, COURT_L - 5.5], [COURT_W - 1.4, COURT_L - 5.5]);
    line([COURT_W / 2, 5.5], [COURT_W / 2, COURT_L - 5.5]);
    // The net.
    const n1 = iso(-0.5, 12), n2 = iso(COURT_W + 0.5, 12);
    ctx.strokeStyle = "rgba(236,240,232,0.5)";
    ctx.beginPath(); ctx.moveTo(n1.x, n1.y - 14); ctx.lineTo(n2.x, n2.y - 14); ctx.stroke();
    ctx.fillStyle = "rgba(236,240,232,0.05)";
    ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y); ctx.lineTo(n2.x, n2.y - 14); ctx.lineTo(n1.x, n1.y - 14); ctx.closePath(); ctx.fill();
  };

  // Ball flight from the feeder to a player: a parabola over the net.
  const ballAt = (p, u) => {
    const x = feeder.x + (p.x - feeder.x) * u, y = feeder.y + (p.y - feeder.y) * u;
    return iso(x, y, 10 + Math.sin(Math.PI * u) * 70);
  };

  const draw = (t) => {
    ctx.globalAlpha = 1;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    const fadeAll = 1 - span(t, 13.4, 14);
    ctx.globalAlpha = fadeAll;
    court(t);

    // Inbox tower: grows by one slab per set that arrives.
    const arrived = hits.filter((h) => t > h.t + 3.6 + h.k * 0.12 + 0.9).length;
    const talk = span(t, 6.6, 7.1) * (1 - span(t, 9.4, 9.9));
    glow(iso(inbox.x + 1, inbox.y + 1).x, iso(inbox.x + 1, inbox.y + 1).y - 30, 120, 0.12 * talk + 0.02 * arrived);
    box(inbox.x, inbox.y, 2.2, 2.2, 6, 0, "#1a1e1a", "#121512", "#0f120f");
    for (let s = 0; s < arrived; s++) box(inbox.x + 0.2, inbox.y + 0.2, 1.8, 1.8, 4, 6 + s * 5, s === arrived - 1 ? lime(0.9) : lime(0.35), lime(0.18), lime(0.1));

    // Voice: bars bobbing above the inbox, and rings spreading out.
    if (talk > 0) {
      const top = iso(inbox.x + 1.1, inbox.y + 1.1, 12 + arrived * 5);
      for (let r = 0; r < 3; r++) {
        const ph = ((t * 0.9 + r / 3) % 1);
        ctx.strokeStyle = lime(0.35 * (1 - ph) * talk);
        ctx.beginPath(); ctx.ellipse(top.x, top.y, 18 + 60 * ph, (18 + 60 * ph) * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      }
      for (let b = 0; b < 9; b++) {
        const hgt = (6 + 22 * (0.5 + 0.5 * Math.sin(t * 9 + b * 1.7)) * (0.5 + 0.5 * Math.sin(t * 3.1 + b))) * talk;
        ctx.fillStyle = lime(0.95);
        ctx.fillRect(top.x - 26 + b * 6.5, top.y - 14 - hgt, 3.5, hgt);
      }
    }

    // Players: pillars on the near baseline. They light up when a note reaches them.
    players.forEach((p, i) => {
      const noteIn = span(t, 10.2 + i * 0.35 + 1.1, 10.2 + i * 0.35 + 1.4);
      const lit = noteIn * (1 - span(t, 13, 13.4));
      const base = iso(p.x + 0.4, p.y + 0.4);
      glow(base.x, base.y - 20, 50, 0.22 * lit);
      box(p.x, p.y, 0.8, 0.8, 26, 0, lit > 0.5 ? LIME : "#d9ddd5", lit > 0.5 ? lime(0.55) : "#7f857c", lit > 0.5 ? lime(0.35) : "#5d625b");
    });

    // Practice: balls from the feeder to each player, with a ring where the racket meets it.
    hits.forEach((h) => {
      const u = span(t, h.t - 0.55, h.t);
      if (u > 0 && u < 1) {
        for (let k = 5; k >= 0; k--) {
          const b = ballAt(h.p, out3(Math.max(0, u - k * 0.025)));
          ctx.fillStyle = lime(k ? 0.12 * (6 - k) : 1);
          ctx.beginPath(); ctx.arc(b.x, b.y, k ? 2.5 : 4, 0, Math.PI * 2); ctx.fill();
        }
        const sh = iso(feeder.x + (h.p.x - feeder.x) * out3(u), feeder.y + (h.p.y - feeder.y) * out3(u));
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      }
      const ring = span(t, h.t, h.t + 0.5);
      if (ring > 0 && ring < 1) {
        const c = iso(h.p.x + 0.4, h.p.y + 0.4, 22);
        ctx.strokeStyle = lime(0.8 * (1 - ring));
        ctx.beginPath(); ctx.ellipse(c.x, c.y, 6 + 22 * ring, (6 + 22 * ring) * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // The set as a clip: a slab rising from the player and arcing into the inbox.
      const f = inOut(span(t, h.t + 3.6 + h.k * 0.12, h.t + 3.6 + h.k * 0.12 + 0.9));
      const rise = span(t, h.t + 0.2, h.t + 0.6);
      if (rise > 0 && f < 1) {
        const from = iso(h.p.x + 0.4, h.p.y + 0.4, 40 + 6 * h.k * rise);
        const to = iso(inbox.x + 1.1, inbox.y + 1.1, 12 + h.k * 5);
        const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 60 };
        const q = 1 - f;
        const x = q * q * from.x + 2 * q * f * mid.x + f * f * to.x;
        const y = q * q * from.y + 2 * q * f * mid.y + f * f * to.y;
        ctx.globalAlpha = fadeAll * rise;
        ctx.fillStyle = lime(0.85); ctx.fillRect(x - 9, y - 3, 18, 6);
        ctx.fillStyle = BG; ctx.fillRect(x - 6, y - 1, 3, 2);
        ctx.globalAlpha = fadeAll;
      }
    });

    // Notes: cards with text lines fly from the inbox back to each player.
    players.forEach((p, i) => {
      const f = inOut(span(t, 10.2 + i * 0.35, 10.2 + i * 0.35 + 1.3));
      if (f <= 0 || f >= 1) return;
      const from = iso(inbox.x + 1.1, inbox.y + 1.1, 40 + arrived * 5);
      const to = iso(p.x + 0.4, p.y + 0.4, 34);
      const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 90 };
      const q = 1 - f;
      const x = q * q * from.x + 2 * q * f * mid.x + f * f * to.x;
      const y = q * q * from.y + 2 * q * f * mid.y + f * f * to.y;
      ctx.fillStyle = "#171a17"; ctx.strokeStyle = lime(0.7);
      ctx.beginPath(); ctx.roundRect(x - 20, y - 13, 40, 26, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(236,240,232,0.75)";
      ctx.fillRect(x - 14, y - 7, 28, 2.5); ctx.fillRect(x - 14, y - 1, 22, 2.5);
      ctx.fillStyle = lime(0.9); ctx.fillRect(x - 14, y + 5, 12, 2.5);
    });

    // Caption, typed at the top with a block cursor.
    ctx.globalAlpha = 1;
    ctx.font = '500 19px "Geist Mono", ui-monospace, monospace';
    for (const [a, b, text] of captions) {
      const vis = span(t, a, a + 0.2) * (1 - span(t, b - 0.25, b));
      if (vis <= 0) continue;
      const typed = text.slice(0, Math.round(text.length * span(t, a, a + 0.8)));
      const x = (W - ctx.measureText(text).width) / 2;
      ctx.globalAlpha = vis;
      ctx.fillStyle = INK; ctx.fillText(typed, x, 52);
      if ((t * 2) % 2 < 1.2) { ctx.fillStyle = LIME; ctx.fillRect(x + ctx.measureText(typed).width + 3, 37, 10, 19); }
    }
    ctx.globalAlpha = 1;
  };

  let raf = 0, visible = true;
  const frame = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    if (canvas.width !== w) { canvas.width = w; canvas.height = Math.round((H * w) / W); }
    if (visible) { ctx.setTransform(canvas.width / W, 0, 0, canvas.width / W, 0, 0); draw(still ? 11.2 : (performance.now() / 1000) % PERIOD); }
    if (!still) raf = requestAnimationFrame(frame);
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
  new ResizeObserver(() => { if (still) frame(); }).observe(canvas);
  frame();
})();
