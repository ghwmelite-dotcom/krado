import type { ArtisanPatch } from "@krado/shared";
import type { z } from "zod";
import type {
  AdminArtisan,
  AdminOverview,
  Artisan,
  BookingRow,
  DashboardPayload,
  LookupResult,
  ManualClaim,
  NudgeRow,
  OnboardPayload,
  OnboardResult,
  ReconRow,
  Service,
} from "./types";

const TOKEN_KEY = "krado_token";
const ADMIN_TOKEN_KEY = "krado_admin_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API ${status}`);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (typeof init.body === "string") headers.set("content-type", "application/json");
  const token = getToken();
  if (token) headers.set("authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }
  return (await res.json()) as T;
}

export const api = {
  login: (phone: string, pin: string) =>
    request<{ token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, pin }),
    }),

  me: () => request<{ artisan: Artisan }>("/api/me"),

  onboard: (payload: OnboardPayload) =>
    request<OnboardResult>("/api/onboard", { method: "POST", body: JSON.stringify(payload) }),

  /**
   * Dashboard is offline-first: when the network fails, fall back to the
   * payload the service worker last cached for GET /api/dashboard.
   */
  dashboard: async (): Promise<DashboardPayload> => {
    try {
      return await request<DashboardPayload>("/api/dashboard");
    } catch (err) {
      if (err instanceof ApiError) throw err; // server answered — not an offline case
      if (typeof caches !== "undefined") {
        const cached = await caches.match("/api/dashboard");
        if (cached) {
          const data = (await cached.json()) as DashboardPayload;
          return { ...data, offline: true };
        }
      }
      throw err;
    }
  },

  bookings: (date: string) =>
    request<{ date: string; bookings: BookingRow[] }>(`/api/bookings?date=${date}`),

  setBookingStatus: (id: string, status: "completed" | "no_show" | "cancelled_by_artisan") =>
    request<{ ok: true; status: string }>(`/api/bookings/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  services: () => request<{ services: Service[] }>("/api/artisan/services"),

  createService: (input: { name: string; price: number; duration_min: number }) =>
    request<{ id: string }>("/api/artisan/services", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateService: (id: string, patch: Partial<{ name: string; price: number; duration_min: number }>) =>
    request<{ ok: true }>(`/api/artisan/services/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteService: (id: string) =>
    request<{ ok: true }>(`/api/artisan/services/${id}`, { method: "DELETE" }),

  uploadServicePhoto: async (id: string, file: File): Promise<{ photo_key: string }> => {
    const headers = new Headers({ "content-type": file.type });
    const token = getToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
    const res = await fetch(`/api/artisan/services/${id}/photo`, {
      method: "PUT",
      headers,
      body: file,
    });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
    return (await res.json()) as { photo_key: string };
  },

  patchArtisan: (patch: z.input<typeof ArtisanPatch>) =>
    request<{ ok: true }>("/api/artisan", { method: "PATCH", body: JSON.stringify(patch) }),

  telegramLink: () => request<{ telegram_link: string }>("/api/artisan/telegram-link", { method: "POST" }),

  nudges: () => request<{ nudges: NudgeRow[] }>("/api/nudges"),

  nudgeAction: (id: string, action: "send" | "dismiss") =>
    request<{ ok: true }>(`/api/nudges/${id}/action`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  manualClaims: () => request<{ claims: ManualClaim[] }>("/api/manual-claims"),

  confirmClaim: (id: string) =>
    request<{ ok: true }>(`/api/manual-claims/${id}/confirm`, { method: "POST" }),

  rejectClaim: (id: string) =>
    request<{ ok: true }>(`/api/manual-claims/${id}/reject`, { method: "POST" }),
};

/** Admin requests carry the separate operator token, never the artisan one. */
async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (typeof init.body === "string") headers.set("content-type", "application/json");
  const token = getAdminToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return (await res.json()) as T;
}

export const adminApi = {
  login: (passcode: string) =>
    adminRequest<{ token: string }>("/api/admin/login", { method: "POST", body: JSON.stringify({ passcode }) }),
  overview: () => adminRequest<AdminOverview>("/api/admin/overview"),
  artisans: () => adminRequest<{ artisans: AdminArtisan[] }>("/api/admin/artisans"),
  setArtisanStatus: (id: string, status: "active" | "paused") =>
    adminRequest<{ ok: true }>(`/api/admin/artisans/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  recon: () => adminRequest<{ recon: ReconRow[] }>("/api/admin/recon"),
  resolveRecon: (id: string) =>
    adminRequest<{ ok: true }>(`/api/admin/recon/${id}/resolve`, { method: "POST" }),
  lookup: (q: string) => adminRequest<LookupResult>(`/api/admin/lookup?q=${encodeURIComponent(q)}`),
};
