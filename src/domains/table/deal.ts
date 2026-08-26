import { SIDES } from "./wall";

/**
 * 배패를 나누는 차례. 선부터 반시계 순서로 네 장씩 세 바퀴를 돌고, 마지막에
 * 한 장씩 더 가져가 각자 13장을 든다. 여기까지가 배패고, 이어서 선이 첫
 * 쯔모패 한 장을 더 가져가 14장으로 게임을 시작한다. 실제로 패를 집는 순서
 * 그대로라, 애니메이션에서 패가 패산을 떠나는 차례가 곧 이 순서다.
 */

export const HAND_TILES = 13;
/**
 * 배패를 다 나눈 뒤 선이 더 가져가는 첫 쯔모패. 선은 14장으로 시작해 한 장을
 * 버리며 게임을 연다. 이 한 장이 없으면 선의 첫 차례가 남과 같아진다.
 */
export const DEALER_DRAW = 1;
/** 네 사람이 패산에서 가져가는 장수. 배패 52장에 선의 첫 쯔모패 한 장이다. */
export const DEALT_TILES = HAND_TILES * SIDES + DEALER_DRAW;
/** 네 장씩 도는 구간의 장수. 이 뒤로는 한 장씩 간다. */
const BLOCK_TILES = 48;

/** 패산에서 order 번째로 나가는 패를 가져가는 자리. 맨 끝 한 장은 선이 뽑는다. */
export function dealSeat(order: number): number {
  if (order < BLOCK_TILES) return Math.floor(order / 4) % SIDES;
  return order < BLOCK_TILES + SIDES ? order - BLOCK_TILES : 0;
}

/**
 * 한 번에 가져가는 묶음의 번호. 실제로도 한 장씩 집지 않고, 두 스택 두 단을 한
 * 손으로 쓸어 온다. 패산에서 나가는 차례가 곧 스택 차례라, 앞의 네 장이 그대로
 * 한 묶음이다. 마지막 한 바퀴는 한 장씩이다.
 *
 * 선은 그 마지막 한 장과 첫 쯔모패를 따로 집지 않고 한 번에 들어 온다. 그래서
 * 두 장이 같은 묶음이다.
 */
export function dealGroup(order: number): number {
  if (order < BLOCK_TILES) return Math.floor(order / 4);
  const last = BLOCK_TILES / 4;
  return order < BLOCK_TILES + SIDES ? last + (order - BLOCK_TILES) : last;
}

/** 가져가는 묶음의 총수. 네 장 묶음 12 개, 마지막 한 바퀴의 네 묶음이다. */
export const DEAL_GROUPS = BLOCK_TILES / 4 + SIDES;

/** 그 패가 가져간 사람의 손에서 몇 번째에 놓이는지. 선의 쯔모패는 14번째다. */
export function dealIndex(order: number): number {
  if (order < BLOCK_TILES) return Math.floor(order / 16) * 4 + (order % 4);
  return order < BLOCK_TILES + SIDES ? HAND_TILES - 1 : HAND_TILES;
}
