import { formatFundraisingDate, formatFundraisingDateTime } from '../../utils/formatters';

type Row = Record<string, any>;

const dateFields = [
  'start_date',
  'close_date',
  'last_contact_date',
  'next_followup_date',
  'commitment_date',
  'expected_close_date',
  'received_date',
];

const dateTimeFields = ['created_at', 'updated_at', 'deleted_at'];

function normalizeRows<T>(data: T | T[] | null | undefined) {
  return Array.isArray(data) ? data as Row[] : data ? [data as Row] : [];
}

function displayName(account?: Row) {
  return account?.name || account?.email || null;
}

function fallbackLabel(value: string | null | undefined, fallback = '-') {
  return value || fallback;
}

function rowMap(rows?: Row[] | null) {
  return new Map<string, Row>((rows ?? []).map((row) => [row.id, row]));
}

export async function enrichFundraisingData<T>(supabase: any, workspaceId: string, data: T | T[] | null | undefined): Promise<T | T[] | null | undefined> {
  const rows = normalizeRows(data);
  if (rows.length === 0) return data;

  const accountIds = new Set<string>();
  const investorIds = new Set<string>();
  const roundIds = new Set<string>();
  const stageIds = new Set<string>();
  const dealIds = new Set<string>();

  rows.forEach((row) => {
    ['owner_id', 'created_by', 'updated_by', 'deleted_by'].forEach((key) => row[key] && accountIds.add(row[key]));
    if (row.investor_id) investorIds.add(row.investor_id);
    if (row.round_id) roundIds.add(row.round_id);
    if (row.stage_id) stageIds.add(row.stage_id);
    if (row.deal_id) dealIds.add(row.deal_id);
  });

  const [accountsResult, investorsResult, roundsResult, stagesResult, dealsResult] = await Promise.all([
    accountIds.size ? supabase.from('accounts').select('id, name, email').in('id', Array.from(accountIds)) : Promise.resolve({ data: [] }),
    investorIds.size ? supabase.schema('fundraising').from('investors').select('id, name, investor_type').eq('workspace_id', workspaceId).in('id', Array.from(investorIds)) : Promise.resolve({ data: [] }),
    roundIds.size ? supabase.schema('fundraising').from('rounds').select('id, round_name').eq('workspace_id', workspaceId).in('id', Array.from(roundIds)) : Promise.resolve({ data: [] }),
    stageIds.size ? supabase.schema('fundraising').from('pipeline_stages').select('id, name').eq('workspace_id', workspaceId).in('id', Array.from(stageIds)) : Promise.resolve({ data: [] }),
    dealIds.size ? supabase.schema('fundraising').from('deals').select('id, investor_id, round_id, status').eq('workspace_id', workspaceId).in('id', Array.from(dealIds)) : Promise.resolve({ data: [] }),
  ]);

  const accounts = rowMap(accountsResult.data);
  const investors = rowMap(investorsResult.data);
  const rounds = rowMap(roundsResult.data);
  const stages = rowMap(stagesResult.data);
  const deals = rowMap(dealsResult.data);

  const relatedInvestorIds = new Set<string>();
  const relatedRoundIds = new Set<string>();
  deals.forEach((deal) => {
    if (deal.investor_id && !investors.has(deal.investor_id)) relatedInvestorIds.add(deal.investor_id);
    if (deal.round_id && !rounds.has(deal.round_id)) relatedRoundIds.add(deal.round_id);
  });

  const [relatedInvestorsResult, relatedRoundsResult] = await Promise.all([
    relatedInvestorIds.size ? supabase.schema('fundraising').from('investors').select('id, name, investor_type').eq('workspace_id', workspaceId).in('id', Array.from(relatedInvestorIds)) : Promise.resolve({ data: [] }),
    relatedRoundIds.size ? supabase.schema('fundraising').from('rounds').select('id, round_name').eq('workspace_id', workspaceId).in('id', Array.from(relatedRoundIds)) : Promise.resolve({ data: [] }),
  ]);

  (relatedInvestorsResult.data ?? []).forEach((investor: Row) => investors.set(investor.id, investor));
  (relatedRoundsResult.data ?? []).forEach((round: Row) => rounds.set(round.id, round));

  rows.forEach((row) => {
    row.owner_name = displayName(accounts.get(row.owner_id)) ?? row.owner_name ?? null;
    row.created_by_name = displayName(accounts.get(row.created_by)) ?? row.created_by_name ?? null;
    row.updated_by_name = displayName(accounts.get(row.updated_by)) ?? row.updated_by_name ?? null;
    row.deleted_by_name = displayName(accounts.get(row.deleted_by)) ?? row.deleted_by_name ?? null;
    row.owner_label = fallbackLabel(row.owner_name, 'Unassigned');

    row.investor_name = investors.get(row.investor_id)?.name ?? row.investor_name ?? null;
    row.round_name = rounds.get(row.round_id)?.round_name ?? row.round_name ?? null;
    row.stage_name = stages.get(row.stage_id)?.name ?? row.stage_name ?? null;
    row.investor_label = fallbackLabel(row.investor_name, 'Investor');
    row.round_label = fallbackLabel(row.round_name, '-');
    row.stage_label = fallbackLabel(row.stage_name, '-');

    const relatedDeal = deals.get(row.deal_id);
    if (relatedDeal) {
      const investorName = investors.get(relatedDeal.investor_id)?.name ?? 'Deal';
      const roundName = rounds.get(relatedDeal.round_id)?.round_name;
      row.deal_name = roundName ? `${investorName} - ${roundName}` : investorName;
      row.deal_status = relatedDeal.status;
    }

    if (row.investor_name || row.round_name) {
      row.display_name = row.round_name ? `${row.investor_name ?? 'Deal'} - ${row.round_name}` : row.investor_name;
    }
    row.display_label = fallbackLabel(row.display_name ?? row.investor_name ?? row.round_name, 'Deal');

    dateFields.forEach((field) => {
      row[`${field}_display`] = formatFundraisingDate(row[field]);
    });
    dateTimeFields.forEach((field) => {
      row[`${field}_display`] = formatFundraisingDateTime(row[field]);
    });
  });

  return data;
}
