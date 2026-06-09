import {bold, clamp, color, dim, drawText, limitMagnitude, mirrorShape, pick, rand} from "./utils.js";
import {state} from "./index.js";
import {RIGHT_SHAPES, PERSONALITIES} from "./constants.js"
import {spawnBubbleBurst} from "./bubbles.js";
import type {Fish} from "./types/fish.types.js";

export function createFish(width: number, height: number): Fish {
    let options = {
        dir: null,
        depth: null,
        x: null,
        y: null
    }
    const shape = pick(RIGHT_SHAPES);
    const dir = options?.dir || (Math.random() > 0.5 ? 1 : -1);
    const personality = pick(PERSONALITIES);
    const depth = options?.depth ?? rand(0.15, 1);
    const speedBase =
        personality === "darty"
            ? rand(10, 18)
            : personality === "lazy"
                ? rand(5, 8.5)
                : rand(7.5, 12.5);

    return {
        width: width,
        height: height,
        x: options?.x ?? rand(2, Math.max(3, width - shape.length - 2)),
        y: options?.y ?? rand(2, Math.max(4, height - 4)),
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

export function findNearestFood(fish: Fish) {
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

export function eatNearbyFood(fish: Fish) {
    for (let i = state.foods.length - 1; i >= 0; i -= 1) {
        const food = state.foods[i];
        const dx = food!.x - fish.x;
        const dy = food!.y - fish.y;
        if (Math.hypot(dx, dy) < 1.8) {
            state.foods.splice(i, 1);
            fish.hunger = Math.max(0, fish.hunger - 0.55);
            fish.vx = (fish.vx ?? 0) * 1.05;
            spawnBubbleBurst();
            break;
        }
    }
}

export function drawFish(buffer: { chars: any[][]; colors: any[][]; }) {
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

export function updateFish(dt: number) {
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
                alignX += fish.vx ?? 0;
                alignY += other.vy ?? 0;
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
            alignX = alignX / neighbors - (fish.vx ?? 0);
            alignY = alignY / neighbors - (fish.vy ?? 0);
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
        fish.vx = (fish.vx ?? 0) + steerX * dt * hungerBoost;
        fish.vy = (fish.vy ?? 0) + steerY * dt;

        const maxSpeed =
            fish.speedBase *
            (fish.personality === "darty" ? 1.35 : fish.personality === "lazy" ? 0.85 : 1) *
            (0.92 + fish.depth * 0.5);

        [fish.vx, fish.vy] = limitMagnitude((fish.vx ?? 0), fish.vy, maxSpeed);

        fish.x += (fish.vx ?? 0) * dt;
        fish.y += (fish.vy ?? 0) * dt;

        if (fish.x <= 1) {
            fish.x = 1;
            fish.vx = Math.abs((fish.vx ?? 0));
        }
        if (fish.x >= state.width - fish.shape.length - 1) {
            fish.x = state.width - fish.shape.length - 1;
            fish.vx = -Math.abs((fish.vx ?? 0));
        }
        if (fish.y <= 2) {
            fish.y = 2;
            fish.vy = Math.abs((fish.vy ?? 0)) * 0.5;
        }
        if (fish.y >= state.height - 3) {
            fish.y = state.height - 3;
            fish.vy = -Math.abs((fish.vy ?? 0)) * 0.5;
        }

        fish.dir = (fish.vx ?? 0) >= 0 ? 1 : -1;
        eatNearbyFood(fish);
    }
}
