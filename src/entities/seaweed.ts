import {SEAWEED_SPACING} from "../utils/constants";
import {state} from "@";
import type {SeaweedProps, Stalks} from "../types/seaweed.types";
import type {Entity} from "../interfaces/entity.interface";
import {pick, rand} from "../utils/math.utils";
import {color} from "../utils/appearance.utils";

import {writeCell} from "../utils/render.utils";


export class Seaweed implements Entity {
    update(): void {
        throw new Error("Method not implemented.");
    }
    create(width: number, height: number): SeaweedProps {
        const stalks: Stalks[] = [];
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
        return {stalks, floorY};
    }

    draw(buffer: { chars: any[][]; colors: any[][]; }) {
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
}