/* ============================================================
   JING — tin-spin3d.js
   Photorealistic rotating tin: a real 3D cylinder (WebGL /
   Three.js) with the actual flat label wrapped as a texture and
   the real lid on top. Soft studio environment lighting + a
   contact shadow so it reads as product photography, while every
   angle of the rotation shows the true label.
   ============================================================ */

import * as THREE from "three";
import { RoomEnvironment } from "./vendor/RoomEnvironment.js";

const canvas = document.querySelector("canvas[data-tin-spin]");
if (canvas) init(canvas);

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

async function init(canvas) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // per-product config (defaults = Skin Mix, so the original render still reproduces)
  const d = canvas.dataset;
  const LABEL_SRC    = d.label || "assets/label-wrap-hi.png";
  const LID_SRC      = d.lid || "assets/lid-badge.png";
  const LID_DISC     = d.lidDisc || "#A9432B";        // colour behind the badge's transparent rim
  const SPIN_SECONDS = parseFloat(d.spinSeconds || "20");   // one revolution
  const FRONT_OFFSET = parseFloat(d.frontOffset || "0.16"); // texture rotation so the name faces camera
  // Camera/shadow are set so the render reads as real product photography: the tin
  // held small in frame with room around it, lit so the contact shadow stays short
  // and soft. These carry through a downstream photoreal pass unchanged, so a wrong
  // value here ships straight to the output as a "CGI" tell.
  const CAM_Y   = parseFloat(d.camY || "4.8");
  const CAM_Z   = parseFloat(d.camZ || "10.9");
  const LOOK_Y  = parseFloat(d.lookY || "0.3");
  const SHADOW  = parseFloat(d.shadow || "0.07");

  // Geometry ratios (body radius = 1), measured off the real tins in
  // Product/Skin Mix Tin/photo_2026-06-25_23-26-32.jpg: the body is ~0.78x the
  // diameter and the lid is a shallow cap, not a deep collar.
  //
  // BODY_H is what makes the label reach. The label wraps the circumference
  // exactly once, so its height in world units is fixed at 2*PI*R/aspect; the
  // fraction of the body it covers is therefore (2*PI*R/aspect)/BODY_H. Too tall a
  // body and the wrap can't reach the base rim, leaving the white gap the real tin
  // doesn't have. At BODY_H 1.60 the wrap covers ~87%, matching the real tin.
  const R = 1;
  const BODY_H = parseFloat(d.bodyH || "1.60");
  const LID_R = 1.035;
  const LID_H = parseFloat(d.lidH || "0.38");

  let labelImg, lidImg;
  try {
    [labelImg, lidImg] = await Promise.all([
      loadImage(LABEL_SRC),
      loadImage(LID_SRC),
    ]);
  } catch (e) { return; }

  // The label wraps exactly once around the circumference, so its height in world
  // units is circumference/aspect — derive the band height instead of hard-coding it,
  // otherwise a label with a different aspect renders horizontally squashed.
  const LABEL_FRAC = ((2 * Math.PI * R) / (labelImg.width / labelImg.height)) / BODY_H;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = gradientBackground();

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, CAM_Y, CAM_Z);
  camera.lookAt(0, LOOK_Y, 0);

  // soft studio reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  // key light (casts the contact shadow) + gentle fill
  // Nearly overhead and slightly off-axis: keeps the shadow tucked short and soft
  // under the tin instead of throwing a long hard slab across the sweep.
  const key = new THREE.DirectionalLight(0xfff4e6, 1.9);
  key.position.set(-1.2, 11.0, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1; key.shadow.camera.far = 26;
  key.shadow.camera.left = -4; key.shadow.camera.right = 4;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0005; key.shadow.radius = 14;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.62);
  fill.position.set(4, 1.5, 3);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.26));

  const bodyBottomY = -BODY_H / 2;

  // ground shadow catcher
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: SHADOW })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = bodyBottomY;
  ground.receiveShadow = true;
  scene.add(ground);

  const tin = new THREE.Group();
  scene.add(tin);

  // ---- BODY: white can with the label baked into the middle band ----
  const bodyTex = new THREE.CanvasTexture(buildBodyCanvas(labelImg, LABEL_FRAC));
  bodyTex.colorSpace = THREE.SRGBColorSpace;
  bodyTex.wrapS = THREE.RepeatWrapping;
  bodyTex.wrapT = THREE.ClampToEdgeWrapping;
  bodyTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  bodyTex.offset.x = FRONT_OFFSET;
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, BODY_H, 160, 1, true),
    new THREE.MeshStandardMaterial({ map: bodyTex, roughness: 0.6, metalness: 0.0, envMapIntensity: 0.55 })
  );
  body.castShadow = true; body.receiveShadow = true;
  tin.add(body);

  // ---- BASE: shallow foot ring, so the can sits on the sweep instead of ending
  // in a bare cylinder edge (the seam reads as real packaging) ----
  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 1.012, R * 1.012, 0.06, 160, 1, false),
    new THREE.MeshStandardMaterial({ color: 0xefe8de, roughness: 0.55, metalness: 0.05, envMapIntensity: 0.6 })
  );
  foot.position.y = bodyBottomY + 0.03;
  foot.castShadow = true; foot.receiveShadow = true;
  tin.add(foot);

  // ---- LID: white overhanging rim + artwork top disc ----
  const lidRimBottom = BODY_H / 2 - 0.07;   // small overhang onto the body
  // Composite the lid artwork onto a solid disc so the rim isn't transparent (a
  // transparent border reads as black). The badge is first cropped to its opaque
  // bounds and drawn edge-to-edge, so the artwork circle fills the cap exactly
  // instead of floating inside a ring.
  const lc = document.createElement("canvas");
  lc.width = lc.height = Math.max(640, lidImg.width);
  const lcx = lc.getContext("2d");
  lcx.fillStyle = LID_DISC;
  lcx.beginPath();
  lcx.arc(lc.width / 2, lc.height / 2, lc.width / 2, 0, Math.PI * 2);
  lcx.fill();
  const bb = alphaBounds(lidImg);
  lcx.drawImage(lidImg, bb.x, bb.y, bb.w, bb.h, 0, 0, lc.width, lc.height);
  const lidTex = new THREE.CanvasTexture(lc);
  lidTex.colorSpace = THREE.SRGBColorSpace;
  lidTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const whiteLid = new THREE.MeshStandardMaterial({ color: 0xf3ede4, roughness: 0.5, metalness: 0.04, envMapIntensity: 0.7 });
  const terraTop = new THREE.MeshStandardMaterial({ map: lidTex, color: 0xffffff, roughness: 0.66, metalness: 0.0, envMapIntensity: 0.5 });
  // single capped cylinder: [side, top, bottom] — top cap carries the lid artwork
  const lidRim = new THREE.Mesh(
    new THREE.CylinderGeometry(LID_R, LID_R, LID_H, 160, 1, false),
    [whiteLid, terraTop, whiteLid]
  );
  lidRim.position.y = lidRimBottom + LID_H / 2;
  lidRim.castShadow = true;
  tin.add(lidRim);

  // ---- size / render loop ----
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const s = Math.max(120, Math.min(rect.width, rect.height));
    renderer.setSize(s, s, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }
  resize();
  renderer.render(scene, camera);

  let running = false, raf = 0, last = 0;
  function frame(t) {
    if (!last) last = t;
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    tin.rotation.y += (dt / SPIN_SECONDS) * Math.PI * 2;
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }
  function start() { if (running || reduce) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  // Hook used when capturing the turntable to a reference clip (tune the front
  // offset live, reset to a known angle, then spin for exactly one revolution).
  window.__tinCtl = {
    canvas, stop, spinSeconds: SPIN_SECONDS,
    start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
    reset() { tin.rotation.y = 0; renderer.render(scene, camera); },
    setOffset(v) { bodyTex.offset.x = v; renderer.render(scene, camera); },
    // Advance and draw one frame explicitly. Capturing via requestAnimationFrame
    // stalls whenever the pane isn't compositing, which yields a single-frame clip;
    // a setInterval-driven step() keeps recording deterministic.
    step(dt) { tin.rotation.y += (dt / SPIN_SECONDS) * Math.PI * 2; renderer.render(scene, camera); },
  };

  if (!reduce && "IntersectionObserver" in window) {
    new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting ? start() : stop()), { threshold: 0.05 }).observe(canvas);
  }
  let rz;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { resize(); renderer.render(scene, camera); }, 150); });
}

