/**
 * PistolGG's kill sounds and win celebration, played through the map's wts_headshot_sound
 * point_soundevent, with feather bursts from the server's wts_feathers effects (see core/effects.ts).
 */

import type { CSPlayerPawn } from "cs_script/point_script";
import { effectPool, particlePool } from "../../core/effects";
import { mapSound } from "../../core/sounds";
import { after } from "../../core/timers";

/**
 * Bells rung from the victim's head, one per kill on the same weapon, the last on the kill that
 * moves the killer up. Inferno's brass bells are named by note (bell_g is bell_f's file pitched
 * up), so these rise as a major chord.
 */
const PISTOL_BELLS = ["inferno.bell_c", "inferno.bell_e", "inferno.bell_g"];

/**
 * The grenade level's own four: the game's wind chimes in rising order, by their loudest pitch
 * (D#5, D#6, G6, G#6, measured from the sound files 2026-10-28). Quieter than the bells: volume
 * 0.4, heard out to 1,000 units, so they ring from the thrower: grenade kills were 600 to 1,300
 * units away and went unheard from the victim (2026-10-28).
 */
const GRENADE_CHIMES = ["windchimes.snd04", "windchimes.snd01", "windchimes.snd03", "windchimes.snd02"];

/**
 * Played together from the victim's head on a knife kill: Arms Race's own winning-knife sting (full
 * volume, heard about 1,400 units away), the top bell to finish the chord, and a chicken
 * resurrection and squawk heard close by.
 */
const KNIFE_SOUNDS = ["UI.ArmsRace.FinalKill_Knife", "inferno.bell_g", "Chicken.ZombieRez", "Chicken.Panic"];

/**
 * After the winning knife kill, one of these every beat from the winner. Each name blocks its own
 * repeats (up to 5 s for the world chicken sounds), so none repeats. The PhotoBooth ones are
 * pet-menu sounds, heard within 300 units.
 */
const WIN_CHICKENS = [
  "Chicken.Panic.Hen.PhotoBooth",
  "Chicken.Interact",
  "Chicken.Panic.Pullet.PhotoBooth",
  "Chicken.Chick.Interact",
  "Chicken.Panic.Chick.PhotoBooth",
  "Chicken.Death",
];
const WIN_BEAT_SECONDS = 0.6;

/**
 * Through the victory lap, feather bursts (the game's cheaper chicken death: a puff and a feather
 * spray) out of the winner: `FEATHER_BURSTS` every `FEATHER_STEP` seconds, scattered within
 * `FEATHER_RADIUS` across and `FEATHER_HEIGHT` up, about a player's body, so it's plain whose they
 * are and they trail behind the lap's run. Each burst holds a pool name for a second, so the pool
 * caps it at about 58 a second. At 180 across, the peak took a client from 235 to 95 FPS (2026-10-29).
 */
const FEATHER_POOL = 64;
const FEATHER_SECONDS = 5;
const FEATHER_STEP = 0.1;
const FEATHER_BURSTS = 5;
const FEATHER_RADIUS = 48;
const FEATHER_HEIGHT = 72;
export const FEATHERS = particlePool("wts_feathers", FEATHER_POOL, ["particles/critters/chicken/chicken_gone_cheaper.vpcf"]);
const feathers = effectPool("fanfare", "wts_feathers", FEATHER_POOL);

const killSound = mapSound("fanfare", "wts_headshot_sound");

export function playKillSound({ killer, victim, weapon, kills, knifed }: { killer: CSPlayerPawn; victim: CSPlayerPawn; weapon: string; kills: number; knifed: boolean }): void {
  const head = victim.GetEyePosition();
  if (knifed) {
    for (const sound of KNIFE_SOUNDS) killSound(head, sound);
    return;
  }
  if (weapon === "weapon_hegrenade") killSound(killer.GetEyePosition(), GRENADE_CHIMES[Math.min(kills, GRENADE_CHIMES.length) - 1]);
  else killSound(head, PISTOL_BELLS[Math.min(kills, PISTOL_BELLS.length) - 1]);
}

/** Arms Race's own demotion cue, from where a player killed themselves. */
export function playDemotion({ player }: { player: CSPlayerPawn }): void {
  killSound(player.GetEyePosition(), "UI.ArmsRace.Demoted");
}

export function celebrateWin(winner: CSPlayerPawn): void {
  WIN_CHICKENS.forEach((sound, beat) => {
    after(beat * WIN_BEAT_SECONDS, () => {
      // Gone if the winner disconnected during the lap
      if (winner.IsValid()) killSound(winner, sound);
    });
  });
  for (let step = 0; step < FEATHER_SECONDS / FEATHER_STEP; step++) {
    after(step * FEATHER_STEP, () => {
      if (!winner.IsValid()) return;
      const at = winner.GetAbsOrigin();
      for (let burst = 0; burst < FEATHER_BURSTS; burst++) {
        // Uniform over the disc, so the middle isn't crowded
        const [reach, angle] = [Math.sqrt(Math.random()) * FEATHER_RADIUS, Math.random() * 2 * Math.PI];
        feathers({ x: at.x + Math.cos(angle) * reach, y: at.y + Math.sin(angle) * reach, z: at.z + Math.random() * FEATHER_HEIGHT });
      }
    });
  }
}
