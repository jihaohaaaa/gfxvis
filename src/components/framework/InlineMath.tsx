import katex from "katex";

interface Props {
  tex: string;
}

/** Render inline KaTeX from a TeX string. Pure and SSR-safe. */
export default function InlineMath({ tex }: Props) {
  const html = katex.renderToString(tex, {
    throwOnError: false,
    displayMode: false,
    output: "html",
  });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
