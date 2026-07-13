(() => {
  "use strict";

  /*
    Campo escalar continuo con isolíneas (marching squares).

    Precondición de CSS: el tamaño del lienzo debe estar
    controlado por la hoja de estilos (por ejemplo,
    `width: 100%` en el contenedor y `aspect-ratio: 1`
    o dimensiones fijas en el canvas), con un tamaño
    mínimo razonable:

      #fieldCanvas {
        width: 100%;
        aspect-ratio: 1;
        min-width: 280px;
        min-height: 280px;
      }

    El script nunca impone un tamaño propio, de modo que
    los atributos width/height del canvas no realimentan
    el layout ni al ResizeObserver.
  */

  const canvas = document.getElementById("fieldCanvas");
  const resetButton = document.getElementById("resetField");

  if (!canvas) return;

  const context = canvas.getContext("2d");

  const motionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  let reduceMotion = motionQuery.matches;

  const COLORS = {
    negative: "#2f6656",
    zero: "#315b7d",
    positive: "#a44f32",
    border: "#bfc9c4"
  };

  const LEVELS = [
    -0.72,
    -0.48,
    -0.24,
    0,
    0.24,
    0.48,
    0.72
  ];

  const GRID_STEP = 9;

  const FRAME_INTERVAL = 33;
  const TIME_STEP = 0.0045;

  let width = 0;
  let height = 0;
  let dpr = 1;

  let centerX = 0;
  let centerY = 0;
  let radius = 0;

  let time = 0;

  let animationId = 0;
  let lastFrameTime = 0;

  /* =========================================================
     Definición aleatoria del campo
     =========================================================

     El campo es una suma de tres ondas sinusoidales.
     Cada onda tiene dirección, frecuencia, velocidad y
     peso propios, generados al azar. Los pesos se
     normalizan para que la amplitud total sea 1 y los
     niveles fijos conserven su significado.
  */

  let waves = [];

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function generateWaves() {
    const raw = Array.from(
      { length: 3 },
      () => {
        const angle = randomRange(0, Math.PI * 2);
        const frequency = randomRange(2.6, 5.6);

        return {
          a: Math.cos(angle) * frequency,
          b: Math.sin(angle) * frequency,
          speed: randomRange(0.45, 1),
          offset: randomRange(0, Math.PI * 2),
          weight: randomRange(0.5, 1)
        };
      }
    );

    const total = raw.reduce(
      (sum, wave) => sum + wave.weight,
      0
    );

    for (const wave of raw) {
      wave.weight /= total;
    }

    waves = raw;
  }

  function field(x, y, phase) {
    const nx = (x - centerX) / radius;
    const ny = (y - centerY) / radius;

    let value = 0;

    for (const wave of waves) {
      value +=
        Math.sin(
          nx * wave.a +
          ny * wave.b +
          phase * wave.speed +
          wave.offset
        ) * wave.weight;
    }

    return value;
  }

  /* =========================================================
     Retícula preasignada
     =========================================================

     La estructura de la retícula (dimensiones y arreglos
     de valores) se construye una sola vez por tamaño de
     lienzo. En cada fotograma solo se rellenan los valores,
     sin crear objetos nuevos.
  */

  let grid = null;

  function buildGridStructure() {
    const size = radius * 2;

    const columns = Math.ceil(size / GRID_STEP);
    const rows = Math.ceil(size / GRID_STEP);

    grid = {
      minX: centerX - radius,
      minY: centerY - radius,
      columns,
      rows,
      xStep: size / columns,
      yStep: size / rows,
      values: Array.from(
        { length: rows + 1 },
        () => new Float32Array(columns + 1)
      )
    };
  }

  function sampleGrid(phase) {
    const {
      minX,
      minY,
      columns,
      rows,
      xStep,
      yStep,
      values
    } = grid;

    for (let row = 0; row <= rows; row += 1) {
      const y = minY + row * yStep;
      const rowValues = values[row];

      for (
        let column = 0;
        column <= columns;
        column += 1
      ) {
        rowValues[column] = field(
          minX + column * xStep,
          y,
          phase
        );
      }
    }
  }

  /* =========================================================
     Marching squares
     =========================================================

     Esquinas de cada celda:

       p0 -------- p1
        |          |
        |          |
       p3 -------- p2

     Aristas:

       0: superior
       1: derecha
       2: inferior
       3: izquierda

     Bits del caso: p0=1, p1=2, p2=4, p3=8.
     Los casos 5 y 10 (sillas) se desambiguan con el
     valor medio de la celda.
  */

  const SEGMENT_TABLE = {
    1: [[3, 0]],
    14: [[3, 0]],
    2: [[0, 1]],
    13: [[0, 1]],
    3: [[3, 1]],
    12: [[3, 1]],
    4: [[1, 2]],
    11: [[1, 2]],
    6: [[0, 2]],
    9: [[0, 2]],
    7: [[3, 2]],
    8: [[3, 2]]
  };

  function interpolate(
    xA,
    yA,
    xB,
    yB,
    valueA,
    valueB,
    level,
    out
  ) {
    const denominator = valueB - valueA;

    const amount =
      Math.abs(denominator) < 1e-9
        ? 0.5
        : (level - valueA) / denominator;

    out.x = xA + (xB - xA) * amount;
    out.y = yA + (yB - yA) * amount;
  }

  function levelColor(level) {
    if (level < 0) return COLORS.negative;
    if (level > 0) return COLORS.positive;
    return COLORS.zero;
  }

  /*
    Puntos de arista reutilizables, para no crear
    objetos dentro del bucle de celdas.
  */

  const edgePoints = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 }
  ];

  /*
    Una sola pasada por las celdas. Los segmentos de cada
    nivel se acumulan en su propio Path2D y se trazan al
    final, con lo que la indexación de la retícula se hace
    una vez en lugar de una por nivel.
  */

  function buildLevelPaths() {
    const {
      minX,
      minY,
      columns,
      rows,
      xStep,
      yStep,
      values
    } = grid;

    const paths = LEVELS.map(() => new Path2D());

    for (let row = 0; row < rows; row += 1) {
      const y0 = minY + row * yStep;
      const y1 = y0 + yStep;

      const topRow = values[row];
      const bottomRow = values[row + 1];

      for (
        let column = 0;
        column < columns;
        column += 1
      ) {
        const x0 = minX + column * xStep;
        const x1 = x0 + xStep;

        const v0 = topRow[column];
        const v1 = topRow[column + 1];
        const v2 = bottomRow[column + 1];
        const v3 = bottomRow[column];

        for (
          let levelIndex = 0;
          levelIndex < LEVELS.length;
          levelIndex += 1
        ) {
          const level = LEVELS[levelIndex];

          let cellCase = 0;

          if (v0 >= level) cellCase |= 1;
          if (v1 >= level) cellCase |= 2;
          if (v2 >= level) cellCase |= 4;
          if (v3 >= level) cellCase |= 8;

          if (
            cellCase === 0 ||
            cellCase === 15
          ) {
            continue;
          }

          let segments;

          if (
            cellCase === 5 ||
            cellCase === 10
          ) {
            const centerValue =
              (v0 + v1 + v2 + v3) / 4;

            const centerAbove =
              centerValue >= level;

            const connectRight =
              cellCase === 5
                ? centerAbove
                : !centerAbove;

            segments = connectRight
              ? [
                  [0, 1],
                  [2, 3]
                ]
              : [
                  [3, 0],
                  [1, 2]
                ];
          } else {
            segments =
              SEGMENT_TABLE[cellCase];
          }

          interpolate(
            x0, y0, x1, y0,
            v0, v1, level,
            edgePoints[0]
          );

          interpolate(
            x1, y0, x1, y1,
            v1, v2, level,
            edgePoints[1]
          );

          interpolate(
            x1, y1, x0, y1,
            v2, v3, level,
            edgePoints[2]
          );

          interpolate(
            x0, y1, x0, y0,
            v3, v0, level,
            edgePoints[3]
          );

          const path = paths[levelIndex];

          for (const [edgeA, edgeB] of segments) {
            const pointA = edgePoints[edgeA];
            const pointB = edgePoints[edgeB];

            path.moveTo(pointA.x, pointA.y);
            path.lineTo(pointB.x, pointB.y);
          }
        }
      }
    }

    return paths;
  }

  /* =========================================================
     Puntos de muestra
     ========================================================= */

  function drawSamplePoints(phase) {
    const count = 22;
    const goldenAngle = 2.399963229728653;

    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      const angle = index * goldenAngle;

      const distance =
        radius *
        Math.sqrt(
          (index + 1) /
          (count + 2)
        ) *
        0.9;

      const x =
        centerX +
        Math.cos(angle) * distance;

      const y =
        centerY +
        Math.sin(angle) * distance;

      const value = field(x, y, phase);

      context.fillStyle = levelColor(value);
      context.globalAlpha = 0.72;

      context.beginPath();
      context.arc(x, y, 2.35, 0, Math.PI * 2);
      context.fill();
    }

    context.globalAlpha = 1;
  }

  /* =========================================================
     Borde circular
     ========================================================= */

  function drawBoundary() {
    context.beginPath();

    context.arc(
      centerX,
      centerY,
      radius,
      0,
      Math.PI * 2
    );

    context.strokeStyle = COLORS.border;
    context.lineWidth = 1;
    context.globalAlpha = 0.85;

    context.stroke();

    context.globalAlpha = 1;
  }

  /* =========================================================
     Dibujo completo
     ========================================================= */

  function draw() {
    context.clearRect(0, 0, width, height);

    /*
      Todos los niveles utilizan la misma fase:
      son curvas de nivel de un único campo escalar.
    */

    const phase = time;

    sampleGrid(phase);

    const paths = buildLevelPaths();

    context.save();

    context.beginPath();

    context.arc(
      centerX,
      centerY,
      radius,
      0,
      Math.PI * 2
    );

    context.clip();

    for (
      let levelIndex = 0;
      levelIndex < LEVELS.length;
      levelIndex += 1
    ) {
      const level = LEVELS[levelIndex];
      const isZero = level === 0;

      context.strokeStyle = levelColor(level);
      context.lineWidth = isZero ? 1.55 : 1.05;
      context.globalAlpha = isZero ? 0.82 : 0.6;

      context.stroke(paths[levelIndex]);
    }

    context.globalAlpha = 1;

    drawSamplePoints(phase);

    context.restore();

    drawBoundary();
  }

  /* =========================================================
     Ajuste del lienzo
     =========================================================

     Devuelve false si el elemento aún no tiene un tamaño
     utilizable. No impone mínimos: el búfer interno siempre
     coincide con el tamaño de CSS, de modo que el círculo
     nunca se deforma.
  */

  function resize() {
    const rect = canvas.getBoundingClientRect();

    if (
      rect.width < 10 ||
      rect.height < 10
    ) {
      return false;
    }

    dpr = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    width = rect.width;
    height = rect.height;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    centerX = width / 2;
    centerY = height / 2;

    radius = Math.min(width, height) * 0.425;

    buildGridStructure();

    return true;
  }

  /* =========================================================
     Animación
     =========================================================

     El dibujo solo ocurre cuando el tiempo avanza
     (cada FRAME_INTERVAL ms), de modo que no se
     redibujan fotogramas idénticos.
  */

  function animate(timestamp = 0) {
    /*
      Un cambio de devicePixelRatio sin cambio de
      tamaño (mover la ventana a otro monitor) no
      dispara el ResizeObserver; se verifica aquí.
    */

    const currentDpr = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    if (currentDpr !== dpr) {
      resize();
      draw();
    }

    if (
      timestamp - lastFrameTime >= FRAME_INTERVAL
    ) {
      time += TIME_STEP;
      lastFrameTime = timestamp;
      draw();
    }

    animationId =
      requestAnimationFrame(animate);
  }

  /*
    start(): dibuja de inmediato y, si corresponde,
    pone en marcha la animación. Conserva el campo actual.

    regenerate(): genera un campo nuevo (ondas nuevas)
    y reinicia el tiempo. Solo la invoca el botón.
  */

  function start() {
    cancelAnimationFrame(animationId);

    lastFrameTime = 0;

    draw();

    if (!reduceMotion) {
      animationId =
        requestAnimationFrame(animate);
    }
  }

  function regenerate() {
    generateWaves();

    time = reduceMotion ? 1.2 : 0;

    start();
  }

  /* =========================================================
     Observación del tamaño del lienzo
     =========================================================

     La guarda de dimensiones evita realimentación:
     el observador solo reacciona a cambios reales del
     tamaño de layout, nunca a los cambios de los
     atributos width/height del canvas. Redimensionar
     conserva la semilla del campo.
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

    if (resize()) {
      start();
    }
  });

  /* =========================================================
     Preferencia de movimiento reducido (reactiva)
     ========================================================= */

  motionQuery.addEventListener(
    "change",
    (event) => {
      reduceMotion = event.matches;

      if (reduceMotion) {
        cancelAnimationFrame(animationId);
        draw();
      } else {
        start();
      }
    }
  );

  /* =========================================================
     Botón para generar otro campo
     ========================================================= */

  if (resetButton) {
    resetButton.addEventListener(
      "click",
      regenerate
    );
  }

  /* =========================================================
     Inicio
     =========================================================

     El primer disparo del ResizeObserver realiza el
     ajuste inicial y arranca la animación.
  */

  generateWaves();

  time = reduceMotion ? 1.2 : 0;

  observer.observe(canvas);
})();