// Kinema site motion: the rotating word in the headline, the live voice-to-notes demo, and sections easing in.
(() => {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Headline word: letters flip out, the next word's letters flip in.
  const swap = document.querySelector("[data-swap]");
  if (swap && !still) {
    const words = swap.dataset.swap.split("|");
    let i = 0;
    const paint = (word, cls) => {
      swap.textContent = "";
      [...word].forEach((c, k) => {
        const s = document.createElement("span");
        s.className = "ch " + cls;
        s.textContent = c;
        s.style.animationDelay = k * (cls === "in" ? 45 : 20) + "ms";
        swap.appendChild(s);
      });
    };
    // Like the reference: the word box eases to the next word's width while its letters flip in.
    const measure = (word) => { const m = document.createElement("span"); m.className = "swap"; m.style.cssText = "position:absolute;visibility:hidden"; m.textContent = word; swap.parentNode.appendChild(m); const w = m.offsetWidth; m.remove(); return w; };
    swap.style.width = measure(words[0]) + "px";
    setInterval(async () => {
      paint(words[i], "out");
      i = (i + 1) % words.length;
      swap.style.width = measure(words[i]) + "px";
      await wait(160);
      paint(words[i], "in");
    }, 2800);
  }

  // Sections ease in once as they reach the screen.
  document.documentElement.classList.add("js");
  const seen = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("on"); seen.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll("[data-reveal]").forEach((el) => seen.observe(el));

  // The live demo: the coach talks, Kinema drafts two notes, the coach sends.
  const live = document.querySelector("[data-live]");
  if (!live) return;
  const said = live.querySelector("[data-said]");
  const status = live.querySelector("[data-status]");
  const notes = [...live.querySelectorAll(".note")];
  const send = live.querySelector(".live-send");
  const bars = [...live.querySelectorAll(".live-wave i")];
  const clock = live.querySelector("[data-clock]");
  const line = said.dataset.text;
  let run = 0, waveTimer = null;

  const wave = (on) => {
    clearInterval(waveTimer);
    if (!on) { bars.forEach((b) => (b.style.height = "18%")); return; }
    waveTimer = setInterval(() => bars.forEach((b) => (b.style.height = 18 + Math.random() * 82 + "%")), 110);
  };

  const finished = () => {
    live.dataset.stage = "done";
    said.innerHTML = line;
    status.textContent = "Kinema drafted 2 notes";
    notes.forEach((n) => n.classList.add("show"));
    send.classList.add("show", "sent");
    send.textContent = "Sent to Alex ✓";
  };

  const play = async () => {
    const me = ++run;
    const alive = () => me === run;
    live.dataset.stage = "talk";
    said.innerHTML = '<span class="cursor"></span>';
    status.textContent = "";
    notes.forEach((n) => n.classList.remove("show"));
    send.classList.remove("show", "sent");
    send.textContent = "Send all 2 notes";
    wave(true);
    const t0 = Date.now();
    const tick = setInterval(() => { clock.textContent = "0:0" + Math.min(9, Math.floor((Date.now() - t0) / 1000)); }, 200);
    for (let k = 1; k <= line.length && alive(); k++) {
      said.innerHTML = line.slice(0, k) + '<span class="cursor"></span>';
      await wait(line[k - 1] === "," ? 260 : 42);
    }
    clearInterval(tick);
    wave(false);
    if (!alive()) return;
    live.dataset.stage = "draft";
    said.innerHTML = line;
    status.innerHTML = '<span class="spin"></span> Kinema is drafting';
    await wait(1400);
    for (const n of notes) { if (!alive()) return; n.classList.add("show"); await wait(380); }
    status.textContent = "Kinema drafted 2 notes · edit by typing or by voice";
    await wait(900);
    if (!alive()) return;
    send.classList.add("show");
    await wait(1800);
    if (!alive()) return;
    send.classList.add("sent");
    send.textContent = "Sent to Alex ✓";
    live.dataset.stage = "done";
  };

  live.querySelector("[data-replay]").addEventListener("click", () => (still ? finished() : play()));
  if (still) { finished(); return; }
  const start = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { start.disconnect(); setTimeout(play, 600); }
  }, { threshold: 0.4 });
  start.observe(live);
})();
