/**
 * Random spawn points for de_mirage, spread over the whole map: open floor picked from the
 * map's nav mesh, at least 64 units clear and 384 units from the team spawns, facing the
 * longest open line of sight.
 */

import type { SpawnPoint } from "../plugins/random-spawns";

export const deMirage: SpawnPoint[] = [
  { position: { x: 1318.2, y: 464.0, z: -250.5 }, yaw: 247 },
  { position: { x: -2576.8, y: 190.1, z: -155.2 }, yaw: 45 },
  { position: { x: -569.5, y: -2393.8, z: -158.0 }, yaw: 180 },
  { position: { x: -642.5, y: -381.0, z: -152.7 }, yaw: 292 },
  { position: { x: 1310.9, y: -1444.2, z: -156.0 }, yaw: 90 },
  { position: { x: -1672.0, y: -1344.0, z: -250.0 }, yaw: 68 },
  { position: { x: -26.6, y: 828.6, z: -124.0 }, yaw: 202 },
  { position: { x: -1352.0, y: 772.5, z: -65.4 }, yaw: 338 },
  { position: { x: 551.1, y: -2302.8, z: -28.0 }, yaw: 202 },
  { position: { x: 436.0, y: -727.7, z: -153.3 }, yaw: 90 },
  { position: { x: -583.0, y: -1393.0, z: -156.0 }, yaw: 180 },
  { position: { x: -1664.3, y: -170.6, z: -155.6 }, yaw: 90 },
  { position: { x: 237.7, y: -1546.1, z: -164.0 }, yaw: 202 },
  { position: { x: 371.5, y: 64.0, z: -214.0 }, yaw: 247 },
  { position: { x: -2332.0, y: -600.0, z: -156.0 }, yaw: 90 },
  { position: { x: -1309.4, y: -2301.9, z: -202.0 }, yaw: 158 },
  { position: { x: -591.9, y: 419.6, z: -202.0 }, yaw: 0 },
  { position: { x: -2050.6, y: 744.6, z: -33.9 }, yaw: 270 },
  { position: { x: 1175.7, y: -790.1, z: -234.2 }, yaw: 90 },
  { position: { x: -1155.5, y: -927.5, z: -156.0 }, yaw: 135 },
  { position: { x: 609.6, y: 621.2, z: -118.3 }, yaw: 225 },
  { position: { x: -163.0, y: -850.5, z: -156.0 }, yaw: 158 },
  { position: { x: -78.0, y: -2042.5, z: -156.0 }, yaw: 315 },
  { position: { x: -1116.6, y: 169.4, z: -157.5 }, yaw: 180 },
  { position: { x: 781.1, y: -1241.6, z: -98.0 }, yaw: 180 },
  { position: { x: 998.5, y: -1954.0, z: -60.0 }, yaw: 90 },
  { position: { x: -1696.0, y: 378.1, z: -157.0 }, yaw: 270 },
  { position: { x: 76.7, y: -349.7, z: -170.0 }, yaw: 202 },
  { position: { x: -1649.0, y: -809.0, z: -156.0 }, yaw: 292 },
  { position: { x: -686.7, y: -1888.8, z: -168.0 }, yaw: 90 },
  { position: { x: -2077.9, y: 69.6, z: -148.0 }, yaw: 135 },
  { position: { x: -1055.9, y: -1412.1, z: -155.2 }, yaw: 338 },
  { position: { x: 694.3, y: -1678.0, z: -246.7 }, yaw: 158 },
  { position: { x: -660.8, y: -807.0, z: -252.0 }, yaw: 270 },
  { position: { x: -1005.2, y: -310.8, z: -356.0 }, yaw: 270 },
  { position: { x: -2366.0, y: 529.8, z: -155.1 }, yaw: 90 },
  { position: { x: 151.5, y: -2337.5, z: -28.0 }, yaw: 0 },
  { position: { x: -296.5, y: -1713.9, z: -158.9 }, yaw: 202 },
  { position: { x: -227.8, y: 431.5, z: -69.3 }, yaw: 90 },
  { position: { x: -409.1, y: 801.7, z: -70.1 }, yaw: 0 },
];
