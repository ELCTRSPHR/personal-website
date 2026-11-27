const defaultRoles = ["Dreamer", "Creator", "Esports Champion", "Pushing Beyond Functional Limits"];

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ---------- Preloader ---------- */
document.body.classList.add("loading");
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("preloader").classList.add("done");
    document.body.classList.remove("loading");
    // reveal hero content right after the loader fades
    document.querySelectorAll(".hero .reveal").forEach((el, i) => {
      setTimeout(() => el.classList.add("visible"), 150 * i);
    });
  }, reduceMotion ? 0 : 1300);
});

/* ---------- Footer year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- Typing effect ---------- */
(function typer() {
  const el = document.getElementById("typed");
  if (!el) return;
  const roles = el.dataset.roles ? el.dataset.roles.split("|") : defaultRoles;
  if (reduceMotion) { el.textContent = roles[0]; return; }
  let r = 0, c = 0, deleting = false;
  function tick() {
    const word = roles[r];
    el.textContent = word.slice(0, c);
    if (!deleting && c < word.length) c++;
    else if (deleting && c > 0) c--;
    else if (!deleting) { deleting = true; return setTimeout(tick, 2800); }
    else { deleting = false; r = (r + 1) % roles.length; }
    setTimeout(tick, deleting ? 45 : 65);
  }
  setTimeout(tick, 1100);
})();

/* ---------- Nav: shrink on scroll, progress bar, active link ---------- */
const nav = document.getElementById("nav");
const progress = document.getElementById("scrollProgress");
const planet = document.getElementById("planet");
const links = document.querySelectorAll(".nav__link");
const sections = [...document.querySelectorAll("main section[id]")];

function onScroll() {
  const y = window.scrollY;
  nav.classList.toggle("scrolled", y > 40);
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
  if (planet && !reduceMotion) planet.style.setProperty("--planet-shift", (y * -0.06).toFixed(1) + "px");

  let current = sections[0].dataset.nav || sections[0].id;
  for (const s of sections) if (s.offsetTop - innerHeight * 0.4 <= y) current = s.dataset.nav || s.id;
  links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + current));
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Mobile menu ---------- */
const toggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
toggle.addEventListener("click", () => {
  toggle.classList.toggle("open");
  navLinks.classList.toggle("open");
});
links.forEach(l => l.addEventListener("click", () => {
  toggle.classList.remove("open");
  navLinks.classList.remove("open");
}));

/* ---------- Scroll reveal (both directions) + counters ---------- */
const pendingReveal = new WeakMap();

// Animate elements in as they enter the screen, from either direction.
const revealer = new IntersectionObserver((entries) => {
  const entering = entries.filter(e =>
    e.isIntersecting && !e.target.classList.contains("visible") && !pendingReveal.has(e.target));

  // stagger elements that appear together, in the order you scroll into them
  entering.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
  if (entering.some(e => e.boundingClientRect.top < 0)) entering.reverse();

  entering.forEach((entry, i) => {
    const el = entry.target;
    pendingReveal.set(el, setTimeout(() => {
      pendingReveal.delete(el);
      el.classList.add("visible");
    }, reduceMotion ? 0 : i * 110));

    if (el.classList.contains("stats") && !el.dataset.counted) {
      el.dataset.counted = "1";
      el.querySelectorAll(".stat__num").forEach(countUp);
    }
  });
}, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });

// Reset elements once they are fully off-screen, so they animate again next time.
// Elements that left through the top come back sliding down; the rest slide up.
const resetter = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) return;
    const el = entry.target;
    clearTimeout(pendingReveal.get(el));
    pendingReveal.delete(el);
    el.classList.remove("visible");
    el.classList.toggle("from-above", entry.boundingClientRect.top < 0);
  });
}, { threshold: 0 });

document.querySelectorAll(".reveal").forEach(el => {
  if (el.closest(".hero")) return;
  revealer.observe(el);
  if (!reduceMotion) resetter.observe(el);
});

function countUp(el) {
  const target = +el.dataset.count;
  if (reduceMotion) { el.textContent = target; return; }
  const start = performance.now(), dur = 1800;
  (function step(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
    if (p < 1) requestAnimationFrame(step);
  })(start);
}

/* ---------- Project filter ---------- */
document.querySelectorAll(".filter").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const f = btn.dataset.filter;
    document.querySelectorAll(".project").forEach(p => {
      const show = f === "all" || p.dataset.cat === f;
      p.classList.toggle("hide", !show);
      if (show) {
        p.classList.remove("visible");
        requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add("visible")));
      }
    });
  });
});

/* ---------- Contact form: sends through FormSubmit to my inbox ---------- */
const contactForm = document.getElementById("contactForm");
if (contactForm) contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const note = document.getElementById("formNote");
  const button = contactForm.querySelector("button[type=submit]");
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();

  // bots fill in the hidden field; people never see it
  if (contactForm.elements._honey.value) return;

  button.disabled = true;
  note.className = "form-note";
  note.textContent = "Sending…";

  try {
    const res = await fetch("https://formsubmit.co/ajax/amirsamehow1@gmail.com", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name, email, message,
        _subject: `New message from ${name} (personal website)`,
        _template: "table",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || String(data.success) !== "true") throw new Error(data.message || res.statusText);

    note.classList.add("form-note--ok");
    note.textContent = "Thanks! Your message has been sent. I'll get back to you soon.";
    contactForm.reset();
  } catch (err) {
    note.classList.add("form-note--error");
    note.textContent = "Sorry, your message couldn't be sent. Please email me directly at amirsamehow1@gmail.com.";
  } finally {
    button.disabled = false;
  }
});

