import { useParams } from "@solidjs/router";
import { Show, createMemo, lazy } from "solid-js";
import { Dynamic } from "solid-js/web";
import { MDXProvider } from "solid-mdx";
import { findLesson, loadLessonBody } from "~/domains/lesson/lessons";

export default function LessonPage() {
  const params = useParams<{ slug: string }>();
  const slug = () => params.slug ?? "";
  const body = createMemo(() => {
    if (!findLesson(slug())) return undefined;
    const loader = loadLessonBody(slug());
    return loader ? lazy(loader) : undefined;
  });

  return (
    <Show
      when={body()}
      fallback={<p class="p-8">그런 레슨은 없습니다: {slug()}</p>}
    >
      {resolved => (
        <article class="lesson-body mx-auto max-w-2xl p-8">
          <MDXProvider>
            <Dynamic component={resolved()} />
          </MDXProvider>
        </article>
      )}
    </Show>
  );
}
