import { For, Index, Show } from "solid-js";

/**
 * 조합의 모양만 보여 준다. 무늬 없는 빈 패를 묶음마다 띄워 놓으므로, 어떤 패인지가
 * 아니라 2 / 3 / 3 / 3 / 3 이라는 칸 수만 눈에 들어온다. 무늬가 있는 예시를 먼저
 * 보이면 그 패들이 왜 한 묶음인지부터 설명해야 해서, 모양이 뒤로 밀린다.
 *
 * MDX 에서 <HandShape groups={[2, 3, 3, 3, 3]} labels={["머리", "몸통"]} /> 로 쓴다.
 * labels 는 groups 와 같은 순서로 붙고, 모자란 만큼은 이름 없이 그려진다.
 */
export function HandShape(props: { groups: number[]; labels?: string[]; class?: string }) {
  return (
    <span data-hand-shape class="inline-flex items-start gap-4 align-middle">
      <For each={props.groups}>
        {(size, i) => (
          <span class="inline-flex flex-col items-center gap-1">
            <span class="inline-flex gap-0.5">
              <Index each={Array.from({ length: size })}>
                {() => (
                  <span
                    class={`inline-block aspect-3/4 rounded-[10%] bg-white/15 ring-1 ring-white/25 ring-inset ${props.class ?? "h-16"}`}
                  />
                )}
              </Index>
            </span>
            <Show when={props.labels?.[i()]}>
              {label => <span class="text-sm text-gray-400">{label()}</span>}
            </Show>
          </span>
        )}
      </For>
    </span>
  );
}
