import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CallHistory } from "./calls/CallHistory";

const resolvedCall = {
  id: "11111111-1111-4111-8111-111111111111",
  callerReference: "Demo Caller 001",
  category: "OPENING_HOURS",
  outcome: "AI_RESOLVED",
  startedAt: "2026-09-26T10:00:00.000Z",
  endedAt: "2026-09-26T10:02:00.000Z",
  createdAt: "2026-09-26T10:00:01.000Z",
};

const apiResponse = (calls: unknown[]) => ({ ok: true, json: async () => ({ calls }) });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("loads Call History from the API and distinguishes resolved and pending calls", async () => {
  const fetchMock = vi.fn().mockResolvedValue(apiResponse([
    resolvedCall,
    { ...resolvedCall, id: "22222222-2222-4222-8222-222222222222", callerReference: null, category: null, outcome: null, endedAt: null },
    { ...resolvedCall, id: "33333333-3333-4333-8333-333333333333", category: "DELIVERY_ISSUE", outcome: "HUMAN_ACTION_REQUIRED" },
  ]));
  vi.stubGlobal("fetch", fetchMock);

  render(<CallHistory />);
  expect(screen.getByText("Loading calls…")).toBeInTheDocument();
  expect(await screen.findByText("AI resolved")).toBeInTheDocument();
  expect(screen.getByText("Outcome pending")).toBeInTheDocument();
  expect(screen.getByText("Follow-up required")).toBeInTheDocument();
  expect(screen.getByText("Unknown caller")).toBeInTheDocument();
  expect(screen.getByText("Opening hours")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith("/api/calls", expect.any(Object));
});

it("shows an empty state when no calls are persisted", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([])));
  render(<CallHistory />);
  expect(await screen.findByText("No calls have been recorded yet.")).toBeInTheDocument();
});

it("offers a working retry when the API request fails", async () => {
  const fetchMock = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(apiResponse([resolvedCall]));
  vi.stubGlobal("fetch", fetchMock);
  render(<CallHistory />);

  expect(await screen.findByRole("alert")).toHaveTextContent("Call History could not be loaded");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("AI resolved")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("rejects a malformed API response instead of displaying it as a call", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([{ ...resolvedCall, outcome: "UNKNOWN" }])));
  render(<CallHistory />);
  expect(await screen.findByRole("alert")).toBeInTheDocument();
});
