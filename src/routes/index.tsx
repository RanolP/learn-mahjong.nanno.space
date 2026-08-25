import { A } from "@solidjs/router";
import { For } from "solid-js";
import { LESSONS } from "~/domains/lesson/lessons";

export default function Home() {
  return (
    <main class="mx-auto max-w-2xl p-8">
      <h1 class="text-3xl font-semibold">쉬운 마작 튜토리얼</h1>
      <ul class="mt-8 space-y-4">
        <For each={LESSONS}>
          {lesson => (
            <li>
              <A
                href={`/lesson/${lesson.slug}`}
                class="text-sky-700 hover:underline"
              >
                {lesson.title}
              </A>
              <p class="text-sm text-gray-600">{lesson.summary}</p>
            </li>
          )}
        </For>
      </ul>
    </main>
  );
}