// Opaque bounding box of an image (used to crop a badge to its actual circle).
function alphaBounds(img) {
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  let data;
  try { data = x.getImageData(0, 0, c.width, c.height).data; }
  catch (e) { return { x: 0, y: 0, w: img.width, h: img.height }; }
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) {
    for (let x2 = 0; x2 < c.width; x2++) {
      if (data[(y * c.width + x2) * 4 + 3] > 8) {
        if (x2 < x0) x0 = x2; if (x2 > x1) x1 = x2;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w: img.width, h: img.height };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// White tin body with the label artwork inset as a horizontal band.
function buildBodyCanvas(labelImg, labelFrac) {
  const aspect = labelImg.width / labelImg.height;
  const texH = 1024;
  const labelH = Math.round(texH * labelFrac);
  const texW = Math.round(labelH * aspect);
  const c = document.createElement("canvas");
  c.width = texW; c.height = texH;
  const x = c.getContext("2d");
  x.fillStyle = "#f4efe6";
  x.fillRect(0, 0, texW, texH);
  const ly = Math.round((texH - labelH) / 2);
  x.drawImage(labelImg, 0, ly, texW, labelH);
  // faint metal shading at the very top and bottom
  const g = x.createLinearGradient(0, 0, 0, texH);
  g.addColorStop(0, "rgba(60,40,25,0.10)");
  g.addColorStop(0.09, "rgba(60,40,25,0)");
  g.addColorStop(0.91, "rgba(60,40,25,0)");
  g.addColorStop(1, "rgba(60,40,25,0.12)");
  x.fillStyle = g;
  x.fillRect(0, 0, texW, texH);
  return c;
}

// Soft cream→peach studio backdrop.
function gradientBackground() {
  const c = document.createElement("canvas");
  c.width = 32; c.height = 512;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, "#FCF4E8");
  g.addColorStop(0.6, "#F6E6D6");
  g.addColorStop(1, "#EFD8C6");
  x.fillStyle = g;
  x.fillRect(0, 0, 32, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
