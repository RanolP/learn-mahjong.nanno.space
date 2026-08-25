/// <reference types="@solidjs/start/env" />

/**
 * solid-mdx 0.0.7 은 types/index.d.ts 를 package.json "exports" 에 걸어두지
 * 않아 bundler resolution 이 못 찾는다. 우리가 쓰는 MDXProvider 만 선언한다.
 */
declare module "solid-mdx" {
  import type { Component, JSX } from "solid-js";
  export const MDXProvider: Component<{
    components?: Record<string, Component<any>>;
    children?: JSX.Element;
  }>;
}
