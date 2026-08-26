import { describe, expect, it } from "vitest";
import {
  DRAWN,
  WINDS,
  drawnBy,
  pickBeats,
  pickPathAngle,
  STAND_ANGLE,
  seatAngle,
  standAside,
  seatEntry,
  sideOfWind,
  windAngle,
  windAtSeat
} from "./seats";

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

describe("pickBeats", () => {
  it("한 사람 안에서 집기, 읽기, 앉기가 이 차례로 끝난다", () => {
    // 東 자리 몫이 반쯤 지났을 때, 집기는 끝났고 앉기는 아직 시작 전이다.
    const own = pickBeats(0, 0.5 * 0.28);
    expect(own.take).toBe(1);
    expect(own.read).toBeGreaterThan(0);
    expect(own.read).toBeLessThan(1);
    expect(own.sit).toBe(0);
  });

  it("앞사람이 다 앉기 전에는 다음 사람이 앉지 않는다", () => {
    for (const progress of [0.2, 0.4, 0.6, 0.8]) {
      const sits = WINDS.map((_, i) => pickBeats(i, progress).sit);
      expect(sits[0]).toBeGreaterThanOrEqual(sits[1]);
      expect(sits[1]).toBeGreaterThanOrEqual(sits[2]);
      expect(sits[2]).toBeGreaterThanOrEqual(sits[3]);
    }
  });

  it("다 끝나면 넷 다 집고 읽고 앉은 상태다", () => {
    for (const beats of WINDS.map((_, i) => pickBeats(i, 1))) {
      expect(beats).toEqual({ take: 1, read: 1, sit: 1 });
    }
  });

  it("시작 전에는 아무도 손을 대지 않았다", () => {
    for (const beats of WINDS.map((_, i) => pickBeats(i, 0))) {
      expect(beats).toEqual({ take: 0, read: 0, sit: 0 });
    }
  });
});

describe("DRAWN", () => {
  it("네 바람이 한 번씩 나온다", () => {
    expect([...DRAWN].sort()).toEqual([0, 1, 2, 3]);
  });

  it("drawnBy 는 그 바람을 뽑은 사람을 돌려준다", () => {
    expect(DRAWN.map((wind, person) => drawnBy(wind) === person)).toEqual([
      true,
      true,
      true,
      true
    ]);
  });
});

describe("pickPathAngle", () => {
  /** 한 바퀴를 접어 두 각도가 얼마나 벌어졌는지. 0 과 2파이는 같은 방향이다. */
  const apart = (a: number, b: number) => {
    const gap = ((a - b) % (2 * Math.PI)) + 2 * Math.PI;
    return Math.min(gap % (2 * Math.PI), 2 * Math.PI - (gap % (2 * Math.PI)));
  };

  it("아직 읽기 전이면 넷 다 화면 아래 한가운데에 서 있다", () => {
    // 자리를 모르는 동안에는 선 방향이 자리를 짐작하게 하면 안 된다.
    WINDS.forEach((_, p) => expect(pickPathAngle(p, 0)).toBeCloseTo(STAND_ANGLE));
  });

  it("서 있는 방향은 어느 자리 쪽도 아니다", () => {
    WINDS.forEach((_, seat) => expect(STAND_ANGLE).not.toBeCloseTo(seatAngle(seat)));
  });

  it("옆으로 비켜선 거리는 넷이 서로 다르고, 앉으면 사라진다", () => {
    const standing = WINDS.map((_, p) => standAside(p, 0));
    expect(new Set(standing).size).toBe(WINDS.length);
    WINDS.forEach((_, p) => expect(standAside(p, 1)).toBeCloseTo(0));
  });

  it("다 옮겨 가면 자기가 뽑은 바람의 자리다", () => {
    WINDS.forEach((_, p) => {
      expect(apart(pickPathAngle(p, 1), seatAngle(DRAWN[p]))).toBeCloseTo(0);
    });
  });

  it("판을 한 바퀴 도는 일 없이 짧은 쪽으로 돈다", () => {
    WINDS.forEach((_, p) => {
      expect(Math.abs(pickPathAngle(p, 1) - pickPathAngle(p, 0))).toBeLessThanOrEqual(Math.PI);
    });
  });
});
