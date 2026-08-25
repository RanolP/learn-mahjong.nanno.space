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
    nitro()
  ]
});
