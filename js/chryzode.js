window.ChryzodeApp = (() => {
  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a;
  }

  function create(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "checked") el.checked = true;
      else el.setAttribute(k, v);
    }
    for (const child of children) {
      if (typeof child === "string") el.appendChild(document.createTextNode(child));
      else el.appendChild(child);
    }
    return el;
  }

  function createSVG(tag, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
    return el;
  }

  function pointOnCircle(cx, cy, r, angle) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  }

  function buildUI(container) {
    const wrap = create("div", { class: "wrap" });

    const controlsCard = create("div", { class: "card" });
    const controls = create("div", { class: "controls" });

    const nInput = create("input", {
      type: "number",
      min: "2",
      max: "800",
      step: "1",
      value: "180"
    });

    const aInput = create("input", {
      type: "number",
      min: "0",
      max: "10000",
      step: "1",
      value: "2"
    });

    const strokeInput = create("input", {
      type: "number",
      min: "0.1",
      max: "5",
      step: "0.1",
      value: "1"
    });

    const pointsCheck = create("input", {
      type: "checkbox",
      checked: "checked"
    });

    const exportBtn = create("button", { class: "btn ghost", type: "button" }, ["Exportar SVG"]);

    controls.appendChild(create("label", {}, ["n:", nInput]));
    controls.appendChild(create("label", {}, ["a:", aInput]));
    controls.appendChild(create("label", {}, ["trazo:", strokeInput]));
    controls.appendChild(create("label", {}, [pointsCheck, "mostrar puntos"]));
    controls.appendChild(exportBtn);

    const info = create("div", { class: "muted", html: "" });

    const svgCard = create("div", { class: "card" });
    const svg = createSVG("svg", {
      width: "100%",
      height: "540",
      viewBox: "0 0 900 540",
      preserveAspectRatio: "xMidYMid meet"
    });

    svgCard.appendChild(svg);
    controlsCard.appendChild(controls);
    controlsCard.appendChild(info);

    wrap.appendChild(controlsCard);
    wrap.appendChild(svgCard);
    container.appendChild(wrap);

    return {
      svg,
      svgCard,
      info,
      nInput,
      aInput,
      strokeInput,
      pointsCheck,
      exportBtn
    };
  }

  function computeDimensions(ui) {
    const rect = ui.svgCard.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width - 32));
    const height = Math.max(320, Math.floor(width * 0.6));
    const cx = width / 2;
    const cy = height / 2;
    const margin = Math.max(28, Math.floor(width * 0.04));
    const radius = Math.max(60, Math.min(width, height) / 2 - margin);

    return { width, height, cx, cy, radius };
  }

  function adaptiveStroke(n, userStroke) {
    const base = Number.isFinite(userStroke) && userStroke > 0 ? userStroke : 1;
    if (n <= 180) return base;
    if (n <= 400) return Math.min(base, 0.9);
    if (n <= 650) return Math.min(base, 0.7);
    return Math.min(base, 0.5);
  }

  function adaptivePointRadius(n) {
    if (n <= 180) return 2.6;
    if (n <= 400) return 2.0;
    if (n <= 650) return 1.4;
    return 1.0;
  }

  function render(ui) {
    const svg = ui.svg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    let n = parseInt(ui.nInput.value, 10);
    let a = parseInt(ui.aInput.value, 10);
    let strokeWidth = parseFloat(ui.strokeInput.value);

    if (!Number.isFinite(n) || n < 2) n = 2;
    if (n > 800) n = 800;

    if (!Number.isFinite(a) || a < 0) a = 0;
    if (!Number.isFinite(strokeWidth) || strokeWidth <= 0) strokeWidth = 1;

    ui.nInput.value = String(n);
    ui.aInput.value = String(a);
    ui.strokeInput.value = String(strokeWidth);

    const showPoints = ui.pointsCheck.checked;

    const { width, height, cx, cy, radius } = computeDimensions(ui);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("height", String(height));

    const realStroke = adaptiveStroke(n, strokeWidth);
    const pointRadius = adaptivePointRadius(n);

    svg.appendChild(createSVG("rect", {
      x: "0",
      y: "0",
      width: String(width),
      height: String(height),
      fill: "#fafafa"
    }));

    svg.appendChild(createSVG("circle", {
      cx: String(cx),
      cy: String(cy),
      r: String(radius),
      fill: "none",
      stroke: "#d8d8d8",
      "stroke-width": "1.2"
    }));

    const pts = [];
    for (let k = 0; k < n; k++) {
      const theta = -Math.PI / 2 + (2 * Math.PI * k) / n;
      pts.push(pointOnCircle(cx, cy, radius, theta));
    }

    const edgesGroup = createSVG("g");
    const pointsGroup = createSVG("g");

    for (let k = 0; k < n; k++) {
      const j = (a * k) % n;
      const p = pts[k];
      const q = pts[j];

      edgesGroup.appendChild(createSVG("line", {
        x1: p.x.toFixed(3),
        y1: p.y.toFixed(3),
        x2: q.x.toFixed(3),
        y2: q.y.toFixed(3),
        stroke: "#111",
        "stroke-opacity": "0.38",
        "stroke-width": String(realStroke)
      }));
    }

    if (showPoints) {
      for (let k = 0; k < n; k++) {
        const p = pts[k];
        pointsGroup.appendChild(createSVG("circle", {
          cx: p.x.toFixed(3),
          cy: p.y.toFixed(3),
          r: String(pointRadius),
          fill: "#b30059"
        }));
      }
    }

    svg.appendChild(edgesGroup);
    svg.appendChild(pointsGroup);

    const d = gcd(a, n);
    ui.info.innerHTML =
      `Regla: <strong>f(k) = ${a}k mod ${n}</strong> &nbsp;|&nbsp; ` +
      `gcd(a,n) = <strong>${d}</strong> &nbsp;|&nbsp; ` +
      `puntos: <strong>${n}</strong>`;
  }

  function exportSVG(svgEl, filename = "chryzode.svg") {
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgEl);

    if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    if (!source.match(/^<svg[^>]+xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 300);
  }

  function debounce(fn, delay = 120) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function mount(selector) {
    const container = typeof selector === "string"
      ? document.querySelector(selector)
      : selector;

    if (!container) {
      console.error("ChryzodeApp: contenedor no encontrado.");
      return;
    }

    const ui = buildUI(container);
    const rerender = () => render(ui);
    const rerenderDebounced = debounce(rerender, 80);

    ui.exportBtn.addEventListener("click", () => exportSVG(ui.svg));

    [
      ui.nInput,
      ui.aInput,
      ui.strokeInput,
      ui.pointsCheck
    ].forEach(el => {
      el.addEventListener("input", rerenderDebounced);
      el.addEventListener("change", rerender);
    });

    window.addEventListener("resize", rerenderDebounced);

    rerender();
  }

  return { mount };
})();