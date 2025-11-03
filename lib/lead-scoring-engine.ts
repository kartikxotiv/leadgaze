import { getLeadById } from "./data/leads";
import { getLeadScoreByLeadId, upsertLeadScore } from "./data/lead-scores";
import { getScoringRulesByOrganization } from "./data/scoring-rules";
import { getActivitiesByRelated } from "./data/activities";
import type { Lead, LeadScore, ScoringRule, Activity } from "./types/database";

export interface ScoreBreakdown {
  ruleId: string;
  ruleName: string;
  points: number;
  reason: string;
}

export interface LeadScoreResult {
  leadId: string;
  totalScore: number;
  tier: "cold" | "warm" | "hot" | "burning";
  breakdown: ScoreBreakdown[];
  previousScore?: number;
  scoreChange?: number;
}

export class LeadScoringEngine {
 
  private static readonly TIER_THRESHOLDS = {
    cold: { min: -100, max: 19 },
    warm: { min: 20, max: 49 },
    hot: { min: 50, max: 79 },
    burning: { min: 80, max: 100 },
  };

 
  private static readonly DEFAULT_RULES = [
    {
      ruleName: "Responded to Outreach",
      ruleType: "activity_response",
      condition: {
        activityType: ["call", "email"],
        outcome: ["positive", "connected"],
      },
      points: 15,
      description: "Lead responded positively to call or email outreach",
    },
    {
      ruleName: "Email Engagement",
      ruleType: "email_interaction",
      condition: { activityType: "email", outcome: ["opened", "clicked"] },
      points: 8,
      description: "Lead opened email or clicked links",
    },
    {
      ruleName: "Quotation Request",
      ruleType: "quotation_request",
      condition: {
        activityType: ["call", "email"],
        outcome: ["quotation_requested"],
      },
      points: 25,
      description: "Lead specifically asked for quotation or pricing",
    },
    {
      ruleName: "No Response Penalty",
      ruleType: "no_response_penalty",
      condition: { daysSinceLastActivity: 10, noPositiveResponse: true },
      points: -8,
      description: "No response for 10+ days",
    },
    {
      ruleName: "ICP Industry Match",
      ruleType: "icp_match",
      condition: {
        field: "industry",
        values: ["technology", "software", "saas", "fintech"],
      },
      points: 12,
      description: "Company is in ideal customer profile industry",
    },
    {
      ruleName: "Decision Maker Title",
      ruleType: "job_title_match",
      condition: {
        field: "jobTitle",
        values: ["ceo", "cto", "founder", "director", "vp", "head"],
      },
      points: 10,
      description: "Contact appears to be a decision maker",
    },
    {
      ruleName: "Quality Lead Source",
      ruleType: "lead_source",
      condition: {
        field: "source",
        values: ["referral", "inbound", "demo_request"],
      },
      points: 15,
      description: "Lead came from high-quality source",
    },
    {
      ruleName: "Enterprise Company Size",
      ruleType: "company_size",
      condition: { field: "companySize", operator: ">=", value: 100 },
      points: 8,
      description: "Company has 100+ employees",
    },
  ];

  
  static async calculateLeadScore(
    leadId: string,
    organizationId: string
  ): Promise<LeadScoreResult> {
    try {
      // Get lead
      const lead = await getLeadById(leadId);
      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      // Get activities for this lead
      const activities = await getActivitiesByRelated("lead", leadId);

      // Get scoring rules
      const rules = await getScoringRulesByOrganization(organizationId, true);

      // Get previous score
      const previousScore = await getLeadScoreByLeadId(leadId);

      // Calculate score
      const breakdown: ScoreBreakdown[] = [];
      let totalScore = 0;

      for (const rule of rules) {
        const result = await this.evaluateRule(rule, lead, activities);
        if (result.applies) {
          breakdown.push({
            ruleId: rule.rule_id,
            ruleName: rule.rule_name,
            points: result.points,
            reason: result.reason,
          });
          totalScore += result.points;
        }
      }

      // Clamp score between -100 and 100
      totalScore = Math.max(-100, Math.min(100, totalScore));

      // Calculate tier
      const tier = this.calculateTier(totalScore);

      const result: LeadScoreResult = {
        leadId,
        totalScore,
        tier,
        breakdown,
        previousScore: previousScore?.total_score,
        scoreChange: previousScore
          ? totalScore - previousScore.total_score
          : undefined,
      };

      // Save score
      await this.saveScore(result, lead.created_by, organizationId);

      return result;
    } catch (error) {
      console.error("Error calculating lead score:", error);
      throw error;
    }
  }

  
  static async calculateBatchScores(
    leadIds: string[],
    organizationId: string
  ): Promise<LeadScoreResult[]> {
    const results: LeadScoreResult[] = [];

    for (const leadId of leadIds) {
      try {
        const result = await this.calculateLeadScore(leadId, organizationId);
        results.push(result);
      } catch (error) {
        console.error(`Error calculating score for lead ${leadId}:`, error);
      }
    }

    return results;
  }

  
  static async initializeDefaultRules(
    organizationId: string,
    createdBy: string
  ): Promise<void> {
    const { createScoringRule } = await import("./data/scoring-rules");
    
    for (const [index, rule] of this.DEFAULT_RULES.entries()) {
      await createScoringRule({
        organization_id: organizationId,
        rule_name: rule.ruleName,
        rule_type: rule.ruleType,
        condition: rule.condition,
        points: rule.points,
        description: rule.description,
        priority: index + 1,
        is_active: true,
        created_by: createdBy,
      });
    }
  }

  
  private static async evaluateRule(
    rule: ScoringRule,
    lead: Lead,
    activities: Activity[]
  ): Promise<{ applies: boolean; points: number; reason: string }> {
    const condition = rule.condition as any;
    const ruleType = rule.rule_type;

    switch (ruleType) {
      case "activity_response":
        return this.evaluateActivityResponse(condition, activities);

      case "email_interaction":
        return this.evaluateEmailInteraction(condition, activities);

      case "quotation_request":
        return this.evaluateQuotationRequest(condition, activities);

      case "no_response_penalty":
        return this.evaluateNoResponsePenalty(condition, activities);

      case "icp_match":
      case "job_title_match":
      case "lead_source":
      case "company_size":
        return this.evaluateFieldMatch(condition, lead);

      default:
        return { applies: false, points: 0, reason: "Unknown rule type" };
    }
  }

