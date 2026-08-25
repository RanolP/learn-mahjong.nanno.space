import { Stepper } from "./Stepper";
import { TableView } from "./TableView";
import { DEAD_WALL_TILES, breakPoint } from "./wall";
import { HAND_TILES } from "./deal";

/**
 * 자리에 앉은 뒤 패를 나누기까지를 단계로 나눠 보여 준다. 주사위를 굴려 끊을
 * 자리를 정하고, 왕패를 떼고, 거기서부터 각자 배패를 가져간다.
 */

/** 이 장면에서 선이 굴린 눈. 합이 7이라 선에서 반시계로 세 번째인 서 자리 패산을 끊는다. */
const ROLL = [4, 3] as const;
const SUM = ROLL[0] + ROLL[1];

const STEPS = [
  {
    label: "주사위",
    caption: `선이 주사위 두 개를 굴린다. ${ROLL[0]}과 ${ROLL[1]}, 합이 ${SUM}이다.`
  },
  {
    label: "왕패 떼기",
    caption:
      `선을 1로 세어 반시계로 ${SUM}번째인 서 자리의 패산을 쓴다. ` +
      `그 사람 오른쪽 끝에서 ${SUM}번째 스택 옆을 끊고, ` +
      `끊은 자리 오른쪽 7스택 ${DEAD_WALL_TILES}장을 왕패로 떼어 둔다.`
  },
  {
    label: "배패",
    caption:
      `끊은 자리부터 선, 남, 서, 북 순서로 네 장씩 세 바퀴, ` +
      `마지막에 한 장씩 가져가 각자 ${HAND_TILES}장을 손에 든다.`
  }
] as const;

export function DealTiles() {
  return (
    <Stepper steps={STEPS}>
      {step => (
        <TableView
          state={{ brokenAt: breakPoint(SUM), drawn: 0 }}
          seats
          built
          seated
          dice={ROLL}
          deadWall={step() > 0}
          split={step() > 0}
          dealt={step() > 1}
          class="h-[32rem] w-full"
        />
      )}
    </Stepper>
  );
}
