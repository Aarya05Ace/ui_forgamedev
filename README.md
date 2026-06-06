# 💀 TOMB RUSH — Front-End

The complete **front-end** of TOMB RUSH — a 2–6 player multiplayer relic-heist game with
an LLM "Tomb Keeper." This repo is **UI / UX / 3D rendering only**: React 19 + React Three
Fiber (Three.js) + Vite. The Rust SpacetimeDB module and the Node Keeper service live in the
full-game repo, not here.

> Extracted as a standalone front-end. It builds and runs on its own; live gameplay needs a
> SpacetimeDB backend to connect to (see **Backend** below).

## What's in here

```
index.html                 Vite entry
src/
  App.tsx                  connection, input, game loop, layout
  components/
    GameScene.tsx          R3F Canvas — fog, god rays, bloom, color grade, EffectComposer
    Forest.tsx             stylized CC0 forest (instanced Kenney Nature Kit)
    Tomb.tsx               ground + forest HDRI sky + cinematic lighting + particles
    Player.tsx             character model, animation, client prediction, camera
    StatusFx.tsx           in-world Keeper-effect auras (carry/curse/bless/stun)
    StatusOverlay.tsx      status badges + screen tint
    HUD.tsx                scoreboard, collapse timer, winner banner
    KeeperVoice.tsx        Tomb Keeper subtitles + Web Speech voice
    HowToPlay.tsx          cinematic title screen
    JoinGameDialog.tsx     "Choose your grave robber" screen
    Relics / BankGates / Traps / HauntedForest / TombRuins / DebugPanel ...
  generated/               SpacetimeDB TS bindings (committed so this builds standalone)
  gameConstants.ts         client mirror of server tuning values
public/
  models/forest/kenney/    Kenney Nature Kit GLBs (CC0)
  models/{wizard,paladin}/ character FBX + animations
  hdri/ textures/          Poly Haven CC0 HDRI + PBR textures
```

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
```

## Backend (for live gameplay)

The client talks to a SpacetimeDB database over WebSocket. Point it at one with env vars
(no code edits needed):

```bash
VITE_STDB_HOST=ws://localhost:3000 VITE_STDB_DB=vibe-multiplayer npm run dev
# or the cloud:
VITE_STDB_HOST=wss://maincloud.spacetimedb.com VITE_STDB_DB=<db> npm run dev
```

Defaults are `localhost:3000` / `vibe-multiplayer`. Without a reachable backend the UI still
loads (title screen, scene) but stays on "Connecting…". The `src/generated/` bindings are
produced from the server module's schema via `spacetime generate`; they're committed here so
the front-end compiles without the backend present.

## Controls

WASD move · Shift sprint · mouse look (click to lock) · **F** shove · grab/bank automatic ·
**M** mute Keeper · **R** raid again · append `?debug` to the URL for the dev panel.

## Credits / licenses

All assets are CC0 (Kenney Nature Kit, Poly Haven) or MIT (R3F/three/the starter). See
[CREDITS.md](./CREDITS.md). Nothing here requires attribution beyond the retained MIT licenses.
