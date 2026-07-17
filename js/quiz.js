/* ============================================================
   JING — quiz.js
   "Build your morning" ritual quiz. Six questions, a safety
   gate, and a result assembled from blocks. Never diagnoses
   skin; never attributes a skin outcome to a botanical.
   Depends on store-au.js (JING global) for the cart.
   ============================================================ */

(() => {
  "use strict";

  const root = document.getElementById("qz-root");
  const bar = document.querySelector("[data-qz-bar]");
  if (!root) return;

  const BREVO_FORM_URL = "https://91b1bfc9.sibforms.com/serve/MUIFAE2j0NTI905dJ163yyDTrlGdRTnnKmKySUnfr7Y0GgKZnhnSAcu0I3Xt9zP6X1sU4Efr8x1UXo6RESffmsD5DahS-n-AqGlpukD9JNC7JYe3enl_eZnYJ7XcnC4i2rZsPl5w1RnzNs9VwatGk6j-mI4zBkYQurI7MDsdeOpSqbrp1SHqub9PeEsTH-iwD7Vh6lEJbUuilq4aFw==";

  /* ---------- State ---------- */
  const state = {
    step: 0,
    v: null,            // vehicle
    r: [],              // routine multi
    n1: null, n2: null, // nutrient rows (0/1/2)
    e: null,            // evidence
    a: null,            // adherence (low/med/high)
    b: "no",            // bloom (high/some/no)
    gate: false,
    gateChoices: [],
  };

  /* ---------- Drop-off tracking (localStorage counters) ---------- */
  function track(ev) {
    try {
      const k = "jing-quiz-stats";
      const s = JSON.parse(localStorage.getItem(k) || "{}");
      s[ev] = (s[ev] || 0) + 1;
      localStorage.setItem(k, JSON.stringify(s));
    } catch (e) {}
  }

  /* ---------- Derivations ---------- */
  function routineDepth() {
    const n = state.r.filter((x) => x !== "R_MINIMAL").length;
    return n <= 1 ? "light" : n <= 4 ? "considered" : "maximalist";
  }
  function nutrient() {
    const sum = (state.n1 || 0) + (state.n2 || 0);
    return sum >= 3 ? "steady" : sum >= 1 ? "patchy" : "thin";
  }

  /* ---------- Question definitions ---------- */
  const V_OPTS = [
    ["water", "A glass of water", "Before anything else"],
    ["coffee", "Coffee, immediately", "Non-negotiable"],
    ["smoothie", "A smoothie or yogurt", "Blended, most days"],
    ["warm", "Congee, oats, something warm", "A real breakfast"],
    ["none", "Honestly, nothing", "Mornings are a rush"],
  ];
  const R_OPTS = [
    ["R_CLEANSE", "Cleanser"],
    ["R_TONER", "Toner or essence"],
    ["R_SERUM", "Serum"],
    ["R_MOIST", "Moisturiser"],
    ["R_SPF", "SPF, daily"],
    ["R_MASK", "Masks or treatments"],
    ["R_ACTIVE", "Retinoid or acid, prescribed or otherwise"],
    ["R_MINIMAL", "Very little, and I'd like to change that"],
  ];
  const E_OPTS = [
    ["evidence", "Show me the study", "I read the citations"],
    ["heritage", "It's been done for centuries", "Tradition earns trust"],
    ["self", "I'll judge it on my own skin", "Eight weeks, then I'll tell you"],
  ];
  const A_OPTS = [
    ["low", "None. If I start something, I finish it"],
    ["low2", "One or two"],
    ["med", "Three or four"],
    ["high", "I've lost count"],
  ];
  const FREQ = [["2", "Most days"], ["1", "A few times a week"], ["0", "Rarely"]];

  /* ---------- Rendering helpers ---------- */
  function h(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function setBar() {
    if (bar) bar.style.width = state.step >= 6 ? "100%" : (state.step / 6) * 100 + "%";
  }
  function screen(inner, opts = {}) {
    root.innerHTML = "";
    const s = h(`<div class="qz-screen"></div>`);
    s.innerHTML = inner;
    root.appendChild(s);
    if (state.step > 0 && state.step < 6 && !opts.noBack) {
      const back = h(`<button type="button" class="qz-back">← Back</button>`);
      back.addEventListener("click", () => { state.step--; render(); });
      s.prepend(back);
    }
    setBar();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const qHead = (n, title, sub) => `
    <p class="qz-count mono">Question ${n} of 6</p>
    <h1 class="qz-title">${title}</h1>
    ${sub ? `<p class="qz-sub">${sub}</p>` : ""}`;

  /* ---------- Screens ---------- */
  function q1() {
    track("q1_seen");
    screen(qHead(1, "First, your morning. Not your skin.",
      "Aura is unflavoured for a reason. It should go wherever you already go.") +
      `<div class="qz-opts">` + V_OPTS.map(([v, l, s]) => `
        <button type="button" class="qz-opt ${state.v === v ? "is-on" : ""}" data-v="${v}">
          <span class="qz-opt-label">${l}</span><span class="qz-opt-sub">${s}</span>
        </button>`).join("") + `</div>`);
    root.querySelectorAll("[data-v]").forEach((btn) =>
      btn.addEventListener("click", () => { state.v = btn.dataset.v; track("q1_done"); state.step = 1; render(); }));
  }

  function q2() {
    track("q2_seen");
    screen(qHead(2, "What you already do stays.",
      "Aura works underneath a routine. It does not replace one. Select everything that applies.") +
      `<div class="qz-opts qz-opts--multi">` + R_OPTS.map(([v, l]) => `
        <button type="button" class="qz-opt qz-opt--chip ${state.r.includes(v) ? "is-on" : ""}" data-r="${v}">${l}</button>`).join("") +
      `</div><button type="button" class="btn btn--primary btn--lg qz-next" data-next disabled>Continue</button>`);
    const next = root.querySelector("[data-next]");
    const sync = () => { next.disabled = state.r.length === 0; };
    root.querySelectorAll("[data-r]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const v = btn.dataset.r;
        if (state.r.includes(v)) state.r = state.r.filter((x) => x !== v);
        else state.r.push(v);
        btn.classList.toggle("is-on");
        sync();
      }));
    next.addEventListener("click", () => { track("q2_done"); state.step = 2; render(); });
    sync();
  }

  function q3() {
    track("q3_seen");
    const row = (key, label, val) => `
      <div class="qz-row">
        <p class="qz-row-label">${label}</p>
        <div class="qz-row-opts">` + FREQ.map(([v, l]) => `
          <button type="button" class="qz-opt qz-opt--chip ${val === +v ? "is-on" : ""}" data-${key}="${v}">${l}</button>`).join("") +
        `</div></div>`;
    screen(qHead(3, "The nutrients with the claims come from food first.",
      "Aura is a top-up, not a substitute for a varied, balanced diet. So it's worth knowing what's already there.") +
      row("n1", "Capsicum, citrus, kiwi, broccoli, berries", state.n1) +
      row("n2", "Red meat, shellfish, legumes, seeds, wholegrains", state.n2) +
      `<button type="button" class="btn btn--primary btn--lg qz-next" data-next disabled>Continue</button>`);
    const next = root.querySelector("[data-next]");
    const sync = () => { next.disabled = state.n1 === null || state.n2 === null; };
    ["n1", "n2"].forEach((key) => {
      root.querySelectorAll(`[data-${key}]`).forEach((btn) =>
        btn.addEventListener("click", () => {
          state[key] = +btn.dataset[key];
          btn.parentElement.querySelectorAll(".qz-opt").forEach((b) => b.classList.toggle("is-on", b === btn));
          sync();
        }));
    });
    next.addEventListener("click", () => { track("q3_done"); state.step = 3; render(); });
    sync();
  }

  function q4() {
    track("q4_seen");
    screen(qHead(4, "Before the result, one honest question.",
      "How do you decide something actually works?") +
      `<div class="qz-opts">` + E_OPTS.map(([v, l, s]) => `
        <button type="button" class="qz-opt ${state.e === v ? "is-on" : ""}" data-e="${v}">
          <span class="qz-opt-label">${l}</span><span class="qz-opt-sub">${s}</span>
        </button>`).join("") + `</div>`);
    root.querySelectorAll("[data-e]").forEach((btn) =>
      btn.addEventListener("click", () => { state.e = btn.dataset.e; track("q4_done"); state.step = 4; render(); }));
  }

  function q5() {
    track("q5_seen");
    screen(qHead(5, "Be honest. How many daily habits have you started and quietly stopped?",
      "This one decides what we recommend you buy. A ritual that doesn't stick is money you shouldn't spend.") +
      `<div class="qz-opts">` + A_OPTS.map(([v, l]) => `
        <button type="button" class="qz-opt ${state.a === v ? "is-on" : ""}" data-a="${v}">
          <span class="qz-opt-label">${l}</span>
        </button>`).join("") + `</div>`);
    root.querySelectorAll("[data-a]").forEach((btn) =>
      btn.addEventListener("click", () => { state.a = btn.dataset.a; track("q5_done"); state.step = 5; render(); }));
  }

  function q6() {
    track("q6_seen");
    const bOpts = [["high", "Yes, very much"], ["some", "A little"], ["no", "Not really"]];
    const gOpts = [["preg", "I'm pregnant or breastfeeding"], ["meds", "I'm taking prescription medication"], ["none", "None of these"]];
    screen(qHead(6, "Two last things.", "Both optional.") +
      `<p class="qz-row-label">Is hair also on your mind?</p>
       <p class="qz-fine">Bloom is in development. We'll only write to you when it's real.</p>
       <div class="qz-row-opts">` + bOpts.map(([v, l]) => `
         <button type="button" class="qz-opt qz-opt--chip ${state.b === v ? "is-on" : ""}" data-b="${v}">${l}</button>`).join("") + `</div>
       <p class="qz-row-label" style="margin-top:1.8rem">Anything we should know?</p>
       <div class="qz-row-opts">` + gOpts.map(([v, l]) => `
         <button type="button" class="qz-opt qz-opt--chip ${state.gateChoices.includes(v) ? "is-on" : ""}" data-g="${v}">${l}</button>`).join("") + `</div>
       <button type="button" class="btn btn--primary btn--lg qz-next" data-next>See my ritual</button>`);
    root.querySelectorAll("[data-b]").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.b = btn.dataset.b;
        btn.parentElement.querySelectorAll(".qz-opt").forEach((x) => x.classList.toggle("is-on", x === btn));
      }));
    root.querySelectorAll("[data-g]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const v = btn.dataset.g;
        if (v === "none") {
          state.gateChoices = state.gateChoices.includes("none") ? [] : ["none"];
        } else {
          state.gateChoices = state.gateChoices.filter((x) => x !== "none");
          if (state.gateChoices.includes(v)) state.gateChoices = state.gateChoices.filter((x) => x !== v);
          else state.gateChoices.push(v);
        }
        root.querySelectorAll("[data-g]").forEach((x) =>
          x.classList.toggle("is-on", state.gateChoices.includes(x.dataset.g)));
      }));
    root.querySelector("[data-next]").addEventListener("click", () => {
      state.gate = state.gateChoices.some((x) => x === "preg" || x === "meds");
      track("q6_done");
      state.step = 6;
      render();
    });
  }

  /* ---------- Result copy blocks ---------- */
  const HEADLINES = {
    evidence: ["Your morning, printed to the milligram.", "Two authorised claims. Four named botanicals. Nothing else pretending."],
    heritage: ["Your morning, four hundred years in the making.", "The tradition your grandmother knew. The honesty she never got."],
    self: ["Your morning. Judge it in eight weeks.", "We won't tell you what you'll see. Your skin will."],
  };
  const VEHICLES = {
    water: "One stick, into the first glass of the day. It disappears. That's the point.",
    coffee: "Coffee is not the vehicle. Stir Aura into the water you drink beside it, before the first sip.",
    smoothie: "Straight into the blender. Unflavoured, so your smoothie tastes like your smoothie.",
    warm: "Stirred through congee or oats, the way tremella has been eaten for centuries.",
    none: "You said your mornings are a rush. So anchor it to something that already happens. Kettle on, stick in, done in ten seconds.",
  };
  const NUTRIENTS = {
    steady: "You're already eating well. Aura sits on top of that, not in place of it. One stick brings both nutrients to 100% NRV on the days food doesn't.",
    patchy: "Food first, always. On the days it slips, one stick puts Vitamin C and Zinc back at 100% NRV.",
    thin: "Start with the plate. Genuinely. Then one stick holds both nutrients at 100% NRV while you do.",
  };
  const ROUTINES = {
    light: "You keep it simple. Aura fits that. One stick, no steps to remember.",
    considered: "Your routine works on the surface. Aura works underneath it. Nothing gets replaced.",
    maximalist: "You've built a serious routine. This is the layer it doesn't have.",
  };
  const OFFERS = {
    low: ["subscribe", "Subscribe · A$75 every 4 weeks", "You finish what you start. Take the A$14 off and stop thinking about it. Pause anytime."],
    med: ["subscribe", "Subscribe · A$75 every 4 weeks", "Three or four abandoned habits is normal. Subscribe anyway. It's A$14 cheaper and you can pause in two clicks, which is easier than remembering to reorder."],
    high: ["month", "Single box · A$89", "You've lost count. So don't subscribe. Buy one box, run it for 30 days, and if it doesn't stick we refund it. Come back when it has."],
  };

  /* ---------- Result URL ---------- */
  function writeResultURL() {
    const p = new URLSearchParams({
      v: state.v, e: state.e, a: state.a === "low2" ? "low" : state.a,
      n: nutrient(), rd: routineDepth(),
      ra: state.r.includes("R_ACTIVE") ? "1" : "0",
      b: state.b, g: state.gate ? "1" : "0",
    });
    history.replaceState(null, "", location.pathname + "?" + p.toString());
  }
  function readResultURL() {
    const p = new URLSearchParams(location.search);
    if (!p.get("v") || !p.get("e") || !p.get("a")) return false;
    state.v = p.get("v"); state.e = p.get("e"); state.a = p.get("a");
    state.gate = p.get("g") === "1"; state.b = p.get("b") || "no";
    state._n = p.get("n") || "patchy"; state._rd = p.get("rd") || "considered";
    state._ra = p.get("ra") === "1";
    state.step = 6;
    return true;
  }

  /* ---------- Email capture ---------- */
  function emailBlock(gateHeld) {
    return `
      <div class="qz-block qz-email">
        <h2>${gateHeld ? "Email me the ritual for later" : "Want this as a card?"}</h2>
        <p>We'll send your ritual, and roughly one useful email a month. No miracles.</p>
        <form class="qz-email-form" data-qz-email>
          <input type="email" required placeholder="Email address" aria-label="Email address">
          <button class="btn btn--primary" type="submit">Send it</button>
        </form>
        <div class="qz-email-optional">
          <select aria-label="Age range (optional)" data-qz-age>
            <option value="">Age range (optional)</option>
            <option>Under 25</option><option>25 to 34</option><option>35 to 44</option>
            <option>45 to 54</option><option>55+</option>
          </select>
          <input type="text" data-qz-self placeholder="How you'd describe yourself (optional, and only so we write to you like a person)" aria-label="How you would describe yourself (optional)">
        </div>
        <p class="qz-fine" data-qz-email-msg aria-live="polite"></p>
      </div>`;
  }
  function wireEmail(gateHeld) {
    const form = root.querySelector("[data-qz-email]");
    if (!form) return;
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const email = form.querySelector("input[type=email]");
      const msg = root.querySelector("[data-qz-email-msg]");
      if (!email.checkValidity()) { email.reportValidity(); return; }
      const btn = form.querySelector("button"); btn.disabled = true;
      try {
        const data = new FormData();
        data.append("EMAIL", email.value);
        data.append("email_address_check", "");
        data.append("locale", "en");
        await fetch(BREVO_FORM_URL, { method: "POST", body: data, mode: "no-cors" });
        try {
          localStorage.setItem("jing-quiz-profile", JSON.stringify({
            email: email.value,
            vehicle: state.v, evidence: state.e,
            adherence: state.a === "low2" ? "low" : state.a,
            nutrient: state._n || nutrient(), routine_depth: state._rd || routineDepth(),
            bloom_interest: state.b, gate_held: gateHeld,
            age: root.querySelector("[data-qz-age]")?.value || "",
            self: root.querySelector("[data-qz-self]")?.value || "",
            completed_at: new Date().toISOString(),
          }));
        } catch (e) {}
        if (msg) msg.textContent = "Sent. Check your inbox.";
        form.reset();
      } catch (e) {
        if (msg) msg.textContent = "Something went wrong. Please try again.";
      } finally { btn.disabled = false; }
    });
  }

  /* ---------- Gate page ---------- */
  function gatePage() {
    track("gate_held");
    writeResultURL();
    screen(`
      <p class="qz-count mono">Your result</p>
      <h1 class="qz-title">Speak to someone first.</h1>
      <p class="qz-body">Aura is a food product, not a medicine, and it's very likely fine. But we're not going to be the ones to tell you that.</p>
      <p class="qz-body">Check with your GP, pharmacist or midwife. Bring them the label. Every dose is printed on it, which is more than most can say.</p>
      <p style="margin:1.6rem 0"><a class="sd-arrow-link" href="standards.html#dossiers">Read the full ingredient dossier <span aria-hidden="true">→</span></a></p>
      ${emailBlock(true)}`, { noBack: true });
    wireEmail(true);
  }

  /* ---------- Result page ---------- */
  function resultPage() {
    track("result_seen");
    const n = state._n || nutrient();
    const rd = state._rd || routineDepth();
    const ra = state._ra !== undefined ? state._ra : state.r.includes("R_ACTIVE");
    const aKey = state.a === "low2" ? "low" : state.a;
    const [hl, hlSub] = HEADLINES[state.e] || HEADLINES.self;
    const [variant, offerTitle, offerCopy] = OFFERS[aKey] || OFFERS.med;
    if (!state._n) writeResultURL();

    const bloomCard = state.b === "high" ? `
      <div class="qz-block qz-bloom">
        <p class="mono qz-block-kicker">Bloom · in development</p>
        <p>Hair, same discipline, same disclosed doses. Join the list below and we'll only write to you when it's real.</p>
      </div>` : state.b === "some" ? `
      <p class="qz-fine" style="text-align:center">Hair on your mind a little? Bloom is in development. The email below doubles as its waitlist.</p>` : "";

    screen(`
      <p class="qz-count mono">Your ritual</p>
      <h1 class="qz-title">${hl}</h1>
      <p class="qz-sub">${hlSub}</p>

      <div class="qz-block">
        <p class="mono qz-block-kicker">The how</p>
        <p class="qz-body">${VEHICLES[state.v] || VEHICLES.water}</p>
      </div>

      <div class="qz-block qz-dose">
        <p class="mono qz-block-kicker">The dose, printed</p>
        <p class="qz-body">Tremella 2,500 mg. Goji 500 mg. Schisandra 500 mg. Astragalus 9 mg, at the level permitted for foods.<br>Vitamin C 80 mg. Zinc 10 mg. Both at 100% NRV.</p>
        <p class="qz-body">Vitamin C contributes to normal collagen formation for the normal function of skin. Zinc contributes to the maintenance of normal skin.</p>
        <p class="qz-body">The four botanicals are named for what they are and dosed where you can see them. They carry no skin claims, and we're not going to invent any.</p>
      </div>

      <div class="qz-block">
        <p class="mono qz-block-kicker">Food first</p>
        <p class="qz-body">${NUTRIENTS[n]}</p>
      </div>

      <div class="qz-block">
        <p class="mono qz-block-kicker">Your routine</p>
        <p class="qz-body">${ROUTINES[rd]}${ra ? " On a retinoid or acid? Nothing changes. Aura is a food, taken by mouth, and it doesn't touch your actives." : ""}</p>
      </div>

      <div class="qz-block qz-timeline">
        <p class="mono qz-block-kicker">What to expect</p>
        <p class="qz-body"><strong>Week 1.</strong> Nothing. This is not a filter.<br>
        <strong>Week 4.</strong> One full skin cycle. Roughly 28 days.<br>
        <strong>Week 8.</strong> Where most members make up their minds.</p>
        <p class="qz-body">If you don't feel the difference in 30 days, we refund your first box in full.</p>
      </div>

      <div class="qz-block qz-offer">
        <p class="mono qz-block-kicker">Our recommendation</p>
        <h2>${offerTitle}</h2>
        <p class="qz-body">${offerCopy}</p>
        <button type="button" class="btn btn--primary btn--lg" data-qz-add="${variant}">Add to cart</button>
        <p class="qz-fine">Free Australian shipping over A$70. Not a substitute for a varied, balanced diet and a healthy lifestyle.</p>
      </div>

      ${bloomCard}
      ${emailBlock(false)}

      <p class="qz-fine" style="text-align:center;margin-top:1.6rem">
        <a href="quiz.html" style="text-decoration:underline">Retake the quiz</a> · This link holds your result, share it or come back to it.
      </p>`, { noBack: true });

    root.querySelector("[data-qz-add]")?.addEventListener("click", (ev) => {
      track("result_add_to_cart");
      if (typeof JING !== "undefined") JING.addToCart("aura", ev.currentTarget.dataset.qzAdd, 1);
    });
    wireEmail(false);
  }

  /* ---------- Router ---------- */
  function render() {
    if (state.step >= 6) { state.gate ? gatePage() : resultPage(); return; }
    [q1, q2, q3, q4, q5, q6][state.step]();
  }

  if (readResultURL()) render();
  else { track("quiz_start"); render(); }
})();
