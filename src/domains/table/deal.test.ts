import { describe, expect, it } from "vitest";
import {
  DEALER_DRAW,
  DEALT_TILES,
  DEAL_GROUPS,
  HAND_TILES,
  dealGroup,
  dealIndex,
  dealSeat
} from "./deal";
import { SIDES } from "./wall";

const orders = Array.from({ length: DEALT_TILES }, (_, i) => i);
/** 네 장씩 도는 구간이 끝나고 선이 마지막 한 장을 가져가는 차례. */
const BLOCK_END = 48;

describe("배패 나누기", () => {
  it("네 사람이 13장씩 나눠 갖고, 선만 쯔모패를 한 장 더 가져간다", () => {
    for (let seat = 0; seat < SIDES; seat += 1) {
      const mine = orders.filter(o => dealSeat(o) === seat);
      expect(mine).toHaveLength(seat === 0 ? HAND_TILES + DEALER_DRAW : HAND_TILES);
    }
  });

  it("한 사람의 손에서 자리가 겹치지 않는다", () => {
    for (let seat = 0; seat < SIDES; seat += 1) {
      const spots = orders.filter(o => dealSeat(o) === seat).map(dealIndex);
      expect(new Set(spots).size).toBe(seat === 0 ? HAND_TILES + DEALER_DRAW : HAND_TILES);
    }
  });

  it("맨 마지막 한 장이 선의 쯔모패로, 손의 14번째에 놓인다", () => {
    const last = DEALT_TILES - 1;
    expect(dealSeat(last)).toBe(0);
    expect(dealIndex(last)).toBe(HAND_TILES);
  });

  it("선이 맨 먼저 네 장을 가져가고, 마지막 한 장도 선이 먼저 가져간다", () => {
    expect(orders.slice(0, 4).map(dealSeat)).toEqual([0, 0, 0, 0]);
    expect(dealSeat(48)).toBe(0);
    expect(dealIndex(48)).toBe(HAND_TILES - 1);
  });

  it("선은 마지막 한 장과 쯔모패를 한 번에 가져간다", () => {
    expect(dealGroup(DEALT_TILES - 1)).toBe(dealGroup(BLOCK_END));
  });

  it("한 묶음은 한 사람이 한 번에 가져가는 패다", () => {
    const groups = new Map<number, number[]>();
    for (const order of orders) {
      const group = dealGroup(order);
      groups.set(group, [...(groups.get(group) ?? []), order]);
    }
    expect(groups.size).toBe(DEAL_GROUPS);
    for (const [group, taken] of groups) {
      // 마지막 한 바퀴는 한 장씩이고, 선만 쯔모패까지 두 장을 함께 든다.
      const single = group >= DEAL_GROUPS - SIDES;
      expect(taken).toHaveLength(single ? (dealSeat(taken[0]) === 0 ? 1 + DEALER_DRAW : 1) : 4);
      expect(new Set(taken.map(dealSeat)).size).toBe(1);
    }
  });
});
