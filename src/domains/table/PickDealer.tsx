import { Stepper } from "./Stepper";
import { TableView } from "./TableView";

/**
 * 게임을 시작하기 전에 자리와 친을 정하는 순서를 보여 준다. 동남서북 패를 뽑아
 * 자리를 잡고, 주사위를 두 번 굴려 친을 정한 뒤, 그 사람 앞에 표시패를 놓는다.
 *
 * 세는 방법은 두 번 다 같다. 굴린 사람을 1 로 세어 반시계 방향으로 눈의 합만큼
 * 간 자리다.
 */

/** 동 자리 사람이 굴린 눈. 합이 6이라 자기부터 여섯 번째인 남 자리가 가짜 친이다. */
const FIRST = [4, 2] as const;
/** 가짜 친이 굴린 눈. 합이 7이라 자기부터 일곱 번째인 북 자리가 진짜 친이다. */
const SECOND = [3, 4] as const;

const sum = (roll: readonly [number, number]) => roll[0] + roll[1];
/** 東 을 0 으로 하고 반시계로 센 자리 번호. 4 로 나눈 나머지가 실제 자리다. */
const FAKE = sum(FIRST) - 1;

const STEPS = [
  { label: "빈 작탁", caption: "아무것도 놓이지 않은 작탁이다. 여기서 시작한다." },
  {
    label: "풍패 섞기",
    caption:
      "동남서북 패 네 장을 펼쳐 보인 뒤 엎는다. 판 위에서 손으로 둥글게 휘저어 " +
      "섞고, 다 섞으면 한 줄로 모아 놓는다."
  },
  {
    label: "풍패 뽑아 앉기",
    caption:
      "한 사람이 패 한 장을 집어 뒤집어 읽는다. 읽고 나서야 자기 자리를 알고, " +
      "그 바람 자리로 가서 앉는다. 네 사람이 차례로 되풀이한다."
  },
  {
    label: "가짜 친",
    caption:
      `동 자리 사람이 주사위를 굴린다. 합이 ${sum(FIRST)}다. 자기를 1로 세어 ` +
      `반시계로 ${sum(FIRST)}까지 세면 남 자리에서 멈춘다. 이 사람이 가짜 친이다.`
  },
  {
    label: "진짜 친",
    caption:
      `가짜 친이 다시 굴린다. 합이 ${sum(SECOND)}다. 가짜 친을 1로 세어 ` +
      `반시계로 ${sum(SECOND)}까지 세면 북 자리에서 멈춘다. 이 사람이 진짜 친이다.`
  },
  {
    label: "표시패",
    caption: "진짜 친 앞에 친 표시패를 놓는다. 이 사람부터 첫 라운드를 시작한다."
  }
] as const;

export function PickDealer() {
  return (
    <Stepper steps={STEPS}>
      {(step, instant) => (
        <TableView
          instant={instant()}
          state={{ brokenAt: 12, drawn: 0 }}
          seats
          picks={step() > 0}
          picked={step() > 1}
          dice={step() === 3 ? FIRST : step() === 4 ? SECOND : undefined}
          count={
            step() === 3
              ? { from: 0, steps: sum(FIRST) }
              : step() === 4
                ? { from: FAKE, steps: sum(SECOND) }
                : undefined
          }
          marker={step() > 4}
          class="h-[32rem] w-full"
        />
      )}
    </Stepper>
  );
}
