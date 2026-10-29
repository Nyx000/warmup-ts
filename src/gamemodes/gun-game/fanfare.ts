/**
 * PistolGG's kill sounds and win celebration, played through the map's wts_headshot_sound
 * point_soundevent and wts_chicken_maker point_template (one chicken as its template).
 */

import { Console, CSDamageFlags, CSDamageTypes, Instance } from "cs_script/point_script";
import type { CSPlayerPawn, PointTemplate } from "cs_script/point_script";
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
 * After the winning knife kill, one of these every beat from the winner, and on the first four a
 * chicken spawned on the winner and killed at once, so it bursts into feathers as a shot chicken does. Each name blocks its own repeats (up to 5 s for the world chicken
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
const WIN_FEATHER_BURSTS = 4;
// Around the winner's chest, far enough out to be seen from their own eyes
const CHICKEN_RADIUS = 40;
const CHICKEN_HEIGHT = 36;
// A chicken shot in the tick it spawned lived on, and one shot 0.1 s later died with its sound but
// no feathers (seen 2026-10-28; assumed, not measured: players' games never saw it before it died)
const CHICKEN_KILL_DELAY = 0.5;

const killSound = mapSound("fanfare", "wts_headshot_sound");
let warnedNoMaker = false;
let warnedSurvivor = false;

export function playKillSound({ killer, victim, weapon, kills, knifed }: { killer: CSPlayerPawn; victim: CSPlayerPawn; weapon: string; kills: number; knifed: boolean }): void {
  const head = victim.GetEyePosition();
  if (knifed) {
    for (const sound of KNIFE_SOUNDS) killSound(head, sound);
    return;
  }
  if (weapon === "weapon_hegrenade") killSound(killer.GetEyePosition(), GRENADE_CHIMES[Math.min(kills, GRENADE_CHIMES.length) - 1]);
  else killSound(head, PISTOL_BELLS[Math.min(kills, PISTOL_BELLS.length) - 1]);
}

export function celebrateWin(winner: CSPlayerPawn): void {
  WIN_CHICKENS.forEach((sound, beat) => {
    after(beat * WIN_BEAT_SECONDS, () => {
      // Gone if the winner disconnected during the lap
      if (!winner.IsValid()) return;
      killSound(winner, sound);
      if (beat < WIN_FEATHER_BURSTS) burstChicken(beat, winner);
    });
  });
}

function burstChicken(beat: number, winner: CSPlayerPawn): void {
  const maker = Instance.FindEntityByName("wts_chicken_maker") as PointTemplate | undefined;
  if (!maker) {
    if (!warnedNoMaker) Console.Log("[fanfare] no point_template named wts_chicken_maker; no feathers");
    warnedNoMaker = true;
    return;
  }
  const around = winner.GetAbsOrigin();
  const angle = (beat / WIN_FEATHER_BURSTS) * 2 * Math.PI;
  const spawned = maker.ForceSpawn({
    x: around.x + Math.cos(angle) * CHICKEN_RADIUS,
    y: around.y + Math.sin(angle) * CHICKEN_RADIUS,
    z: around.z + CHICKEN_HEIGHT,
  });
  for (const chicken of spawned ?? []) {
    after(CHICKEN_KILL_DELAY, () => {
      if (!chicken.IsValid()) return;
      chicken.TakeDamage({ damage: 1000, damageTypes: CSDamageTypes.BULLET, damageFlags: CSDamageFlags.FORCE_DEATH, attacker: winner.IsValid() ? winner : undefined });
      after(0.1, () => {
        if (!chicken.IsValid() || !chicken.IsAlive() || warnedSurvivor) return;
        Console.Log("[fanfare] a win chicken survived its shot; no feathers");
        warnedSurvivor = true;
      });
    });
  }
}
