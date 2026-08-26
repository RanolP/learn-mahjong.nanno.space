import { describe, expect, it } from "vitest";
import { skipsAnimation } from "./Stepper";

describe("skipsAnimation", () => {
  it("다음 단계로 한 칸 가면 움직임을 보여 준다", () => {
    expect(skipsAnimation(1, 2)).toBe(false);
  });

  it("앞 단계로 한 칸 되돌아가도 움직임을 보여 준다", () => {
    expect(skipsAnimation(2, 1)).toBe(false);
  });

  it("두 칸 넘게 건너뛰면 움직임을 건너뛴다", () => {
    expect(skipsAnimation(0, 2)).toBe(true);
    expect(skipsAnimation(5, 1)).toBe(true);
  });

  it("같은 단계를 다시 누르면 그대로 둔다", () => {
    expect(skipsAnimation(3, 3)).toBe(false);
  });
});
