import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Onboarding } from "../src/screens/Onboarding";

function renderStep(step: number) {
  return render(
    <MemoryRouter>
      <Onboarding initialStep={step} />
    </MemoryRouter>,
  );
}

describe("Onboarding wizard — the 2-minute invariant", () => {
  it("renders exactly 3 steps in the stepper", () => {
    const { container } = renderStep(0);
    expect(container.querySelectorAll(".krado-stepper__step")).toHaveLength(3);
  });

  it("counts exactly 7 required fields across the whole flow", () => {
    const required = new Set<string>();
    for (const step of [0, 1, 2]) {
      const { container, unmount } = renderStep(step);
      container.querySelectorAll("[data-field-required]").forEach((el) => {
        const field = el.getAttribute("data-field-required");
        if (field) required.add(field);
      });
      unmount();
    }
    expect(required.size).toBe(7);
    expect([...required].sort()).toEqual(
      ["area", "hours", "momo_number", "name", "phone", "services", "shop_name"].sort(),
    );
  });

  it("starts the services step with two service rows (minimum required)", () => {
    const { container } = renderStep(1);
    expect(container.querySelectorAll(".service-row")).toHaveLength(2);
  });

  it("renders all 7 days on the hours step", () => {
    const { container } = renderStep(2);
    expect(container.querySelectorAll(".hours-row")).toHaveLength(7);
  });
});
