import { A } from "@solidjs/router";

export default function Nav() {
  return (
    <nav class="bg-sky-800 text-gray-100">
      <div class="mx-auto flex max-w-2xl items-center gap-4 p-3">
        <A href="/" class="font-semibold">
          쉬운 마작
        </A>
      </div>
    </nav>
  );
}
