/* ---------- Flowing gas-giant background (portfolio page) ----------
   A WebGL shader that warps layered noise into slowly moving,
   Jupiter-like bands and swirls. Rendered at reduced resolution
   for speed; the canvas is stretched to fill the screen. */
(function liquid() {
  const canvas = document.getElementById("liquid");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
  if (!gl) return; // CSS gradient on the canvas stays as the fallback

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const vert = `
    attribute vec2 a;
    void main() { gl_Position = vec4(a, 0.0, 1.0); }`;

  const frag = `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform float uScroll;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes.y;
      float t = uTime * 0.035;

      // diagonal bands, like the planet seen at an angle
      vec2 p = mat2(0.94, -0.34, 0.34, 0.94) * (uv * 2.1);
      p.y += uScroll;
      p *= vec2(0.6, 1.35); // stretch swirls along the belts, like Jupiter's jet streams

      // domain warping: noise feeding noise gives the fluid, swirling look
      vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
      vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + 0.6 * t),
                    fbm(p + 4.0 * q + vec2(8.3, 2.8) - 0.5 * t));
      float f = fbm(p + 4.0 * r);

      // palette sampled from Voyager's view of Jupiter
      vec3 cream = vec3(0.92, 0.87, 0.78);
      vec3 tan   = vec3(0.80, 0.65, 0.47);
      vec3 rust  = vec3(0.64, 0.37, 0.16);
      vec3 umber = vec3(0.28, 0.18, 0.10);
      vec3 slate = vec3(0.50, 0.60, 0.72);
      vec3 ice   = vec3(0.80, 0.87, 0.95);
      vec3 navy  = vec3(0.12, 0.22, 0.42);

      // warm and cool belts, pushed around by the warp
      float band = sin((p.y + 1.3 * r.x + 0.7 * q.y) * 2.6);
      float b = smoothstep(-0.55, 0.55, band);

      vec3 warm = mix(umber, rust, smoothstep(0.25, 0.6, f));
      warm = mix(warm, tan, smoothstep(0.45, 0.75, f + 0.15 * q.x));
      warm = mix(warm, cream, smoothstep(0.62, 0.9, f + 0.35 * r.y - 0.1));

      vec3 cool = mix(navy, slate, smoothstep(0.25, 0.6, f));
      cool = mix(cool, ice, smoothstep(0.55, 0.85, f + 0.25 * q.y));

      vec3 col = mix(cool, warm, b);

      // fine streaks along the flow
      col *= 0.88 + 0.24 * smoothstep(0.2, 0.8, fbm(p * 3.0 + 6.0 * r));

      gl_FragColor = vec4(col, 1.0);
    }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  const vs = compile(gl.VERTEX_SHADER, vert);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "uRes");
  const uTime = gl.getUniformLocation(prog, "uTime");
  const uScroll = gl.getUniformLocation(prog, "uScroll");

  const SCALE = 0.5; // render at half resolution; the soft look hides it
  function resize() {
    canvas.width = Math.max(1, Math.round(innerWidth * SCALE));
    canvas.height = Math.max(1, Math.round(innerHeight * SCALE));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener("resize", resize);

  const start = performance.now();
  canvas.classList.add("ready");
  function draw(now) {
    gl.uniform1f(uTime, still ? 20 : (now - start) / 1000 + 20);
    gl.uniform1f(uScroll, window.scrollY * 0.00035);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!still) requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
  if (still) window.addEventListener("scroll", () => requestAnimationFrame(draw), { passive: true });
})();
