export function pick<T>(list: T[] | string | object): any {
    if (Array.isArray(list) || typeof list === "string") {
        return list[Math.floor(Math.random() * list.length)];
    }
    if (typeof list === "object" && list !== null) {
        const values = Object.values(list);
        return values[Math.floor(Math.random() * values.length)];
    }
    return undefined;
}

export function limitMagnitude(x: number, y: number, max: number) {
    const magnitude = Math.hypot(x, y);
    if (magnitude <= max || magnitude === 0) {
        return [x, y];
    }
    const scale = max / magnitude;
    return [x * scale, y * scale];
}

export function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

export function rand(min: number, max: number) {
    return Math.random() * (max - min) + min;
}
