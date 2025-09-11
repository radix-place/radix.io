// Juego de la Vida — Radix
(() => {
  // --- DOM ---
  const canvas   = document.getElementById("life");
  const ctx      = canvas.getContext("2d", { alpha: false });
  const colsIn   = document.getElementById("cols");
  const rowsIn   = document.getElementById("rows");
  const densIn   = document.getElementById("density");
  const speedIn  = document.getElementById("speed");
  const toroIn   = document.getElementById("toroidal");
  const startBtn = document.getElementById("btn-start");
  const stepBtn  = document.getElementById("btn-step");
  const clearBtn = document.getElementById("btn-clear");
  const randBtn  = document.getElementById("btn-rand");
  const expPNG   = document.getElementById("btn-exp-png");
  const statusEl = document.getElementById("status");

  // --- Estado ---
  let COLS = clamp(parseInt(colsIn.value,10), 10, 200);
  let ROWS = clamp(parseInt(rowsIn.value,10), 10, 200);
  let DENS = clamp(parseInt(densIn.value,10), 0, 100);
  let SPEED = clamp(parseInt(speedIn.value,10), 20, 500);
  let TORUS = !!toroIn.checked;

  let grid = makeGrid(ROWS, COLS);
  let buffer = makeGrid(ROWS, COLS);
  let generation = 0;
  let running = false;
  let rafId = null;
  let lastStep = 0;

  // --- Utils ---
  function clamp(v, a, b){ return Math.max(a, Math.min(v, b)); }
  function idx(r,c){ return r*COLS + c; }
  function makeGrid(r, c){ return new Uint8Array(r*c); }

  // Resize robusto (usa tamaño del contenedor; limita DPR; evita re-asignaciones redundantes)
  function resizeCanvas(){
    const box = canvas.parentElement;
    const cssW = Math.max(1, box.clientWidth);
    const cssH = Math.max(1, box.clientHeight || 420); // fallback si aún no tiene layout
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const targetW = Math.floor(cssW * dpr);
    const targetH = Math.floor(cssH * dpr);
    if (canvas.width === targetW && canvas.height === targetH) return;
    canvas.width  = targetW;
    canvas.height = targetH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 1 unidad = 1 CSS px
  }

  // Densidad EXACTA: siembra exactamente DENS% celdas vivas
  function randomize(){
    grid.fill(0);
    const total  = ROWS * COLS;
    const target = Math.round(total * DENS / 100);

    if (target <= 0) { generation = 0; return; }
    if (target >= total) { grid.fill(1); generation = 0; return; }

    // Fisher–Yates parcial: elige 'target' índices únicos
    const idxs = new Uint32Array(total);
    for (let i = 0; i < total; i++) idxs[i] = i;
    for (let i = 0; i < target; i++) {
      const j = i + Math.floor(Math.random() * (total - i));
      const tmp = idxs[i]; idxs[i] = idxs[j]; idxs[j] = tmp;
      grid[idxs[i]] = 1;
    }
    generation = 0;
  }

  function clearGrid(){ grid.fill(0); generation = 0; }

  function neighbors(r, c){
    let sum = 0;
    if (TORUS){
      const r0 = (r-1+ROWS)%ROWS, r1=r, r2=(r+1)%ROWS;
      const c0 = (c-1+COLS)%COLS, c1=c, c2=(c+1)%COLS;
      sum += grid[idx(r0,c0)] + grid[idx(r0,c1)] + grid[idx(r0,c2)];
      sum += grid[idx(r1,c0)]                     + grid[idx(r1,c2)];
      sum += grid[idx(r2,c0)] + grid[idx(r2,c1)] + grid[idx(r2,c2)];
    } else {
      for (let dr=-1; dr<=1; dr++){
        for (let dc=-1; dc<=1; dc++){
          if (dr===0 && dc===0) continue;
          const rr = r+dr, cc = c+dc;
          if (rr>=0 && rr<ROWS && cc>=0 && cc<COLS){
            sum += grid[idx(rr,cc)];
          }
        }
      }
    }
    return sum;
  }

  function step(){
    for (let r=0; r<ROWS; r++){
      for (let c=0; c<COLS; c++){
        const n = neighbors(r,c);
        const alive = grid[idx(r,c)];
        buffer[idx(r,c)] = (alive ? (n===2 || n===3) : (n===3)) ? 1 : 0;
      }
    }
    const tmp = grid; grid = buffer; buffer = tmp;
    generation++;
  }

  function render(){
    resizeCanvas();
    // Fondo
    ctx.fillStyle = "#fff";
    // usar tamaño en CSS px (ctx transform ya está en dpr)
    const w = canvas.clientWidth;
    const h = canvas.clientHeight || 420;
    ctx.fillRect(0,0,w,h);

    const cw = w / COLS;
    const ch = h / ROWS;

    // Celdas vivas
    ctx.fillStyle = "#111";
    for (let r=0; r<ROWS; r++){
      const y0 = Math.round(r*ch);
      const y1 = Math.round((r+1)*ch);
      for (let c=0; c<COLS; c++){
        if (grid[idx(r,c)]) {
          const x0 = Math.round(c*cw);
          const x1 = Math.round((c+1)*cw);
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        }
      }
    }

    const pop = grid.reduce((a,b)=>a+b,0);
    statusEl.textContent = `Gen ${generation} · Población ${pop} · ${COLS}×${ROWS} · ${TORUS ? "Toroidal" : "Borde fijo"} · ${SPEED} ms`;
  }

  function loop(ts){
    if (!running){ render(); return; }
    if (ts - lastStep >= SPEED){
      step();
      lastStep = ts;
    }
    render();
    rafId = requestAnimationFrame(loop);
  }

  function rebuild(newRows, newCols){
    ROWS = clamp(newRows, 10, 200);
    COLS = clamp(newCols, 10, 200);
    grid   = makeGrid(ROWS, COLS);
    buffer = makeGrid(ROWS, COLS);
    randomize();
    render();
  }

  // --- Pintar con mouse
  let drawing = false;
  let paintValue = 1; // 1 pintar, 0 borrar
  canvas.addEventListener("mousedown", (e)=>{
    paintValue = (e.button === 2) ? 0 : 1;
    drawing = true;
    toggleAtEvent(e, paintValue);
  });
  canvas.addEventListener("mousemove", (e)=>{
    if (!drawing) return;
    toggleAtEvent(e, paintValue);
  });
  canvas.addEventListener("mouseup", ()=> drawing=false);
  canvas.addEventListener("mouseleave", ()=> drawing=false);
  canvas.addEventListener("contextmenu", (e)=> e.preventDefault());

  function toggleAtEvent(e, val){
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const c = Math.floor( x / (canvas.clientWidth  / COLS) );
    const r = Math.floor( y / (canvas.clientHeight / ROWS) );
    if (r>=0 && r<ROWS && c>=0 && c<COLS){
      grid[idx(r,c)] = val;
      render();
    }
  }

  // --- Soporte táctil (pintar con el dedo)
  canvas.addEventListener("touchstart", (e)=>{
    e.preventDefault();
    drawing = true; paintValue = 1;
    toggleAtTouch(e, paintValue);
  }, {passive:false});

  canvas.addEventListener("touchmove", (e)=>{
    if (!drawing) return;
    e.preventDefault();
    toggleAtTouch(e, paintValue);
  }, {passive:false});

  canvas.addEventListener("touchend", ()=> drawing=false);

  function toggleAtTouch(e, val){
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0] || e.changedTouches[0];
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    const c = Math.floor( x / (canvas.clientWidth  / COLS) );
    const r = Math.floor( y / (canvas.clientHeight / ROWS) );
    if (r>=0 && r<ROWS && c>=0 && c<COLS){
      grid[idx(r,c)] = val;
      render();
    }
  }

  // --- Botones ---
  startBtn.addEventListener("click", ()=>{
    // Si está vacía y hay densidad > 0, siembra antes de correr
    const pop = grid.reduce((a,b)=>a+b,0);
    if (pop === 0 && DENS > 0) randomize();

    running = !running;
    startBtn.textContent = running ? "Pausar" : "Iniciar";
    lastStep = performance.now();
    if (running) rafId = requestAnimationFrame(loop);
    else cancelAnimationFrame(rafId);
  });

  stepBtn.addEventListener("click", ()=>{
    if (running) return; // no interferir durante reproducción
    step(); render();
  });

  clearBtn.addEventListener("click", ()=>{
    // Pausa y limpia
    running = false;
    startBtn.textContent = "Iniciar";
    if (rafId) cancelAnimationFrame(rafId);
    grid.fill(0);
    generation = 0;
    render();
  });

  randBtn.addEventListener("click", ()=>{
    // Pausa y siembra
    running = false;
    startBtn.textContent = "Iniciar";
    if (rafId) cancelAnimationFrame(rafId);
    randomize();
    render();
  });

  expPNG.addEventListener("click", ()=>{
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g,"-");
    a.href = url;
    a.download = `life-${COLS}x${ROWS}-gen${generation}-${ts}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // --- Inputs ---
  colsIn.addEventListener("change", ()=>{
    const v = clamp(parseInt(colsIn.value,10)||COLS, 10, 200);
    colsIn.value = v; rebuild(ROWS, v);
  });
  rowsIn.addEventListener("change", ()=>{
    const v = clamp(parseInt(rowsIn.value,10)||ROWS, 10, 200);
    rowsIn.value = v; rebuild(v, COLS);
  });

  // densidad actual siempre usada por randomize()
  densIn.addEventListener("input", ()=>{
    DENS = clamp(parseInt(densIn.value,10) || 0, 0, 100);
  });

  speedIn.addEventListener("input", ()=>{
    SPEED = clamp(parseInt(speedIn.value,10)||120, 20, 500);
  });

  toroIn.addEventListener("change", ()=>{
    TORUS = !!toroIn.checked; render();
  });

  // Throttle de resize (evita renders excesivos)
  let resizeScheduled = false;
  window.addEventListener("resize", () => {
    if (resizeScheduled) return;
    resizeScheduled = true;
    requestAnimationFrame(() => { resizeScheduled = false; render(); });
  });

  // --- Init ---
  randomize();
  render();

  // Pausar automáticamente si la pestaña se oculta o si abandonas la página
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) {
      running = false;
      startBtn.textContent = "Iniciar";
      if (rafId) cancelAnimationFrame(rafId);
    }
  });

  window.addEventListener("pagehide", () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  });
})();
