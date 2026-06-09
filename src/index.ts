#!/usr/bin/env node

import process from "node:process";
import {
    clamp,
    drawBackground,
    enterAltScreen,
    hideCursor,
    leaveAltScreen,
    printHelp,
    rand,
    showCursor
} from "./utils.js";
import {ESC, FRAME_MS, LIGHTING_MODES, MAX_BUBBLES, MAX_FISH, RESET} from "./constants.js";
import {createFish, drawFish, updateFish} from "./fish.js";
import {createBubble, drawBubbles, spawnBubbleBurst, updateBubbles} from "./bubbles.js";
import {createSeaweed, drawSeaweed} from "./seaweed.js";
import {createShark, drawShark, updateShark} from "./shark.js";
import {drawFood, spawnFoodBurst, updateFood} from "./food.js";
import {drawHud} from "./hud.js";
import * as readline from "node:readline";
import type {StateProps} from "./types/state.types.js";

export let state: StateProps;
export let timer: NodeJS.Timeout | null;
export let shuttingDown = false;

export function createState(): StateProps {
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
        splashMessage: "f feed  a add  r remove  l light  s shark.ts  h hud  q quit",
        splashAge: 0,
        feedingFrenzy: 0,
        fish: Array.from({length: fishCount}, () => createFish(width, height)),
        bubbles: Array.from({length: Math.min(24, Math.floor(width / 3))}, () =>
            createBubble(width, height)
        ),
        foods: [],
        shark: null,
        lastRareEvent: 0,
        seaweed: createSeaweed(width, height),
    };
}

export function resizeState(nextWidth: number, nextHeight: number) {
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

export function maybeSpawnAmbientEffects(dt: number) {
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

export function update(dt: number) {
    state.clock += dt;
    state.splashAge += dt;
    state.feedingFrenzy = Math.max(0, state.feedingFrenzy - dt);

    if (state.splashAge > 6) {
        state.splashMessage = "f feed  a add  r remove  l light  s shark.ts  h hud  q quit";
    }

    maybeSpawnAmbientEffects(dt);
    updateFood(dt);
    updateBubbles(dt);
    updateFish(dt);
    updateShark(dt);
}

export function getWaterTone(x: number, y: number) {
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

export function createBuffer(width: number, height: number) {
    const chars: String[][] = Array.from({length: height}, (): String[] => Array(width).fill(" "));
    const colors: String[][] = Array.from({length: height}, (): String[] => Array(width).fill(""));
    return {chars, colors};
}

export function renderBuffer(buffer: { chars: any; colors: any; }) {
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

export function onKeypress(_: any, key: { ctrl: any; name: string; }) {
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
        printHelp()
        return;
    }

    // if (args.has("--version") || args.has("-v")) {
    //   process.stdout.write(`${packageJson.version}\n`);
    //   return;
    // }

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

start();
