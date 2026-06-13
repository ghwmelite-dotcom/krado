import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "../src/screens/Dashboard";
import type { DashboardPayload } from "../src/types";

const fixture: DashboardPayload = {
  artisan: {
    name: "Kojo Mensah",
    shop_name: "Kojo's Cuts",
    handle: "kojos-cuts",
    language: "en",
    daily_goal: 20000,
    susu_mode: "flat",
    susu_value: 500,
  },
  date: "2026-06-12",
  daily_goal: 20000,
  earned_today: 12400,
  susu_today: 1000,
  susu_week: 4500,
  clients_week: 9,
  up_next: [
    {
      id: "bkg_1",
      service_name: "Low fade",
      price: 4000,
      deposit: 1000,
      starts_at: "2026-06-12T14:30:00.000Z",
      status: "locked",
      client_name: "Yaw Boateng",
      client_phone: "+233241234567",
    },
    {
      id: "bkg_2",
      service_name: "Beard trim",
      price: 2500,
      deposit: 500,
      starts_at: "2026-06-12T16:00:00.000Z",
      status: "locked",
      client_name: "Kofi Adjei",
      client_phone: "+233209876543",
    },
  ],
  pending_nudges: [
    { id: "ndg_1", cycle_days: 14, client_name: "Ama Serwaa", client_phone: "+233501112223" },
  ],
  pending_manual_claims: 2,
};

beforeEach(() => {
  localStorage.setItem("krado_token", "test-token");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/api/dashboard")) {
        return new Response(JSON.stringify(fixture), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe("Dashboard", () => {
  it("renders the goal bar percentage from the payload", async () => {
    renderDashboard();
    // 12400 / 20000 = 62%
    expect(await screen.findByText("62%")).toBeDefined();
    expect(screen.getByText("GHS 124 of 200")).toBeDefined();
  });

  it("renders the up-next bookings with client names and prices", async () => {
    renderDashboard();
    expect(await screen.findByText("Yaw Boateng")).toBeDefined();
    expect(screen.getByText("Kofi Adjei")).toBeDefined();
    expect(screen.getByText("Low fade · GHS 40.00")).toBeDefined();
    expect(screen.getByText("Beard trim · GHS 25.00")).toBeDefined();
  });

  it("shows exactly one nudge card with a Later dismiss", async () => {
    renderDashboard();
    await screen.findByText("62%");
    expect(screen.getAllByText("Ama Serwaa is usually back every 14 days")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Later" })).toBeDefined();
  });

  it("links to bookings when manual claims are pending", async () => {
    renderDashboard();
    await screen.findByText("62%");
    const banner = screen.getByText("2 manual payments waiting for your confirmation");
    expect(banner.closest("a")?.getAttribute("href")).toBe("/bookings");
  });
});
