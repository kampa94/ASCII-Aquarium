#!/usr/bin/env node
import readline from "readline";

const FPS = 30;
const FRAME_MS = 1000 / FPS;
const MAX_FISH = 28;
const MAX_BUBBLES = 120;
const SEAWEED_SPACING = 8;
const ESC = "\x1b[";
const RESET = "\x1b[0m";
const FEEDING_FRENZY_SECONDS = 6.5;

const LIGHTING_MODES = {
  AUTO: "auto",
  NIGHT: "night",
  NEON: "neon",
  ABYSS: "abyss",
};

const RIGHT_SHAPES = [
  "><>",
  "><))*>",
  "><(((o>",
  ">==>",
  "><>==>",
  "><((*>",
];

const PERSONALITIES = ["social", "curious", "lazy", "darty"];

let state = null;
let timer = null;
let shuttingDown = false;

export function printHelp() {
  const lines = [
    "ASCII Aquarium",
    "",
    "Usage:",
    "  node src/index.js",
    "  ascii-aquarium",
    "",
    "Controls:",
    "  f  drop food",
    "  a  add fish",
    "  r  remove fish",
    "  l  cycle lighting mode (auto/night/neon/abyss)",
    "  s  spawn shark",
    "  b  bubble burst",
    "  h  toggle HUD",
    "  q  quit",
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function rand(min, max) {
  return Math.random() * (max - min) + min;
}

export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function limitMagnitude(x, y, max) {
  const magnitude = Math.hypot(x, y);
  if (magnitude <= max || magnitude === 0) {
    return [x, y];
  }
  const scale = max / magnitude;
  return [x * scale, y * scale];
}

export function mirrorShape(shape) {
  const pairs = {
    "<": ">",
    ">": "<",
    "(": ")",
    ")": "(",
    "[": "]",
    "]": "[",
    "{": "}",
    "}": "{",
    "/": "\\",
    "\\": "/",
  };

  return shape
    .split("")
    .reverse()
    .map((char) => pairs[char] || char)
    .join("");
}

export function color(code) {
  return `${ESC}38;5;${code}m`;
}

export function bold(code) {
  return `${ESC}1;38;5;${code}m`;
}

export function dim(code) {
  return `${ESC}2;38;5;${code}m`;
}

export function hideCursor() {
  process.stdout.write(`${ESC}?25l`);
}

export function showCursor() {
  process.stdout.write(`${ESC}?25h`);
}

export function enterAltScreen() {
  process.stdout.write(`${ESC}?1049h${ESC}2J${ESC}H`);
}

export function leaveAltScreen() {
  process.stdout.write(`${ESC}?1049l`);
}

export function createSeaweed(width, height) {
  const stalks = [];
  const floorY = Math.max(3, height - 2);
  for (let x = 4; x < width - 4; x += SEAWEED_SPACING) {
    stalks.push({
      x,
      height: Math.floor(rand(3, Math.max(4, height * 0.28))),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.7, 1.6),
      glyph: pick(["|", "/", "\\"]),
    });
  }
  return { stalks, floorY };
}

export function createFish(width, height, options = {}) {
  const shape = pick(RIGHT_SHAPES);
  const dir = options.dir || (Math.random() > 0.5 ? 1 : -1);
  const personality = pick(PERSONALITIES);
  const depth = options.depth ?? rand(0.15, 1);
  const speedBase =
    personality === "darty"
      ? rand(10, 18)
      : personality === "lazy"
        ? rand(5, 8.5)
        : rand(7.5, 12.5);

  return {
    x: options.x ?? rand(2, Math.max(3, width - shape.length - 2)),
    y: options.y ?? rand(2, Math.max(4, height - 4)),
    vx: dir * speedBase,
    vy: rand(-2.4, 2.4),
    dir,
    shape,
    personality,
    speedBase,
    hunger: rand(0.1, 0.8),
    hungerRate: rand(0.015, 0.05),
    color: Math.floor(rand(111, 229)),
    depth,
    phase: rand(0, Math.PI * 2),
    energy: rand(0.6, 1.1),
    wanderX: rand(-1, 1),
    wanderY: rand(-1, 1),
    age: 0,
  };
}

export function createBubble(width, height, sourceX = rand(2, width - 2), sourceY = height - 2) {
  return {
    x: sourceX + rand(-0.5, 0.5),
    y: sourceY + rand(-0.2, 0.2),
    vx: rand(-1.2, 1.2),
    vy: rand(-9.5, -4.5),
    age: 0,
    ttl: rand(3, 8),
    glyph: pick(["o", "O", ".", "0"]),
  };
}

export function createFood(width) {
  return {
    x: rand(Math.max(4, width * 0.18), Math.max(5, width * 0.82)),
    y: 2,
    vy: rand(3.5, 6.5),
    life: 0,
    sparkle: rand(0, Math.PI * 2),
  };
}

export function createShark(width, height) {
  const dir = Math.random() > 0.5 ? 1 : -1;
  // Single-line shark that actually looks like a shark
  const body = dir === 1 
    ? "    /\\    ___)))>=======>"
    : "<=======(((___    /\\    ";
  return {
    x: dir === 1 ? -body.length : width + body.length,
    y: rand(3, Math.max(5, height * 0.55)),
    vx: dir * rand(16, 20),
    dir,
    body,
    ttl: 14,
    phase: rand(0, Math.PI * 2),
  };
}

export function createState() {
  const width = Math.max(60, process.stdout.columns || 80);
  const height = Math.max(18, process.stdout.rows || 24);
  const fishCount = Math.min(12, Math.max(6, Math.floor(width / 10)));

  return {
    width,
    height,
    clock: 0,
    cycleOffset: rand(0, Math.PI * 2),
    lightingMode: LIGHTING_MODES.AUTO,
    showHud: true,
    splashMessage: "f feed  a add  r remove  l light  s shark  h hud  q quit",
    splashAge: 0,
    feedingFrenzy: 0,
    fish: Array.from({ length: fishCount }, () => createFish(width, height)),
    bubbles: Array.from({ length: Math.min(24, Math.floor(width / 3)) }, () =>
      createBubble(width, height)
    ),
    foods: [],
    shark: null,
    lastRareEvent: 0,
    seaweed: createSeaweed(width, height),
  };
}

export function resizeState(nextWidth, nextHeight) {
  if (!state) {
    return;
  }

  state.width = Math.max(60, nextWidth || 80);
  state.height = Math.max(18, nextHeight || 24);
  state.seaweed = createSeaweed(state.width, state.height);

  for (const fish of state.fish) {
    fish.x = clamp(fish.x, 1, state.width - fish.shape.length - 1);
    fish.y = clamp(fish.y, 2, state.height - 3);
  }

  for (const bubble of state.bubbles) {
    bubble.x = clamp(bubble.x, 1, state.width - 2);
    bubble.y = clamp(bubble.y, 1, state.height - 2);
  }

  for (const food of state.foods) {
    food.x = clamp(food.x, 1, state.width - 2);
    food.y = clamp(food.y, 1, state.height - 2);
  }
}

export function spawnFoodBurst() {
  const count = Math.floor(rand(3, 7));
  for (let i = 0; i < count; i += 1) {
    state.foods.push(createFood(state.width));
  }
  state.feedingFrenzy = FEEDING_FRENZY_SECONDS;
  state.splashMessage = "Feeding frenzy! The school turns instantly.";
  state.splashAge = 0;
}

export function spawnBubbleBurst() {
  const burstX = rand(4, state.width - 4);
  const burstY = rand(state.height * 0.55, state.height - 2);
  for (let i = 0; i < 18; i += 1) {
    if (state.bubbles.length >= MAX_BUBBLES) {
      break;
    }
    state.bubbles.push(createBubble(state.width, state.height, burstX, burstY));
  }
}

export function maybeSpawnAmbientEffects(dt) {
  if (Math.random() < 0.34 * dt && state.bubbles.length < MAX_BUBBLES) {
    state.bubbles.push(createBubble(state.width, state.height));
  }

  if (!state.shark && state.clock - state.lastRareEvent > 18 && Math.random() < 0.015 * dt) {
    state.shark = createShark(state.width, state.height);
    state.lastRareEvent = state.clock;
    state.splashMessage = "A shadow glides through the tank...";
    state.splashAge = 0;
  }
}

export function updateFood(dt) {
  state.foods = state.foods.filter((food) => {
    food.life += dt;
    food.y += food.vy * dt;
    food.vy = Math.min(food.vy + dt * 0.65, 8);
    return food.life < 18 && food.y < state.height - 2;
  });
}

export function updateBubbles(dt) {
  state.bubbles = state.bubbles.filter((bubble) => {
    bubble.age += dt;
    bubble.x += bubble.vx * dt + Math.sin(state.clock * 2.4 + bubble.age * 5) * 0.03;
    bubble.y += bubble.vy * dt;
    bubble.vx += Math.sin(state.clock * 1.2 + bubble.age * 8) * 0.12 * dt;
    bubble.vy -= 0.45 * dt;
    return bubble.age < bubble.ttl && bubble.y > 1;
  });
}

export function updateShark(dt) {
  if (!state.shark) {
    return;
  }

  const shark = state.shark;
  shark.ttl -= dt;
  shark.x += shark.vx * dt;
  shark.phase += dt * 1.3;

  if (Math.random() < 0.9 * dt && state.bubbles.length < MAX_BUBBLES) {
    state.bubbles.push(
      createBubble(
        state.width,
        state.height,
        shark.x + (shark.dir === 1 ? shark.body.length - 6 : 5),
        shark.y + 1
      )
    );
  }

  for (const fish of state.fish) {
    const dx = fish.x - shark.x;
    const dy = fish.y - shark.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 16) {
      fish.vx += Math.sign(dx || 1) * 18 * dt;
      fish.vy += Math.sign(dy || 1) * 10 * dt;
      fish.hunger = Math.max(0, fish.hunger - 0.1 * dt);
    }
  }

  const offRight = shark.x > state.width + shark.body.length + 2;
  const offLeft = shark.x < -shark.body.length - 2;
  if (shark.ttl <= 0 || offRight || offLeft) {
    state.shark = null;
  }
}

