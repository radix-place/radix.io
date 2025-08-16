// tetris.js
(function () {
  const canvas = document.getElementById("tetrisCanvas");
  if (!canvas) { console.error("[tetris] No hay #tetrisCanvas"); return; }
  const ctx = canvas.getContext("2d");
  if (!ctx) { console.error("[tetris] Sin contexto 2D"); return; }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const BOX = 20;
  let DPR = 1;
  let WIDTH = 0;
  let HEIGHT = 320;    // tu héroe tiene min-height:320px
  let cols = 0, rows = 0;
  let grid = [];
  let blocks = [];
  let frame = 0;
  let running = true;

  function initGrid() {
    grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();     // tamaño real en CSS px
    WIDTH  = Math.max(1, Math.floor(rect.width));
    HEIGHT = Math.max(320, Math.floor(rect.height)); // por si crece

    DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    // tamaño físico del lienzo (px reales) y CSS (px lógicos)
    canvas.width  = Math.round(WIDTH * DPR);
    canvas.height = Math.round(HEIGHT * DPR);
    canvas.style.width  = WIDTH + "px";
    canvas.style.height = HEIGHT + "px";

    // reset de la transformación y escala por DPR
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(DPR, DPR);

    // rejilla lógica
    cols = Math.max(1, Math.floor(WIDTH / BOX));
    rows = Math.max(1, Math.floor(HEIGHT / BOX));

    initGrid();
    blocks.length = 0;
  }

  class Block {
    constructor(x) {
      this.x = x;
      this.y = 0;
      this.stop = false;
      this.c = `hsl(${Math.random() * 360}, 55%, 72%)`;
    }
    update() {
      if (this.stop) return;
      const nr = Math.floor((this.y + BOX) / BOX);
      const c  = Math.floor(this.x / BOX);
      if (nr >= rows || grid[nr]?.[c]) {
        this.stop = true;
        const r = Math.floor(this.y / BOX);
        if (grid[r] && grid[r][c] === null) grid[r][c] = this.c;
      } else {
        this.y += 1.4;
      }
    }
    draw() {
      ctx.fillStyle = this.c;
      ctx.fillRect(this.x, this.y, BOX, BOX);
    }
  }

  function addBlock() {
    const c = Math.floor(Math.random() * cols);
    blocks.push(new Block(c * BOX));
    if (blocks.length > Math.ceil(cols * 0.8)) blocks.shift(); // control de densidad
  }

  function drawGrid() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = grid[r][c];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(c * BOX, r * BOX, BOX, BOX);
        }
      }
    }
  }

  function maxStackPx() {
    for (let r = 0; r < rows; r++) if (grid[r].some(Boolean)) return HEIGHT - r * BOX;
    return 0;
  }

  function loop() {
    if (!running) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);  // limpiar en coordenadas lógicas

    drawGrid();
    for (const b of blocks) { b.update(); b.draw(); }
    blocks = blocks.filter(b => !b.stop);

    if (frame % 20 === 0) addBlock();
    if (maxStackPx() >= HEIGHT * 0.85) { initGrid(); blocks.length = 0; }

    frame++;
    requestAnimationFrame(loop);
  }

  document.addEventListener("visibilitychange", () => {
    running = document.visibilityState === "visible";
    if (running) loop();
  });

  window.addEventListener("resize", resize, { passive: true });

  resize();
  loop();
})();
