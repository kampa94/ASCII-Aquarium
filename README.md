# Objective
I'm using this handy command-line application to do some refactoring exercises. I'll try to avoid using the AI ​​tool as much as possible, to see if I still remember how it works!

# Steps
Here are the steps I plan to perform:
- Unit testing: to fully understand the code and avoid future errors.

- Migrating from JavaScript to TypeScript
- Adding typing
- Creating the project structure (files and folders)
- Functional refactoring
- Implementing the Entity Component System pattern (https://en.wikipedia.org/wiki/Entity_component_system)



# ASCII Aquarium

A terminal-native ASCII aquarium designed for PowerShell, Command Prompt, macOS Terminal, and Linux terminals.

## Features

- Smooth ANSI-rendered animation in the real terminal
- Schooling fish with hunger-driven food chasing
- Rising bubbles, swaying seaweed, and layered depth
- Multiple lighting moods (auto / night / neon / abyss)
- Rare shark flyby event for extra drama
- Interactive controls with no external dependencies

## Run (no install)

If you have the project folder locally:

```bash
node src/index.js
```

## Run with npx (recommended)

If this is published on npm, you can run it instantly:

```bash
npx asc
```

If `asc` isn’t available (or you prefer the long name), run:

```bash
npx ascii-aquarium
```

## Install globally (optional)

If you want a persistent command:

```bash
npm i -g ascii-aquarium
ascii-aquarium
```

## Controls

- `f` drop food
- `a` add fish
- `r` remove fish
- `l` cycle lighting mode
- `s` spawn shark
- `b` bubble burst
- `h` toggle HUD
- `q` quit

## Troubleshooting

- **Nothing renders / it exits immediately**: you must run it in an interactive terminal (TTY). (Not inside some IDE output panes.)
- **Colors look weird**: use Windows Terminal / modern terminal emulator with ANSI support.
- **Flicker**: try a larger terminal window; very small windows are harder to animate smoothly.

## Notes

- Requires an interactive TTY terminal
- Best experienced in a modern ANSI-capable terminal
- Uses only built-in Node.js APIs for portability