  private static evaluateActivityResponse(
    condition: any,
    activities: Activity[]
  ): { applies: boolean; points: number; reason: string } {
    const relevantActivities = activities.filter((activity) =>
      condition.activityType.includes(activity.activity_type)
    );

    const positiveResponses = relevantActivities.filter(
      (activity) =>
        activity.outcome &&
        condition.outcome.some((outcome: string) =>
          activity.outcome.toLowerCase().includes(outcome.toLowerCase())
        )
    );

    if (positiveResponses.length > 0) {
      return {
        applies: true,
        points: 15,
        reason: `Positive response in ${positiveResponses[0].activity_type}`,
      };
    }

    return { applies: false, points: 0, reason: "No positive responses" };
  }

  private static evaluateEmailInteraction(
    condition: any,
    activities: Activity[]
  ): { applies: boolean; points: number; reason: string } {
    const emailActivities = activities.filter(
      (activity) => activity.activity_type === "email"
    );

    const engagements = emailActivities.filter(
      (activity) =>
        activity.outcome &&
        ["opened", "clicked", "replied"].some((engagement) =>
          activity.outcome?.toLowerCase().includes(engagement)
        )
    );

    if (engagements.length > 0) {
      return {
        applies: true,
        points: 8,
        reason: "Engaged with email communications",
      };
    }

    return { applies: false, points: 0, reason: "No email engagement" };
  }

