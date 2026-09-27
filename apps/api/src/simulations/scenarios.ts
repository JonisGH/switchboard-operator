import type { CallOutcome, SimulationScenarioKey, StructuredSuggestion } from "@switchboard/shared";

type CallerResponse = "CONFIRMED_ANSWERED" | "ASKED_FOR_HUMAN" | "ACCEPTED_TRANSFER" | "UNCLEAR";

type Scenario = {
  callerReference: string;
  category: string | null;
  transcript: string;
  callerResponse: CallerResponse;
  suggestion: StructuredSuggestion;
};

// Fictional fixtures only. The caller's response, not the mock AI's opinion, determines the outcome.
export const scenarios: Record<SimulationScenarioKey, Scenario> = {
  OPENING_HOURS_V1: {
    callerReference: "Demo Caller (hours)", category: "OPENING_HOURS",
    transcript: "Caller: What time do you close today?\nAssistant: This fictional office closes at 5 PM today. Did that answer your question, or would you like someone to contact you?\nCaller: Yes, that answers my question. Thank you.",
    callerResponse: "CONFIRMED_ANSWERED",
    suggestion: {
      schemaVersion: 1, suggestedTitle: "Opening-hours question", suggestedCategory: "OPENING_HOURS",
      summary: "The caller asked for today's closing time and confirmed the answer was sufficient.",
      callerRequest: "Find out when the fictional office closes today.", clarificationQuestions: [],
    },
  },
  DELIVERY_ISSUE_V1: {
    callerReference: "Demo Caller (delivery)", category: "DELIVERY_ISSUE",
    transcript: "Caller: My fictional delivery hasn't arrived.\nAssistant: I can record that for the team. Would you like someone to investigate and contact you?\nCaller: Yes, please have someone look into it.",
    callerResponse: "ASKED_FOR_HUMAN",
    suggestion: {
      schemaVersion: 1, suggestedTitle: "Follow up on missing delivery", suggestedCategory: "DELIVERY_ISSUE",
      summary: "The caller reports a missing fictional delivery and requests human follow-up.",
      callerRequest: "Investigate the fictional delivery and contact the caller.",
      clarificationQuestions: ["Confirm the fictional order reference with the caller."],
    },
  },
  TRANSFER_REQUEST_V1: {
    callerReference: "Demo Caller (transfer)", category: "CALLBACK_REQUEST",
    transcript: "Caller: Could you connect me to the office?\nAssistant: I can transfer you now.\nCaller: Yes, please transfer me.",
    callerResponse: "ACCEPTED_TRANSFER",
    suggestion: {
      schemaVersion: 1, suggestedTitle: "Requested transfer", suggestedCategory: "CALLBACK_REQUEST",
      summary: "The caller requested and accepted a simulated transfer to the office.",
      callerRequest: "Speak with an operator.", clarificationQuestions: [],
    },
  },
  UNCLEAR_ENDING_V1: {
    callerReference: "Demo Caller (unclear)", category: null,
    transcript: "Caller: I have a question about a service.\nAssistant: Could you tell me which service?\nCaller: [Call ends before the request is clarified.]",
    callerResponse: "UNCLEAR",
    suggestion: {
      schemaVersion: 1, suggestedTitle: "Unclear service inquiry", suggestedCategory: null,
      summary: "The call ended before the caller clarified the request; no resolution was confirmed.",
      callerRequest: "Ask about an unspecified service.", clarificationQuestions: ["Which service did the caller mean?"],
    },
  },
};

export function outcomeFromCallerResponse(response: CallerResponse): CallOutcome {
  switch (response) {
    case "CONFIRMED_ANSWERED": return "AI_RESOLVED";
    case "ASKED_FOR_HUMAN": return "HUMAN_ACTION_REQUIRED";
    case "ACCEPTED_TRANSFER": return "TRANSFERRED";
    case "UNCLEAR": return "INCOMPLETE";
  }
}
