import { CardAgentState } from "../types.js";
import { IAgent } from "./IAgent.js";

export interface IAgentFactory {
    createVolcanoAgent(cardConfig: CardAgentState): Promise<IAgent>;
}
