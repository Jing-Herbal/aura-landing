/* ============================================================
   JING — landing.js
   Scroll-motion engine for landing.html (Seed-style rebuild):
   hero scrub, pinned statement text fill, pinned mechanism
   steps, editorial parallax, sticky buy bar, buy-box logic,
   hover videos, testimonial wall.
   Depends on store.js (JING global) loaded first.
   ============================================================ */

(() => {
  "use strict";

  if (new URLSearchParams(location.search).has("flat")) {
    document.documentElement.classList.add("flat");
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* Progress of a tall section's pinned scene: 0 when its top hits the
     viewport top, 1 when its bottom reaches the viewport bottom. */
  function pinProgress(section) {
    const r = section.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    return clamp(-r.top / (r.height - vh), 0, 1);
  }

  /* ---------- Scroll-driven scenes (one rAF loop) ---------- */
  const hero = document.querySelector("[data-hero]");
  const heroCopy = document.querySelector("[data-hero-copy]");
  const heroVideo = document.querySelector(".sd-hero-video");

  const statement = document.querySelector("[data-statement]");
  const stText = document.querySelector("[data-statement-text]");
  const stLink = document.querySelector(".sd-statement-link");
  let words = [];
  if (stText) {
    // Split into word spans for the scrub fill
    const text = stText.textContent.trim();
    stText.textContent = "";
    words = text.split(/\s+/).map((w) => {
      const s = document.createElement("span");
      s.className = "sw";
      s.textContent = w;
      stText.appendChild(s);
      stText.appendChild(document.createTextNode(" "));
      return s;
    });
  }

  /* Nourish animation refs (statement section) */
  const nourish = document.querySelector("[data-nourish]");
  const nr = {};
  if (nourish) {
    ["stick", "particles", "mesh", "glow", "surf1", "surf2", "sheen", "labels"].forEach((k) => {
      nr[k] = nourish.querySelector(`[data-nr="${k}"]`);
    });
    nr.dots = nourish.querySelectorAll(`[data-nr="particles"] circle`);
    // Prepare mesh strokes for draw-in
    nourish.querySelectorAll(`[data-nr="mesh"] path`).forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
    });
  }

  function drawNourish(p) {
    if (!nourish) return;
    const ease = (t) => 1 - Math.pow(1 - t, 2);
    // Stick tips in and settles
    nr.stick.style.transform = `translateY(${(1 - ease(clamp(p * 2.2, 0, 1))) * -26}px)`;
    nr.stick.style.opacity = clamp(p * 3, 0, 1);
    // Particles rain toward the skin continuously as the page scrolls
    const presence = clamp(p * 4, 0, 1);
    nr.dots.forEach((c, i) => {
      const local = (p * 2.4 + i * 0.11) % 1;
      c.style.transform = `translateY(${local * 150}px)`;
      c.style.opacity = String(Math.sin(local * Math.PI) * presence);
    });
    // Collagen mesh draws in through the middle of the scroll
    nourish.querySelectorAll(`[data-nr="mesh"] path`).forEach((path, i) => {
      const len = parseFloat(path.style.strokeDasharray);
      const local = clamp((p - 0.25 - i * 0.1) / 0.45, 0, 1);
      path.style.strokeDashoffset = String(len * (1 - ease(local)));
      path.style.opacity = String(0.25 + local * 0.75);
    });
    // Glow builds, dull surface crossfades to plumped surface
    nr.glow.style.opacity = clamp((p - 0.3) / 0.5, 0, 1);
    const plump = clamp((p - 0.45) / 0.4, 0, 1);
    nr.surf1.style.opacity = String(1 - plump);
    nr.surf2.style.opacity = String(plump);
    nr.surf2.style.transform = `translateY(${(1 - plump) * 6}px)`;
    // Sheen sweeps across once plumped
    const sh = clamp((p - 0.78) / 0.22, 0, 1);
    nr.sheen.style.opacity = String(sh > 0 ? Math.sin(sh * Math.PI) * 0.9 : 0);
    nr.sheen.style.transform = `translateX(${sh * 150}px)`;
  }

  const mech = document.querySelector("[data-mech]");
  const mechSteps = Array.from(document.querySelectorAll("[data-mech-step]"));
  const mechDots = Array.from(document.querySelectorAll(".sd-mech-progress span"));

  const editorialMedia = document.querySelector("[data-parallax-media]");
  const stickybar = document.querySelector("[data-stickybar]");
  const buySection = document.getElementById("buy");

  let ticking = false;
  function onFrame() {
    ticking = false;

    if (!reduced && hero) {
      const p = pinProgress(hero);
      heroCopy && heroCopy.style.setProperty("--hero-p", p.toFixed(3));
      heroVideo && heroVideo.style.setProperty("--hero-zoom", (1 + p * 0.07).toFixed(4));
    }

    if (!reduced && statement && words.length) {
      const p = pinProgress(statement);
      const lit = Math.round(p * 1.25 * words.length);
      words.forEach((w, i) => w.classList.toggle("is-lit", i < lit));
      stLink && stLink.classList.toggle("is-in", p > 0.85);
      drawNourish(p);
    } else if (reduced) {
      drawNourish(1);
    }

    if (!reduced && mech && mechSteps.length && window.matchMedia("(min-width: 901px)").matches) {
      const p = pinProgress(mech);
      const idx = clamp(Math.floor(p * mechSteps.length), 0, mechSteps.length - 1);
      mechSteps.forEach((s, i) => s.classList.toggle("is-active", i === idx));
      mechDots.forEach((d, i) => d.classList.toggle("is-on", i <= idx));
    }

    if (!reduced && editorialMedia) {
      const r = editorialMedia.parentElement.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const par = clamp((vh - r.top) / (vh + r.height), 0, 1) - 0.5;
      editorialMedia.querySelector("img").style.transform =
        "translateY(" + (par * 9).toFixed(2) + "%)";
    }

    if (stickybar && hero && buySection) {
      const pastHero = hero.getBoundingClientRect().bottom < 0;
      const buyR = buySection.getBoundingClientRect();
      const buyInView = buyR.top < window.innerHeight && buyR.bottom > 0;
      const show = pastHero && !buyInView;
      stickybar.classList.toggle("is-visible", show);
      stickybar.setAttribute("aria-hidden", String(!show));
    }
  }
  function requestFrame() {
    if (!ticking) { ticking = true; requestAnimationFrame(onFrame); }
  }
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame, { passive: true });
  onFrame();

  /* On mobile / reduced motion, all mech steps stay readable */
  if (reduced || !window.matchMedia("(min-width: 901px)").matches) {
    mechSteps.forEach((s) => s.classList.add("is-active"));
  }

  /* ---------- Play stage/hero videos only when visible ---------- */
  const mechVideo = document.querySelector("[data-mech-video]");
  if ("IntersectionObserver" in window) {
    const vids = [heroVideo, mechVideo].filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target;
        if (e.isIntersecting) v.play && v.play().catch(() => {});
        else v.pause && v.pause();
      });
    }, { threshold: 0.15 });
    vids.forEach((v) => io.observe(v));
  }

  /* ---------- Product-card hover spin videos ---------- */
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  document.querySelectorAll("[data-hover-card]").forEach((card) => {
    const v = card.querySelector("[data-hover-video]");
    if (!v) return;
    if (canHover) {
      card.addEventListener("mouseenter", () => v.play().catch(() => {}));
      card.addEventListener("mouseleave", () => { v.pause(); try { v.currentTime = 0; } catch (e) {} });
    } else if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => es.forEach((e) =>
        e.isIntersecting ? v.play().catch(() => {}) : v.pause()
      ), { threshold: 0.5 }).observe(card);
    }
  });

  /* ---------- Creator videos: hover / tap to play ---------- */
  const creators = document.querySelectorAll("[data-creator]");
  function playCreator(card) {
    creators.forEach((c) => { if (c !== card) pauseCreator(c); });
    card.querySelector("video").play()
      .then(() => card.classList.add("is-playing")).catch(() => {});
  }
  function pauseCreator(card) {
    card.querySelector("video").pause();
    card.classList.remove("is-playing");
  }
  creators.forEach((card) => {
    const v = card.querySelector("video");
    if (canHover) {
      card.addEventListener("mouseenter", () => playCreator(card));
      card.addEventListener("mouseleave", () => pauseCreator(card));
    }
    card.addEventListener("click", () => (v.paused ? playCreator(card) : pauseCreator(card)));
  });
  if ("IntersectionObserver" in window && creators.length) {
    const io = new IntersectionObserver((es) =>
      es.forEach((e) => { if (!e.isIntersecting) pauseCreator(e.target); }),
      { threshold: 0.4 });
    creators.forEach((c) => io.observe(c));
  }

  /* ---------- Testimonial wall: duplicate tracks for seamless loop ---------- */
  document.querySelectorAll(".sd-testi-wall .testi-track").forEach((t) => {
    t.innerHTML += t.innerHTML;
  });

  /* ---------- Buy box: plan, qty, add to cart ---------- */
  const plans = document.querySelectorAll(".plan");
  const qtyVal = document.querySelector("[data-qty-val]");
  const priceEl = document.querySelector("[data-add-price]");
  let qty = 1;
  const selectedPlan = () => document.querySelector(".plan input:checked")?.value || "subscribe";
  function refreshBuy() {
    if (!priceEl || !window.JING) return;
    const v = JING.PRODUCTS["aura"].variants[selectedPlan()];
    priceEl.textContent = JING.fmt(v.price * qty);
    qtyVal.textContent = qty;
    plans.forEach((p) => p.classList.toggle("is-selected", p.querySelector("input").checked));
  }
  plans.forEach((p) => p.querySelector("input").addEventListener("change", refreshBuy));
  document.querySelector("[data-qty-inc]")?.addEventListener("click", () => { qty = Math.min(9, qty + 1); refreshBuy(); });
  document.querySelector("[data-qty-dec]")?.addEventListener("click", () => { qty = Math.max(1, qty - 1); refreshBuy(); });
  document.querySelector("[data-add-to-cart]")?.addEventListener("click", () => {
    JING.addToCart("aura", selectedPlan(), qty);
    qty = 1; refreshBuy();
  });
  document.querySelector("[data-sticky-add]")?.addEventListener("click", () => {
    JING.addToCart("aura", "subscribe", 1);
  });
  refreshBuy();

  /* ---------- Buy gallery thumbs ---------- */
  const mainImg = document.getElementById("buy-main-img");
  document.querySelectorAll(".sd-buy-thumbs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!mainImg) return;
      mainImg.src = btn.dataset.thumb;
      document.querySelectorAll(".sd-buy-thumbs button").forEach((b) =>
        b.classList.toggle("is-active", b === btn));
    });
  });

  /* ---------- FAQ: close others when one opens ---------- */
  const faqs = document.querySelectorAll(".sd-faq-list details");
  faqs.forEach((d) => d.addEventListener("toggle", () => {
    if (d.open) faqs.forEach((o) => { if (o !== d) o.open = false; });
  }));
})();
