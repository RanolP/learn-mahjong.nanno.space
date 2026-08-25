import { type Tile, tileName, tileToString } from "./tile";

/**
 * 패 그림은 public/tiles/<표기>.svg 로 들어있다. 파일 이름이 곧 표기법이라
 * (5m, 0p, 1z, back) 매핑 표가 따로 필요 없다.
 *
 * 원본 SVG 는 패의 무늬만 그리므로 패 몸통(흰 바탕과 테두리)은 여기서 만든다.
 * 무늬를 background-image 로 까는 이유는 <img> 를 넣으면 세로 길이가
 * 부모의 aspect 로부터 내려오지 않아 0 으로 찌그러지기 때문이다.
 * class 는 몸통의 크기를 정한다.
 */
export function TileImage(props: { tile: Tile; class?: string }) {
  return (
    <span
      role="img"
      aria-label={tileName(props.tile)}
      style={{
        "background-image": `url(/tiles/${tileToString(props.tile)}.svg)`,
        "background-size": "82% 82%",
        "background-position": "center",
        "background-repeat": "no-repeat"
      }}
      class={`inline-block aspect-3/4 rounded-[10%] bg-white ring-1 ring-slate-300 ring-inset ${props.class ?? "h-16"}`}
    />
  );
}