export function updateFish(dt) {
  for (const fish of state.fish) {
    fish.age += dt;
    fish.hunger = clamp(fish.hunger + fish.hungerRate * dt, 0, 1.5);

    let alignX = 0;
    let alignY = 0;
    let cohesionX = 0;
    let cohesionY = 0;
    let separationX = 0;
    let separationY = 0;
    let neighbors = 0;

    for (const other of state.fish) {
      if (other === fish) {
        continue;
      }
      const dx = other.x - fish.x;
      const dy = other.y - fish.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 14) {
        neighbors += 1;
        alignX += other.vx;
        alignY += other.vy;
        cohesionX += other.x;
        cohesionY += other.y;
      }

      if (distance > 0 && distance < 4) {
        separationX -= dx / distance;
        separationY -= dy / distance;
      }
    }

    let steerX = 0;
    let steerY = Math.sin(state.clock * 1.2 + fish.phase) * 0.6;

    if (neighbors > 0 && fish.personality !== "lazy") {
      alignX = alignX / neighbors - fish.vx;
      alignY = alignY / neighbors - fish.vy;
      cohesionX = cohesionX / neighbors - fish.x;
      cohesionY = cohesionY / neighbors - fish.y;
      steerX += alignX * 0.012 + cohesionX * 0.01 + separationX * 0.85;
      steerY += alignY * 0.012 + cohesionY * 0.01 + separationY * 0.85;
    }

    const nearestFood = findNearestFood(fish);
    if (nearestFood && (state.feedingFrenzy > 0 || fish.hunger > 0.18)) {
      const dx = nearestFood.x - fish.x;
      const dy = nearestFood.y - fish.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const pull = (state.feedingFrenzy > 0 ? 2.1 : 1) * (1 / dist) * (1 + fish.hunger * 0.85);
      steerX += dx * 3.6 * pull;
      steerY += dy * 3.1 * pull;
    } else {
      fish.wanderX += rand(-0.18, 0.18) * dt;
      fish.wanderY += rand(-0.12, 0.12) * dt;
      fish.wanderX = clamp(fish.wanderX, -1.3, 1.3);
      fish.wanderY = clamp(fish.wanderY, -0.9, 0.9);
      steerX += fish.wanderX * 0.9;
      steerY += fish.wanderY * 0.4;
    }

    const leftMargin = 2;
    const rightMargin = state.width - fish.shape.length - 2;
    const topMargin = 2;
    const bottomMargin = state.height - 3;

    if (fish.x < leftMargin + 4) {
      steerX += (leftMargin + 4 - fish.x) * 0.32;
    }
    if (fish.x > rightMargin - 4) {
      steerX -= (fish.x - (rightMargin - 4)) * 0.32;
    }
    if (fish.y < topMargin + 1) {
      steerY += 1.2;
    }
    if (fish.y > bottomMargin - 1) {
      steerY -= 1.2;
    }

    if (state.shark) {
      const dx = fish.x - state.shark.x;
      const dy = fish.y - state.shark.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 18) {
        steerX += (dx / Math.max(distance, 1)) * 20;
        steerY += (dy / Math.max(distance, 1)) * 12;
      }
    }

    const hungerBoost = 1 + fish.hunger * 0.5;
    fish.vx += steerX * dt * hungerBoost;
    fish.vy += steerY * dt;

    const maxSpeed =
      fish.speedBase *
      (fish.personality === "darty" ? 1.35 : fish.personality === "lazy" ? 0.85 : 1) *
      (0.92 + fish.depth * 0.5);

    [fish.vx, fish.vy] = limitMagnitude(fish.vx, fish.vy, maxSpeed);

    fish.x += fish.vx * dt;
    fish.y += fish.vy * dt;

    if (fish.x <= 1) {
      fish.x = 1;
      fish.vx = Math.abs(fish.vx);
    }
    if (fish.x >= state.width - fish.shape.length - 1) {
      fish.x = state.width - fish.shape.length - 1;
      fish.vx = -Math.abs(fish.vx);
    }
    if (fish.y <= 2) {
      fish.y = 2;
      fish.vy = Math.abs(fish.vy) * 0.5;
    }
    if (fish.y >= state.height - 3) {
      fish.y = state.height - 3;
      fish.vy = -Math.abs(fish.vy) * 0.5;
    }

    fish.dir = fish.vx >= 0 ? 1 : -1;
    eatNearbyFood(fish);
  }
}

