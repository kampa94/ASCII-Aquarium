import {PERSONALITIES} from "../enums/enums";

export type FishProps =  {
    width: number,
    height: number,
    hunger: number
    vx: number | undefined
    vy: number | undefined
    x:number
    y:number
    shape: string
    rightDirection: boolean,
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