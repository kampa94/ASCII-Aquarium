import {MAX_BUBBLES} from "./constants.js";
import {state} from "./index.js";
import {color, dim, writeCell, rand, pick} from "./utils.js";
import type {BubbleProps} from "./types/bubble.types.js";

export class Bubble {
    createBubble(width: number, height: number, sourceX = rand(2, width - 2), sourceY = height - 2): BubbleProps {
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

    spawnBubbleBurst() {
        const burstX = rand(4, state.width - 4);
        const burstY = rand(state.height * 0.55, state.height - 2);
        for (let i = 0; i < 18; i += 1) {
            if (state.bubbles.length >= MAX_BUBBLES) {
                break;
            }
            state.bubbles.push(this.createBubble(state.width, state.height, burstX, burstY));
        }
    }

    updateBubbles(dt: number) {
        state.bubbles = state.bubbles.filter((bubble: BubbleProps) => {
            bubble.age += dt;
            bubble.x += bubble.vx * dt + Math.sin(state.clock * 2.4 + bubble.age * 5) * 0.03;
            bubble.y += bubble.vy * dt;
            bubble.vx += Math.sin(state.clock * 1.2 + bubble.age * 8) * 0.12 * dt;
            bubble.vy -= 0.45 * dt;
            return bubble.age < bubble.ttl && bubble.y > 1;
        });
    }

    drawBubbles(buffer: { chars: any[][]; colors: any[][]; }) {
        for (const bubble of state.bubbles) {
            const style = bubble.glyph === "." ? dim(153) : color(159);
            writeCell(buffer, Math.round(bubble.x), Math.round(bubble.y), bubble.glyph, style);

        }
    }
}