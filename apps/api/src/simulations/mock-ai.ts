import type { SimulationScenarioKey } from "@switchboard/shared";
import { scenarios } from "./scenarios.js";

export interface AIProvider {
  summarize(input: { transcript: string; scenarioKey: SimulationScenarioKey }): Promise<unknown>;
}

export const mockAIProvider: AIProvider = {
  async summarize({ scenarioKey }) {
    return scenarios[scenarioKey].suggestion;
  },
};
