# Plugins

A plugin is one piece of behaviour: an object with a `name` and the engine hooks it needs (see `src/core/plugin.ts`, and "Writing a plugin" in the root README). Plugins here are shared by more than one gamemode; a plugin only one gamemode uses stays in that gamemode's folder.

Each plugin sits in one category, by what it touches. If it seems to fit two, it is probably two plugins. A category with ten or more files gets subfolders. Tests live in `tests/`, not beside the plugin.

| Category | Plugins today |
|---|---|
| `combat/` | `headshot-blood.ts`, `headshot-sound.ts`, `headshots-only.ts`, `ragdoll-punch.ts` |
| `economy/` | `money-log.ts` |
| `dev/` | `debug.ts`, `example.ts` |
| `hud/` | `repeat-message.ts`, `spawn-sound.ts`, `welcome.ts` |
| `players/` | `random-spawns.ts` |
| `loadout/`, `world/` | none yet; the folder and its README mark where they go |
