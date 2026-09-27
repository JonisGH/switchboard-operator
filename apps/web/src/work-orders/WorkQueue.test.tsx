import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WorkQueue } from "./WorkQueue";

const activeWorkOrder = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  callId: "22222222-2222-4222-8222-222222222222",
  title: "Follow up on missing delivery",
  description: "Fictional delivery issue",
  status: "OPEN",
  createdAt: "2026-09-27T11:00:00.000Z",
  call: { callerReference: "Demo Caller 002", category: "DELIVERY_ISSUE", startedAt: "2026-09-26T10:00:00.000Z" },
};

const apiResponse = (workOrders: unknown[]) => ({ ok: true, json: async () => ({ workOrders }) });

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("renders active WorkOrders from the API with the originating Call's arrival time", async () => {
  const fetchMock = vi.fn().mockResolvedValue(apiResponse([activeWorkOrder]));
  vi.stubGlobal("fetch", fetchMock);
  render(<WorkQueue />);

  expect(screen.getByText("Loading work orders…")).toBeInTheDocument();
  expect(await screen.findByText("Follow up on missing delivery")).toBeInTheDocument();
  expect(screen.getByText("Delivery issue")).toBeInTheDocument();
  expect(screen.getByText("Open")).toBeInTheDocument();
  expect(screen.getByText("Fictional delivery issue")).toBeInTheDocument();
  expect(screen.getByText("Waiting since")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith("/api/work-orders", expect.any(Object));
});

it("shows a useful empty state", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([])));
  render(<WorkQueue />);
  expect(await screen.findByText("No work orders need action right now.")).toBeInTheDocument();
});

it("retries a failed request and validates the response", async () => {
  const fetchMock = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(apiResponse([activeWorkOrder]));
  vi.stubGlobal("fetch", fetchMock);
  render(<WorkQueue />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Work Queue could not be loaded");
  fireEvent.click(screen.getByRole("button", { name: "Retry Work Queue" }));
  expect(await screen.findByText("Follow up on missing delivery")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("rejects a malformed WorkOrder instead of displaying it", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([{ ...activeWorkOrder, status: "UNKNOWN" }])));
  render(<WorkQueue />);
  expect(await screen.findByRole("alert")).toBeInTheDocument();
});

it("does not silently label a resolved WorkOrder as in progress", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(apiResponse([{ ...activeWorkOrder, status: "RESOLVED" }])));
  render(<WorkQueue />);
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.queryByText("In progress")).not.toBeInTheDocument();
});
