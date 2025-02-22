import request, { CliRequestOptions } from "../request";
import { odata } from "./odata";
import { PlannerPlan } from "@microsoft/microsoft-graph-types";

const graphResource = 'https://graph.microsoft.com';

const getRequestOptions = (url: string, metadata: 'none' | 'minimal' | 'full'): CliRequestOptions => ({
  url: url,
  headers: {
    accept: `application/json;odata.metadata=${metadata}`
  },
  responseType: 'json'
});

export const planner = {
  /**
   * Get Planner plan by ID.
   * @param id Planner ID.
   * @param metadata OData metadata level. Default is none
   */
  async getPlanById(id: string, metadata: 'none' | 'minimal' | 'full' = 'none'): Promise<PlannerPlan> {
    const requestOptions = getRequestOptions(`${graphResource}/v1.0/planner/plans/${id}`, metadata);

    try {
      return await request.get<PlannerPlan>(requestOptions);
    }
    catch (ex) {
      throw Error(`Planner plan with id '${id}' was not found.`);
    }
  },

  /**
   * Get all Planner plans for a specific group.
   * @param groupId Group ID.
   */
  getPlansByGroupId(groupId: string, metadata: 'none' | 'minimal' | 'full' = 'none'): Promise<PlannerPlan[]> {
    return odata.getAllItems<PlannerPlan>(`${graphResource}/v1.0/groups/${groupId}/planner/plans`, metadata);
  },

  /**
   * Get the Planner plan for a specific Roster.
   * @param rosterId Roster ID.
   */
  async getPlanByRosterId(rosterId: string, metadata: 'none' | 'minimal' | 'full' = 'none'): Promise<PlannerPlan> {
    const plans = await odata.getAllItems<PlannerPlan>(`${graphResource}/beta/planner/rosters/${rosterId}/plans`, metadata);
    return plans[0];
  },

  /**
   * Get Planner plan by title in a specific group. 
   * @param title Title of the Planner plan. Case insensitive.
   * @param groupId Owner group ID.
   * @param rosterId Roster ID.
   */
  async getPlanByTitle(title: string, groupId?: string, metadata: 'none' | 'minimal' | 'full' = 'none'): Promise<PlannerPlan> {
    let plans: PlannerPlan[] = [];
    if (groupId) {
      plans = await this.getPlansByGroupId(groupId, metadata);
    }
    const filteredPlans = plans.filter(p => p.title && p.title.toLowerCase() === title.toLowerCase());

    if (!filteredPlans.length) {
      throw Error(`The specified plan '${title}' does not exist.`);
    }

    if (filteredPlans.length > 1) {
      throw Error(`Multiple plans with title '${title}' found: ${filteredPlans.map(x => x.id)}.`);
    }

    return filteredPlans[0];
  }
};