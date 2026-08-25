import { describe, expect, it } from "vitest";
import { WINDS, seatAngle, seatEntry, sideOfWind, windAngle, windAtSeat } from "./seats";

describe("sideOfWind", () => {
  it("동은 화면 앞쪽 변에 앉는다", () => {
    expect(sideOfWind(0)).toBe(0);
  });

  it("변 번호를 거꾸로 돌아 반시계 방향으로 앉는다", () => {
    expect(WINDS.map((_, i) => sideOfWind(i))).toEqual([0, 3, 2, 1]);
  });

  it("네 자리가 서로 겹치지 않는다", () => {
    expect(new Set(WINDS.map((_, i) => sideOfWind(i))).size).toBe(4);
  });
});

describe("windAtSeat", () => {
  it("라운드가 없으면 자리 순서 그대로다", () => {
    expect(WINDS.map((_, i) => windAtSeat(i))).toEqual([...WINDS]);
  });

  it("한 라운드가 지나면 남 자리가 동이 된다", () => {
    expect(windAtSeat(1, 1)).toBe("東");
    expect(windAtSeat(0, 1)).toBe("北");
  });

  it("네 라운드가 지나면 처음으로 돌아온다", () => {
    expect(WINDS.map((_, i) => windAtSeat(i, 4))).toEqual([...WINDS]);
  });
});

describe("windAngle", () => {
  // -0 과 0 은 toEqual 이 다르게 본다. || 0 으로 부호를 지운다.
  const round1 = (n: number) => (Math.round(n * 1000) || 0) / 1000;

  it("어느 라운드에서도 windAtSeat 이 정한 자리와 같은 곳을 가리킨다", () => {
    for (let rounds = 0; rounds < 5; rounds += 1) {
      for (let seat = 0; seat < WINDS.length; seat += 1) {
        const wind = WINDS.indexOf(windAtSeat(seat, rounds));
        expect([
          round1(Math.sin(windAngle(wind, rounds))),
          round1(Math.cos(windAngle(wind, rounds)))
        ]).toEqual([round1(Math.sin(seatAngle(seat))), round1(Math.cos(seatAngle(seat)))]);
      }
    }
  });

  it("라운드가 늘면 각도도 늘기만 한다", () => {
    expect(windAngle(0, 1)).toBeGreaterThan(windAngle(0, 0));
    expect(windAngle(0, 1) - windAngle(0, 0)).toBeCloseTo(Math.PI / 2);
  });
});

describe("seatEntry", () => {
  it("아무도 앉지 않았거나 넷 다 앉은 끝에서는 모든 자리가 같다", () => {
    expect(WINDS.map((_, i) => seatEntry(i, 0))).toEqual([0, 0, 0, 0]);
    expect(WINDS.map((_, i) => seatEntry(i, 1))).toEqual([1, 1, 1, 1]);
  });

  it("동, 남, 서, 북 순서대로 들어온다", () => {
    const middle = WINDS.map((_, i) => seatEntry(i, 0.5));
    expect(middle[0]).toBeGreaterThan(middle[1]);
    expect(middle[1]).toBeGreaterThan(middle[2]);
    expect(middle[2]).toBeGreaterThan(middle[3]);
  });

  it("동이 다 앉은 뒤에도 북은 아직 시작하지 않았다", () => {
    expect(seatEntry(0, 0.4)).toBe(1);
    expect(seatEntry(3, 0.4)).toBe(0);
  });
});
