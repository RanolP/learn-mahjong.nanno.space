import mdx from "@mdx-js/rollup";
import { solidStart } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // MDX 는 solidStart 보다 먼저 돌아야 한다. .mdx 를 JSX 로 바꾼 뒤라야
    // solid 컴파일러가 그 JSX 를 읽는다.
    {
      ...mdx({
        jsx: true,
        jsxImportSource: "solid-js",
        providerImportSource: "solid-mdx"
      }),
      enforce: "pre"
    },
    solidStart({ extensions: ["mdx", "md"] }),
    tailwindcss(),
    // GitHub Pages 는 정적 파일만 낸다. 서버가 없으므로 모든 경로를 빌드 때
    // 미리 그려 둔다. 목차(/)에서 각 레슨으로 걸린 링크를 따라가면 레슨 페이지가
    // 전부 나오고, 어디서도 링크되지 않는 /table 만 손으로 적어 준다.
    nitro({
      prerender: {
        routes: ["/", "/table", "/404"],
        crawlLinks: true,
        failOnError: true
      }
    })
  ]
});
