import type {FishProps} from "./fish.types.js";
import type {BubbleProps} from "./bubble.types.js";
import type {FoodProps} from "./food.types.js";
import type {SharkProps} from "./shark.types.js";
import type {SeaweedProps} from "./seaweed.types.js";

export type StateProps =  {
    width: number;
    height: number;
    clock: number;
    cycleOffset: number;
    lightingMode: string;
    showHud: boolean;
    splashMessage: string;
    splashAge: number;
    feedingFrenzy: number;
    fish: FishProps[];
    bubbles: BubbleProps[];
    foods: FoodProps[];
    shark: SharkProps | null;
    lastRareEvent: number;
    seaweed: SeaweedProps;
}