/**
 * 패 하나를 문자열 하나로 적는다: 수패는 "5m"(만수) "5p"(통수) "5s"(삭수),
 * 자패는 "1z"~"7z"(동남서북백발중). 적도라(빨간 5)는 숫자 0 으로 적는다: "0m".
 * 이 표기는 천봉(Tenhou) 로그가 쓰는 것과 같아서, 밖에서 가져온 패보와
 * 변환 없이 맞물린다.
 */
export const SUITS = ["m", "p", "s", "z"] as const;
export type Suit = (typeof SUITS)[number];

export type Tile = {
  readonly suit: Suit;
  /** 1~9. 자패는 1~7. 적도라는 rank 5 에 red=true 로 푼다. */
  readonly rank: number;
  readonly red: boolean;
};

const HONOR_MAX = 7;
const NUMBER_MAX = 9;

export function makeTile(suit: Suit, rank: number, red = false): Tile {
  const max = suit === "z" ? HONOR_MAX : NUMBER_MAX;
  if (!Number.isInteger(rank) || rank < 1 || rank > max) {
    throw new RangeError(`${suit} 패의 rank 는 1~${max} 인데 ${rank} 가 왔다`);
  }
  if (red && (suit === "z" || rank !== 5)) {
    throw new RangeError(`적도라는 수패 5 만 가능한데 ${rank}${suit} 가 왔다`);
  }
  return { suit, rank, red };
}

export function tileToString(tile: Tile): string {
  return `${tile.red ? 0 : tile.rank}${tile.suit}`;
}

/**
 * "123m456p11z" 처럼 숫자를 몰아쓰고 뒤에 수트를 붙이는 축약형을 푼다.
 * 튜토리얼 본문에서 손패를 한 줄로 적기 위한 입력 형식이다.
 */
export function parseHand(notation: string): Tile[] {
  const tiles: Tile[] = [];
  let pending: number[] = [];

  for (const ch of notation) {
    if (ch >= "0" && ch <= "9") {
      pending.push(Number(ch));
      continue;
    }
    if (!SUITS.includes(ch as Suit)) {
      throw new SyntaxError(`알 수 없는 문자 '${ch}' 가 "${notation}" 에 있다`);
    }
    if (pending.length === 0) {
      throw new SyntaxError(`수트 '${ch}' 앞에 숫자가 없다: "${notation}"`);
    }
    const suit = ch as Suit;
    for (const n of pending) {
      tiles.push(n === 0 ? makeTile(suit, 5, true) : makeTile(suit, n));
    }
    pending = [];
  }

  if (pending.length > 0) {
    throw new SyntaxError(`"${notation}" 의 끝에 수트 문자가 없다`);
  }
  return tiles;
}

const HONOR_NAMES = ["동", "남", "서", "북", "백", "발", "중"] as const;
const SUIT_NAMES: Record<Exclude<Suit, "z">, string> = {
  m: "만",
  p: "통",
  s: "삭"
};

/** 화면 낭독기와 alt 텍스트에 쓰는 한국어 패 이름. */
export function tileName(tile: Tile): string {
  if (tile.suit === "z") return HONOR_NAMES[tile.rank - 1];
  return `${tile.red ? "적" : ""}${tile.rank}${SUIT_NAMES[tile.suit]}`;
}
