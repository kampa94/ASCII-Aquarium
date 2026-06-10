import {state} from "@";
import {ESC, LIGHTING_MODES} from "./constants";


import {drawText} from "./render.utils";

export class Hud {
    drawHud(buffer: { chars: any[][]; colors: any[][]; }) {
        if (!state.showHud) {
            return;
        }

        const daylight = (Math.sin(state.clock * 0.15 + state.cycleOffset) + 1) / 2;
        const autoPhase = daylight > 0.6 ? "day" : daylight < 0.35 ? "night" : "dusk";
        const mode =
            state.lightingMode === LIGHTING_MODES.AUTO ? `auto:${autoPhase}` : state.lightingMode;
        const text =
            ` ASCII Aquarium | fish ${state.fish.length} | food ${state.foods.length} | ` +
            `bubbles ${state.bubbles.length} | light ${mode} | ` +
            `${state.feedingFrenzy > 0 ? "FRENZY! " : ""}${state.splashMessage}`;
        const hud = text.padEnd(state.width, " ").slice(0, state.width);
        drawText(buffer, 0, 0, hud, `${ESC}30;48;5;153m`);
    }
}