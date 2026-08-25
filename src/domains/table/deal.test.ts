import { describe, expect, it } from "vitest";
import { DEALT_TILES, HAND_TILES, dealIndex, dealSeat } from "./deal";
import { SIDES } from "./wall";

const orders = Array.from({ length: DEALT_TILES }, (_, i) => i);

describe("배패 나누기", () => {
  it("네 사람이 13장씩 나눠 갖는다", () => {
    for (let seat = 0; seat < SIDES; seat += 1) {
      expect(orders.filter(o => dealSeat(o) === seat)).toHaveLength(HAND_TILES);
    }
  });

  it("한 사람의 손에서 자리가 겹치지 않는다", () => {
    for (let seat = 0; seat < SIDES; seat += 1) {
      const spots = orders.filter(o => dealSeat(o) === seat).map(dealIndex);
      expect(new Set(spots).size).toBe(HAND_TILES);
    }
  });

  it("선이 맨 먼저 네 장을 가져가고, 마지막 한 장도 선이 먼저 가져간다", () => {
    expect(orders.slice(0, 4).map(dealSeat)).toEqual([0, 0, 0, 0]);
    expect(dealSeat(48)).toBe(0);
    expect(dealIndex(48)).toBe(HAND_TILES - 1);
  });
});
