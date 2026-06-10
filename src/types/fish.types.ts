import type {PERSONALITIES} from "../utils/constants";

export type FishProps =  {
    width: number,
    height: number,
    hunger: number
    vx: number | undefined
    vy: number | undefined
    x:number
    y:number
    shape: string
    // todo: change to boolean, rename
    dir: number,
    personality: PERSONALITIES
    speedBase: number
    hungerRate: number
    color: number
    depth: number
    phase: number
    energy: number
    wanderX: number
    wanderY: number
    age: number
}