export function findNearestFood(fish) {
  let nearest = null;
  let bestDistance = Infinity;

  for (const food of state.foods) {
    const dx = food.x - fish.x;
    const dy = food.y - fish.y;
    const distance = Math.hypot(dx, dy);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = food;
    }
  }

  return nearest;
}

export function eatNearbyFood(fish) {
  for (let i = state.foods.length - 1; i >= 0; i -= 1) {
    const food = state.foods[i];
    const dx = food.x - fish.x;
    const dy = food.y - fish.y;
    if (Math.hypot(dx, dy) < 1.8) {
      state.foods.splice(i, 1);
      fish.hunger = Math.max(0, fish.hunger - 0.55);
      fish.vx *= 1.05;
      spawnBubbleBurst();
      break;
    }
  }
}

export function update(dt) {
  state.clock += dt;
  state.splashAge += dt;
  state.feedingFrenzy = Math.max(0, state.feedingFrenzy - dt);

  if (state.splashAge > 6) {
    state.splashMessage = "f feed  a add  r remove  l light  s shark  h hud  q quit";
  }

  maybeSpawnAmbientEffects(dt);
  updateFood(dt);
  updateBubbles(dt);
  updateFish(dt);
  updateShark(dt);
}

export function getWaterTone(x, y) {
  const depth = y / Math.max(1, state.height - 1);
  const wave =
    Math.sin(x * 0.08 + state.clock * 1.6) * 0.22 +
    Math.cos(y * 0.12 - state.clock * 1.1) * 0.18 +
    Math.sin((x + y) * 0.03 + state.clock * 0.9) * 0.12;

  const autoDaylight = (Math.sin(state.clock * 0.15 + state.cycleOffset) + 1) / 2;
  const daylight =
    state.lightingMode === LIGHTING_MODES.AUTO
      ? autoDaylight
      : state.lightingMode === LIGHTING_MODES.NIGHT
        ? 0.18
        : state.lightingMode === LIGHTING_MODES.NEON
          ? 0.72
          : 0.06;

  if (state.lightingMode === LIGHTING_MODES.NEON) {
    const band = Math.sin(state.clock * 0.7 + x * 0.05 + y * 0.09);
    const neonShift = band > 0.55 ? 6 : band < -0.55 ? -6 : 0;
    const base = depth < 0.22 ? 45 : depth < 0.55 ? 39 : depth < 0.82 ? 33 : 27;
    return clamp(base + neonShift, 16, 51);
  }

  if (state.lightingMode === LIGHTING_MODES.ABYSS) {
    const base = depth < 0.2 ? 24 : depth < 0.55 ? 18 : depth < 0.82 ? 17 : 16;
    return clamp(base + (wave > 0.35 ? 1 : wave < -0.35 ? -1 : 0), 16, 25);
  }

  if (depth < 0.18) {
    return daylight > 0.55 ? (wave > 0.35 ? 123 : 117) : 81;
  }
  if (depth < 0.5) {
    return daylight > 0.55 ? (wave > 0.3 ? 81 : 75) : 31;
  }
  if (depth < 0.78) {
    return daylight > 0.55 ? 32 : (wave > 0.25 ? 25 : 24);
  }
  return daylight > 0.55 ? 24 : 18;
}

