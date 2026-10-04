# Gun Rangers Squad

A front-end-only physics simulation game where two guns battle inside a confined arena. Built with Next.js, Matter.js, and HTML5 Canvas.

---

## What it is

Two guns spawn in a rectangular arena and fight autonomously. The player fires their gun by clicking or tapping. A bot gun is controlled by the AI. Physics determines everything — recoil pushes guns backward on every shot, guns bounce off walls and each other, and bullets travel in straight lines until they hit something.

The game ends when one gun reaches 0 HP.

---

## How to run locally

**Requirements:** Node.js 18+

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Alternatively use the included script:

```bash
bash start.sh
```

---

## How to play

| Action | Input |
|---|---|
| Fire your gun | Click / tap the canvas |
| Pause / resume | Spacebar |

- **You** are Gun A (blue).
- **Bot** is Gun B (red).
- First gun to reach 0 HP loses.
- Click **Fight** to start a new round.

---

## Game features

### Guns
Four gun models, each with distinct stats:

| Gun | Damage | Recoil | Fire rate | Notes |
|---|---|---|---|---|
| Pistol | 10 | Medium | Fast | Balanced, forgiving |
| Rifle | 18 | Heavy | Slow | High accuracy, strong kick |
| Shotgun | 6×5 | Violent | Very slow | Launches gun backward |
| Sniper | 35 | Extreme | Very slow | One-shot power |

### Arenas
- **Standard** — 800×600, classic layout
- **Compact** — 600×450, fast and chaotic
- **Wide** — 1000×500, open sightlines
- **Tall** — 600×800, vertical play

### Bot difficulty
Adjustable from 1–5. Controls aim tolerance, trigger patience, and mistake rate.

### Power-ups
Spawn periodically in the arena:
- 🛡 **Shield** — blocks the next hit entirely
- ⚡ **Damage Boost** — doubles damage on the next shot

### Tournament mode
Best-of series (3, 5, or 7). Tracks round scores across multiple battles.

### Physics settings
Configurable in-game:
- Gravity (X and Y)
- Recoil multiplier
- Restitution (bounciness) multiplier
- Bullet speed multiplier

---

## Physics model

The game uses **Matter.js** for rigid-body simulation with custom impulse handling layered on top.

### Recoil
Every shot applies a momentum-conservation impulse opposite the barrel direction:

```
Δv = (recoilForce × recoilMultiplier × stabilityFactor × 1000) / mass
```

Heavier guns resist recoil more. A **Fibonacci² stacking damper** prevents runaway velocity accumulation when shots land back-to-back before the gun settles — a fully recovered gun always gets full-strength recoil.

Angular kick direction is geometry-derived: the barrel sits slightly above the gun's center of mass, so the cross product of the barrel-offset vector and the recoil force vector determines which way the gun rotates. The rotation is always physically connected to the shot direction.

### Collisions

**Gun vs wall** — Matter.js owns the bounce response entirely. A fallback anti-tunneling guard corrects position if the gun passes through at high speed, using `v_new = -e × v_old` (correct restitution formula). Angular response is derived from the tangential velocity component along the wall surface.

**Gun vs gun** — Matter.js collision resolution is disabled between guns (negative collision group). A single manual resolver applies the correct mass-weighted impulse:

```
J = (1 + e) × v_rel_n / (1/mA + 1/mB)
```

A heavy sniper barely moves when a light pistol bounces off it. Angular spin comes from the tangential relative velocity at the contact point, not random noise.

**Bullet vs gun** — applies damage, removes bullet, spawns hit sparks.

**Bullet vs wall** — removes bullet, spawns dust.

### Slow motion
When a gun is destroyed, the simulation enters a 2.5-second slow-motion sequence (4% time scale) before the victory screen.

---

## Project structure

```
src/
├── app/                    # Next.js app router
├── components/             # React UI components
│   ├── GameCanvas.tsx      # Canvas mount + Game lifecycle
│   ├── HUD.tsx             # Health bars, state overlays
│   ├── GunSelector.tsx     # Gun picker
│   ├── ArenaSelector.tsx   # Arena picker
│   ├── DifficultySlider.tsx
│   ├── PhysicsSettings.tsx
│   ├── StatsPanel.tsx      # Post-battle stats
│   └── ...
└── game/
    ├── Game.ts             # Main game class, loop, collision handling
    ├── types.ts            # All shared TypeScript types
    ├── constants.ts        # Gun models, physics constants, colors
    ├── arenas.ts           # Arena configs and default settings
    ├── levels.ts           # Preset level configs
    ├── entities/
    │   ├── Gun.ts          # Gun body creation, barrel tip helpers
    │   └── Bullet.ts       # Bullet body creation
    ├── physics/
    │   ├── recoil.ts       # Recoil impulse, Fibonacci damper, decay
    │   ├── collisions.ts   # Collision type helpers
    │   └── shooting.ts     # Bullet spawn and firing
    └── systems/
        ├── RenderSystem.ts # All canvas drawing
        ├── SpawnSystem.ts  # Gun spawn positioning
        ├── AudioSystem.ts  # Web Audio API sound effects
        ├── StatsSystem.ts  # Shot/hit/damage tracking
        └── RandomSystem.ts # Fire delay randomization
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 + React 18 |
| Language | TypeScript |
| Physics | Matter.js 0.20 |
| Rendering | HTML5 Canvas 2D |
| Audio | Web Audio API |
| Deployment | Vercel (static, no backend) |

---

## Deployment

The app is fully static — no server, no database, no API.

Deploy to Vercel:

```bash
npx vercel
```

Or connect the GitHub repo to Vercel for automatic deploys on push.

---

## License

Proprietary — © NathenaelTamirat. See [LICENSE.md](LICENSE.md).
