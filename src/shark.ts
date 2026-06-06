import {bold, drawText, rand} from "./utils.js";
import {state} from "./index.js";
import {MAX_BUBBLES} from "./constants.js";
import {createBubble} from "./bubbles.js";


export function createShark(width: number, height: number) {
    const dir = Math.random() > 0.5 ? 1 : -1;
    // Single-line shark.js that actually looks like a shark.js
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
export function drawShark(buffer: { chars: any[][]; colors: any[][]; }) {
    if (!state.shark) {
        return;
    }
    const y = Math.round(state.shark.y + Math.sin(state.shark.phase) * 0.6);
    drawText(buffer, Math.round(state.shark.x), y, state.shark.body, bold(250));
}

export function updateShark(dt: number) {
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
            fish.vx = fish.vx ? undefined : fish.vx;
            fish.vx =(fish.vx ?? 0) + Math.sign(dx || 1) * 18 * dt;
            fish.vy =(fish.vy ?? 0)  + Math.sign(dy || 1) * 10 * dt;
            fish.hunger = Math.max(0, fish.hunger - 0.1 * dt);
        }
    }

    const offRight = shark.x > state.width + shark.body.length + 2;
    const offLeft = shark.x < -shark.body.length - 2;
    if (shark.ttl <= 0 || offRight || offLeft) {
        state.shark = null;
    }
}