export function createBuffer(width, height) {
  const chars = Array.from({ length: height }, () => Array(width).fill(" "));
  const colors = Array.from({ length: height }, () => Array(width).fill(""));
  return { chars, colors };
}

export function writeCell(buffer, x, y, char, style) {
  if (x < 0 || y < 0 || y >= buffer.chars.length || x >= buffer.chars[0].length) {
    return;
  }
  buffer.chars[y][x] = char;
  buffer.colors[y][x] = style;
}

export function drawText(buffer, x, y, text, style) {
  for (let i = 0; i < text.length; i += 1) {
    writeCell(buffer, x + i, y, text[i], style);
  }
}

export function drawBackground(buffer) {
  const waterChars = [" ", " ", ".", ".", ",", "`", "~"];
  const floorY = state.height - 2;
  const floorChars = ["_", ".", ",", "_", ".", ","];

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const waterStyle = color(getWaterTone(x, y));
      const noise =
        Math.sin((x * 0.18) + state.clock * 1.35 + y * 0.41) +
        Math.cos((x * 0.07) - state.clock * 0.95 + y * 0.28);
      const index = clamp(Math.floor(((noise + 2) / 4) * waterChars.length), 0, waterChars.length - 1);
      let char = waterChars[index];

      if (y === floorY) {
        char = floorChars[(x + Math.floor(state.clock * 3)) % floorChars.length];
      } else if (y > floorY) {
        char = x % 5 === 0 ? "_" : x % 3 === 0 ? "." : " ";
      }

      writeCell(buffer, x, y, char, waterStyle);
    }
  }
}

