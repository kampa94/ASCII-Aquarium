import {getWaterTone, state} from "@";
import {color} from "./appearance.utils";
import {clamp} from "./math.utils";
import {ESC, RESET} from "./constants";
import process from "node:process";

export function writeCell(buffer: {
    chars: any;
    colors: any;
}, x: number, y: number, char: string | undefined, style: string) {
    if (x < 0 || y < 0 || y >= buffer.chars.length || x >= buffer.chars[0].length) {
        return;
    }
    buffer.chars[y][x] = char;
    buffer.colors[y][x] = style;
}

export function drawText(buffer: {
    chars: any[][];
    colors: any[][];
}, x: number, y: number, text: string | any[], style: string) {
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