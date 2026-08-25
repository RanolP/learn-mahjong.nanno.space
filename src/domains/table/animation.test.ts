import { describe, expect, it } from "vitest";
import { easeOutExpo, stagger } from "./animation";

describe("easeOutExpo", () => {
  it("0 에서 시작해 1 에서 끝난다", () => {
    expect(easeOutExpo(0)).toBe(0);
    expect(easeOutExpo(1)).toBe(1);
  });

  it("앞쪽에서 더 많이 나아간다", () => {
    expect(easeOutExpo(0.5)).toBeGreaterThan(0.9);
  });
});

describe("stagger", () => {
  it("양 끝에서는 모두가 같다", () => {
    for (let i = 0; i < 4; i += 1) {
      expect(stagger(i, 4, 0, 0.4)).toBe(0);
      expect(stagger(i, 4, 1, 0.4)).toBe(1);
    }
  });

  it("앞 번호가 먼저 들어온다", () => {
    const middle = [0, 1, 2, 3].map(i => stagger(i, 4, 0.5, 0.4));
    expect(middle[0]).toBeGreaterThan(middle[1]);
    expect(middle[1]).toBeGreaterThan(middle[2]);
    expect(middle[2]).toBeGreaterThan(middle[3]);
  });

  it("하나뿐이면 시작을 미루지 않는다", () => {
    expect(stagger(0, 1, 0.4, 0.4)).toBe(1);
  });
});
