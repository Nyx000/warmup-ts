/**
 * PistolGG's kill sounds and win celebration, played through the map's wts_headshot_sound
 * point_soundevent and wts_feathers_0..3 info_particle_systems ("Start Active" off).
 */

import { Console, Instance } from "cs_script/point_script";
import type { CSPlayerPawn, Vector } from "cs_script/point_script";
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
 * 0.4, heard out to 1,000 units.
 */
const GRENADE_CHIMES = ["windchimes.snd04", "windchimes.snd01", "windchimes.snd03", "windchimes.snd02"];

/**
 * Played together from the victim's head on a knife kill: Arms Race's own winning-knife sting (full
 * volume, heard about 1,400 units away), the top bell to finish the chord, and a chicken
 * resurrection and squawk heard close by.
 */
const KNIFE_SOUNDS = ["UI.ArmsRace.FinalKill_Knife", "inferno.bell_g", "Chicken.ZombieRez", "Chicken.Panic"];

/**
 * After the winning knife kill, one of these every beat from the winner, with a burst of feathers
 * around them on the first four. Each name blocks its own repeats (up to 5 s for the world chicken
 * sounds), so none repeats. The PhotoBooth ones are pet-menu sounds, heard within 300 units.
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
const FEATHER_BURSTS = 4;
// How far from the winner each burst appears, and how high
const FEATHER_RADIUS = 48;
const FEATHER_HEIGHT = 40;

const killSound = mapSound("fanfare", "wts_headshot_sound");
const warnedFeathers = new Set<number>();

export function playKillSound({ victim, weapon, kills, knifed }: { victim: CSPlayerPawn; weapon: string; kills: number; knifed: boolean }): void {
  const head = victim.GetEyePosition();
  if (knifed) {
    for (const sound of KNIFE_SOUNDS) killSound(head, sound);
    return;
  }
  const tones = weapon === "weapon_hegrenade" ? GRENADE_CHIMES : PISTOL_BELLS;
  killSound(head, tones[Math.min(kills, tones.length) - 1]);
}

export function celebrateWin(winner: CSPlayerPawn): void {
  WIN_CHICKENS.forEach((sound, beat) => {
    after(beat * WIN_BEAT_SECONDS, () => {
      // Gone if the winner disconnected during the lap
      if (!winner.IsValid()) return;
      killSound(winner, sound);
      if (beat < FEATHER_BURSTS) burstFeathers(beat, winner.GetAbsOrigin());
    });
  });
}

function burstFeathers(slot: number, around: Vector): void {
  const angle = (slot / FEATHER_BURSTS) * 2 * Math.PI;
  const position = {
    x: around.x + Math.cos(angle) * FEATHER_RADIUS,
    y: around.y + Math.sin(angle) * FEATHER_RADIUS,
    z: around.z + FEATHER_HEIGHT,
  };
  const effects = Instance.FindEntitiesByName(`wts_feathers_${slot}`);
  if (effects.length === 0) {
    if (!warnedFeathers.has(slot)) Console.Log(`[fanfare] no info_particle_system named wts_feathers_${slot}; that burst stays off`);
    warnedFeathers.add(slot);
    return;
  }
  for (const effect of effects) {
    effect.Teleport({ position });
    // Stopping first restarts a burst still playing from the last win
    Instance.EntFireAtTarget({ target: effect, input: "Stop" });
    Instance.EntFireAtTarget({ target: effect, input: "Start" });
  }
}
