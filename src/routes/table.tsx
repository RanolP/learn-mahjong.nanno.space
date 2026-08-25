import { For, createSignal } from "solid-js";
import { TableView } from "~/domains/table/TableView";
import { TOTAL_TILES } from "~/domains/table/wall";

const SCENES = [
  { label: "배패 직후", drawn: 13 * 4 },
  { label: "게임 시작 전", drawn: 0 },
  { label: "중반", drawn: 70 },
  { label: "해곡 직전", drawn: 120 }
];

export default function TablePage() {
  const [drawn, setDrawn] = createSignal(SCENES[0].drawn);

  return (
    <main class="mx-auto max-w-4xl p-8">
      <h1 class="text-2xl font-semibold">패산</h1>
      <p class="mt-2 text-sm text-gray-400">
        남은 패 {TOTAL_TILES - drawn()}장 · 회색이 왕패 14장
      </p>
      <div class="mt-4 flex gap-2">
        <For each={SCENES}>
          {scene => (
            <button
              type="button"
              onClick={() => setDrawn(scene.drawn)}
              class="rounded border border-white/20 px-3 py-1 text-sm hover:bg-white/10"
              classList={{ "bg-white/15": drawn() === scene.drawn }}
            >
              {scene.label}
            </button>
          )}
        </For>
      </div>
      <div class="mt-4 overflow-hidden rounded-lg border border-white/15">
        <TableView state={{ brokenAt: 12, drawn: drawn() }} deadWall />
      </div>
    </main>
  );
}
