import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SpoilerText } from "../src/components";
describe("user text rendering", () => {
  it("conceals both supported spoiler formats without outputting hidden text", () => {
    const markup = renderToStaticMarkup(
      <SpoilerText
        text={"Before >!the secret ending!< and ||another secret|| after."}
      />,
    );
    expect(markup).not.toContain("the secret ending");
    expect(markup).not.toContain("another secret");
    expect(markup.match(/SPOILER/g)).toHaveLength(2);
    expect(markup).toContain('aria-expanded="false"');
  });
  it("escapes user-provided HTML instead of executing it", () => {
    const markup = renderToStaticMarkup(
      <SpoilerText
        text={'<script>alert("unsafe")</script><img src=x onerror=alert(1)>'}
      />,
    );
    expect(markup).not.toContain("<script>");
    expect(markup).not.toContain("<img");
    expect(markup).toContain("&lt;script&gt;");
  });
});
