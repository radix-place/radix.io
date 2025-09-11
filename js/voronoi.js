// Voronoi Radix — vista real (mm) en lienzo + export mm (máx 10mm) + sin doble marco
(() => {
  const svg     = document.getElementById("voronoi");
  const btnGen  = document.getElementById("btn-gen");
  const btnRand = document.getElementById("btn-rand");
  const btnExp  = document.getElementById("btn-exp");
  const inputN  = document.getElementById("n");
  const strokePxInput = document.getElementById("strokePx");
  const strokeMmInput = document.getElementById("strokeMm");
  const previewMmChk  = document.getElementById("previewMm");
  const status  = document.getElementById("status");

  // Caja / viewBox
  const VB = { x: 0, y: 0, w: 900, h: 560 };
  svg.setAttribute("viewBox", `${VB.x} ${VB.y} ${VB.w} ${VB.h}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // Tamaño físico objetivo del SVG exportado (puedes cambiarlo)
  const EXPORT_WIDTH_MM = 210; // A4 de ancho por defecto
  const EXPORT_HEIGHT_MM = (VB.h / VB.w) * EXPORT_WIDTH_MM;

  // Estado
  let STROKE_PX = parseFloat(strokePxInput?.value || "1.6");
  let STROKE_MM = clamp(parseFloat(strokeMmInput?.value || "0.10"), 0.01, 10);
  let POINTS = randPoints(Number(inputN.value));

  function clamp(v, a, b){ return Math.max(a, Math.min(v, b)); }

  function randPoints(n, pad = 14) {
    const pts = new Array(n);
    for (let i = 0; i < n; i++) {
      const x = VB.x + pad + Math.random() * (VB.w - 2*pad);
      const y = VB.y + pad + Math.random() * (VB.h - 2*pad);
      pts[i] = [x, y];
    }
    return pts;
  }

  function render(points) {
    svg.innerHTML = "";

    if (!points.length) return;

    // Voronoi (d3-delaunay)
    const delaunay = d3.Delaunay.from(points);
    const vor = delaunay.voronoi([VB.x, VB.y, VB.w, VB.h]);

    // Path del diagrama
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", vor.render());
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#111");

    if (previewMmChk?.checked) {
      // Vista real en el lienzo: convertimos mm -> unidades del viewBox.
      // 1 unidad (x) del viewBox = (EXPORT_WIDTH_MM / VB.w) mm
      // => stroke_user_units = STROKE_MM / (mm por unidad) = STROKE_MM * VB.w / EXPORT_WIDTH_MM
      const strokeUnits = STROKE_MM * VB.w / EXPORT_WIDTH_MM;
      path.setAttribute("stroke-width", strokeUnits);
      // importante: SIN non-scaling-stroke (que haría fijo en px)
    } else {
      // Vista en px aparentes (como antes)
      const pxPerUnit = (svg.clientWidth || VB.w) / VB.w;
      const stroke = STROKE_PX / pxPerUnit;
      path.setAttribute("stroke-width", stroke);
      path.setAttribute("vector-effect", "non-scaling-stroke");
    }

    svg.appendChild(path);

    // Estado UI
    const mode = previewMmChk?.checked ? "real (mm)" : "pantalla (px)";
    status.textContent =
      `${points.length} celda(s) · modo ${mode} · grosor ${previewMmChk?.checked ? STROKE_MM.toFixed(2) + " mm" : STROKE_PX.toFixed(1) + " px"}`;
  }

  function generate() {
    let n = Math.max(1, Math.min(50, Number(inputN.value) || 0));
    if (n !== Number(inputN.value)) inputN.value = n;
    POINTS = randPoints(n);
    render(POINTS);
  }

  function rerandomize() {
    if (!POINTS || !POINTS.length) return generate();
    POINTS = randPoints(POINTS.length);
    render(POINTS);
  }

  function exportSVG() {
    STROKE_MM = clamp(parseFloat(strokeMmInput?.value || "0.10"), 0.01, 10);

    const clone = svg.cloneNode(true);
    if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    if (!clone.getAttribute("xmlns:xlink")) clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    // Tamaño físico
    clone.setAttribute("width",  EXPORT_WIDTH_MM  + "mm");
    clone.setAttribute("height", EXPORT_HEIGHT_MM + "mm");

    // Fuerza el grosor en mm para todas las trazas
    clone.querySelectorAll("*").forEach(el => {
      if (el.getAttribute("stroke")) {
        el.setAttribute("stroke-width", `${STROKE_MM}mm`);
        // Si tu láser requiere color específico de corte, define aquí:
        // el.setAttribute("stroke", "#FF0000");
      }
      // Limpia efecto de px fijos por si existiera
      el.removeAttribute("vector-effect");
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` + new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `voronoi-${POINTS.length}p-${STROKE_MM.toFixed(2)}mm-${ts}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Listeners
  btnGen.addEventListener("click", generate);
  btnRand.addEventListener("click", rerandomize);
  btnExp.addEventListener("click", exportSVG);
  inputN.addEventListener("change", generate);
  window.addEventListener("resize", () => render(POINTS));

  strokePxInput?.addEventListener("input", () => { STROKE_PX = parseFloat(strokePxInput.value); if (!previewMmChk.checked) render(POINTS); });
  strokeMmInput?.addEventListener("change", () => { STROKE_MM = clamp(parseFloat(strokeMmInput.value), 0.01, 10); if (previewMmChk.checked) render(POINTS); });
  previewMmChk?.addEventListener("change", () => {
    strokePxInput.disabled = previewMmChk.checked; // deshabilita px cuando se ve en mm
    render(POINTS);
  });

  // Primer render
  strokePxInput.disabled = previewMmChk.checked;
  render(POINTS);
})();
