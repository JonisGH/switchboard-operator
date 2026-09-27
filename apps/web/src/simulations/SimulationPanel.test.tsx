import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SimulationPanel } from "./SimulationPanel";

const callId = "11111111-1111-4111-8111-111111111111";
const result = {
  call: {
    id: callId, callerReference: "Demo Caller (hours)", category: "OPENING_HOURS",
    outcome: "AI_RESOLVED", startedAt: "2026-09-27T10:00:00.000Z",
    endedAt: "2026-09-27T10:01:00.000Z", createdAt: "2026-09-27T10:00:00.000Z",
    simulationScenarioKey: "OPENING_HOURS_V1",
    transcript: "Caller: When do you close?\nCaller: Yes, that answers my question.",
    aiSuggestion: {
      schemaVersion: 1, suggestedTitle: "Opening-hours question", suggestedCategory: "OPENING_HOURS",
      summary: "Caller confirmed the answer was sufficient.", callerRequest: "Find closing time.",
      clarificationQuestions: [],
    },
  },
  workOrder: null,
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("sends a backend scenario and displays its recorded result, not a frontend-generated outcome", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => result });
  vi.stubGlobal("fetch", fetchMock);
  const onCompleted = vi.fn();
  render(<SimulationPanel onCompleted={onCompleted} />);

  fireEvent.click(screen.getByRole("button", { name: "Simulate call" }));
  expect(screen.getByText("Processing fictional call…")).toBeInTheDocument();
  expect(await screen.findByText("No WorkOrder created")).toBeInTheDocument();
  expect(screen.getByText("AI resolved")).toBeInTheDocument();
  expect(screen.getByText(/Caller: When do you close/)).toBeInTheDocument();
  expect(onCompleted).toHaveBeenCalledOnce();
  const [url, request] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/simulated-calls");
  expect(request.method).toBe("POST");
  expect(JSON.parse(request.body)).toMatchObject({ scenarioKey: "OPENING_HOURS_V1" });
});

it("retries with the same Call ID after a failed request", async () => {
  const fetchMock = vi.fn().mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ ok: true, json: async () => result });
  vi.stubGlobal("fetch", fetchMock);
  render(<SimulationPanel onCompleted={() => {}} />);

  fireEvent.click(screen.getByRole("button", { name: "Simulate call" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Retry the same Call ID");
  fireEvent.click(screen.getByRole("button", { name: "Retry simulation" }));
  expect(await screen.findByText("No WorkOrder created")).toBeInTheDocument();
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(JSON.parse(fetchMock.mock.calls[1][1].body));
});

it("uses the selected scenario and shows a WorkOrder only when the API returns one", async () => {
  const followUp = {
    call: { ...result.call, outcome: "HUMAN_ACTION_REQUIRED", simulationScenarioKey: "DELIVERY_ISSUE_V1" },
    workOrder: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", callId,
      title: "Follow up on delivery", description: "Investigate delivery", status: "OPEN",
      createdAt: "2026-09-27T10:02:00.000Z" },
  };
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => followUp });
  vi.stubGlobal("fetch", fetchMock);
  render(<SimulationPanel onCompleted={() => {}} />);

  fireEvent.change(screen.getByLabelText("Scenario"), { target: { value: "DELIVERY_ISSUE_V1" } });
  fireEvent.click(screen.getByRole("button", { name: "Simulate call" }));
  expect(await screen.findByText("WorkOrder created: Follow up on delivery")).toBeInTheDocument();
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).scenarioKey).toBe("DELIVERY_ISSUE_V1");
});

it("rejects an invalid structured suggestion rather than displaying it", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    ...result, call: { ...result.call, aiSuggestion: { schemaVersion: 2 } },
  }) }));
  render(<SimulationPanel onCompleted={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Simulate call" }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();
});
