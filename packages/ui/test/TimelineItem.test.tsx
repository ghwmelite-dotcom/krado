import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineItem } from "../src/TimelineItem";

describe("TimelineItem", () => {
  it("renders client, time, service and price", () => {
    render(
      <ul>
        <TimelineItem name="Akosua Mensah" timeLabel="2:30 pm" serviceName="Low fade" pricePesewas={4000} status="locked" />
      </ul>,
    );
    expect(screen.getByText("Akosua Mensah")).toBeDefined();
    expect(screen.getByText(/Low fade · GHS 40\.00/)).toBeDefined();
  });

  it("does not crash when the client has no name (regression)", () => {
    expect(() =>
      render(
        <ul>
          <TimelineItem name={null as unknown as string} timeLabel="3:00 pm" serviceName="Trim" pricePesewas={2500} status="locked" />
        </ul>,
      ),
    ).not.toThrow();
  });
});
