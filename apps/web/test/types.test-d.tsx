/**
 * Type-level tests. Importing the app entry pulls the entire source graph
 * (screens, api, @krado/ui, @krado/shared) into the tsc program, so this
 * suite doubles as the project-wide typecheck gate for `npm test`.
 */
import { describe, expectTypeOf, it } from "vitest";
import { App } from "../src/App";
import { api } from "../src/api";
import type { DashboardPayload } from "../src/types";

describe("type contracts", () => {
  it("App is a React component", () => {
    expectTypeOf(App).toBeFunction();
    expectTypeOf(App).returns.not.toBeAny();
  });

  it("dashboard endpoint resolves to the dashboard payload", () => {
    expectTypeOf(api.dashboard).returns.resolves.toEqualTypeOf<DashboardPayload>();
  });

  it("money fields are integer pesewas (number), never strings", () => {
    expectTypeOf<DashboardPayload["earned_today"]>().toEqualTypeOf<number>();
    expectTypeOf<DashboardPayload["daily_goal"]>().toEqualTypeOf<number>();
  });
});