export function drawSeaweed(buffer) {
  const floorY = state.seaweed.floorY;
  const style = color(34);
  for (const stalk of state.seaweed.stalks) {
    for (let i = 0; i < stalk.height; i += 1) {
      const sway = Math.sin(state.clock * stalk.speed + stalk.phase + i * 0.45) * 1.3;
      const x = Math.round(stalk.x + sway);
      const y = floorY - i;
      const glyph =
        i === stalk.height - 1
          ? pick(["'", "`", "."])
          : Math.abs(sway) < 0.45
            ? "|"
            : sway > 0
              ? "/"
              : "\\";
      writeCell(buffer, x, y, glyph, style);
    }
  }
}

export function drawFood(buffer) {
  const style = bold(220);
  const sparkleStyle = bold(229);
  for (const food of state.foods) {
    const x = Math.round(food.x);
    const y = Math.round(food.y);
    const sparkle = Math.sin(state.clock * 9 + food.sparkle) > 0.55 ? "+" : "*";
    writeCell(buffer, x, y, sparkle, sparkle === "+" ? sparkleStyle : style);
    if (state.feedingFrenzy > 0 && Math.random() < 0.12) {
      writeCell(buffer, x + (Math.random() > 0.5 ? 1 : -1), y, ".", dim(228));
    }
  }
}

export function drawBubbles(buffer) {
  for (const bubble of state.bubbles) {
    const style = bubble.glyph === "." ? dim(153) : color(159);
    writeCell(buffer, Math.round(bubble.x), Math.round(bubble.y), bubble.glyph, style);
  }
}

export function drawFish(buffer) {
  const sorted = [...state.fish].sort((a, b) => a.depth - b.depth);
  for (const fish of sorted) {
    const body = fish.dir === 1 ? fish.shape : mirrorShape(fish.shape);
    const style =
      fish.depth > 0.66
        ? bold(fish.color)
        : fish.depth > 0.38
          ? color(fish.color)
          : dim(fish.color);
    const y = Math.round(fish.y + Math.sin(state.clock * 2 + fish.phase) * 0.35);
    drawText(buffer, Math.round(fish.x), y, body, style);
  }
}

export function drawShark(buffer) {
  if (!state.shark) {
    return;
  }
  const y = Math.round(state.shark.y + Math.sin(state.shark.phase) * 0.6);
  drawText(buffer, Math.round(state.shark.x), y, state.shark.body, bold(250));
}

