/**
 * 패산의 기하와 남은 장수를 계산한다. three.js 를 모르는 순수 함수라
 * 좌표가 맞는지 테스트로 먼저 확인할 수 있다.
 *
 * 규칙은 이렇다. 주사위로 정한 지점에서 패산을 끊고, 거기서부터 시계 방향으로
 * 한 스택씩(위 패 먼저, 그다음 아래 패) 가져간다. 끊은 지점의 반시계 쪽
 * 7스택 14장은 왕패로 떼어 둔다.
 * 참고: https://riichi.wiki/Wanpai
 */

export const SIDES = 4;
/** 한 변에 쌓는 스택 수. 4변 × 17스택 × 2단 = 136장. */
export const STACKS_PER_SIDE = 17;
export const TIERS = 2;
export const TOTAL_TILES = SIDES * STACKS_PER_SIDE * TIERS;
/** 왕패는 언제나 14장이다. 깡을 하면 패산 꼬리에서 한 장을 끌어와 채운다. */
export const DEAD_WALL_TILES = 14;

/**
 * 패 한 장의 크기. 실물 리치패 26×34×19mm 를 폭 1 기준으로 줄인 값이다.
 * w 는 패산이 뻗는 방향, l 은 패산의 두께 방향, h 는 위로 쌓이는 방향이다.
 */
export const TILE_SIZE = { w: 1, l: 1.32, h: 0.72 } as const;

/** 패산 한 변이 판 중심에서 떨어진 거리. 한 변의 길이 17 의 절반이라 모서리가 맞물린다. */
export const WALL_RADIUS = (STACKS_PER_SIDE * TILE_SIZE.w) / 2;

/**
 * 주사위 눈의 합이 가리키는 끊는 자리. 선을 1 로 세어 반시계 방향으로 합만큼
 * 간 사람의 패산을 쓰고, 그 사람에게서 오른쪽 끝부터 합만큼 센 스택 옆을 끊는다.
 * 끊은 자리에서 반시계 쪽 7스택 14장이 왕패가 된다.
 * 참고: https://riichi.wiki/Dead_wall
 */
export function breakPoint(sum: number): number {
  const seat = (sum - 1) % SIDES;
  // 자리 번호는 반시계로, 변 번호는 시계로 커진다(seats.ts 의 sideOfWind 와 같다).
  const side = (SIDES - seat) % SIDES;
  return side * STACKS_PER_SIDE + sum;
}

export type WallState = {
  /** 주사위로 끊은 지점. 0 ~ 67 사이의 스택 번호. */
  readonly brokenAt: number;
  /** 지금까지 패산에서 가져간 장수. */
  readonly drawn: number;
  /** 깡 횟수. 한 번마다 가져갈 수 있는 패가 한 장 줄어든다. 중급 튜토리얼에서 쓴다. */
  readonly kans?: number;
};

export type WallSlot = {
  readonly side: number;
  readonly stack: number;
  readonly tier: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** 패산이 뻗는 방향으로 패를 돌려 놓는 각도(라디안). */
  readonly rotationY: number;
  readonly kind: "live" | "dead";
};

/** 아직 가져갈 수 있는 패의 장수. 깡을 할수록 줄어든다. */
export function drawableTiles(kans = 0): number {
  return TOTAL_TILES - DEAD_WALL_TILES - kans;
}

/**
 * 끊은 지점에서 시계 방향으로 센 순번을 (변, 스택) 으로 되돌린다.
 * 순번 0 이 곧 끊은 지점의 첫 스택이다.
 */
function stackAt(brokenAt: number, offset: number) {
  const total = SIDES * STACKS_PER_SIDE;
  const index = (((brokenAt + offset) % total) + total) % total;
  return { side: Math.floor(index / STACKS_PER_SIDE), stack: index % STACKS_PER_SIDE };
}

/**
 * 변과 스택 번호를 판 위의 좌표로 옮긴다. 변 번호가 커지는 방향이 위에서 볼 때
 * 시계 방향이고, 한 변 안에서도 스택 번호가 커질수록 시계 방향으로 나아간다.
 * 그래서 변이 바뀌는 자리에서 좌표가 끊기지 않는다.
 */
function placeStack(side: number, stack: number) {
  const along = (STACKS_PER_SIDE - 1 - stack - (STACKS_PER_SIDE - 1) / 2) * TILE_SIZE.w;
  const angle = -side * (Math.PI / 2);
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return {
    x: along * cos + WALL_RADIUS * sin,
    z: -along * sin + WALL_RADIUS * cos,
    rotationY: angle
  };
}

/**
 * 지금 판 위에 남아 있는 패의 자리를 준다. 이미 가져간 패는 목록에서 빠진다.
 * 레슨마다 drawn 만 바꿔 넣으면 배패 직후와 종반의 패산이 같은 함수에서 나온다.
 */
export function wallSlots(state: WallState): WallSlot[] {
  const kans = state.kans ?? 0;
  const liveEnd = drawableTiles(kans);
  const slots: WallSlot[] = [];

  // 깡을 하면 왕패 끝에서 영상패를 한 장 빼 가고, 그만큼 패산 꼬리가 왕패로
  // 넘어간다. 그래서 왕패는 14장을 유지한 채 자리만 뒤로 밀린다.
  for (let order = state.drawn; order < TOTAL_TILES - kans; order += 1) {
    const { side, stack } = stackAt(state.brokenAt, Math.floor(order / TIERS));
    // 한 스택에서는 위 패를 먼저 가져간다. 순번의 짝수 쪽이 위 단이다.
    const tier = order % TIERS === 0 ? 1 : 0;
    const { x, z, rotationY } = placeStack(side, stack);
    slots.push({
      side,
      stack,
      tier,
      x,
      y: tier * TILE_SIZE.h + TILE_SIZE.h / 2,
      z,
      rotationY,
      kind: order < liveEnd ? "live" : "dead"
    });
  }
  return slots;
}

/**
 * 패산을 쌓는 순서. wallSlots 는 가져가는 순서대로 주므로 한 스택의 위 패가
 * 먼저 나오는데, 쌓을 때는 아래 패부터 놓아야 위 패가 허공에 뜨지 않는다.
 * 자리 목록의 index 번째 패가 몇 번째로 놓이는지를 돌려준다.
 */
export function buildOrder(slots: readonly WallSlot[]): number[] {
  const rank = slots.map((_, i) => i);
  for (let i = 0; i + 1 < slots.length; i += 1) {
    const upper = slots[i];
    const lower = slots[i + 1];
    if (upper.tier === 1 && lower.side === upper.side && lower.stack === upper.stack) {
      [rank[i], rank[i + 1]] = [rank[i + 1], rank[i]];
      i += 1;
    }
  }
  return rank;
}
