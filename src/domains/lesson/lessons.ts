import type { Component } from "solid-js";

/**
 * 레슨 목차. 순서와 제목을 여기서 한 번만 적고, 본문은 같은 slug 의
 * src/content/<slug>.mdx 가 맡는다. MDX 프론트매터 대신 이 배열을 쓰는 이유는
 * 목차를 그리는 데 본문 파일을 열어볼 필요가 없기 때문이다.
 */
export type Lesson = {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
};

export const LESSONS: readonly Lesson[] = [
  {
    slug: "01-tiles",
    title: "패 읽기",
    summary: "만수패·통수패·삭수패와 자패를 구분해서 읽는다."
  },
  {
    slug: "02-setup",
    title: "게임 준비",
    summary: "패 136장, 자리와 바람, 배패 13장을 알아본다."
  },
  {
    slug: "03-hands",
    title: "패 만들기",
    summary: "손에 든 13장으로 무엇을 만들어야 화료인지 알아본다."
  },
  {
    slug: "04-round",
    title: "라운드 진행",
    summary: "판이 바뀔 때 바람이 어떻게 도는지 알아본다."
  }
];

const modules = import.meta.glob<{ default: Component }>("../../content/*.mdx");

export function findLesson(slug: string): Lesson | undefined {
  return LESSONS.find(lesson => lesson.slug === slug);
}

/** 레슨 본문을 지연 로딩한다. 없는 slug 면 undefined 를 준다. */
export function loadLessonBody(slug: string) {
  return modules[`../../content/${slug}.mdx`];
}
