
    (() => {
      "use strict";

      const canvas = document.getElementById("growthCanvas");
      const regenerateButton = document.getElementById("regenerateGrowth");

      if (!canvas || !regenerateButton) {
        return;
      }

      const context = canvas.getContext("2d");
      const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );

      const COLORS = {
        ink: "#202522",
        paper: "#F4F1E8",
        green: "#2F6656",
        blue: "#315B7D",
        terracotta: "#A44F32",
        gray: "#D9D7CF"
      };

      let animationFrameId = null;
      let resizeTimer = null;
      let simulation = null;

      function randomBetween(minimum, maximum) {
        return minimum + Math.random() * (maximum - minimum);
      }

      function distanceSquared(pointA, pointB) {
        const dx = pointA.x - pointB.x;
        const dy = pointA.y - pointB.y;
        return dx * dx + dy * dy;
      }

      function normalizeVector(x, y) {
        const length = Math.hypot(x, y);

        if (length === 0) {
          return { x: 0, y: 0 };
        }

        return {
          x: x / length,
          y: y / length
        };
      }

      function configureCanvas() {
        const rectangle = canvas.getBoundingClientRect();
        const size = Math.max(280, Math.round(rectangle.width));
        const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.round(size * devicePixelRatio);
        canvas.height = Math.round(size * devicePixelRatio);
        canvas.style.height = `${size}px`;

        context.setTransform(
          devicePixelRatio,
          0,
          0,
          devicePixelRatio,
          0,
          0
        );

        return size;
      }

      function createAttractors(center, radius, targetCount) {
        const attractors = [];
        const minimumRadius = radius * 0.16;
        const maximumRadius = radius * 0.92;
        const minimumSeparation = Math.max(10, radius * 0.055);
        const minimumSeparationSquared =
          minimumSeparation * minimumSeparation;

        let attempts = 0;
        const maximumAttempts = targetCount * 80;

        while (
          attractors.length < targetCount &&
          attempts < maximumAttempts
        ) {
          attempts += 1;

          const angle = Math.random() * Math.PI * 2;
          const radialFactor = Math.sqrt(Math.random());
          const pointRadius =
            minimumRadius +
            radialFactor * (maximumRadius - minimumRadius);

          const point = {
            x: center.x + Math.cos(angle) * pointRadius,
            y: center.y + Math.sin(angle) * pointRadius,
            reached: false
          };

          const isSeparated = attractors.every(
            (attractor) =>
              distanceSquared(point, attractor) >
              minimumSeparationSquared
          );

          if (isSeparated) {
            attractors.push(point);
          }
        }

        return attractors;
      }

      function createInitialBranches(center, radius, stepLength) {
        const branches = [
          {
            x: center.x,
            y: center.y,
            parentIndex: -1,
            directionX: 0,
            directionY: -1,
            depth: 0
          }
        ];

        const rotation = randomBetween(0, Math.PI * 2);
        const seedCount = 4;

        for (let index = 0; index < seedCount; index += 1) {
          const angle =
            rotation +
            (index / seedCount) * Math.PI * 2 +
            randomBetween(-0.16, 0.16);

          const directionX = Math.cos(angle);
          const directionY = Math.sin(angle);

          branches.push({
            x: center.x + directionX * stepLength,
            y: center.y + directionY * stepLength,
            parentIndex: 0,
            directionX,
            directionY,
            depth: 1
          });
        }

        return branches;
      }

      function createSimulation() {
        const size = configureCanvas();
        const center = {
          x: size / 2,
          y: size / 2
        };

        const radius = size * 0.44;
        const isCompact = size < 390;
        const stepLength = Math.max(4.6, size * 0.014);

        const attractorCount = isCompact ? 74 : 104;
        const attractors = createAttractors(
          center,
          radius,
          attractorCount
        );

        return {
          size,
          center,
          radius,
          attractors,
          branches: createInitialBranches(
            center,
            radius,
            stepLength
          ),
          stepLength,
          influenceDistance: radius * 0.31,
          killDistance: Math.max(9, size * 0.025),
          minimumNodeDistance: stepLength * 0.62,
          maximumNodes: isCompact ? 460 : 650,
          iterations: 0,
          maximumIterations: 230,
          finished: false,
          revealProgress: 0
        };
      }

      function growOneIteration(state) {
        if (
          state.finished ||
          state.branches.length >= state.maximumNodes ||
          state.iterations >= state.maximumIterations ||
          state.attractors.length === 0
        ) {
          state.finished = true;
          return;
        }

        state.iterations += 1;

        const influenceDistanceSquared =
          state.influenceDistance * state.influenceDistance;
        const killDistanceSquared =
          state.killDistance * state.killDistance;

        const influences = new Map();
        const survivingAttractors = [];

        for (const attractor of state.attractors) {
          let nearestBranchIndex = -1;
          let nearestDistanceSquared = Infinity;

          for (
            let branchIndex = 0;
            branchIndex < state.branches.length;
            branchIndex += 1
          ) {
            const branch = state.branches[branchIndex];
            const currentDistanceSquared = distanceSquared(
              attractor,
              branch
            );

            if (currentDistanceSquared < nearestDistanceSquared) {
              nearestDistanceSquared = currentDistanceSquared;
              nearestBranchIndex = branchIndex;
            }
          }

          if (nearestDistanceSquared <= killDistanceSquared) {
            continue;
          }

          survivingAttractors.push(attractor);

          if (
            nearestBranchIndex >= 0 &&
            nearestDistanceSquared <= influenceDistanceSquared
          ) {
            const branch = state.branches[nearestBranchIndex];
            const direction = normalizeVector(
              attractor.x - branch.x,
              attractor.y - branch.y
            );

            const currentInfluence = influences.get(
              nearestBranchIndex
            ) || {
              directionX: 0,
              directionY: 0,
              count: 0
            };

            currentInfluence.directionX += direction.x;
            currentInfluence.directionY += direction.y;
            currentInfluence.count += 1;

            influences.set(nearestBranchIndex, currentInfluence);
          }
        }

        state.attractors = survivingAttractors;

        const newBranches = [];

        for (const [branchIndex, influence] of influences.entries()) {
          const parent = state.branches[branchIndex];

          const averagedDirection = normalizeVector(
            influence.directionX / influence.count +
              parent.directionX * 0.42,
            influence.directionY / influence.count +
              parent.directionY * 0.42
          );

          const newPoint = {
            x: parent.x + averagedDirection.x * state.stepLength,
            y: parent.y + averagedDirection.y * state.stepLength
          };

          const radialDistance = Math.hypot(
            newPoint.x - state.center.x,
            newPoint.y - state.center.y
          );

          if (radialDistance >= state.radius * 0.97) {
            continue;
          }

          const minimumNodeDistanceSquared =
            state.minimumNodeDistance * state.minimumNodeDistance;

          const isFarEnough = state.branches.every(
            (branch) =>
              distanceSquared(newPoint, branch) >
              minimumNodeDistanceSquared
          );

          if (!isFarEnough) {
            continue;
          }

          newBranches.push({
            x: newPoint.x,
            y: newPoint.y,
            parentIndex: branchIndex,
            directionX: averagedDirection.x,
            directionY: averagedDirection.y,
            depth: parent.depth + 1
          });
        }

        if (newBranches.length === 0) {
          state.finished = true;
          return;
        }

        state.branches.push(...newBranches);
      }

      function drawBackground(state) {
        context.clearRect(0, 0, state.size, state.size);

        context.save();
        context.translate(0.5, 0.5);

        context.beginPath();
        context.arc(
          state.center.x,
          state.center.y,
          state.radius,
          0,
          Math.PI * 2
        );
        context.strokeStyle = COLORS.gray;
        context.lineWidth = 1;
        context.stroke();

        context.restore();
      }

      function drawAttractors(state) {
        const initialCount = state.size < 390 ? 74 : 104;
        const remainingRatio = Math.min(
          1,
          state.attractors.length / initialCount
        );

        const alpha =
          state.iterations < 14
            ? 0.52
            : Math.max(0.12, 0.32 * remainingRatio);

        context.save();

        for (const attractor of state.attractors) {
          context.beginPath();
          context.arc(
            attractor.x,
            attractor.y,
            state.size < 390 ? 1.25 : 1.45,
            0,
            Math.PI * 2
          );
          context.fillStyle = `rgba(49, 91, 125, ${alpha})`;
          context.fill();
        }

        context.restore();
      }

      function drawBranches(state) {
        context.save();
        context.lineCap = "round";
        context.lineJoin = "round";

        for (
          let branchIndex = 1;
          branchIndex < state.branches.length;
          branchIndex += 1
        ) {
          const branch = state.branches[branchIndex];
          const parent = state.branches[branch.parentIndex];

          const normalizedDepth = Math.min(branch.depth / 24, 1);
          const lineWidth =
            Math.max(1, state.size * 0.009 * (1 - normalizedDepth * 0.56));

          context.beginPath();
          context.moveTo(parent.x, parent.y);
          context.lineTo(branch.x, branch.y);
          context.strokeStyle =
            branch.depth < 5
              ? "rgba(47, 102, 86, 0.98)"
              : "rgba(47, 102, 86, 0.82)";
          context.lineWidth = lineWidth;
          context.stroke();
        }

        context.beginPath();
        context.arc(
          state.center.x,
          state.center.y,
          Math.max(4, state.size * 0.012),
          0,
          Math.PI * 2
        );
        context.fillStyle = COLORS.terracotta;
        context.fill();

        const tipCount = Math.min(14, state.branches.length - 1);

        for (
          let offset = 0;
          offset < tipCount;
          offset += 1
        ) {
          const branch =
            state.branches[state.branches.length - 1 - offset];

          context.beginPath();
          context.arc(
            branch.x,
            branch.y,
            Math.max(1.35, state.size * 0.004),
            0,
            Math.PI * 2
          );
          context.fillStyle =
            offset % 3 === 0 ? COLORS.blue : COLORS.green;
          context.fill();
        }

        context.restore();
      }

      function drawSimulation(state) {
        drawBackground(state);
        drawAttractors(state);
        drawBranches(state);
      }

      function animate() {
        if (!simulation) {
          return;
        }

        const iterationsPerFrame =
          simulation.size < 390 ? 2 : 1;

        for (
          let iteration = 0;
          iteration < iterationsPerFrame;
          iteration += 1
        ) {
          growOneIteration(simulation);
        }

        drawSimulation(simulation);

        if (!simulation.finished) {
          animationFrameId = window.requestAnimationFrame(animate);
        } else {
          animationFrameId = null;
        }
      }

      function completeWithoutAnimation(state) {
        while (!state.finished) {
          growOneIteration(state);
        }

        drawSimulation(state);
      }

      function restartSimulation() {
        if (animationFrameId !== null) {
          window.cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }

        simulation = createSimulation();

        if (reducedMotionQuery.matches) {
          completeWithoutAnimation(simulation);
        } else {
          animate();
        }
      }

      regenerateButton.addEventListener(
        "click",
        restartSimulation
      );

      window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimer);

        resizeTimer = window.setTimeout(
          restartSimulation,
          180
        );
      });

      reducedMotionQuery.addEventListener?.(
        "change",
        restartSimulation
      );

      restartSimulation();
    })();
  