/* ---------- Desktop-only effects ---------- */
if (finePointer && !reduceMotion) {
  // Custom cursor
  document.body.classList.add("has-cursor");
  const dot = document.getElementById("cursorDot");
  const ring = document.getElementById("cursorRing");
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  window.addEventListener("mousemove", e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
  });
  (function loop() {
    rx += (mx - rx) * 0.15; ry += (my - ry) * 0.15;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll("a, button, .card, .project, input, textarea").forEach(el => {
    el.addEventListener("mouseenter", () => ring.classList.add("hover"));
    el.addEventListener("mouseleave", () => ring.classList.remove("hover"));
  });

  // Magnetic buttons
  document.querySelectorAll(".magnetic").forEach(el => {
    el.addEventListener("mousemove", e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });

  // 3D tilt + spotlight on cards and photo
  document.querySelectorAll(".tilt").forEach(el => {
    el.addEventListener("mousemove", e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", px * 100 + "%");
      el.style.setProperty("--my", py * 100 + "%");
      el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 10}deg) rotateY(${(px - 0.5) * 10}deg)`;
      el.style.transition = "transform .1s linear, border-color .4s, box-shadow .4s";
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
      el.style.transition = "transform .8s cubic-bezier(.22,1,.36,1), border-color .4s, box-shadow .4s";
    });
  });

  // Subtle parallax on the hero glow
  const glow = document.querySelector(".hero__glow");
  if (glow) window.addEventListener("mousemove", e => {
    const x = (e.clientX / innerWidth - 0.5) * 40;
    const y = (e.clientY / innerHeight - 0.5) * 40;
    glow.style.marginLeft = x + "px";
    glow.style.marginTop = y + "px";
  });
}

/* ---------- Floating gold particles background ---------- */
(function particles() {
  const canvas = document.getElementById("particles");
  const ctx = canvas.getContext("2d");
  let w, h, dots = [];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    const count = Math.min(90, Math.floor(innerWidth / 16));
    dots = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (Math.random() * 1.6 + 0.4) * dpr,
      vx: (Math.random() - 0.5) * 0.15 * dpr,
      vy: (-Math.random() * 0.35 - 0.05) * dpr,
      a: Math.random() * 0.6 + 0.15,
      t: Math.random() * Math.PI * 2,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      d.x += d.vx; d.y += d.vy; d.t += 0.02;
      if (d.y < -10) { d.y = h + 10; d.x = Math.random() * w; }
      if (d.x < -10) d.x = w + 10; if (d.x > w + 10) d.x = -10;
      const alpha = d.a * (0.6 + 0.4 * Math.sin(d.t));
      ctx.beginPath();
      ctx.fillStyle = `rgba(232, 196, 90, ${alpha})`;
      ctx.shadowColor = "rgba(212, 175, 55, 0.8)";
      ctx.shadowBlur = 8 * dpr;
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  draw();
})();

/* ---------- Shooting stars (main page only) ---------- */
(function meteors() {
  const canvas = document.getElementById("meteors");
  if (!canvas || reduceMotion) return;
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w, h, stars = [], last = 0, nextSpawn = 1500;

  function resize() {
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
  }

  function spawn() {
    // Start along the top edge or the upper part of the right edge, travel down-left.
    const fromTop = Math.random() < 0.65;
    const angle = (Math.PI * (0.72 + Math.random() * 0.1)); // ~130–148°, down-left
    const speed = (0.9 + Math.random() * 0.7) * dpr;         // px per ms
    stars.push({
      x: fromTop ? w * (0.25 + Math.random() * 0.75) : w + 20 * dpr,
      y: fromTop ? -20 * dpr : h * Math.random() * 0.45,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: (120 + Math.random() * 160) * dpr,
      life: 0,
      max: 700 + Math.random() * 700,
      width: (1 + Math.random() * 0.8) * dpr,
    });
  }

  function draw(now) {
    const dt = Math.min(now - (last || now), 50);
    last = now;
    ctx.clearRect(0, 0, w, h);

    nextSpawn -= dt;
    if (nextSpawn <= 0) {
      spawn();
      if (Math.random() < 0.15) spawn(); // occasional pair
      nextSpawn = 1800 + Math.random() * 3200;
    }

    stars = stars.filter((s) => s.life < s.max);
    for (const s of stars) {
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const p = s.life / s.max;
      const fade = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85; // quick fade in, slow fade out
      const mag = Math.hypot(s.vx, s.vy);
      const tx = s.x - (s.vx / mag) * s.len;
      const ty = s.y - (s.vy / mag) * s.len;

      const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
      grad.addColorStop(0, `rgba(255, 241, 184, ${0.95 * fade})`);
      grad.addColorStop(0.25, `rgba(232, 196, 90, ${0.5 * fade})`);
      grad.addColorStop(1, "rgba(212, 175, 55, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 248, 220, ${fade})`;
      ctx.shadowColor = "rgba(245, 215, 122, 0.9)";
      ctx.shadowBlur = 12 * dpr;
      ctx.arc(s.x, s.y, s.width * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);
})();
