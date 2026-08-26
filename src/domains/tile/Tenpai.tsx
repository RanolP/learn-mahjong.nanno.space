import { Hand } from "./Hand";

/**
 * 리치를 걸 수 있는 손패 하나와 그 손패가 기다리는 패를 나란히 보여 준다.
 * 대기 모양의 이름(량면, 간짱 …)은 기다리는 패가 무엇인지와 함께 봐야 뜻이
 * 통하므로, 손패만 그리는 <Hand /> 두 개로 흩어 놓지 않고 한 덩어리로 묶는다.
 */
export function Tenpai(props: { name: string; hand: string; waits: string; note?: string }) {
  return (
    <div class="my-4 rounded-lg border border-white/15 bg-white/5 p-3">
      <p class="mb-2 text-sm text-gray-300">
        <span class="font-semibold text-gray-100">{props.name}</span>
        {props.note ? ` — ${props.note}` : ""}
      </p>
      <div class="flex flex-wrap items-end gap-3">
        <Hand notation={props.hand} class="h-10" />
        <span class="text-sm text-gray-400">대기</span>
        <Hand notation={props.waits} class="h-10" />
      </div>
    </div>
  );
}
