import { Stepper } from "./Stepper";
import { TableView } from "./TableView";

/**
 * 라운드가 끝날 때마다 바람이 한 칸씩 도는 것을 보여 준다. 사람은 앉은 자리에
 * 그대로 있고 바람 글자만 움직인다. 앞 단계를 누르면 왔던 길을 그대로 되짚는다.
 */
const STEPS = [
  { label: "시작", caption: "동 자리에 앉은 사람이 선이다. 여기서 첫 라운드를 시작한다." },
  { label: "1라운드 뒤", caption: "라운드마다 시계 반대 방향으로 선 플레이어를 넘긴다." },
  { label: "2라운드 뒤", caption: "또 한 라운드가 끝났다. 서였던 사람이 동이 된다." },
  {
    label: "3라운드 뒤",
    caption: "북이었던 사람이 동이 된다. 한 번 더 돌면 모두 처음 자리로 돌아온다."
  }
] as const;

export function RoundRotation() {
  return (
    <Stepper steps={STEPS}>
      {step => (
        <TableView
          state={{ brokenAt: 12, drawn: 0 }}
          seats
          arrow
          built
          seated
          rounds={step()}
          class="h-96 w-full"
        />
      )}
    </Stepper>
  );
}
