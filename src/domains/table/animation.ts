/**
 * 판 위의 것들이 하나씩 내려앉는 움직임. 자리에 앉는 것도 패산을 쌓는 것도
 * "여럿이 시차를 두고 위에서 떨어진다" 라는 같은 모양이라, 여기 한 번만 적는다.
 */

/** 내려앉기 전에 떠 있는 높이. 패산 두 단 높이(1.44)의 두 배쯤이다. */
export const ENTRY_HEIGHT = 3;

/**
 * ease out expo. 처음에 확 떨어지고 끝에서 잦아든다. 물건이 내려앉아 멈추는
 * 모습이라, 위에서 내려오는 동작에 쓴다.
 */
export function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
}

/** a 와 b 사이에서 t 가 얼마나 왔는지. 밖이면 0 또는 1 이다. */
export function phase(t: number, a: number, b: number): number {
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
}

/**
 * 여럿이 차례로 같은 일을 할 때 index 번째의 몫. span 은 하나가 그 일을 다
 * 하는 데 쓰는 전체 진행도의 비율이고, 나머지 구간에 시작 시각이 고르게
 * 흩어진다. 곡선을 입히지 않고 주므로, 한 사람 몫 안에서 박자를 다시 나눌 수
 * 있다.
 */
export function slice(index: number, count: number, progress: number, span: number): number {
  const start = count > 1 ? (index / (count - 1)) * (1 - span) : 0;
  return phase(progress, start, start + span);
}

/**
 * 여럿을 차례로 들여보낼 때 index 번째의 진행도. 자르는 법은 slice 와 같고,
 * 위에서 내려앉는 곡선을 입힌 값이다.
 */
export function stagger(index: number, count: number, progress: number, span: number): number {
  return easeOutExpo(slice(index, count, progress, span));
}
