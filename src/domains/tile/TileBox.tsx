import { Index } from "solid-js";
import { TileImage } from "./TileImage";
import { type Tile, parseHand } from "./tile";

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
  /** 빈 칸에 넣을 패. 줄마다 한 장씩 오른쪽 끝에 붙인다. */
  extra?: string;
}) {
  const tiles = () => parseHand(props.notation);
  const copies = () => props.copies ?? 4;
  const columns = () => props.columns ?? tiles().length;

  const cells = (): (Tile | undefined)[] => {
    const leftovers = props.extra ? parseHand(props.extra) : [];
    const rows: (Tile | undefined)[][] = [];
    for (let row = 0; row < copies(); row += 1) {
      const cells: (Tile | undefined)[] = [...tiles()];
      while (cells.length < columns()) cells.push(undefined);
      const leftover = leftovers.shift();
      if (leftover) cells[columns() - 1] = leftover;
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
