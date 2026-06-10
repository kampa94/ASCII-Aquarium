import process from "node:process";

export function printHelp() {
    const lines = [
        "ASCII Aquarium",
        "",
        "Usage:",
        "  node src/index.ts",
        "  ascii-aquarium",
        "",
        "Controls:",
        "  f  drop food",
        "  a  add fish",
        "  r  remove fish",
        "  l  cycle lighting mode (auto/night/neon/abyss)",
        "  s  spawn shark.ts",
        "  b  bubble burst",
        "  h  toggle HUD",
        "  q  quit",
    ];

    process.stdout.write(`${lines.join("\n")}\n`);
}
