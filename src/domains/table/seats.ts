import { easeOutExpo, phase, slice, stagger } from "./animation";

/**
 * 자리에 붙는 바람. 동 자리에서 시작해 남, 서, 북 순으로 반시계 방향으로 앉는다.
 * 패산의 변 번호는 시계 방향으로 커지므로(wall.ts 참고), 바람은 변 번호를
 * 거꾸로 돌며 붙는다.
 */
export const WINDS = ["東", "南", "西", "北"] as const;
export type Wind = (typeof WINDS)[number];

export const SIDES = 4;

/** 바람이 붙는 변 번호. 화면 앞쪽(변 0)이 동 자리다. */
export function sideOfWind(index: number): number {
  return (SIDES - index) % SIDES;
}

/** 자리가 판 위에서 놓인 각도(라디안). 패산의 변 번호와 같은 규칙이다. */
export function seatAngle(seat: number): number {
  return -sideOfWind(seat) * (Math.PI / 2);
}

/**
 * 한 라운드가 끝나면 자리는 그대로 두고 바람만 한 칸 돌린다. 南 이던 사람이
 * 다음 라운드의 東 이 되므로, 자리 번호가 같아도 붙는 바람은 앞 번호로 옮겨간다.
 */
export function windAtSeat(seat: number, rounds = 0): Wind {
  return WINDS[(((seat - rounds) % SIDES) + SIDES) % SIDES];
}

/**
 * 바람 글자가 rounds 라운드 뒤에 놓이는 각도. 나머지를 취하지 않고 계속 더해서,
 * 라운드가 늘어날 때마다 글자가 한 칸씩 앞으로 미끄러진다. 애니메이션이
 * 중간 값을 그대로 각도로 쓸 수 있는 이유다.
 */
export function windAngle(wind: number, rounds: number): number {
  return (wind + rounds) * (Math.PI / 2);
}

/**
 * 차례로 앉는 장면에서 한 자리의 진행도. 전체 진행도 progress 를 0 에서 1 로
 * 올리면 동, 남, 서, 북 자리가 SEAT_SPAN 만큼 겹치며 하나씩 내려앉는다.
 */
const SEAT_SPAN = 0.4;

export function seatEntry(seat: number, progress: number): number {
  return stagger(seat, SIDES, progress, SEAT_SPAN);
}

/**
 * 자리를 정하는 장면에서 나온 결과. p 번째로 패를 집는 사람이 뽑은 바람이다.
 * 집는 차례와 앉는 자리가 어긋나 있어야, 집어서 읽기 전에는 자기 자리를 모른다는
 * 것이 그림으로 보인다.
 */
export const DRAWN: readonly number[] = [2, 0, 3, 1];

/** 그 바람을 뽑는 사람의 차례. 자리 글자는 그 사람이 와서 앉을 때 놓인다. */
export function drawnBy(wind: number): number {
  return DRAWN.indexOf(wind);
}

/**
 * 뽑기 전에 네 사람이 서 있는 곳. 넷 다 화면 아래 한가운데에 나란히 선다.
 * 자리마다 다른 쪽에 세우면 벌써 그 자리 사람으로 보이는데, 아직 아무도 제
 * 자리를 모르는 장면이다.
 *
 * 카메라가 (1, 1, 1) 에서 원점을 보므로 화면 가로 방향은 (1, 0, -1) 이고,
 * 화면에서 곧장 아래로 오는 판 위의 방향은 x 와 z 가 같은 쪽, 곧 동 자리와 남
 * 자리 사이의 45도다. 동 자리 쪽(0도)은 화면에서 오른쪽 아래로 비껴 보인다.
 */
export const STAND_ANGLE = Math.PI / 4;
/** 나란히 선 네 사람 사이의 간격. 두 손 한 쌍이 서로 닿지 않을 만큼이다. */
const STAND_PITCH = 4.4;

/**
 * 서 있는 줄에서 옆으로 비켜선 거리. 자기 자리로 옮겨 가면서 0 이 되어, 줄에
 * 서 있던 넷이 각자 자리 한가운데로 모인다.
 */
export function standAside(person: number, sit: number): number {
  return (person - 1.5) * STAND_PITCH * (1 - sit);
}

/**
 * p 번째로 집는 사람이 sit 만큼 옮겨 갔을 때의 각도. 한 방향에 서 있다가 자기가
 * 뽑은 바람의 자리까지 판을 돌아서 간다. 돌아가는 방향은 짧은 쪽으로 잡아,
 * 바로 옆자리로 가면서 판을 크게 한 바퀴 도는 일이 없게 한다.
 */
export function pickPathAngle(person: number, sit: number): number {
  const gap = seatAngle(DRAWN[person]) - STAND_ANGLE;
  const turn = (((gap + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return STAND_ANGLE + turn * sit;
}

/**
 * 풍패를 뽑아 앉는 장면에서 한 사람이 차지하는 몫. 앞사람이 앉기를 마칠 즈음
 * 다음 사람이 집기 시작하도록 조금만 겹친다.
 */
const PICK_SPAN = 0.28;
/** 한 사람 몫 안에서 집기와 읽기가 끝나는 지점. 남는 구간이 앉기다. */
const TAKE_END = 0.45;
const READ_END = 0.72;

/**
 * 한 사람이 풍패를 집어 오고, 뒤집어 읽고, 그 자리에 앉기까지의 세 박자.
 * 네 사람이 이 세 박자를 차례로 되풀이한다. 패와 손과 자리 글자가 한 박자로
 * 움직여야 해서, 세 곳이 이 함수 하나를 함께 쓴다.
 */
export function pickBeats(seat: number, progress: number) {
  const own = slice(seat, SIDES, progress, PICK_SPAN);
  return {
    /** 판 가운데에서 패 한 장을 집어 자기 앞으로 가져오는 정도. */
    take: easeOutExpo(phase(own, 0, TAKE_END)),
    /** 가져온 패를 뒤집어 어떤 바람인지 읽는 정도. */
    read: phase(own, TAKE_END, READ_END),
    /** 읽고 나서 그 자리에 앉는 정도. */
    sit: easeOutExpo(phase(own, READ_END, 1))
  };
}
