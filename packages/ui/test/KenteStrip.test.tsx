import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { KenteStrip } from "../src/KenteStrip";

describe("KenteStrip", () => {
  it("renders exactly 7 flat blocks in the woven ratio", () => {
    const { container } = render(<KenteStrip />);
    const blocks = container.querySelectorAll(".krado-kente__block");
    expect(blocks).toHaveLength(7);
  });

  it("uses the 2:1:2:1:2:1:2 flex ratios", () => {
    const { container } = render(<KenteStrip />);
    const ratios = Array.from(container.querySelectorAll<HTMLElement>(".krado-kente__block")).map(
      (el) => (el.getAttribute("style") ?? "").match(/flex:\s*(\d)/)?.[1],
    );
    expect(ratios).toEqual(["2", "1", "2", "1", "2", "1", "2"]);
  });

  it("defaults to the 5px app height", () => {
    const { container } = render(<KenteStrip />);
    const strip = container.querySelector<HTMLElement>(".krado-kente");
    expect(strip?.style.height).toBe("5px");
  });
});
