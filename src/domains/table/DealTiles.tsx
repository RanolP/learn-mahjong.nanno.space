import { Stepper } from "./Stepper";
import { TableView } from "./TableView";
import { DEAD_WALL_TILES, breakPoint } from "./wall";
import { HAND_TILES } from "./deal";

/**
 * 자리에 앉은 뒤 패를 나누기까지를 단계로 나눠 보여 준다. 다 쌓은 패산에서
 * 시작해 주사위를 굴리고, 그 눈으로 끊을 자리를 찾고, 왕패를 떼고, 거기서부터
 * 각자 배패를 가져간다.
 */

/**
 * 이 장면에서 선이 굴린 눈. 합이 3이라 선에서 반시계로 세 번째인 서 자리
 * 패산을 쓰는데, 그 사람 오른쪽 끝에서 셋째라 끊은 자리가 변의 거의 끝이다.
 * 그래서 왕패 7스택이 한 변에 다 들어가지 못하고 모서리를 넘어 북 자리
 * 패산까지 걸친다. 왕패가 사람이 아니라 패산에 매인다는 것이 이때 드러난다.
 */
const ROLL = [1, 2] as const;
const SUM = ROLL[0] + ROLL[1];

const STEPS = [
  {
    label: "초기 상태",
    caption: "패산을 다 쌓고 네 사람이 자리에 앉았다. 아직 아무것도 가져가지 않았다."
  },
  {
    label: "주사위 굴리기",
    caption: `선이 주사위 두 개를 굴린다. ${ROLL[0]}과 ${ROLL[1]}, 합이 ${SUM}이다.`
  },
  {
    label: "왕패 뗄 곳 찾기",
    caption:
      `선을 1로 세어 반시계로 ${SUM}번째인 서 자리의 패산을 쓴다. ` +
      `그 사람 오른쪽 끝에서 ${SUM}번째 스택 옆이 끊는 자리다.`
  },
  {
    label: "왕패 떼기",
    caption:
      `끊은 자리 오른쪽 7스택 ${DEAD_WALL_TILES}장을 왕패로 떼어 둔다. ` +
      `7스택이 남지 않아 모서리를 넘어 북 자리 패산까지 이어진다.`
  },
  {
    label: "배패하기",
    caption:
      `끊은 자리부터 선, 남, 서, 북 순서로 네 장씩(두 스택 두 단) 세 바퀴, ` +
      `마지막에 한 장씩 가져가 각자 ${HAND_TILES}장을 든다. 선은 첫 쯔모패 ` +
      `한 장을 더 가져가 14장으로 시작한다.`
  }
] as const;

export function DealTiles() {
  return (
    <Stepper steps={STEPS}>
      {(step, instant) => (
        <TableView
          instant={instant()}
          state={{ brokenAt: breakPoint(SUM), drawn: 0 }}
          seats
          built
          seated
          // 주사위는 끊을 자리를 다 찾을 때까지 판에 남는다. 그 눈을 두 번
          // 쓰는 장면이라, 먼저 치우면 무엇으로 셌는지가 사라진다.
          dice={step() >= 1 && step() <= 3 ? ROLL : undefined}
          // 여기서 세는 것은 어느 패산을 끊을지다. 다 센 자리가 동가라는 뜻이
          // 아니므로 東 은 띄우지 않는다.
          count={step() === 2 ? { from: 0, steps: SUM, crown: false } : undefined}
          breakCount={step() > 1}
          deadWall={step() > 2}
          split={step() > 2}
          dealt={step() > 3}
          class="h-[32rem] w-full"
        />
      )}
    </Stepper>
  );
}
