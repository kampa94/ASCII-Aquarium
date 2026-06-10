import process from "node:process";
import {ESC} from "./constants";

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