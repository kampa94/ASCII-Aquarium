import type {Fish} from "./fish.types.js";
import type {Bubble} from "./bubble.types.js";
import type {Food} from "./food.types.js";
import type {Shark} from "./shark.types.js";
import type {Seaweed} from "./seaweed.types.js";

export interface State {
    width: number;
    height: number;
    clock: number;
    cycleOffset: number;
    lightingMode: string;
    showHud: boolean;
    splashMessage: string;
    splashAge: number;
    feedingFrenzy: number;
    fish: Fish[];
    bubbles: Bubble[];
    foods: Food[];
    shark: Shark | null;
    lastRareEvent: number;
    seaweed: Seaweed;
}