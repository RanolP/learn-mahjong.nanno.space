import { For } from "solid-js";
import { parseHand } from "./tile";
import { TileImage } from "./TileImage";

/**
 * 레슨 본문에서 손패 한 벌을 그린다. MDX 안에서 <Hand notation="123m0p" /> 로 쓴다.
 */
export function Hand(props: { notation: string; class?: string }) {
  const tiles = () => parseHand(props.notation);
  return (
    <span data-hand class="inline-flex items-end gap-0.5 align-middle">
      <For each={tiles()}>
        {tile => <TileImage tile={tile} class={props.class} />}
      </For>
    </span>
  );
}
