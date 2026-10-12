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

  // The demo video plays muted while it's on screen, and pauses when it's not.
  const vid = document.querySelector("video[data-autoplay]");
  if (vid && !still) new IntersectionObserver(([e]) => { if (e.isIntersecting) vid.play().catch(() => {}); else vid.pause(); }, { threshold: 0.5 }).observe(vid);

  // The live demo: the coach talks, Kinema writes one message, the coach says "make it shorter", then sends.
  const live = document.querySelector("[data-live]");
  if (!live) return;
  const said = live.querySelector("[data-said]");
  const status = live.querySelector("[data-status]");
  const message = live.querySelector("[data-message]");
  const words = message.querySelector("[data-words]");
  const send = live.querySelector(".live-send");
  const bars = [...live.querySelectorAll(".live-wave i")];
  const clock = live.querySelector("[data-clock]");
  let run = 0, waveTimer = null;

  const wave = (on) => {
    clearInterval(waveTimer);
    if (!on) { bars.forEach((b) => (b.style.height = "18%")); return; }
    waveTimer = setInterval(() => bars.forEach((b) => (b.style.height = 18 + Math.random() * 82 + "%")), 110);
  };

  const finished = () => {
    live.dataset.stage = "done";
    said.innerHTML = said.dataset.change;
    status.textContent = "Kinema changed the message";
    words.textContent = message.dataset.short;
    message.classList.add("show");
    send.classList.add("show", "sent");
    send.textContent = "Sent to Alex ✓";
  };

  const play = async () => {
    const me = ++run;
    const alive = () => me === run;
    // The coach talks; the words appear as they're said.
    const talk = async (line) => {
      live.dataset.stage = "talk";
      wave(true);
      const t0 = Date.now();
      const tick = setInterval(() => { clock.textContent = "0:0" + Math.min(9, Math.floor((Date.now() - t0) / 1000)); }, 200);
      for (let k = 1; k <= line.length && alive(); k++) {
        said.innerHTML = line.slice(0, k) + '<span class="cursor"></span>';
        await wait(line[k - 1] === "," ? 260 : 42);
      }
      clearInterval(tick);
      wave(false);
      said.innerHTML = line;
      live.dataset.stage = "draft";
    };
    said.innerHTML = '<span class="cursor"></span>';
    status.textContent = "";
    message.classList.remove("show");
    send.classList.remove("show", "sent");
    send.textContent = "Send";
    await talk(said.dataset.text);
    if (!alive()) return;
    status.innerHTML = '<span class="spin"></span> Kinema is writing it up';
    await wait(1400);
    if (!alive()) return;
    words.textContent = message.dataset.first;
    message.classList.add("show");
    status.textContent = "One message, in your words";
    await wait(2600);
    if (!alive()) return;
    // Changes go by voice.
    await talk(said.dataset.change);
    if (!alive()) return;
    status.innerHTML = '<span class="spin"></span> Kinema is changing it';
    await wait(1200);
    if (!alive()) return;
    words.classList.remove("rewrite"); void words.offsetWidth; words.classList.add("rewrite");
    words.textContent = message.dataset.short;
    status.textContent = "Kinema changed the message";
    await wait(1200);
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
