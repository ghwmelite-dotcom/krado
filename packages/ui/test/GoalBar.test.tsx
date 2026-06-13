import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoalBar } from "../src/GoalBar";

describe("GoalBar", () => {
  it("renders the percentage and formatted GHS amounts", () => {
    render(<GoalBar label="Today's goal" earned={14500} goal={20000} />);
    expect(screen.getByText("73%")).toBeDefined();
    expect(screen.getByText("GHS 145.00 of GHS 200.00")).toBeDefined();
  });

  it("caps the fill and readout at 100% when earnings exceed the goal", () => {
    const { container } = render(<GoalBar label="Today's goal" earned={25000} goal={20000} />);
    expect(screen.getByText("100%")).toBeDefined();
    const fill = container.querySelector<HTMLElement>(".krado-goalbar__fill");
    expect(fill?.style.width).toBe("100%");
    expect(container.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe(
      "100",
    );
  });

  it("shows 0% on a zero goal instead of dividing by zero", () => {
    render(<GoalBar label="Today's goal" earned={5000} goal={0} />);
    expect(screen.getByText("0%")).toBeDefined();
  });
});
