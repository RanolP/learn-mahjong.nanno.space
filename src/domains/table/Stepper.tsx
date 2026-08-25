import { type Accessor, For, type JSX, createSignal } from "solid-js";

export type Step = {
  /** 단계 막대에 적는 짧은 이름. */
  readonly label: string;
  /** 그림 위에 적는 한 줄 설명. */
  readonly caption: string;
};

/**
 * 단계 막대와 자막을 그리고, 지금 몇 번째 단계인지를 아래 그림에 넘긴다.
 * 판을 차리는 순서와 자리가 도는 순서가 같은 모양이라, 껍데기는 여기 한 번만 적는다.
 */
export function Stepper(props: {
  steps: readonly Step[];
  /**
   * 지금 단계를 읽는 함수를 받아 그림을 만든다. 단계마다 다시 부르지 않고 처음에
   * 한 번만 부르므로, 그림은 그대로 남아 단계 사이를 움직여 갈 수 있다.
   */
  children: (step: Accessor<number>) => JSX.Element;
}) {
  const [step, setStep] = createSignal(0);
  const view = props.children(step);

  return (
    <div class="my-4">
      <div class="flex gap-1">
        <For each={props.steps}>
          {(item, i) => (
            <button
              type="button"
              onClick={() => setStep(i())}
              class="flex-1 border-t-4 pt-2 text-left text-xs transition-colors"
              classList={{
                "border-amber-400 text-white": i() === step(),
                "border-white/15 text-gray-400 hover:border-white/40": i() !== step()
              }}
            >
              {item.label}
            </button>
          )}
        </For>
      </div>
      {/* 자막은 높이를 고정해 둔다. 단계마다 글이 길고 짧아도 아래 그림이 위아래로 흔들리지 않는다. */}
      <p class="mt-3 h-12 text-sm text-gray-300">{props.steps[step()].caption}</p>
      <div class="overflow-hidden rounded-lg border border-white/15">{view}</div>
    </div>
  );
}
