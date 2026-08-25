import { describe, expect, it } from "vitest";
import {
  DEAD_WALL_TILES,
  STACKS_PER_SIDE,
  TOTAL_TILES,
  breakPoint,
  buildOrder,
  drawableTiles,
  wallSlots
} from "./wall";

const start = { brokenAt: 12, drawn: 0 };

describe("wallSlots", () => {
  it("한 장도 안 가져갔으면 136장이 그대로 서 있다", () => {
    expect(wallSlots(start)).toHaveLength(TOTAL_TILES);
  });

  it("가져간 만큼 패산이 줄어든다", () => {
    expect(wallSlots({ ...start, drawn: 13 * 4 })).toHaveLength(TOTAL_TILES - 52);
  });

  it("왕패는 언제나 14장이다", () => {
    const dead = wallSlots(start).filter(slot => slot.kind === "dead");
    expect(dead).toHaveLength(DEAD_WALL_TILES);
  });

  it("깡을 하면 가져갈 수 있는 패가 한 장씩 줄고 왕패 수는 그대로다", () => {
    expect(drawableTiles(0)).toBe(122);
    expect(drawableTiles(2)).toBe(120);
    const dead = wallSlots({ ...start, kans: 2 }).filter(s => s.kind === "dead");
    expect(dead).toHaveLength(DEAD_WALL_TILES);
  });

  it("자리는 4변 × 17스택 × 2단을 한 번씩만 쓴다", () => {
    const keys = wallSlots(start).map(s => `${s.side}-${s.stack}-${s.tier}`);
    expect(new Set(keys).size).toBe(TOTAL_TILES);
  });

  it("한 스택에서는 위 패를 먼저 가져간다", () => {
    const [first, second] = wallSlots(start);
    expect(first.tier).toBe(1);
    expect(second.tier).toBe(0);
    expect(second.stack).toBe(first.stack);
  });

  it("끊은 지점에서 시계 방향으로 나아간다", () => {
    // 위에서 내려다볼 때 시계 방향이면 atan2(x, z) 로 잰 각이 계속 줄어든다.
    const stacks = wallSlots(start)
      .filter((_, i) => i % 2 === 0)
      .map(s => Math.atan2(s.x, s.z));
    let turned = 0;
    for (let i = 1; i < stacks.length; i += 1) {
      let step = stacks[i] - stacks[i - 1];
      if (step > Math.PI) step -= 2 * Math.PI;
      if (step < -Math.PI) step += 2 * Math.PI;
      expect(step).toBeLessThan(0);
      turned += step;
    }
    // 68스택이 한 바퀴를 거의 채운다.
    expect(turned).toBeLessThan(-Math.PI * 1.9);
  });

  it("이웃한 스택은 패 폭만큼만 떨어져 있다 — 변이 바뀌는 자리도 마찬가지다", () => {
    const stacks = wallSlots(start).filter((_, i) => i % 2 === 0);
    for (let i = 1; i < stacks.length; i += 1) {
      const dx = stacks[i].x - stacks[i - 1].x;
      const dz = stacks[i].z - stacks[i - 1].z;
      expect(Math.hypot(dx, dz)).toBeLessThan(1.2);
    }
  });
});

describe("buildOrder", () => {
  const slots = wallSlots({ brokenAt: 0, drawn: 0 });

  it("한 스택에서 아래 패를 위 패보다 먼저 놓는다", () => {
    slots.forEach((slot, i) => {
      const pair = slots.findIndex(
        (other, j) => j !== i && other.side === slot.side && other.stack === slot.stack
      );
      const rank = buildOrder(slots);
      if (slot.tier === 0) expect(rank[i]).toBeLessThan(rank[pair]);
    });
  });

  it("순서를 하나도 빠뜨리거나 겹치지 않는다", () => {
    const rank = buildOrder(slots);
    expect([...rank].sort((a, b) => a - b)).toEqual(slots.map((_, i) => i));
  });
});

describe("breakPoint", () => {
  it("합이 5면 선이 자기 패산을 끊는다", () => {
    // 선의 패산은 변 0 이고, 오른쪽 끝에서 다섯 번째 스택 옆을 끊는다.
    expect(breakPoint(5)).toBe(5);
  });

  it("합이 7이면 선에서 반시계로 세 번째인 서 자리 패산을 끊는다", () => {
    // 서 자리(자리 2)의 앞은 변 2 다.
    expect(breakPoint(7)).toBe(2 * STACKS_PER_SIDE + 7);
  });

  it("두 주사위로 나올 수 있는 합은 모두 패산 안을 가리킨다", () => {
    for (let sum = 2; sum <= 12; sum += 1) {
      expect(breakPoint(sum)).toBeGreaterThanOrEqual(0);
      expect(breakPoint(sum)).toBeLessThan(4 * STACKS_PER_SIDE);
    }
  });
});
