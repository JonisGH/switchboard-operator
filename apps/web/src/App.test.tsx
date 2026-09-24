import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { App } from "./App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows the backend connection only after a valid health response", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "ok" }) });
  vi.stubGlobal("fetch", fetchMock);
  render(<App />);
  expect(await screen.findByText("API: Connected")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith("/api/health", expect.any(Object));
});

it("does not report connected when the response violates the contract", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "down" }) }));
  render(<App />);
  expect(await screen.findByText(/API: Unavailable/)).toBeInTheDocument();
});
