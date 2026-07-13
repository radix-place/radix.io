(() => {
  "use strict";

  /*
    Bandada de boids confinada a un disco.

    Precondición de CSS (igual que el script del campo):
    el tamaño del lienzo debe estar controlado por la hoja
    de estilos, con un mínimo razonable:

      #boidsCanvas {
        width: 100%;
        aspect-ratio: 1;
        min-width: 280px;
        min-height: 280px;
      }

    Contención en tres capas:
      1. Fuerza progresiva hacia adentro desde 0.8·r,
         que cerca del borde supera cualquier combinación
         de alineación, cohesión y separación.
      2. Clamp duro en 0.97·r: proyección de la posición
         y reflexión amortiguada de la velocidad radial.
      3. Recorte circular del dibujo (clip), de modo que
         ni la punta del triángulo (5.5 px) puede verse
         fuera del disco.
  */

  const canvas = document.getElementById("boidsCanvas");
  const resetButton = document.getElementById("resetBoids");
  if (!canvas) return;

  const context = canvas.getContext("2d");

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduceMotion = motionQuery.matches;

  const palette = {
    ink: "#202522",
    green: "#2f6656",
    blue: "#315b7d",
    terracotta: "#a44f32",
    gray: "rgba(32, 37, 34, 0.11)",
    border: "#bfc9c4"
  };

  /* Parámetros de contención */
  const CONTAIN_START = 0.8;   /* fracción de r donde empieza la fuerza */
  const CONTAIN_MAX = 0.16;    /* magnitud máxima (> 0.128, suma de las demás) */
  const HARD_LIMIT = 0.97;     /* fracción de r del clamp duro */
  const BOUNCE_DAMPING = 0.4;  /* fracción de la velocidad radial reflejada */

  const MAX_SPEED = 1.12;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let radius = 0;
  let centerX = 0;
  let centerY = 0;
  let agents = [];
  let animationId = 0;

  class Agent {
    constructor(index) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * radius * 0.72;
      const velocityAngle = Math.random() * Math.PI * 2;
      this.x = centerX + Math.cos(angle) * distance;
      this.y = centerY + Math.sin(angle) * distance;
      this.vx = Math.cos(velocityAngle) * (0.45 + Math.random() * 0.35);
      this.vy = Math.sin(velocityAngle) * (0.45 + Math.random() * 0.35);
      this.color = [palette.green, palette.blue, palette.terracotta][index % 3];
    }
  }

  function createAgents() {
    const count = width < 400 ? 23 : 31;
    agents = Array.from({ length: count }, (_, index) => new Agent(index));
  }

  /*
    Al redimensionar, la bandada se conserva: las posiciones
    se remapean del disco anterior al nuevo. Las velocidades
    no se escalan porque sus límites son absolutos (px/f).
    El número de agentes solo se ajusta al regenerar.
  */
  function remapAgents(oldCenterX, oldCenterY, oldRadius) {
    if (oldRadius <= 0) return;
    const scale = radius / oldRadius;
    for (const agent of agents) {
      agent.x = centerX + (agent.x - oldCenterX) * scale;
      agent.y = centerY + (agent.y - oldCenterY) * scale;
    }
  }

  /*
    Devuelve false si el elemento aún no tiene tamaño
    utilizable. Sin mínimos impuestos: el búfer coincide
    siempre con el tamaño de CSS y el círculo no se deforma.
  */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return false;

    const oldCenterX = centerX;
    const oldCenterY = centerY;
    const oldRadius = radius;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    centerX = width / 2;
    centerY = height / 2;
    radius = Math.min(width, height) * 0.425;

    if (agents.length === 0) {
      createAgents();
    } else {
      remapAgents(oldCenterX, oldCenterY, oldRadius);
    }
    return true;
  }

  function limit(x, y, maximum) {
    const magnitude = Math.hypot(x, y);
    if (magnitude <= maximum || magnitude === 0) return [x, y];
    return [x / magnitude * maximum, y / magnitude * maximum];
  }

  function updateAgent(agent, index) {
    let alignX = 0;
    let alignY = 0;
    let cohesionX = 0;
    let cohesionY = 0;
    let separationX = 0;
    let separationY = 0;
    let nearby = 0;
    let veryNear = 0;

    /*
      Comparaciones con distancias al cuadrado:
      la separación usa dx/d² directamente, así que
      ningún par requiere raíz cuadrada.
    */
    const nearRadiusSq = (radius * 0.27) ** 2;
    const separationRadiusSq = (radius * 0.095) ** 2;

    for (let i = 0; i < agents.length; i += 1) {
      if (i === index) continue;
      const other = agents[i];
      const dx = other.x - agent.x;
      const dy = other.y - agent.y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq < nearRadiusSq) {
        alignX += other.vx;
        alignY += other.vy;
        cohesionX += other.x;
        cohesionY += other.y;
        nearby += 1;
      }

      if (distanceSq > 0 && distanceSq < separationRadiusSq) {
        separationX -= dx / distanceSq;
        separationY -= dy / distanceSq;
        veryNear += 1;
      }
    }

    let forceX = 0;
    let forceY = 0;

    if (nearby > 0) {
      alignX /= nearby;
      alignY /= nearby;
      const aligned = limit(alignX - agent.vx, alignY - agent.vy, 0.032);
      forceX += aligned[0] * 0.9;
      forceY += aligned[1] * 0.9;

      cohesionX = cohesionX / nearby - agent.x;
      cohesionY = cohesionY / nearby - agent.y;
      const cohesive = limit(cohesionX * 0.003, cohesionY * 0.003, 0.025);
      forceX += cohesive[0] * 0.55;
      forceY += cohesive[1] * 0.55;
    }

    if (veryNear > 0) {
      const separated = limit(separationX, separationY, 0.055);
      forceX += separated[0] * 1.55;
      forceY += separated[1] * 1.55;
    }

    /*
      Capa 1: contención progresiva. La magnitud crece
      linealmente desde 0 en CONTAIN_START·r hasta
      CONTAIN_MAX en r, superando cerca del borde la suma
      máxima de las otras fuerzas (≈ 0.128).
    */
    const fromCenterX = agent.x - centerX;
    const fromCenterY = agent.y - centerY;
    const distanceFromCenter = Math.hypot(fromCenterX, fromCenterY);
    const containStart = radius * CONTAIN_START;

    if (distanceFromCenter > containStart) {
      const t = Math.min(
        (distanceFromCenter - containStart) / (radius - containStart),
        1.5
      );
      const strength = t * CONTAIN_MAX;
      forceX += (-fromCenterX / distanceFromCenter) * strength;
      forceY += (-fromCenterY / distanceFromCenter) * strength;
    }

    agent.vx += forceX;
    agent.vy += forceY;
    [agent.vx, agent.vy] = limit(agent.vx, agent.vy, MAX_SPEED);
    agent.x += agent.vx;
    agent.y += agent.vy;

    /*
      Capa 2: clamp duro. Garantiza la invariante
      d ≤ HARD_LIMIT·r sin importar la combinación
      de fuerzas del fotograma.
    */
    const hardRadius = radius * HARD_LIMIT;
    const dx = agent.x - centerX;
    const dy = agent.y - centerY;
    const d = Math.hypot(dx, dy);

    if (d > hardRadius) {
      const nx = dx / d;
      const ny = dy / d;

      agent.x = centerX + nx * hardRadius;
      agent.y = centerY + ny * hardRadius;

      const radialSpeed = agent.vx * nx + agent.vy * ny;
      if (radialSpeed > 0) {
        agent.vx -= (1 + BOUNCE_DAMPING) * radialSpeed * nx;
        agent.vy -= (1 + BOUNCE_DAMPING) * radialSpeed * ny;
      }
    }
  }

  function drawConnections() {
    const connectRadius = radius * 0.19;
    const connectRadiusSq = connectRadius * connectRadius;
    context.lineWidth = 0.65;
    context.strokeStyle = palette.gray;

    for (let i = 0; i < agents.length; i += 1) {
      for (let j = i + 1; j < agents.length; j += 1) {
        const a = agents[i];
        const b = agents[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < connectRadiusSq) {
          /* la raíz solo se calcula para pares conectados */
          context.globalAlpha = 1 - Math.sqrt(distanceSq) / connectRadius;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }
    }
    context.globalAlpha = 1;
  }

  function drawAgents() {
    for (const agent of agents) {
      const direction = Math.atan2(agent.vy, agent.vx);
      context.save();
      context.translate(agent.x, agent.y);
      context.rotate(direction);
      context.fillStyle = agent.color;
      context.beginPath();
      context.moveTo(5.5, 0);
      context.lineTo(-3.5, 2.8);
      context.lineTo(-2.3, 0);
      context.lineTo(-3.5, -2.8);
      context.closePath();
      context.fill();
      context.restore();
    }
  }

  function drawBoundary() {
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.strokeStyle = palette.border;
    context.lineWidth = 1;
    context.globalAlpha = 0.85;
    context.stroke();
    context.globalAlpha = 1;
  }

  function draw() {
    context.clearRect(0, 0, width, height);

    /* Capa 3: recorte circular del dibujo */
    context.save();
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.clip();

    drawConnections();
    drawAgents();

    context.restore();
    drawBoundary();
  }

  function stepPhysics() {
    for (let i = 0; i < agents.length; i += 1) updateAgent(agents[i], i);
  }

  function animate() {
    /*
      Un cambio de devicePixelRatio sin cambio de tamaño
      (mover la ventana a otro monitor) no dispara el
      ResizeObserver; se verifica aquí.
    */
    const currentDpr = Math.min(window.devicePixelRatio || 1, 2);
    if (currentDpr !== dpr) resize();

    stepPhysics();
    draw();
    animationId = requestAnimationFrame(animate);
  }

  /*
    start(): conserva la bandada actual. Con movimiento
    reducido dibuja un estado estático ya asentado.

    regenerate(): bandada nueva. Solo la invoca el botón.
  */
  function start() {
    cancelAnimationFrame(animationId);
    if (reduceMotion) {
      for (let i = 0; i < 160; i += 1) stepPhysics();
      draw();
    } else {
      animationId = requestAnimationFrame(animate);
    }
  }

  function regenerate() {
    cancelAnimationFrame(animationId);
    createAgents();
    start();
  }

  /* =========================================================
     Observación del tamaño del lienzo
     =========================================================

     Guarda de dimensiones para evitar realimentación:
     el observador solo reacciona a cambios reales del
     tamaño de layout. Redimensionar conserva la bandada.
  */
  let lastObservedWidth = 0;
  let lastObservedHeight = 0;

  const observer = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect();
    if (
      Math.abs(rect.width - lastObservedWidth) < 1 &&
      Math.abs(rect.height - lastObservedHeight) < 1
    ) {
      return;
    }
    lastObservedWidth = rect.width;
    lastObservedHeight = rect.height;

    if (resize()) start();
  });

  /* Preferencia de movimiento reducido, reactiva */
  motionQuery.addEventListener("change", (event) => {
    reduceMotion = event.matches;
    start();
  });

  if (resetButton) resetButton.addEventListener("click", regenerate);

  /*
    El primer disparo del ResizeObserver realiza el ajuste
    inicial, crea la bandada y arranca la animación.
  */
  observer.observe(canvas);
})();