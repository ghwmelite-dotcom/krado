import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusChip } from "../src/StatusChip";

describe("StatusChip", () => {
  it("renders the locked variant (forest)", () => {
    render(<StatusChip status="locked" />);
    const chip = screen.getByText("Locked");
    expect(chip.className).toContain("krado-chip--locked");
  });

  it("renders the no-show variant (clay)", () => {
    render(<StatusChip status="no_show" />);
    const chip = screen.getByText("No-show");
    expect(chip.className).toContain("krado-chip--no_show");
  });

  it("renders the held variant with a live minute countdown", () => {
    render(<StatusChip status="held" holdExpiresAt={Date.now() + 5 * 60_000} />);
    const chip = screen.getByText("Hold 5m");
    expect(chip.className).toContain("krado-chip--held");
  });

  it("maps both cancel statuses onto the neutral cancelled variant", () => {
    const { rerender } = render(<StatusChip status="cancelled_by_client" />);
    expect(screen.getByText("Cancelled").className).toContain("krado-chip--cancelled");
    rerender(<StatusChip status="cancelled_by_artisan" />);
    expect(screen.getByText("Cancelled").className).toContain("krado-chip--cancelled");
  });

  it("renders completed as a neutral chip", () => {
    render(<StatusChip status="completed" />);
    expect(screen.getByText("Done").className).toContain("krado-chip--completed");
  });
});
