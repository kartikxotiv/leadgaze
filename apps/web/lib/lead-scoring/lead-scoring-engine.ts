/**
 * Lead Scoring Engine
 *
 * Total Lead Score = Fit Score (0–60) + Engagement Score (0–40)
 * Max Score = 100
 */

export interface LeadScoringData {
  first_name: string;
  last_name?: string;
  company_name?: string;
  industry_id?: string;
  company_size?: string;
  location?: string;
  timezone?: string;
  job_title?: string;
  contacted_count?: number;
  source_id?: string;
  status_key?: string;
  status_name?: string;
  custom_fields?: Record<string, any>;
}

export interface ScoringResult {
  totalScore: number;
  fitScore: number;
  engagementScore: number;
  breakdown: {
    fit: Record<string, number>;
    engagement: Record<string, number>;
    adjustments: Record<string, number>;
  };
}

function getWorthliftScoreOverride(
  customFields: Record<string, any> | undefined,
): number | null {
  if (customFields?.lead_score_source !== 'worthlift') return null;

  const score = customFields.lead_score_override;
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;

  return Math.max(0, Math.min(Math.round(score), 100));
}

export const calculateLeadScore = (data: LeadScoringData): ScoringResult => {
  const worthliftScore = getWorthliftScoreOverride(data.custom_fields);

  if (worthliftScore !== null) {
    return {
      totalScore: worthliftScore,
      fitScore: 0,
      engagementScore: 0,
      breakdown: {
        fit: {},
        engagement: {},
        adjustments: { 'Worthlift Audit Score': worthliftScore },
      },
    };
  }

  let fitScore = 0;
  let engagementScore = 0;
  const breakdown = {
    fit: {} as Record<string, number>,
    engagement: {} as Record<string, number>,
    adjustments: {} as Record<string, number>,
  };

  // --- 1. Fit Score (Max 60) ---

  // A. Company / Lead Profile (Max 35)

  // Industry Match: Target industry (Tech, Healthcare, Retail, SaaS, etc.) +10
  const targetIndustries = [
    'tech',
    'healthcare',
    'retail',
    'saas',
    'software',
    'technology',
  ];
  // Note: Check against industry name if possible, or industry_id
  if (data.industry_id || data.custom_fields?.industry_name) {
    const industryName = (
      data.custom_fields?.industry_name || ''
    ).toLowerCase();
    if (
      targetIndustries.some((ti) => industryName.includes(ti)) ||
      data.industry_id
    ) {
      const score = 10;
      fitScore += score;
      breakdown.fit['Industry Match'] = score;
    }
  }

  // Company Size: 11–50 / 51–200 / 200+ employees (+5 / +8 / +10)
  if (data.company_size) {
    let score = 0;
    const size = data.company_size.toLowerCase();
    if (size === 'small' || size.includes('11-50')) score = 5;
    else if (size === 'medium' || size.includes('51-200')) score = 8;
    else if (['large', 'enterprise'].includes(size) || size.includes('200+'))
      score = 10;

    if (score > 0) {
      fitScore += score;
      breakdown.fit['Company Size'] = score;
    }
  }

  // Geography: Target market (US, UAE, Europe) +5
  const targetMarkets = [
    'us',
    'usa',
    'uae',
    'europe',
    'united states',
    'united arab emirates',
  ];
  const location = (data.location?.toLowerCase() || '').trim();
  const timezone = (data.timezone?.toLowerCase() || '').trim();

  const hasGeographyMatch = targetMarkets.some((m) => {
    if (m.length <= 3) {
      const regex = new RegExp(`\\b${m}\\b`, 'i');
      return regex.test(location) || regex.test(timezone);
    }
    return location.includes(m) || timezone.includes(m);
  });

  if (hasGeographyMatch) {
    const score = 5;
    fitScore += score;
    breakdown.fit['Geography'] = score;
  }

  // Decision Maker: Founder / C-level / VP +5
  const decisionMakerTitles = [
    'founder',
    'ceo',
    'cto',
    'cfo',
    'coo',
    'v-p',
    'vp',
    'vice president',
    'c-level',
  ];
  const jobTitle = data.job_title?.toLowerCase() || '';
  if (
    decisionMakerTitles.some((t) => {
      if (t === 'vp') {
        return /\bvp\b/i.test(jobTitle);
      }
      return jobTitle.includes(t);
    })
  ) {
    const score = 5;
    fitScore += score;
    breakdown.fit['Decision Maker'] = score;
  }

  // B. Budget & Need (Max 25)
  // Using custom_fields for these since they aren't standard lead fields yet

  // Budget Provided: Yes +10
  if (data.custom_fields?.budget_provided) {
    const score = 10;
    fitScore += score;
    breakdown.fit['Budget Provided'] = score;
  }

  // Budget Range: Matches service pricing +5
  if (data.custom_fields?.budget_match) {
    const score = 5;
    fitScore += score;
    breakdown.fit['Budget Range'] = score;
  }

  // Timeline: Immediate / 1–3 months +10
  if (
    ['immediate', '1-3 months'].includes(
      data.custom_fields?.timeline?.toLowerCase(),
    )
  ) {
    const score = 10;
    fitScore += score;
    breakdown.fit['Timeline'] = score;
  }

  // Clear Requirement: Detailed use case shared +5
  if (data.custom_fields?.has_detailed_use_case) {
    const score = 5;
    fitScore += score;
    breakdown.fit['Clear Requirement'] = score;
  }

  // Cap Fit Score at 60
  fitScore = Math.min(fitScore, 60);

  // --- 2. Engagement Score (Max 40) ---

  // A. Interaction Level (Max 25)

  // Lead Contacted (Lead Source Selected) +5
  // The user's manual refers to this as "Lead Contacted", but in the UI it's the "Lead Source" field.
  // We award 5 points if ANY lead source is selected.
  if (data.source_id) {
    const score = 5;
    engagementScore += score;
    breakdown.engagement['Lead Source Selected'] = score;
  }

  // Also keep the original contacted_count check if they want to track actual activity too,
  // but based on the request "if any lead source is selected give 5 points", we prioritize that.
  if ((data.contacted_count || 0) > 0) {
    const score = 5;
    engagementScore += score;
    breakdown.engagement['Interaction (Calls/Emails)'] = score;
  }

  // Replied to message +10
  if (data.custom_fields?.replied) {
    const score = 10;
    engagementScore += score;
    breakdown.engagement['Replied to message'] = score;
  }

  // Attended call/demo +15
  if (data.custom_fields?.attended_demo) {
    const score = 15;
    engagementScore += score;
    breakdown.engagement['Attended call/demo'] = score;
  }

  // Follow-up response +5
  if (data.custom_fields?.follow_up_response) {
    const score = 5;
    engagementScore += score;
    breakdown.engagement['Follow-up response'] = score;
  }

  // Shared documents / scope +10
  if (data.custom_fields?.shared_scope) {
    const score = 10;
    engagementScore += score;
    breakdown.engagement['Shared documents'] = score;
  }

  // B. Digital Engagement (Optional, Max 15)
  let digitalScore = 0;
  if (data.custom_fields?.visited_website) digitalScore += 5;
  if (data.custom_fields?.downloaded_content) digitalScore += 5;
  if ((data.custom_fields?.email_opens || 0) >= 3) digitalScore += 5;

  digitalScore = Math.min(digitalScore, 15);
  engagementScore += digitalScore;
  if (digitalScore > 0) {
    breakdown.engagement['Digital Engagement'] = digitalScore;
  }

  // Cap Engagement Score at 40
  engagementScore = Math.min(engagementScore, 40);

  // --- 3. Status-Based Score Adjustment ---

  let totalScore = fitScore + engagementScore;
  let statusAdjustment = 0;
  let statusKey = data.status_key?.toLowerCase();

  // Fallback to name if key is missing
  if (!statusKey && data.status_name) {
    const name = data.status_name.toLowerCase();
    if (name.includes('unqualified')) statusKey = 'unqualified';
    else if (name.includes('qualified')) statusKey = 'qualified';
    else if (name.includes('contacted')) statusKey = 'contacted';
    else if (name.includes('nurturing')) statusKey = 'nurturing';
  }

  // Contacted +5
  if (statusKey === 'contacted') {
    statusAdjustment = 5;
  }
  // Nurturing +10
  else if (statusKey === 'nurturing') {
    statusAdjustment = 10;
  }

  totalScore += statusAdjustment;
  if (statusAdjustment > 0) {
    breakdown.adjustments['Status Bonus'] = statusAdjustment;
  }

  // Qualified Force score to ≥70
  if (statusKey === 'qualified') {
    if (totalScore < 70) {
      const adjustment = 70 - totalScore;
      totalScore = 70;
      breakdown.adjustments['Qualified Minimum'] = adjustment;
    }
  }

  // Unqualified Force score = 0
  if (statusKey === 'unqualified') {
    totalScore = 0;
    breakdown.adjustments['Unqualified Reset'] = -100; // Visual indicator for reset
  }

  // Final Cap
  totalScore = Math.max(0, Math.min(totalScore, 100));

  return {
    totalScore: Math.round(totalScore),
    fitScore,
    engagementScore,
    breakdown,
  };
};
