/**
 * PistolGG's kill sounds and win celebration, played through the map's wts_headshot_sound
 * point_soundevent, with the map's own chickens for the feathers.
 */

import { Console, CSDamageFlags, CSDamageTypes, Instance } from "cs_script/point_script";
import type { CSPlayerPawn, Entity } from "cs_script/point_script";
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
 * After the winning knife kill, one of these every beat from the winner, and on the first four one
 * of the map's chickens moved in front of the winner's eyes and shot, so it bursts into feathers. Map
 * chickens need no extra entity: a point_template only spawns what Hammer compiled into its own
 * entity lump. Each name blocks its own repeats (up to 5 s for the world chicken
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
// Straight ahead of the winner's eyes, each burst a little off the aim line so they don't stack
const FACE_DISTANCE = 40;
const FACE_SPREAD = 10;
// A chicken's origin is at its feet; this lowers it so its body sits on the aim line (assumed height)
const CHICKEN_BODY_HEIGHT = 12;

const killSound = mapSound("fanfare", "wts_headshot_sound");
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

/** Arms Race's own demotion cue, from where a player killed themselves. */
export function playDemotion({ player }: { player: CSPlayerPawn }): void {
  killSound(player.GetEyePosition(), "UI.ArmsRace.Demoted");
}

export function celebrateWin(winner: CSPlayerPawn): void {
  // The map's own chickens, which the next match's round restart puts back
  const flock = Instance.FindEntitiesByClass("chicken").filter((chicken) => chicken.IsValid() && chicken.IsAlive()).slice(0, WIN_FEATHER_BURSTS);
  if (flock.length < WIN_FEATHER_BURSTS) Console.Log(`[fanfare] ${flock.length} live map chicken(s) for ${WIN_FEATHER_BURSTS} feather bursts`);
  WIN_CHICKENS.forEach((sound, beat) => {
    after(beat * WIN_BEAT_SECONDS, () => {
      // Gone if the winner disconnected during the lap
      if (!winner.IsValid()) return;
      killSound(winner, sound);
      const chicken = flock[beat];
      if (chicken) burstChicken(beat, chicken, winner);
    });
  });
}

function burstChicken(beat: number, chicken: Entity, winner: CSPlayerPawn): void {
  if (!chicken.IsValid() || !chicken.IsAlive()) return;
  const eyes = winner.GetEyePosition();
  const { pitch, yaw } = winner.GetEyeAngles();
  const [p, y] = [(pitch * Math.PI) / 180, (yaw * Math.PI) / 180];
  // Source pitch is positive looking down
  const forward = { x: Math.cos(p) * Math.cos(y), y: Math.cos(p) * Math.sin(y), z: -Math.sin(p) };
  // Offsets across the view: right (level) and up
  const angle = (beat / WIN_FEATHER_BURSTS) * 2 * Math.PI;
  const [across, up] = [Math.cos(angle) * FACE_SPREAD, Math.sin(angle) * FACE_SPREAD];
  chicken.Teleport({
    position: {
      x: eyes.x + forward.x * FACE_DISTANCE + Math.sin(y) * across,
      y: eyes.y + forward.y * FACE_DISTANCE - Math.cos(y) * across,
      z: eyes.z + forward.z * FACE_DISTANCE + up - CHICKEN_BODY_HEIGHT,
    },
    velocity: { x: 0, y: 0, z: 0 },
  });
  // Shot in the same tick it arrives, so it bursts in place: at 0.5 s it had already dropped to the floor (seen 2026-10-28)
  chicken.TakeDamage({ damage: 1000, damageTypes: CSDamageTypes.BULLET, damageFlags: CSDamageFlags.FORCE_DEATH, attacker: winner });
  after(0.1, () => {
    if (!chicken.IsValid() || !chicken.IsAlive() || warnedSurvivor) return;
    Console.Log("[fanfare] a win chicken survived its shot; no feathers");
    warnedSurvivor = true;
  });
}