export function drawHud(buffer) {
  if (!state.showHud) {
    return;
  }

  const daylight = (Math.sin(state.clock * 0.15 + state.cycleOffset) + 1) / 2;
  const autoPhase = daylight > 0.6 ? "day" : daylight < 0.35 ? "night" : "dusk";
  const mode =
    state.lightingMode === LIGHTING_MODES.AUTO ? `auto:${autoPhase}` : state.lightingMode;
  const text =
    ` ASCII Aquarium | fish ${state.fish.length} | food ${state.foods.length} | ` +
    `bubbles ${state.bubbles.length} | light ${mode} | ` +
    `${state.feedingFrenzy > 0 ? "FRENZY! " : ""}${state.splashMessage}`;
  const hud = text.padEnd(state.width, " ").slice(0, state.width);
  drawText(buffer, 0, 0, hud, `${ESC}30;48;5;153m`);
}

export function renderBuffer(buffer) {
  let output = `${ESC}H`;
  for (let y = 0; y < buffer.chars.length; y += 1) {
    let currentStyle = "";
    for (let x = 0; x < buffer.chars[y].length; x += 1) {
      const style = buffer.colors[y][x];
      if (style !== currentStyle) {
        output += style;
        currentStyle = style;
      }
      output += buffer.chars[y][x];
    }
    output += RESET;
    if (y < buffer.chars.length - 1) {
      output += "\n";
    }
  }
  process.stdout.write(output);
}

export function render() {
  const buffer = createBuffer(state.width, state.height);
  drawBackground(buffer);
  drawSeaweed(buffer);
  drawFood(buffer);
  drawBubbles(buffer);
  drawFish(buffer);
  drawShark(buffer);
  drawHud(buffer);
  renderBuffer(buffer);
}

export function onKeypress(_, key) {
  if (!key) {
    return;
  }

  if (key.ctrl && key.name === "c") {
    shutdown();
    return;
  }

  switch (key.name) {
    case "q":
      shutdown();
      break;
    case "f":
      spawnFoodBurst();
      break;
    case "a":
      if (state.fish.length < MAX_FISH) {
        state.fish.push(createFish(state.width, state.height));
        state.splashMessage = "A new fish slips into the tank.";
        state.splashAge = 0;
      }
      break;
    case "r":
      if (state.fish.length > 1) {
        state.fish.pop();
        state.splashMessage = "One fish vanished into the deep.";
        state.splashAge = 0;
      }
      break;
    case "l":
      state.lightingMode =
        state.lightingMode === LIGHTING_MODES.AUTO
          ? LIGHTING_MODES.NIGHT
          : state.lightingMode === LIGHTING_MODES.NIGHT
            ? LIGHTING_MODES.NEON
            : state.lightingMode === LIGHTING_MODES.NEON
              ? LIGHTING_MODES.ABYSS
              : LIGHTING_MODES.AUTO;
      state.splashMessage = `Lighting: ${state.lightingMode}`;
      state.splashAge = 0;
      break;
    case "s":
      if (!state.shark) {
        state.shark = createShark(state.width, state.height);
        state.splashMessage = "A rare predator arrives.";
        state.splashAge = 0;
      }
      break;
    case "b":
      spawnBubbleBurst();
      state.splashMessage = "Bubble vent triggered.";
      state.splashAge = 0;
      break;
    case "h":
      state.showHud = !state.showHud;
      break;
    default:
      break;
  }
}

export function shutdown() {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  process.stdin.off("keypress", onKeypress);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
  showCursor();
  process.stdout.write(RESET);
  leaveAltScreen();
}

export function start() {
  const args = new Set(process.argv.slice(2));

  if (args.has("--help") || args.has("-h")) {
    printHelp();
    return;
  }

  if (args.has("--version") || args.has("-v")) {
    process.stdout.write(`${packageJson.version}\n`);
    return;
  }

  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    console.error("This aquarium needs an interactive terminal (TTY). Run it in PowerShell, Command Prompt, or a terminal window.");
    process.exit(1);
  }

  state = createState();
  enterAltScreen();
  hideCursor();

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("keypress", onKeypress);

  let last = Date.now();
  timer = setInterval(() => {
    const now = Date.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
  }, FRAME_MS);

  process.stdout.on("resize", () => {
    resizeState(process.stdout.columns, process.stdout.rows);
    render();
  });

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", () => {
    if (!shuttingDown) {
      showCursor();
      process.stdout.write(RESET);
      leaveAltScreen();
    }
  });

  render();
}

// start();