  private static evaluateQuotationRequest(
    condition: any,
    activities: Activity[]
  ): { applies: boolean; points: number; reason: string } {
    const quotationRequests = activities.filter(
      (activity) =>
        activity.outcome && activity.outcome.toLowerCase().includes("quotation")
    );

    if (quotationRequests.length > 0) {
      return {
        applies: true,
        points: 25,
        reason: "Requested quotation or pricing information",
      };
    }

    return { applies: false, points: 0, reason: "No quotation requests" };
  }

  private static evaluateNoResponsePenalty(
    condition: any,
    activities: Activity[]
  ): { applies: boolean; points: number; reason: string } {
    if (activities.length === 0) {
      return { applies: false, points: 0, reason: "No activities to evaluate" };
    }

    // Sort by created_at descending
    const sortedActivities = [...activities].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const lastActivity = sortedActivities[0];
    
    const daysSinceLastActivity = Math.floor(
      (Date.now() - new Date(lastActivity.created_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const hasPositiveResponse = activities.some(
      (activity) =>
        activity.outcome &&
        ["positive", "connected", "interested"].some((positive) =>
          activity.outcome?.toLowerCase().includes(positive)
        )
    );

    if (
      daysSinceLastActivity >= condition.daysSinceLastActivity &&
      !hasPositiveResponse
    ) {
      return {
        applies: true,
        points: -8,
        reason: `No positive response for ${daysSinceLastActivity} days`,
      };
    }

    return {
      applies: false,
      points: 0,
      reason: "Recent activity or positive response exists",
    };
  }

  private static evaluateFieldMatch(
    condition: any,
    lead: Lead
  ): { applies: boolean; points: number; reason: string } {
    const field = condition.field;
    // Map camelCase fields to snake_case database fields
    const fieldMap: Record<string, keyof Lead> = {
      industry: "industry_id",
      jobTitle: "job_title",
      source: "source_id",
      companySize: "company_size_id",
    };
    
    const dbField = fieldMap[field] || field as keyof Lead;
    let leadValue = lead[dbField] as any;

    // If it's an ID field, we might need to get the actual value from config
    // For now, we'll work with the ID or value directly
    if (typeof leadValue === "string" && leadValue.length === 36) {
      // Likely a UUID, we'll skip field matching for ID fields for now
      // This would need config lookup if we want to match on values
      return { applies: false, points: 0, reason: `Field ${field} is an ID, needs config lookup` };
    }

    if (!leadValue) {
      return { applies: false, points: 0, reason: `No ${field} data` };
    }

    const leadValueStr = String(leadValue).toLowerCase();

    if (condition.values) {
      const matches = condition.values.some((targetValue: string) =>
        leadValueStr.includes(targetValue.toLowerCase())
      );

      if (matches) {
        return {
          applies: true,
          points: 10,
          reason: `${field} matches ideal profile`,
        };
      }
    }

    if (condition.operator && condition.value) {
      const numericValue = parseInt(leadValueStr);
      if (!isNaN(numericValue)) {
        switch (condition.operator) {
          case ">=":
            if (numericValue >= condition.value) {
              return {
                applies: true,
                points: 8,
                reason: `${field} meets minimum threshold`,
              };
            }
            break;
          case "<=":
            if (numericValue <= condition.value) {
              return {
                applies: true,
                points: 8,
                reason: `${field} within target range`,
              };
            }
            break;
        }
      }
    }

    return {
      applies: false,
      points: 0,
      reason: `${field} doesn't match criteria`,
    };
  }

  private static calculateTier(
    score: number
  ): "cold" | "warm" | "hot" | "burning" {
    if (score >= this.TIER_THRESHOLDS.burning.min) return "burning";
    if (score >= this.TIER_THRESHOLDS.hot.min) return "hot";
    if (score >= this.TIER_THRESHOLDS.warm.min) return "warm";
    return "cold";
  }

  private static async saveScore(
    result: LeadScoreResult,
    userId: string,
    organizationId: string
  ): Promise<void> {
    await upsertLeadScore({
      lead_id: result.leadId,
      total_score: result.totalScore,
      tier: result.tier,
      last_calculated: new Date().toISOString(),
      score_breakdown: result.breakdown as any,
      user_id: userId,
      organization_id: organizationId,
    });
  }
}
