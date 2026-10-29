# Gamemodes

A gamemode is a whole game: it owns the win condition and the match flow, and it is built from plugins.

Each gamemode gets its own folder, with its main file named after it (`gun-game/gun-game.ts`). That file starts with the gamemode's settings, plain values with a comment each, so anyone can change how a match plays without reading plugin code. Below them it exports the gamemode, its name and its plugin list built from those settings, and `src/gamemode.ts` picks which one runs. Plugins that only this gamemode uses live in its folder too (`gun-game/ladder.ts`). One moves to `src/plugins/` when a second gamemode needs it.

Maps, models, sounds and HUD layouts aren't kept here. Workshop Tools saves them into the addon (`content/csgo_addons/cs2_gamemode_framework/`), and the game loads them from there.

`gun-game/gun-game.ts` is the reference for the layout, and the root README's "Making your own" lists the steps.
