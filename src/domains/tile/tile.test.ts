import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { makeTile, parseHand, tileName, tileToString } from "./tile";

describe("parseHand", () => {
  it("수트별로 숫자를 나눠 읽는다", () => {
    expect(parseHand("123m11z").map(tileToString)).toEqual([
      "1m",
      "2m",
      "3m",
      "1z",
      "1z",
    ]);
  });

  it("0 을 적도라 5 로 읽는다", () => {
    const [tile] = parseHand("0p");
    expect(tile).toEqual({ suit: "p", rank: 5, red: true });
    expect(tileToString(tile)).toBe("0p");
  });

  it("수트 문자가 빠지면 거부한다", () => {
    expect(() => parseHand("123")).toThrow(SyntaxError);
  });

  it("숫자 없는 수트를 거부한다", () => {
    expect(() => parseHand("m123")).toThrow(SyntaxError);
  });
});

describe("makeTile", () => {
  it("자패 8 을 거부한다", () => {
    expect(() => makeTile("z", 8)).toThrow(RangeError);
  });

  it("5 가 아닌 적도라를 거부한다", () => {
    expect(() => makeTile("m", 3, true)).toThrow(RangeError);
  });
});

describe("tileName", () => {
  it("수패에 수트 이름을 붙인다", () => {
    expect(tileName(makeTile("m", 5))).toBe("5만");
    expect(tileName(makeTile("s", 1))).toBe("1삭");
  });

  it("적도라를 표시한다", () => {
    expect(tileName(makeTile("p", 5, true))).toBe("적5통");
  });

  it("자패를 이름으로 부른다", () => {
    expect(tileName(makeTile("z", 1))).toBe("동");
    expect(tileName(makeTile("z", 7))).toBe("중");
  });
});

describe("패 그림 파일", () => {
  it("표기법이 가리키는 SVG 가 모두 있다", () => {
    const every = [
      ...parseHand("123456789m123456789p123456789s1234567z"),
      ...parseHand("0m0p0s")
    ];
    const missing = every
      .map(tileToString)
      .filter(name => !existsSync(join("public", "tiles", `${name}.svg`)));
    expect(missing).toEqual([]);
  });
});
