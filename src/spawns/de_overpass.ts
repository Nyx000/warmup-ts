/**
 * Random spawn points for de_overpass, spread over the whole map: open floor picked from the
 * map's nav mesh, at least 64 units clear and 384 units from the team spawns, facing the
 * longest open line of sight.
 */

import type { SpawnPoint } from "../plugins/random-spawns";

export const deOverpass: SpawnPoint[] = [
  { position: { x: -2509.5, y: 1564.5, z: 372.0 }, yaw: 315 },
  { position: { x: -942.5, y: -2966.5, z: 244.6 }, yaw: 90 },
  { position: { x: -3906.5, y: -1536.0, z: 519.3 }, yaw: 315 },
  { position: { x: -312.5, y: -28.5, z: 36.0 }, yaw: 158 },
  { position: { x: -1916.0, y: -1234.1, z: 255.4 }, yaw: 90 },
  { position: { x: -2688.0, y: -2840.0, z: 488.0 }, yaw: 22 },
  { position: { x: -3299.3, y: 17.2, z: 532.5 }, yaw: 68 },
  { position: { x: -133.0, y: -1499.5, z: 50.0 }, yaw: 158 },
  { position: { x: -1850.7, y: 203.1, z: 180.0 }, yaw: 225 },
  { position: { x: -2928.9, y: -1136.0, z: 544.3 }, yaw: 22 },
  { position: { x: -1796.5, y: -2266.4, z: 442.0 }, yaw: 158 },
  { position: { x: -1085.8, y: -585.9, z: 101.4 }, yaw: 180 },
  { position: { x: -3531.1, y: -2447.0, z: 488.8 }, yaw: 90 },
  { position: { x: -2469.0, y: -389.0, z: 446.0 }, yaw: 270 },
  { position: { x: -3918.8, y: -607.8, z: 528.5 }, yaw: 338 },
  { position: { x: -712.8, y: -2125.3, z: 298.0 }, yaw: 112 },
  { position: { x: -2807.0, y: 728.2, z: 496.0 }, yaw: 22 },
  { position: { x: -2707.0, y: -1984.1, z: 488.0 }, yaw: 90 },
  { position: { x: -1020.0, y: 322.2, z: 107.3 }, yaw: 180 },
  { position: { x: -1839.0, y: 1243.5, z: 368.0 }, yaw: 292 },
  { position: { x: -323.0, y: -786.0, z: 51.5 }, yaw: 158 },
  { position: { x: -827.5, y: -1437.5, z: 160.0 }, yaw: 22 },
  { position: { x: -1868.5, y: -529.0, z: 144.0 }, yaw: 90 },
  { position: { x: -2445.4, y: 219.7, z: 508.0 }, yaw: 292 },
  { position: { x: -3324.9, y: -683.5, z: 502.0 }, yaw: 202 },
  { position: { x: -1798.7, y: -1775.5, z: 112.0 }, yaw: 180 },
  { position: { x: -1440.0, y: -1022.0, z: 28.3 }, yaw: 90 },
  { position: { x: -484.5, y: -2608.5, z: 167.3 }, yaw: 158 },
  { position: { x: -3477.3, y: -1205.3, z: 514.1 }, yaw: 247 },
  { position: { x: -2408.2, y: -1342.6, z: 447.3 }, yaw: 180 },
  { position: { x: -150.0, y: -2013.5, z: 160.0 }, yaw: 202 },
  { position: { x: -2206.0, y: -1838.5, z: 488.0 }, yaw: 315 },
  { position: { x: -1293.0, y: -2169.5, z: 350.0 }, yaw: 0 },
  { position: { x: -1445.7, y: -213.6, z: 143.5 }, yaw: 158 },
  { position: { x: -3443.5, y: -1943.5, z: 503.3 }, yaw: 112 },
  { position: { x: -2227.9, y: -2521.2, z: 489.4 }, yaw: 202 },
  { position: { x: -2987.0, y: -2438.2, z: 488.0 }, yaw: 0 },
  { position: { x: -1470.5, y: 519.0, z: 30.7 }, yaw: 247 },
  { position: { x: -3100.0, y: -1597.0, z: 552.7 }, yaw: 292 },
  { position: { x: -2228.0, y: -812.0, z: 403.3 }, yaw: 225 },
];
