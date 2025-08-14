import { Lead, LeadScore, ScoringRule, Activity } from "@/models";
import { Op } from "sequelize";

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
  // Score tier thresholds
  private static readonly TIER_THRESHOLDS = {
    cold: { min: -100, max: 19 },
    warm: { min: 20, max: 49 },
    hot: { min: 50, max: 79 },
    burning: { min: 80, max: 100 },
  };

  // Default scoring rules
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

  /**
   * Calculate score for a single lead
   */
  static async calculateLeadScore(
    leadId: string,
    organizationId: string
  ): Promise<LeadScoreResult> {
    try {
      // Get lead with related data
      const lead = await Lead.findByPk(leadId, {
        include: [
          {
            model: Activity,
            as: "activities",
            where: { relatedType: "lead", relatedId: leadId },
            required: false,
            order: [["createdAt", "DESC"]],
          },
        ],
      });

      if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
      }

      // Get active scoring rules for organization
      const rules = await ScoringRule.findAll({
        where: {
          organizationId,
          isActive: true,
        },
        order: [["priority", "ASC"]],
      });

      // Get previous score if exists
      const previousScore = await LeadScore.findOne({
        where: { leadId },
      });

      // Calculate score using rules
      const breakdown: ScoreBreakdown[] = [];
      let totalScore = 0;

      for (const rule of rules) {
        const result = await this.evaluateRule(rule, lead);
        if (result.applies) {
          breakdown.push({
            ruleId: rule.ruleId,
            ruleName: rule.ruleName,
            points: result.points,
            reason: result.reason,
          });
          totalScore += result.points;
        }
      }

      // Ensure score stays within bounds
      totalScore = Math.max(-100, Math.min(100, totalScore));

      // Determine tier
      const tier = this.calculateTier(totalScore);

      const result: LeadScoreResult = {
        leadId,
        totalScore,
        tier,
        breakdown,
        previousScore: previousScore?.totalScore,
        scoreChange: previousScore
          ? totalScore - previousScore.totalScore
          : undefined,
      };

      // Save/update score in database
      await this.saveScore(result, lead.userId, organizationId);

      return result;
    } catch (error) {
      console.error("Error calculating lead score:", error);
      throw error;
    }
  }

  /**
   * Batch calculate scores for multiple leads
   */
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

  /**
   * Initialize default scoring rules for an organization
   */
  static async initializeDefaultRules(
    organizationId: string,
    createdBy: string
  ): Promise<void> {
    for (const [index, rule] of this.DEFAULT_RULES.entries()) {
      await ScoringRule.create({
        ...rule,
        organizationId,
        createdBy,
        priority: index + 1,
        isActive: true,
      });
    }
  }

  /**
   * Evaluate a single rule against a lead
   */
  private static async evaluateRule(
    rule: any,
    lead: any
  ): Promise<{ applies: boolean; points: number; reason: string }> {
    const condition = rule.condition;
    const ruleType = rule.ruleType;

    switch (ruleType) {
      case "activity_response":
        return this.evaluateActivityResponse(condition, lead.activities || []);

      case "email_interaction":
        return this.evaluateEmailInteraction(condition, lead.activities || []);

      case "quotation_request":
        return this.evaluateQuotationRequest(condition, lead.activities || []);

      case "no_response_penalty":
        return this.evaluateNoResponsePenalty(condition, lead.activities || []);

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
    activities: any[]
  ): { applies: boolean; points: number; reason: string } {
    const relevantActivities = activities.filter((activity) =>
      condition.activityType.includes(activity.activityType)
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
        reason: `Positive response in ${positiveResponses[0].activityType}`,
      };
    }

    return { applies: false, points: 0, reason: "No positive responses" };
  }

  private static evaluateEmailInteraction(
    condition: any,
    activities: any[]
  ): { applies: boolean; points: number; reason: string } {
    const emailActivities = activities.filter(
      (activity) => activity.activityType === "email"
    );

    const engagements = emailActivities.filter(
      (activity) =>
        activity.outcome &&
        ["opened", "clicked", "replied"].some((engagement) =>
          activity.outcome.toLowerCase().includes(engagement)
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
    activities: any[]
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
    activities: any[]
  ): { applies: boolean; points: number; reason: string } {
    if (activities.length === 0) {
      return { applies: false, points: 0, reason: "No activities to evaluate" };
    }

    const lastActivity = activities[0]; // Activities are ordered by createdAt DESC
    const daysSinceLastActivity = Math.floor(
      (Date.now() - new Date(lastActivity.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const hasPositiveResponse = activities.some(
      (activity) =>
        activity.outcome &&
        ["positive", "connected", "interested"].some((positive) =>
          activity.outcome.toLowerCase().includes(positive)
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
    lead: any
  ): { applies: boolean; points: number; reason: string } {
    const field = condition.field;
    const leadValue = lead[field];

    if (!leadValue) {
      return { applies: false, points: 0, reason: `No ${field} data` };
    }

    if (condition.values) {
      // Check if lead value matches any of the target values
      const matches = condition.values.some((targetValue: string) =>
        leadValue.toLowerCase().includes(targetValue.toLowerCase())
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
      // Numeric comparison
      const numericValue = parseInt(leadValue);
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
    await LeadScore.upsert({
      leadId: result.leadId,
      totalScore: result.totalScore,
      tier: result.tier,
      lastCalculated: new Date(),
      scoreBreakdown: result.breakdown,
      userId,
      organizationId,
    });
  }
}
