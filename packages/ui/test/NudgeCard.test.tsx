import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NudgeCard } from "../src/NudgeCard";

describe("NudgeCard", () => {
  it("always renders the Later dismiss button", () => {
    render(
      <NudgeCard
        insight="Yaw is usually back every 14 days"
        actionLabel="Send rebook nudge"
        onAction={() => {}}
        onLater={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Later" })).toBeDefined();
  });

  it("fires onLater when dismissed and onAction for the primary action", () => {
    const onAction = vi.fn();
    const onLater = vi.fn();
    render(
      <NudgeCard
        insight="Yaw is usually back every 14 days"
        actionLabel="Send rebook nudge"
        onAction={onAction}
        onLater={onLater}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Send rebook nudge" }));
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it("resolves the Later label from the lang table (tw falls back to English for now)", () => {
    render(
      <NudgeCard
        insight="Yaw is usually back every 14 days"
        actionLabel="Send rebook nudge"
        onAction={() => {}}
        onLater={() => {}}
        lang="tw"
      />,
    );
    expect(screen.getByRole("button", { name: "Later" })).toBeDefined();
  });
});
