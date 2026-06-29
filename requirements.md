# Software Requirements Specification (SRS)

## Project: Recoil Duel

**Version:** 1.0
**Platform:** Web Browser (Frontend Only)
**Hosting:** Vercel
**Architecture:** Static Next.js Application (No Backend)

---

# 1. Project Overview

## 1.1 Purpose

Recoil Duel is a frontend-only physics simulation game where two autonomous guns battle inside a confined arena.

The player has no control over the guns after pressing **Start**. Every action is determined by physics and random events.

The game's entertainment comes from:

* realistic recoil
* momentum
* collisions
* randomness
* unpredictable outcomes

Each round produces a different battle.

---

# 2. Scope

The project consists entirely of client-side code.

No:

* database
* authentication
* multiplayer
* API
* server logic
* accounts

Everything executes inside the browser.

---

# 3. Technology Stack

## Framework

* Next.js
* React
* TypeScript

## Rendering

HTML5 Canvas

OR

PixiJS (preferred)

---

## Physics

Matter.js

Used for

* rigid body physics
* collision detection
* wall collision
* gun collision
* recoil forces

---

## Audio

Howler.js

---

## Deployment

Vercel

---

# 4. Game Overview

The player presses

> Start Battle

The simulation begins.

Two guns spawn inside a rectangular arena.

They begin firing one at a time.

The firing order is randomly generated.

Physics determines movement.

Eventually one gun loses all health.

Winner is displayed.

Replay button appears.

---

# 5. Arena

The arena is a rectangle.

Example

```
+--------------------------------------+
|                                      |
|                                      |
|      Gun A            Gun B          |
|                                      |
|                                      |
|                                      |
+--------------------------------------+
```

Properties

* closed box
* guns cannot escape
* walls are solid
* walls bounce guns
* bullets disappear on wall impact

---

# 6. Guns

Each gun is a Matter.js body.

Properties

```
id

position

rotation

velocity

angular velocity

mass

health

alive

gun type

reload timer

fire cooldown
```

---

# 7. Initial Spawn

Spawn positions are randomized.

Requirements

* minimum distance apart
* cannot overlap
* random rotation

---

# 8. Health

Default

```
100 HP
```

Damage

```
Bullet hit

-10 HP
```

When HP reaches

```
0

Gun destroyed
```

---

# 9. Firing System

There is no player control.

A timer chooses which gun fires.

Example

```
Gun A

Gun B

Gun B

Gun A

Gun A

Gun A

Gun B
```

Random every shot.

Probability

```
50%

50%
```

---

# 10. Shooting

When firing

Create

Bullet

Apply recoil

Play sound

Create muzzle flash

Start cooldown

---

# 11. Recoil

Every shot applies force opposite barrel direction.

Requirements

Realistic impulse

Moves gun backwards

Can rotate gun

Changes future aim

---

# 12. Bullets

Properties

```
position

velocity

direction

damage

radius

owner
```

---

Behavior

Move straight.

No gravity.

No bouncing.

Destroyed when

* hitting wall
* hitting gun

---

# 13. Collision System

## Bullet vs Gun

If owner != target

Apply damage

Destroy bullet

Create sparks

Play hit sound

---

## Bullet vs Wall

Destroy bullet

Dust particle

Small sound

---

## Gun vs Gun

Physics collision.

Momentum transfer.

Rotation changes.

No damage.

---

## Gun vs Wall

Bounce.

Remain inside arena.

Never escape.

---

# 14. Physics

Physics runs at

```
60 FPS
```

Simulation must be deterministic during one round.

Properties

* restitution
* friction
* density
* angular damping

---

# 15. Random System

Randomly generated

Spawn positions

Spawn rotation

Next shooter

Arena modifier (future)

Critical hit (future)

---

# 16. Camera

Static camera.

Arena always visible.

No scrolling.

---

# 17. User Interface

Top

```
Gun A HP

Timer

Gun B HP
```

Center

Canvas

Bottom

```
Start

Restart

Settings
```

---

# 18. Sound

Effects

Gunshot

Impact

Wall hit

Victory

Explosion

UI click

---

# 19. Visual Effects

Muzzle flash

Smoke

Sparks

Dust

Hit flash

Health bar animation

Screen shake

---

# 20. Game States

```
MENU

↓

START

↓

SPAWN

↓

BATTLE

↓

VICTORY

↓

RESTART
```

---

# 21. Win Condition

When

```
Health <= 0
```

Stop simulation.

Display winner.

Play animation.

Show replay.

---

# 22. Performance Requirements

Target

```
60 FPS
```

Maximum bullets

```
100
```

Maximum particles

```
1000
```

Memory

Less than 200 MB

---

# 23. Folder Structure

```
src/

    app/

    components/

        Arena/

        Gun/

        Bullet/

        HUD/

        UI/

    physics/

        engine.ts

        recoil.ts

        collisions.ts

        shooting.ts

    entities/

        Gun.ts

        Bullet.ts

    systems/

        DamageSystem.ts

        SpawnSystem.ts

        RandomSystem.ts

        PhysicsSystem.ts

        AudioSystem.ts

        RenderSystem.ts

    assets/

        sounds/

        images/

    utils/

    types/
```

---

# 24. Future Features (Out of Scope for v1)

* Different gun models
* Multiple arenas
* Replay system
* Slow-motion highlights
* Statistics dashboard
* Betting mode (player predicts winner)
* Custom physics settings
* Tournament mode
* Spectator mode
* Mobile controls
* Leaderboards
* Multiplayer

---

# 25. Acceptance Criteria

The project is considered complete when:

* Two guns spawn without overlap.
* Guns remain inside the arena at all times.
* Guns collide realistically with walls and each other.
* One randomly selected gun fires at a time.
* Every shot produces visible recoil.
* Recoil affects future positioning and aim.
* Bullets travel in straight lines.
* Bullets disappear on wall or gun impact.
* Gun health decreases only when hit by an opponent's bullet.
* The simulation runs smoothly at approximately 60 FPS.
* One gun is declared the winner when the other reaches 0 HP.
* The game can be deployed as a static frontend-only application on Vercel with no backend dependencies.

This specification defines a self-contained, deterministic physics simulation whose core gameplay emerges from recoil, collision dynamics, and randomized firing order rather than direct player input.
