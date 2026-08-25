# 구조

## 왜 이 조합인가

SolidStart 2 위에 올린다. 튜토리얼은 남이 검색해서 들어오는 글이라 페이지마다 HTML 이 서버에서 나와야 하고, 동시에 패를 만지는 위젯이 필요하다. SolidStart 는 두 가지를 한 프로젝트에서 준다.

문서 프레임워크(SolidBase)를 쓰지 않은 이유는 레슨 카드, 진행률, 전체화면 연습 문제 같은 앱에 가까운 화면을 직접 만들기 위해서다.

## 폴더는 도메인으로 나눈다

`src/domains/<도메인>/` 안에 그 도메인의 모델, 로직, 컴포넌트, 테스트를 모두 둔다. `components/`, `stores/` 같은 기술 계층 폴더는 만들지 않는다.

| 도메인 | 맡는 일 |
|---|---|
| `tile` | 패 하나의 모델, 표기법 파싱, 패 그리기 |
| `hand` | 손패 모델, 샹텐·텐파이 계산 |
| `yaku` | 족보 판정, 점수 계산 |
| `lesson` | 레슨 목차, 본문 로딩, 퀴즈 진행 상태 |

## 레슨 본문은 MDX 로 쓴다

본문 파일은 `src/content/<slug>.mdx` 다. 목차와 제목은 `src/domains/lesson/lessons.ts` 의 `LESSONS` 배열이 갖는다. 목차를 그릴 때 본문 파일을 열지 않으려고 둘을 나눴다.

라우트 `src/routes/lesson/[slug].tsx` 가 `import.meta.glob` 으로 본문을 지연 로딩한다. MDX 안에서는 `src/domains/*` 의 Solid 컴포넌트를 그대로 쓸 수 있다.

Vite 플러그인 순서가 중요하다. `@mdx-js/rollup` 이 `enforce: "pre"` 로 먼저 돌아 `.mdx` 를 JSX 로 바꾼 뒤라야, `solidStart()` 의 컴파일러가 그 JSX 를 읽는다.

## 패 표기법

패 하나는 `5m`(만수) `5p`(통수) `5s`(삭수) `1z`(자패) 로 적는다. 적도라는 `0m` 처럼 숫자 0 을 쓴다. 손패는 `123m456p11z` 처럼 몰아쓴다.

이 표기는 천봉(Tenhou) 패보가 쓰는 것과 같다. 밖에서 가져온 패보를 변환 없이 그대로 넣기 위해서다. 구현은 `src/domains/tile/tile.ts` 의 `parseHand` 에 있다.

## 명령

| 명령 | 하는 일 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm test` | Vitest 단위 테스트 |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm build` | 프로덕션 빌드 (`.output/`) |
| `pnpm start` | 빌드 결과 실행 |

`pnpm build` 가 이전 결과를 재활용해 옛 화면을 내보내는 일이 있었다. 화면이 바뀌지 않으면 `rm -rf .output node_modules/.vite` 후 다시 빌드한다.
