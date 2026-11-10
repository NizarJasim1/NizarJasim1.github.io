// =============================================================
//  UI — تفاصيل الصفحة الحيّة
//  • غنائم دائرية بفيزياء حقيقية (Matter.js): تطيح، تتصادم، تنسحب وتنرمى
//  • خيط أحمر بريشة يتدلى من المؤشر (Verlet)
//  • نص يتخربط ويرجع (ScrambleText)
// =============================================================
const $ = (s, r = document) => r.querySelector(s);

// ---------------- الغنائم: أقراص صغيرة بفيزياء ----------------
export function physicsTokens(field, items, { mobile, flag }) {
  const M = window.Matter;
  if (!M) return null;
  const { Engine, Bodies, Composite, Body, Constraint, Query, Vector } = M;
  const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.0012 } });
  const els = items.map((it) => {
    const el = document.createElement("div");
    const d = Math.round((it.big ? 1.25 : 1) * (mobile ? 74 : 92));
    el.className = "token" + (it.big ? " big" : "") + (it.live ? " live" : "");
    el.style.width = el.style.height = d + "px";
    el.innerHTML = `<i></i><b>${it.n}</b><small>${it.s}</small>`;
    field.appendChild(el);
    el.style.transform = "translate(-9999px,0)";
    return { el, r: d / 2 };
  });
  let walls = [];
  function buildWalls() {
    Composite.remove(engine.world, walls);
    const W = field.clientWidth, H = field.clientHeight, T = 400;
    walls = [
      Bodies.rectangle(W / 2, H + T / 2, W + T * 2, T, { isStatic: true, friction: 0.5 }),
      Bodies.rectangle(-T / 2, H / 2 - 600, T, H + 2400, { isStatic: true }),
      Bodies.rectangle(W + T / 2, H / 2 - 600, T, H + 2400, { isStatic: true }),
    ];
    Composite.add(engine.world, walls);
  }
  buildWalls();
  addEventListener("resize", buildWalls);
  const bodies = els.map(({ r }) => Bodies.circle(0, 0, r, { restitution: 0.42, friction: 0.08, frictionAir: 0.012, density: 0.0018 }));
  bodies.forEach((b) => Body.setInertia(b, Infinity)); // تتزحلق وتتصادم بدون ما تنقلب، حتى الكتابة تبقى تنقرا
  let dropped = false;
  function drop() {
    const W = field.clientWidth;
    bodies.forEach((b, i) => {
      Body.setPosition(b, { x: 50 + ((i * 97) % Math.max(60, W - 100)), y: -90 - i * 70 });
      Body.setVelocity(b, { x: (Math.random() - 0.5) * 3, y: 0 });
      Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.1);
    });
    if (!dropped) Composite.add(engine.world, bodies);
    dropped = true;
  }
  const local = (e) => { const r = field.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  let drag = null, dragBody = null, last = null;
  els.forEach(({ el }, i) => {
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault(); e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      const p = local(e), b = bodies[i];
      dragBody = b;
      drag = Constraint.create({ pointA: p, bodyB: b, pointB: Vector.rotate(Vector.sub(p, b.position), -b.angle), stiffness: 0.18, damping: 0.1, length: 0 });
      Composite.add(engine.world, drag);
      el.classList.add("held");
    });
    el.addEventListener("pointermove", (e) => { if (drag && dragBody === bodies[i]) drag.pointA = local(e); });
    const up = () => {
      if (!drag || dragBody !== bodies[i]) return;
      Composite.remove(engine.world, drag);
      if (dragBody.speed > 24 && flag) flag("throw", "Nice throw! 🪶 NJBC{crows_never_drop_loot}");
      drag = null; dragBody = null; el.classList.remove("held");
    };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  });
  field.addEventListener("pointermove", (e) => {
    const p = local(e);
    if (last && !drag) {
      const dx = p.x - last.x, dy = p.y - last.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) for (const b of Query.point(bodies, p)) Body.applyForce(b, p, { x: dx * 0.0005 * b.mass, y: dy * 0.0005 * b.mass });
    }
    last = p;
  });
  field.addEventListener("pointerleave", () => (last = null));
  let active = false;
  function tick() {
    if (!active) return;
    Engine.update(engine, 1000 / 60);
    bodies.forEach((b, i) => {
      const { el, r } = els[i];
      el.style.transform = `translate(${(b.position.x - r).toFixed(1)}px,${(b.position.y - r).toFixed(1)}px) rotate(${b.angle.toFixed(3)}rad)`;
    });
  }
  gsap.ticker.add(tick);
  if (new URLSearchParams(location.search).has("test")) window.__phys = (n) => { const was = active; active = true; for (let i = 0; i < n; i++) tick(); active = was; };
  return {
    setActive(v) { active = v; if (v && !dropped) drop(); },
    shake() { bodies.forEach((b) => Body.setVelocity(b, { x: (Math.random() - 0.5) * 12, y: -10 - Math.random() * 8 })); },
  };
}

// ---------------- خيط المؤشر ----------------
export function cursorRope(pointer) {
  const cv = $("#rope"), g = cv.getContext("2d");
  const N = 16, SEG = 7, pts = Array.from({ length: N }, () => ({ x: pointer.x, y: pointer.y, px: pointer.x, py: pointer.y }));
  const size = () => { const d = Math.min(devicePixelRatio, 2); cv.width = innerWidth * d; cv.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0); };
  size(); addEventListener("resize", size);
  gsap.ticker.add(() => {
    pts[0].x = pointer.x; pts[0].y = pointer.y;
    for (let i = 1; i < N; i++) {
      const p = pts[i], vx = (p.x - p.px) * 0.97, vy = (p.y - p.py) * 0.97;
      p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + 0.45;
    }
    for (let it = 0; it < 6; it++)
      for (let i = 0; i < N - 1; i++) {
        const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, diff = (d - SEG) / d;
        if (i === 0) { b.x -= dx * diff; b.y -= dy * diff; }
        else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
      }
    g.clearRect(0, 0, innerWidth, innerHeight);
    if (!pointer.active) return;
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < N - 1; i++) { const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2; g.quadraticCurveTo(pts[i].x, pts[i].y, mx, my); }
    g.strokeStyle = "rgba(224,17,34,.55)"; g.lineWidth = 1.2; g.stroke();
    const e = pts[N - 1], f = pts[N - 3], ang = Math.atan2(e.y - f.y, e.x - f.x);
    g.save(); g.translate(e.x, e.y); g.rotate(ang);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(7, -4, 16, 0); g.quadraticCurveTo(7, 4, 0, 0);
    g.fillStyle = "#e01122"; g.fill();
    g.strokeStyle = "rgba(0,0,0,.6)"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 0); g.lineTo(15, 0); g.stroke();
    g.restore();
  });
}

// نص يتخربط بأرقام ويرجع لأصله
export function scramble(el) {
  if (!window.ScrambleTextPlugin || !el) return;
  const txt = el.dataset.txt || (el.dataset.txt = el.textContent);
  gsap.to(el, { duration: 1.0, scrambleText: { text: txt, chars: "01", revealDelay: 0.2, speed: 0.5 }, overwrite: true });
}
