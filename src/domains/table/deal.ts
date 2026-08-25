import { SIDES } from "./wall";

/**
 * 배패를 나누는 차례. 선부터 반시계 순서로 네 장씩 세 바퀴를 돌고, 마지막에
 * 한 장씩 더 가져가 각자 13장을 든다. 실제로 패를 집는 순서 그대로라,
 * 애니메이션에서 패가 패산을 떠나는 차례가 곧 이 순서다.
 */

export const HAND_TILES = 13;
/** 네 사람이 배패로 가져가는 장수. */
export const DEALT_TILES = HAND_TILES * SIDES;
/** 네 장씩 도는 구간의 장수. 이 뒤로는 한 장씩 간다. */
const BLOCK_TILES = 48;

/** 패산에서 order 번째로 나가는 패를 가져가는 자리. */
export function dealSeat(order: number): number {
  return order < BLOCK_TILES ? Math.floor(order / 4) % SIDES : order - BLOCK_TILES;
}

/** 그 패가 가져간 사람의 손에서 몇 번째에 놓이는지. */
export function dealIndex(order: number): number {
  return order < BLOCK_TILES ? Math.floor(order / 16) * 4 + (order % 4) : HAND_TILES - 1;
}
