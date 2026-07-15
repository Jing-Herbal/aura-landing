/* ============================================================
   JING — scroll-hero.js
   Vanilla port of the smooth-scroll-hero React component
   (originally framer-motion). Drives a scroll-linked clip-path
   reveal + background zoom-out parallax on the hero, plus a
   gentle fade of the overlaid copy. No dependencies.
   Driven by a rAF loop while the hero is on screen (started /
   stopped via IntersectionObserver) for smooth, reliable updates.
   ============================================================ */

(function () {
  "use strict";
  const section = document.querySelector(".scroll-hero");
  if (!section) return;

  const stage = section.querySelector("[data-hero-stage]");
  const imgs = section.querySelectorAll("[data-hero-img]");
  const copy = section.querySelector("[data-hero-copy]");
  const cue = section.querySelector(".scroll-hero-cue");

  const SH = parseInt(section.getAttribute("data-scroll-height") || "1500", 10);
  const HOLD = parseInt(section.getAttribute("data-hold") || "600", 10);
  const INIT_CLIP = parseFloat(section.getAttribute("data-init-clip") || "25");
  const FINAL_CLIP = parseFloat(section.getAttribute("data-final-clip") || "75");
  // keep the CSS track height in sync with the JS scroll math
  section.style.setProperty("--sh", SH + "px");
  section.style.setProperty("--hold", HOLD + "px");

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let lastY = -1;
  let locked = false;     // reveal has fully played — visuals frozen, never reverses
  let collapsed = false;  // tall intro track removed from the scroll timeline
  let observer = null;
  const RELEASE = SH + HOLD;   // end of the pinned reveal + hold span

  // scroll-linked reveal — active only until the reveal completes
  function reveal(y) {
    // clip-path: initialClip -> 0 and finalClip -> 100 over [0, SH]
    const tClip = clamp(y / SH, 0, 1);
    const cs = lerp(INIT_CLIP, 0, tClip);
    const ce = lerp(FINAL_CLIP, 100, tClip);
    stage.style.clipPath =
      "polygon(" + cs + "% " + cs + "%, " + ce + "% " + cs + "%, " + ce + "% " + ce + "%, " + cs + "% " + ce + "%)";

    // background zoom-out (equivalent to background-size 170% -> 100%) over [0, SH + 500]
    const s = lerp(1.18, 1.0, clamp(y / (SH + 500), 0, 1));
    for (let i = 0; i < imgs.length; i++) imgs[i].style.transform = "scale(" + s + ")";

    // reveal the overlaid copy near the END of the scroll effect (rises in and holds)
    const tCopy = clamp((y - SH * 0.6) / (SH * 0.4), 0, 1);
    if (copy) {
      copy.style.opacity = String(tCopy);
      copy.style.transform = "translateY(" + (32 * (1 - tCopy)) + "px)";
      copy.style.pointerEvents = tCopy < 0.5 ? "none" : "";
    }
    // scroll cue shows during the reveal, fades as the copy appears
    if (cue) cue.style.opacity = String(clamp(1 - y / (SH * 0.5), 0, 1));

    // reveal the nav / announce chrome only once the hero is (almost) fully revealed
    document.body.classList.toggle("chrome-hidden", y < SH * 0.9);
  }

  // pin the hero at its fully-revealed state — from here it can never play backward
  function freeze() {
    stage.style.clipPath = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
    for (let i = 0; i < imgs.length; i++) imgs[i].style.transform = "scale(1)";
    if (copy) { copy.style.opacity = "1"; copy.style.transform = "none"; copy.style.pointerEvents = ""; }
    if (cue) cue.style.opacity = "0";
    document.body.classList.remove("chrome-hidden");
  }

  // Once the hero has scrolled fully off-screen, drop the tall intro track from the
  // scroll timeline. Because it happens off-screen and re-anchors the scroll by the
  // exact removed height, nothing visibly jumps — afterwards the hero is a normal
  // one-viewport section that still can't be scrolled back into a reverse.
  function collapse(y) {
    if (collapsed) return;
    collapsed = true;
    stop();
    if (observer) observer.disconnect();
    section.classList.add("is-committed");
    const html = document.documentElement;
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, Math.max(0, Math.round(y - RELEASE)));
    html.style.scrollBehavior = prevBehavior;
  }

  function apply() {
    if (collapsed) return;
    const y = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    if (y === lastY) return;
    lastY = y;

    if (!locked) {
      reveal(y);
      // the instant the reveal finishes, freeze it (one-way) — but DON'T snap the
      // scroll: the hero simply keeps scrolling away into the page from here.
      if (y >= SH) { locked = true; freeze(); }
    } else if (y >= RELEASE + window.innerHeight) {
      // hero is fully above the viewport now — collapse the intro seamlessly
      collapse(y);
    }
  }

  if (reduce) { document.body.classList.remove("chrome-hidden"); return; } // static hero, nav visible

  let running = false, raf = 0;
  function loop() { apply(); if (running) raf = requestAnimationFrame(loop); }
  function start() { if (!running) { running = true; raf = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? start() : stop()));
    }, { threshold: 0 });
    observer.observe(section);
  } else {
    start();
  }
  // also respond to direct scroll/resize as a fallback
  window.addEventListener("scroll", apply, { passive: true });
  window.addEventListener("resize", () => { lastY = -1; apply(); });
  apply();
})();
