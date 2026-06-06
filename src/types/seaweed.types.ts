export interface Seaweed {
    stalks: Stalks[]
    floorY: number;
}

export interface Stalks {
    x: number;
    height: number;
    phase: number;
    speed: number;
    glyph: "|" | "/" | "\\";
}