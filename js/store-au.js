/* ============================================================
   JING — store.js
   Product catalog, cart (localStorage), cart drawer, and
   shared UI behaviours (nav, reveal animations, toast).
   ============================================================ */

const JING = (() => {
  "use strict";

  /* ---------- Catalog ---------- */
  const PRODUCTS = {
    "aura": {
      id: "aura",
      name: "Aura",
      sub: "Skin formula — with Vitamin C & Zinc",
      img: "assets/aura-box-sachet.jpg",
      variants: {
        "month": { id: "month", label: "Single Box", desc: "120 g · 30 × 4 g sticks · 4 week ritual", price: 89, compare: null },
        "subscribe": { id: "subscribe", label: "Subscribe · 4 Weeks", desc: "One box delivered monthly · pause anytime", price: 75, compare: 89 }
      }
    }
  };

  const FREE_SHIP_THRESHOLD = 70;
  const CART_KEY = "jing-cart-v1";
  const fmt = (n) => "A$" + n.toLocaleString("en-AU");

  /* ---------- Cart state ---------- */
  function readCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY)) || [];
      return raw.filter((l) => PRODUCTS[l.pid] && PRODUCTS[l.pid].variants[l.vid] && l.qty > 0);
    } catch { return []; }
  }
  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCartUI(cart);
  }
  function cartTotal(cart) {
    return cart.reduce((sum, l) => sum + PRODUCTS[l.pid].variants[l.vid].price * l.qty, 0);
  }
  function cartCount(cart) {
    return cart.reduce((sum, l) => sum + l.qty, 0);
  }

  function addToCart(pid, vid, qty = 1) {
    const cart = readCart();
    const line = cart.find((l) => l.pid === pid && l.vid === vid);
    if (line) line.qty += qty;
    else cart.push({ pid, vid, qty });
    writeCart(cart);
    bumpCount();
    openCart();
    toast(`${PRODUCTS[pid].name} — ${PRODUCTS[pid].variants[vid].label} added`);
  }
  function setQty(pid, vid, qty) {
    let cart = readCart();
    const line = cart.find((l) => l.pid === pid && l.vid === vid);
    if (!line) return;
    line.qty = qty;
    if (line.qty <= 0) cart = cart.filter((l) => l !== line);
    writeCart(cart);
  }
  function clearCart() { writeCart([]); }

  /* ---------- Cart drawer ---------- */
  let lastFocus = null;

  function svgIcon(name) {
    const icons = {
      check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
      bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7h12l1 14H5L6 7Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg>'
    };
    return icons[name] || "";
  }

  function renderCartUI(cart) {
    cart = cart || readCart();
    const count = cartCount(cart);
    document.querySelectorAll(".cart-count").forEach((el) => {
      el.textContent = count;
      el.classList.toggle("has-items", count > 0);
    });

    const itemsEl = document.querySelector(".cart-items");
    if (!itemsEl) return;

    if (!cart.length) {
      itemsEl.innerHTML = `
        <div class="cart-empty">
          ${svgIcon("bag")}
          <p>Your cart is empty.</p>
          <p style="font-size:var(--text-xs);margin-top:4px">One stick a day · 每日一包</p>
        </div>`;
    } else {
      itemsEl.innerHTML = cart.map((l) => {
        const p = PRODUCTS[l.pid], v = p.variants[l.vid];
        return `
        <div class="cart-item" data-pid="${l.pid}" data-vid="${l.vid}">
          <div class="cart-item-img"><img src="${v.img || p.img}" alt="${p.name}" width="76" height="76" loading="lazy"></div>
          <div>
            <h3>${p.name}</h3>
            <span class="variant">${v.label} · ${v.desc}</span>
            <div class="qty" aria-label="Quantity">
              <button type="button" data-cart-dec aria-label="Decrease quantity">−</button>
              <span class="qty-val" aria-live="polite">${l.qty}</span>
              <button type="button" data-cart-inc aria-label="Increase quantity">+</button>
            </div>
          </div>
          <div>
            <div class="cart-item-price">${fmt(v.price * l.qty)}</div>
            <button type="button" class="remove" data-cart-remove>Remove</button>
          </div>
        </div>`;
      }).join("");
    }

    const total = cartTotal(cart);
    const totalEl = document.querySelector("[data-cart-total]");
    if (totalEl) totalEl.textContent = fmt(total);

    const shipNote = document.querySelector("[data-ship-note]");
    const shipBar = document.querySelector(".free-ship-bar i");
    if (shipNote) {
      if (total >= FREE_SHIP_THRESHOLD) {
        shipNote.textContent = "You have free Australian shipping ✓";
      } else if (total > 0) {
        shipNote.textContent = `${fmt(FREE_SHIP_THRESHOLD - total)} away from free AU shipping`;
      } else {
        shipNote.textContent = `Free AU shipping over ${fmt(FREE_SHIP_THRESHOLD)}`;
      }
    }
    if (shipBar) shipBar.style.width = Math.min(100, (total / FREE_SHIP_THRESHOLD) * 100) + "%";

    const checkoutBtn = document.querySelector("[data-cart-checkout]");
    if (checkoutBtn) checkoutBtn.toggleAttribute("disabled", !cart.length);
  }

  function openCart() {
    lastFocus = document.activeElement;
    document.querySelector(".cart-drawer")?.classList.add("is-open");
    document.querySelector(".cart-overlay")?.classList.add("is-open");
    document.body.style.overflow = "hidden";
    document.querySelector(".cart-close")?.focus();
  }
  function closeCart() {
    document.querySelector(".cart-drawer")?.classList.remove("is-open");
    document.querySelector(".cart-overlay")?.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  function bumpCount() {
    document.querySelectorAll(".cart-count").forEach((el) => {
      el.classList.remove("bump");
      void el.offsetWidth;
      el.classList.add("bump");
    });
  }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.innerHTML = svgIcon("check") + `<span>${msg}</span>`;
    requestAnimationFrame(() => el.classList.add("is-visible"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 3200);
  }

  /* ---------- Shared UI ---------- */
  function initHeader() {
    const header = document.querySelector(".header");
    if (!header) return;
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const menuBtn = document.querySelector(".menu-btn");
    const nav = document.querySelector(".nav");
    if (menuBtn && nav) {
      menuBtn.addEventListener("click", () => {
        const open = nav.classList.toggle("is-open");
        menuBtn.setAttribute("aria-expanded", open);
        document.body.style.overflow = open ? "hidden" : "";
      });
      nav.querySelectorAll("a").forEach((a) =>
        a.addEventListener("click", () => {
          nav.classList.remove("is-open");
          menuBtn.setAttribute("aria-expanded", "false");
          document.body.style.overflow = "";
        })
      );
    }
  }

  function initReveal() {
    const els = document.querySelectorAll(".reveal, .reveal-img");
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el) => io.observe(el));
  }

  function initCountUp() {
    const nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const el = e.target;
        const target = parseFloat(el.dataset.count);
        const decimals = (el.dataset.count.split(".")[1] || "").length;
        if (reduced) { el.textContent = el.dataset.count; return; }
        const dur = 1400, t0 = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toFixed(decimals);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    nums.forEach((el) => io.observe(el));
  }

  function initCartEvents() {
    document.addEventListener("click", (ev) => {
      const t = ev.target;
      if (t.closest("[data-cart-open]")) { ev.preventDefault(); openCart(); }
      if (t.closest(".cart-close") || t.closest(".cart-overlay")) closeCart();

      const item = t.closest(".cart-item");
      if (item) {
        const { pid, vid } = item.dataset;
        const line = readCart().find((l) => l.pid === pid && l.vid === vid);
        if (!line) return;
        if (t.closest("[data-cart-inc]")) setQty(pid, vid, line.qty + 1);
        if (t.closest("[data-cart-dec]")) setQty(pid, vid, line.qty - 1);
        if (t.closest("[data-cart-remove]")) setQty(pid, vid, 0);
      }
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") closeCart();
    });
  }

  // Newsletter forms post to the Brevo "Join the Jing Community" form endpoint
  const BREVO_FORM_URL = "https://91b1bfc9.sibforms.com/serve/MUIFAE2j0NTI905dJ163yyDTrlGdRTnnKmKySUnfr7Y0GgKZnhnSAcu0I3Xt9zP6X1sU4Efr8x1UXo6RESffmsD5DahS-n-AqGlpukD9JNC7JYe3enl_eZnYJ7XcnC4i2rZsPl5w1RnzNs9VwatGk6j-mI4zBkYQurI7MDsdeOpSqbrp1SHqub9PeEsTH-iwD7Vh6lEJbUuilq4aFw==";

  function initNewsletter() {
    document.querySelectorAll("[data-newsletter]").forEach((form) => {
      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const email = form.querySelector("input[type=email]");
        const msg = form.parentElement.querySelector(".form-msg");
        const btn = form.querySelector("button[type=submit]");
        if (!email.checkValidity()) { email.reportValidity(); return; }
        if (btn) btn.disabled = true;
        try {
          const data = new FormData();
          data.append("EMAIL", email.value);
          data.append("email_address_check", ""); // Brevo honeypot — must be empty
          data.append("locale", "en");
          await fetch(BREVO_FORM_URL, { method: "POST", body: data, mode: "no-cors" });
          if (msg) msg.textContent = "Welcome to the ritual — check your inbox.";
          form.reset();
        } catch (e) {
          if (msg) msg.textContent = "Something went wrong — please try again.";
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    });
  }

  function init() {
    initHeader();
    initReveal();
    initCountUp();
    initCartEvents();
    initNewsletter();
    renderCartUI();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { PRODUCTS, fmt, readCart, writeCart, addToCart, setQty, clearCart, cartTotal, cartCount, openCart, closeCart, toast, FREE_SHIP_THRESHOLD };
})();
