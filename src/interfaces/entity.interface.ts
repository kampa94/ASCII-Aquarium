export interface Entity {
    create(width: number, height: number): void,

    draw(buffer: { chars: any[][]; colors: any[][] }): void,

    update(dt: number): void
}
