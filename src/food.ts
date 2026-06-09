import {bold, dim, rand, writeCell} from "./utils";
import {state} from "./index";
import {FEEDING_FRENZY_SECONDS} from "./constants";
import type {FoodProps} from "./types/food.types.js";

export class Food {
    private createFood(width: number): FoodProps {
        return {
            x: rand(Math.max(4, width * 0.18), Math.max(5, width * 0.82)),
            y: 2,
            vy: rand(3.5, 6.5),
            life: 0,
            sparkle: rand(0, Math.PI * 2),
        };
    }

    spawnFoodBurst() {
        const count = Math.floor(rand(3, 7));
        for (let i = 0; i < count; i += 1) {
            state.foods.push(this.createFood(state.width));
        }
        state.feedingFrenzy = FEEDING_FRENZY_SECONDS;
        state.splashMessage = "Feeding frenzy! The school turns instantly.";
        state.splashAge = 0;
    }

    drawFood(buffer: { chars: any[][]; colors: any[][]; }) {
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

    updateFood(dt: number) {
        state.foods = state.foods.filter((food: FoodProps) => {
            food.life += dt;
            food.y += food.vy * dt;
            food.vy = Math.min(food.vy + dt * 0.65, 8);
            return food.life < 18 && food.y < state.height - 2;
        });
    }
}