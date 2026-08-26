import { createSignal } from "solid-js";
import { TileBox } from "./TileBox";

/**
 * 한 게임에 쓰는 136장을 종류별 상자로 늘어놓고, 적도라를 켜고 끄는 스위치를
 * 붙인다. 적도라는 패를 더 넣는 것이 아니라 5 네 장 중 한 장을 빨간 것으로
 * 바꾸는 규칙이라, 따로 세 장을 그려 두면 136장에 더 얹는 것처럼 읽힌다.
 * 스위치로 그 한 장이 바뀌는 것을 직접 보여 준다.
 */
export function TileSet() {
  const [red, setRed] = createSignal(false);

  return (
    <div class="my-4">
      <label class="mb-3 inline-flex cursor-pointer items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          class="peer sr-only"
          checked={red()}
          onChange={event => setRed(event.currentTarget.checked)}
        />
        <span class="relative h-5 w-9 rounded-full bg-white/20 transition-colors after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-red-500 peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-white/60" />
        적도라
      </label>
      <div class="flex flex-wrap items-start gap-3">
        <TileBox label="만수 36장" notation="123456789m" red={red()} />
        <TileBox label="통수 36장" notation="123456789p" red={red()} />
        <TileBox label="삭수 36장" notation="123456789s" red={red()} />
        <TileBox label="자패 28장" notation="1234567z" columns={9} />
      </div>
    </div>
  );
}
