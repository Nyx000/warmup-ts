/**
 * Entry point: the script a map's point_script entity loads (scripts/gamemode.vjs).
 * Picks the gamemode that runs. Launch the map with: game_type 3; game_mode 0; map <your_map>
 */

import { createGamemode } from "./core/gamemode";
import { pistolGG } from "./gamemodes/gun-game/gun-game";

createGamemode(pistolGG);
