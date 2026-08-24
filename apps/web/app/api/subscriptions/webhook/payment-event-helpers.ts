export async function logPaymentEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  data: {
    workspace_id: string | null;
    seat_id: string | null;
    event_type: string;
    provider_event_id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any;
    processed_at?: string;
    processing_error?: string;
  },
) {
  try {
    await adminClient.from('payment_events').insert({
      workspace_id: data.workspace_id,
      seat_id: data.seat_id,
      payment_provider: 'stripe',
      provider_event_id: data.provider_event_id,
      event_type: data.event_type,
      payload: data.payload,
      processed_at: data.processed_at ?? null,
      processing_error: data.processing_error ?? null,
    });
  } catch (err) {
    // Duplicate event — ignore (unique constraint on provider_event_id)
    console.warn('Payment event log insert skipped (likely duplicate):', err);
  }
}

/**
 * Auto-assign a seat to the buyer after successful checkout.
 * Same logic as the dummy-checkout helper.
 */
export async function autoAssignSeatToBuyer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  workspaceId: string,
  userId: string,
  productId: string,
  seatId: string,
) {
  try {
    // Check if buyer already has an active assignment for this product
    const { data: existing } = await adminClient
      .from('seat_assignments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) return;

    // Check for a previously revoked assignment to reactivate
    const { data: inactive } = await adminClient
      .from('seat_assignments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('is_active', false)
      .maybeSingle();

    if (inactive) {
      await adminClient
        .from('seat_assignments')
        .update({
          is_active: true,
          assigned_at: new Date().toISOString(),
          assigned_by: userId,
          revoked_at: null,
          revoked_by: null,
        })
        .eq('id', inactive.id);
      return;
    }

    // Create new assignment
    await adminClient.from('seat_assignments').insert({
      seat_id: seatId,
      workspace_id: workspaceId,
      user_id: userId,
      product_id: productId,
      is_active: true,
      assigned_by: userId,
    });
  } catch (error) {
    console.error('Auto-assign seat to buyer error:', error);
  }
}
