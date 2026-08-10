import { supabase } from './supabase';

/**
 * Explicitly funds the escrow for a contract.
 * Annual bonus is never included in escrow.
 */
export async function fundContractEscrow(
  contractId: string,
  userId: string,
): Promise<{ success: boolean; amount?: number; error?: string }> {
  try {
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, escrow_amount, escrow_status')
      .eq('id', contractId)
      .maybeSingle();

    if (contractError) throw contractError;
    if (!contract) return { success: false, error: 'Контракт не найден' };

    if (contract.escrow_status === 'FUNDED') {
      return { success: true, amount: Number(contract.escrow_amount || 0) };
    }

    const { data: streams, error: streamsError } = await supabase
      .from('contract_payout_streams')
      .select('stream_key, amount')
      .eq('contract_id', contractId);

    if (streamsError) throw streamsError;

    const escrowAmount = (streams || [])
      .filter(stream => stream.stream_key !== 'annual')
      .reduce((sum, stream) => sum + Number(stream.amount || 0), 0);

    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        escrow_amount: escrowAmount,
        escrow_status: 'FUNDED',
      })
      .eq('id', contractId);

    if (updateError) throw updateError;

    const { error: eventError } = await supabase.from('escrow_events').insert({
      contract_id: contractId,
      event_type: 'ESCROW_FUNDED',
      amount: escrowAmount,
      actor_role: 'CEO',
      actor_id: userId,
      metadata: {
        streams_count: (streams || []).filter(stream => stream.stream_key !== 'annual').length,
        total_escrow: escrowAmount,
        annual_bonus_excluded: true,
      },
    });

    if (eventError) throw eventError;

    return { success: true, amount: escrowAmount };
  } catch (error) {
    console.error('Ошибка оплаты escrow:', error);
    return { success: false, error: (error as Error).message };
  }
}
