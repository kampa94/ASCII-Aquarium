import {ESC} from "./constants.js";
import {getWaterTone, state} from "./index.js";
import * as process from "node:process";

export function printHelp() {
    const lines = [
        "ASCII Aquarium",
        "",
        "Usage:",
        "  node src/index.ts",
        "  ascii-aquarium",
        "",
        "Controls:",
        "  f  drop food",
        "  a  add fish",
        "  r  remove fish",
        "  l  cycle lighting mode (auto/night/neon/abyss)",
        "  s  spawn shark.ts",
        "  b  bubble burst",
        "  h  toggle HUD",
        "  q  quit",
    ];

    process.stdout.write(`${lines.join("\n")}\n`);
}

export function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

export function rand(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

export function pick(list: string | any[]) {
    return list[Math.floor(Math.random() * list.length)];
}

export function limitMagnitude(x: number, y: number, max: number) {
    const magnitude = Math.hypot(x, y);
    if (magnitude <= max || magnitude === 0) {
        return [x, y];
    }
    const scale = max / magnitude;
    return [x * scale, y * scale];
}

export function mirrorShape(shape: string) {
    const pairs: Record<string, string> = {
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
        .map((char: string) => pairs[char] || char)
        .join("");
}

export function color(code: number) {
    return `${ESC}38;5;${code}m`;
}

export function bold(code: number) {
    return `${ESC}1;38;5;${code}m`;
}

export function dim(code: any) {
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

export function writeCell(buffer: { chars: any; colors: any; }, x: number, y: number, char: string | undefined, style: string) {
    if (x < 0 || y < 0 || y >= buffer.chars.length || x >= buffer.chars[0].length) {
        return;
    }
    buffer.chars[y][x] = char;
    buffer.colors[y][x] = style;
}

export function drawText(buffer: { chars: any[][]; colors: any[][]; }, x: number, y: number, text: string | any[], style: string) {
    for (let i = 0; i < text.length; i += 1) {
        writeCell(buffer, x + i, y, text[i], style);
    }
}

export function drawBackground(buffer: { chars: any; colors: any; }) {
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