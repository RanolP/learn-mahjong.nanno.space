import { stagger } from "./animation";

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
