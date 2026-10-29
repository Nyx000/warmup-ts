/**
 * Random spawn points for de_inferno, spread over the whole map: open floor picked from the
 * map's nav mesh, at least 64 units clear and 384 units from the team spawns, facing the
 * longest open line of sight.
 */

import type { SpawnPoint } from "../plugins/random-spawns";

export const deInferno: SpawnPoint[] = [
  { position: { x: 2451.0, y: -481.3, z: 117.3 }, yaw: 112 },
  { position: { x: 469.5, y: 3437.0, z: 175.8 }, yaw: 270 },
  { position: { x: -1534.5, y: -101.0, z: -52.0 }, yaw: 0 },
  { position: { x: 1832.0, y: 1652.2, z: 172.0 }, yaw: 0 },
  { position: { x: 486.2, y: -44.1, z: 80.0 }, yaw: 338 },
  { position: { x: 182.2, y: 1617.0, z: 120.6 }, yaw: 68 },
  { position: { x: 2217.2, y: 2839.5, z: 144.2 }, yaw: 180 },
  { position: { x: -627.3, y: 725.3, z: -18.7 }, yaw: 22 },
  { position: { x: 1950.1, y: 524.3, z: 170.8 }, yaw: 0 },
  { position: { x: 1185.0, y: 2721.5, z: 137.3 }, yaw: 180 },
  { position: { x: -397.7, y: -423.2, z: 204.0 }, yaw: 0 },
  { position: { x: 1356.0, y: -327.0, z: 269.3 }, yaw: 0 },
  { position: { x: 183.5, y: 2543.5, z: 172.0 }, yaw: 68 },
  { position: { x: 2611.3, y: 1130.1, z: 170.0 }, yaw: 180 },
  { position: { x: 1137.5, y: 551.9, z: 120.5 }, yaw: 180 },
  { position: { x: 159.0, y: 678.0, z: 92.7 }, yaw: 45 },
  { position: { x: 800.0, y: 2056.0, z: 147.5 }, yaw: 90 },
  { position: { x: 1745.7, y: 2352.2, z: 206.0 }, yaw: 0 },
  { position: { x: -903.2, y: 135.2, z: 58.0 }, yaw: 68 },
  { position: { x: 764.2, y: -634.5, z: 104.7 }, yaw: 225 },
  { position: { x: 1483.0, y: 1081.5, z: 169.4 }, yaw: 0 },
  { position: { x: 2033.4, y: -120.5, z: 302.0 }, yaw: 135 },
  { position: { x: -361.0, y: 263.5, z: 204.0 }, yaw: 270 },
  { position: { x: -1059.0, y: -414.6, z: 16.0 }, yaw: 22 },
  { position: { x: 998.0, y: 3265.5, z: 140.0 }, yaw: 338 },
  { position: { x: 45.8, y: 3073.3, z: 172.0 }, yaw: 338 },
  { position: { x: 634.3, y: 2849.1, z: 200.0 }, yaw: 292 },
  { position: { x: 2020.3, y: 1100.2, z: 178.3 }, yaw: 180 },
  { position: { x: -21.1, y: -103.5, z: 46.6 }, yaw: 0 },
  { position: { x: 2351.0, y: 241.5, z: 135.3 }, yaw: 90 },
  { position: { x: 1425.6, y: 143.0, z: 142.2 }, yaw: 90 },
  { position: { x: 1652.0, y: 2807.0, z: 137.3 }, yaw: 338 },
  { position: { x: 904.5, y: 135.2, z: 179.8 }, yaw: 112 },
  { position: { x: 623.4, y: 651.1, z: 107.5 }, yaw: 180 },
  { position: { x: 310.9, y: -539.7, z: 108.0 }, yaw: 180 },
  { position: { x: 145.0, y: 1132.8, z: 99.4 }, yaw: 270 },
  { position: { x: -1083.6, y: 523.6, z: -49.5 }, yaw: 0 },
  { position: { x: 2321.5, y: 778.0, z: 169.3 }, yaw: 270 },
  { position: { x: -224.0, y: 876.7, z: 34.7 }, yaw: 0 },
  { position: { x: 399.5, y: 1955.0, z: 148.0 }, yaw: 247 },
];
