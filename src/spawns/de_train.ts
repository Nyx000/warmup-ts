/**
 * Random spawn points for de_train, spread over the whole map: open floor picked from the
 * map's nav mesh, at least 64 units clear and 384 units from the team spawns, facing the
 * longest open line of sight.
 */

import type { SpawnPoint } from "../plugins/random-spawns";

export const deTrain: SpawnPoint[] = [
  { position: { x: 1215.0, y: 1614.7, z: -202.5 }, yaw: 202 },
  { position: { x: -1010.0, y: -1737.1, z: -144.0 }, yaw: 0 },
  { position: { x: -1281.0, y: 1396.0, z: -175.3 }, yaw: 0 },
  { position: { x: 1686.5, y: -688.0, z: -252.0 }, yaw: 270 },
  { position: { x: -95.0, y: -46.0, z: -204.0 }, yaw: 22 },
  { position: { x: 550.4, y: -1709.7, z: -156.0 }, yaw: 68 },
  { position: { x: -75.0, y: 1688.0, z: -204.7 }, yaw: 202 },
  { position: { x: -1185.7, y: -551.8, z: -78.0 }, yaw: 0 },
  { position: { x: 1073.0, y: 433.1, z: -202.0 }, yaw: 0 },
  { position: { x: -216.5, y: -1045.5, z: -184.7 }, yaw: 338 },
  { position: { x: 646.9, y: -638.7, z: -204.0 }, yaw: 180 },
  { position: { x: -676.0, y: 694.2, z: 10.0 }, yaw: 292 },
  { position: { x: 220.5, y: 590.5, z: -204.0 }, yaw: 202 },
  { position: { x: -337.0, y: -1733.0, z: -156.0 }, yaw: 90 },
  { position: { x: -686.4, y: 49.2, z: 96.0 }, yaw: 0 },
  { position: { x: 542.0, y: 37.2, z: -204.0 }, yaw: 135 },
  { position: { x: 540.5, y: 1527.5, z: -204.0 }, yaw: 22 },
  { position: { x: 1436.7, y: -105.6, z: -202.0 }, yaw: 180 },
  { position: { x: -676.0, y: 1513.8, z: -204.0 }, yaw: 0 },
  { position: { x: 899.9, y: -1163.1, z: -332.0 }, yaw: 135 },
  { position: { x: -1106.5, y: -1128.3, z: -92.0 }, yaw: 45 },
  { position: { x: 1077.5, y: 1055.0, z: -204.7 }, yaw: 270 },
  { position: { x: 319.5, y: -1178.0, z: -340.0 }, yaw: 180 },
  { position: { x: -617.9, y: -564.7, z: -24.6 }, yaw: 90 },
  { position: { x: 1555.7, y: 559.9, z: -202.0 }, yaw: 270 },
  { position: { x: 1020.8, y: -1642.6, z: -308.0 }, yaw: 90 },
  { position: { x: -318.7, y: 440.3, z: -204.0 }, yaw: 0 },
  { position: { x: -907.2, y: 1073.3, z: -160.0 }, yaw: 247 },
  { position: { x: 255.5, y: -363.2, z: -205.7 }, yaw: 292 },
  { position: { x: -41.1, y: -1422.9, z: -339.4 }, yaw: 0 },
  { position: { x: -854.0, y: 293.1, z: -204.0 }, yaw: 90 },
  { position: { x: 903.0, y: -172.0, z: -202.0 }, yaw: 0 },
  { position: { x: -637.3, y: -871.4, z: -304.8 }, yaw: 112 },
  { position: { x: 630.0, y: 591.5, z: -204.0 }, yaw: 180 },
  { position: { x: 159.1, y: 1355.1, z: -201.7 }, yaw: 135 },
  { position: { x: -447.7, y: -224.1, z: -204.0 }, yaw: 22 },
  { position: { x: -449.0, y: -1320.5, z: -340.0 }, yaw: 45 },
  { position: { x: 19.7, y: 291.0, z: -40.7 }, yaw: 225 },
  { position: { x: 107.0, y: -862.0, z: -308.7 }, yaw: 180 },
  { position: { x: -849.4, y: -341.4, z: -202.0 }, yaw: 180 },
];
