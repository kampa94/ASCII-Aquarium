import {state} from "@";
import {PERSONALITIES, RIGHT_SHAPES} from "../utils/constants"
import type {FishProps} from "../types/fish.types";
import {Bubble} from "./bubble";
import {type Entity} from "../interfaces/entity.interface"
import {clamp, limitMagnitude, pick, rand} from "../utils/math.utils";
import {bold, color, dim} from "../utils/appearance.utils";

import {drawText} from "../utils/render.utils";


export class Fish implements Entity {
    bubble = new Bubble();

    create(width: number, height: number): FishProps {
        let options = {
            dir: true,
            depth: null,
            x: null,
            y: null
        }
        const shape = pick(RIGHT_SHAPES);
        const dir = options?.dir || (Math.random() > 0.5);
        const personality: PERSONALITIES = pick(PERSONALITIES);
        const depth = options?.depth ?? rand(0.15, 1);
        let speedBase = 0;

        switch (personality) {
            case PERSONALITIES.darty:
                speedBase = rand(10, 18);
                break;
            case PERSONALITIES.lazy:
                speedBase = rand(5, 8.5);
                break;
            case PERSONALITIES.social:
                speedBase = rand(7.5, 12.5);
                break;
            case PERSONALITIES.curious:
                speedBase = rand(10, 15);
                break;
            default:
                // DEFAULT: social
                speedBase = rand(7.5, 12.5);
                break;
        }

        return {
            width: width,
            height: height,
            x: options?.x ?? rand(2, Math.max(3, width - shape.length - 2)),
            y: options?.y ?? rand(2, Math.max(4, height - 4)),
            vx: (dir ? 1 : -1) * speedBase,
            vy: rand(-2.4, 2.4),
            rightDirection: dir,
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

    private findNearestFood(fish: FishProps) {
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

    private eatNearbyFood(fish: FishProps) {
        for (let i = state.foods.length - 1; i >= 0; i -= 1) {
            const food = state.foods[i];
            const dx = food!.x - fish.x;
            const dy = food!.y - fish.y;
            if (Math.hypot(dx, dy) < 1.8) {
                state.foods.splice(i, 1);
                fish.hunger = Math.max(0, fish.hunger - 0.55);
                fish.vx = (fish.vx ?? 0) * 1.05;
                this.bubble.spawnBubbleBurst();
                break;
            }
        }
    }

    draw(buffer: { chars: any[][]; colors: any[][]; }) {
        const sorted = [...state.fish].sort((a, b) => a.depth - b.depth);
        for (const fish of sorted) {
            const body = fish.rightDirection ? fish.shape : this.mirrorShape(fish.shape);
            let style = dim(fish.color);
            if (fish.depth > 0.66) {
                style = bold(fish.color);
            } else if (fish.depth > 0.38) {
                style = color(fish.color);
            }
            const y = Math.round(fish.y + Math.sin(state.clock * 2 + fish.phase) * 0.35);
            drawText(buffer, Math.round(fish.x), y, body, style);
        }
    }

    update(dt: number) {
        for (const fish of state.fish) {
            this.updateBiologicalState(fish, dt);

            const steer = {
                x: 0,
                y: Math.sin(state.clock * 1.2 + fish.phase) * 0.6
            };

            this.applyFlockingForces(fish, steer);
            this.applyMovementForces(fish, steer, dt);
            this.applyAvoidanceForces(fish, steer);

            this.updateVelocity(fish, steer, dt);
            this.updatePosition(fish, dt);

            this.constrainToMap(fish);
            this.finalizeTurn(fish, dt);
        }
    }

    private updateBiologicalState(fish: any, dt: number): void {
        fish.age += dt;
        fish.hunger = clamp(fish.hunger + fish.hungerRate * dt, 0, 1.5);
    }

    private applyFlockingForces(fish: any, steer: { x: number; y: number }): void {
        const flocking = this.calculateFlocking(fish);
        steer.x += flocking.x;
        steer.y += flocking.y;
    }

    private applyMovementForces(fish: any, steer: { x: number; y: number }, dt: number): void {
        const movement = this.calculateMovement(fish, dt);
        steer.x += movement.x;
        steer.y += movement.y;
    }

    private applyAvoidanceForces(fish: any, steer: { x: number; y: number }): void {
        const avoidance = this.calculateAvoidance(fish);
        steer.x += avoidance.x;
        steer.y += avoidance.y;
    }

    private updateVelocity(fish: any, steer: { x: number; y: number }, dt: number): void {
        const hungerBoost = 1 + fish.hunger * 0.5;
        fish.vx = (fish.vx ?? 0) + steer.x * dt * hungerBoost;
        fish.vy = (fish.vy ?? 0) + steer.y * dt;

        const maxSpeed = this.getMaxSpeed(fish);
        [fish.vx, fish.vy] = limitMagnitude(fish.vx, fish.vy, maxSpeed);
    }

    private updatePosition(fish: any, dt: number): void {
        fish.x += (fish.vx ?? 0) * dt;
        fish.y += (fish.vy ?? 0) * dt;
    }

    private finalizeTurn(fish: any, dt: number): void {
        fish.dir = (fish.vx ?? 0) * dt >= 0 ? 1 : -1;
        this.eatNearbyFood(fish);
    }

    private calculateFlocking(fish: any): { x: number; y: number } {
        if (fish.personality === PERSONALITIES.lazy) return {x: 0, y: 0};
        const context = {
            alignX: 0, alignY: 0,
            cohesionX: 0, cohesionY: 0,
            separationX: 0, separationY: 0,
            neighbors: 0
        };

        this.accumulateNeighborForces(fish, context);

        if (context.neighbors === 0) return {x: 0, y: 0};

        const steer = {x: 0, y: 0};
        this.computeFlockingAverages(fish, context, steer);

        return steer;
    }

    private accumulateNeighborForces(fish: any, context: any): void {
        for (const other of state.fish) {
            if (other === fish) continue;

            const dx = other.x - fish.x;
            const dy = other.y - fish.y;
            const distance = Math.hypot(dx, dy);

            if (distance < 14) {
                context.neighbors++;
                context.alignX += other.vx ?? 0;
                context.alignY += other.vy ?? 0;
                context.cohesionX += other.x;
                context.cohesionY += other.y;
            }

            if (distance > 0 && distance < 4) {
                context.separationX -= dx / distance;
                context.separationY -= dy / distance;
            }
        }
    }

    private computeFlockingAverages(fish: any, context: any, steer: { x: number; y: number }): void {
        const n = context.neighbors;

        const alignX = context.alignX / n - (fish.vx ?? 0);
        const alignY = context.alignY / n - (fish.vy ?? 0);
        const cohesionX = context.cohesionX / n - fish.x;
        const cohesionY = context.cohesionY / n - fish.y;

        steer.x = alignX * 0.012 + cohesionX * 0.01 + context.separationX * 0.85;
        steer.y = alignY * 0.012 + cohesionY * 0.01 + context.separationY * 0.85;
    }


    private calculateMovement(fish: any, dt: number): { x: number; y: number } {
        const nearestFood = this.findNearestFood(fish);
        const isFrenzy = state.feedingFrenzy > 0;

        if (nearestFood && (isFrenzy || fish.hunger > 0.18)) {
            const dx = nearestFood.x - fish.x;
            const dy = nearestFood.y - fish.y;
            const dist = Math.max(1, Math.hypot(dx, dy));

            const pull = (isFrenzy ? 2.1 : 1) * (1 / dist) * (1 + fish.hunger * 0.85);
            return {x: dx * 3.6 * pull, y: dy * 3.1 * pull};
        }

        fish.wanderX = clamp(fish.wanderX + rand(-0.18, 0.18) * dt, -1.3, 1.3);
        fish.wanderY = clamp(fish.wanderY + rand(-0.12, 0.12) * dt, -0.9, 0.9);

        return {x: fish.wanderX * 0.9, y: fish.wanderY * 0.4};
    }

    private calculateAvoidance(fish: any): { x: number; y: number } {
        const steer = {x: 0, y: 0};

        this.avoidScreenMargins(fish, steer);
        this.fleeFromShark(fish, steer);

        return steer;
    }

    private avoidScreenMargins(fish: any, steer: { x: number; y: number }): void {
        const rightMargin = state.width - fish.shape.length - 2;

        if (fish.x < 6) {
            steer.x += (6 - fish.x) * 0.32;
        }
        if (fish.x > rightMargin - 4) {
            steer.x -= (fish.x - (rightMargin - 4)) * 0.32;
        }
        if (fish.y < 3) {
            steer.y += 1.2;
        }
        if (fish.y > state.height - 4) {
            steer.y -= 1.2;
        }
    }

    private fleeFromShark(fish: any, steer: { x: number; y: number }): void {
        if (!state.shark) return;

        const dx = fish.x - state.shark.x;
        const dy = fish.y - state.shark.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 18) {
            const force = Math.max(distance, 1);
            steer.x += (dx / force) * 20;
            steer.y += (dy / force) * 12;
        }
    }

    private getMaxSpeed(fish: any): number {
        const personalityModifier =
            fish.personality === PERSONALITIES.darty ? 1.35 :
                fish.personality === PERSONALITIES.lazy ? 0.85 : 1;

        return fish.speedBase * personalityModifier * (0.92 + fish.depth * 0.5);
    }

    private constrainToMap(fish: any) {
        const rightBound = state.width - fish.shape.length - 1;
        const bottomBound = state.height - 3;

        if (fish.x <= 1) {
            fish.x = 1;
            fish.vx = Math.abs(fish.vx);
        }
        if (fish.x >= rightBound) {
            fish.x = rightBound;
            fish.vx = -Math.abs(fish.vx);
        }
        if (fish.y <= 2) {
            fish.y = 2;
            fish.vy = Math.abs(fish.vy) * 0.5;
        }
        if (fish.y >= bottomBound) {
            fish.y = bottomBound;
            fish.vy = -Math.abs(fish.vy) * 0.5;
        }
    }


    mirrorShape(shape: string) {
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

}