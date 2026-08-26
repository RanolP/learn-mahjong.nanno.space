import { Index } from "solid-js";
import { TileImage } from "./TileImage";
import { type Tile, makeTile, parseHand } from "./tile";

/**
 * 같은 종류의 패를 한 상자에 모아 보여준다. 마작은 같은 패가 4장씩 들어가므로
 * copies 의 기본값은 4 다. MDX 에서 <TileBox label="만수 36장"
 * notation="123456789m" /> 로 쓴다.
 *
 * 격자의 칸 너비를 1.75rem 으로 고정한다. 그래야 한 벌이 언제나 한 줄로
 * 떨어지고, 줄이 접히지 않는다. 상자 두 개는 본문 폭에 나란히 들어간다.
 */
export function TileBox(props: {
  label: string;
  notation: string;
  copies?: number;
  /** 줄 하나의 칸 수. 한 벌보다 크면 오른쪽에 빈 칸이 생긴다. */
  columns?: number;
  /**
   * 적도라 규칙을 켠 모습. 수패 5 네 장 가운데 맨 아랫줄 한 장만 빨간 패가
   * 된다. 장수는 그대로이므로 상자의 칸 수는 달라지지 않는다.
   */
  red?: boolean;
}) {
  const tiles = () => parseHand(props.notation);
  const copies = () => props.copies ?? 4;
  const columns = () => props.columns ?? tiles().length;

  const cells = (): (Tile | undefined)[] => {
    const rows: (Tile | undefined)[][] = [];
    for (let row = 0; row < copies(); row += 1) {
      const last = row === copies() - 1;
      const cells: (Tile | undefined)[] = tiles().map(tile =>
        props.red && last && tile.suit !== "z" && tile.rank === 5
          ? makeTile(tile.suit, 5, true)
          : tile
      );
      while (cells.length < columns()) cells.push(undefined);
      rows.push(cells);
    }
    return rows.flat();
  };

  return (
    <div class="rounded-lg border border-white/15 bg-white/5 p-3">
      <p class="mb-2 text-sm text-gray-400">{props.label}</p>
      <div
        class="grid gap-0.5"
        style={{ "grid-template-columns": `repeat(${columns()}, 1.75rem)` }}
      >
        <Index each={cells()}>
          {cell => (
            <>
              {cell() ? (
                <TileImage tile={cell()!} class="w-full" />
              ) : (
                <span class="inline-block aspect-3/4 w-full rounded-[10%] bg-white/10" />
              )}
            </>
          )}
        </Index>
      </div>
    </div>
  );
}
