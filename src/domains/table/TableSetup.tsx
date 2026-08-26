import { Stepper } from "./Stepper";
import { TableView } from "./TableView";
import { STACKS_PER_SIDE, TIERS, TOTAL_TILES } from "./wall";

/**
 * 패산을 차리는 순서를 단계로 나눠 보여 준다. 빈 작탁에서 시작해 패산을 쌓고,
 * 각자 앞의 패산이 몇 장인지 센다.
 *
 * 앉기는 앞의 친 정하기(PickDealer)에서 이미 끝났다. 그래서 여기서는 네 사람이
 * 처음부터 앉아 있고, 판 위에 패산만 올라온다.
 */
const STEPS = [
  { label: "빈 작탁", caption: "네 사람이 앉았지만 아직 아무것도 놓이지 않은 작탁이다." },
  { label: "패산 쌓기", caption: "작탁에 패산을 쌓는다." },
  {
    label: "패 세기",
    caption:
      `각자 앞에 ${STACKS_PER_SIDE}개를 ${TIERS}층으로 쌓는다. ` +
      `한 사람 앞이 ${STACKS_PER_SIDE} × ${TIERS} = ${STACKS_PER_SIDE * TIERS}장이고, ` +
      `네 사람 몫을 합치면 ${TOTAL_TILES}장이다.`
  }
] as const;

export function TableSetup() {
  return (
    <Stepper steps={STEPS}>
      {(step, instant) => (
        <TableView
          instant={instant()}
          state={{ brokenAt: 12, drawn: 0 }}
          seats
          built={step() > 0}
          rulers={step() === 2}
          seated
          class="h-[32rem] w-full"
        />
      )}
    </Stepper>
  );
}
