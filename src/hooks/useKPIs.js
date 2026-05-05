import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useKPIs(filters = {}) {
  const { profile } = useAuth();
  const [kpis,    setKPIs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchKPIs = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    let query = supabase
      .from('kpis')
      .select(`
        *,
        owner:profiles!kpis_owner_id_fkey(id, full_name, role, division),
        latest_progress:kpi_progress(raw_score, reported_at)
      `)
      .order('created_at', { ascending: false });

    if (filters.status)   query = query.eq('status', filters.status);
    if (filters.owner_id) query = query.eq('owner_id', filters.owner_id);
    if (filters.division) query = query.eq('division', filters.division);

    const { data, error } = await query;
    if (error) { setError(error.message); setLoading(false); return; }

    // Attach latest score per KPI
    const enriched = (data ?? []).map(k => ({
      ...k,
      latest_score: k.latest_progress?.length
        ? k.latest_progress.sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at))[0].raw_score
        : null,
    }));
    setKPIs(enriched);
    setLoading(false);
  }, [profile, filters.status, filters.owner_id, filters.division]);

  useEffect(() => {
    fetchKPIs();

    // Realtime subscription
    const channel = supabase
      .channel('kpis-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpis' }, fetchKPIs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_progress' }, fetchKPIs)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchKPIs]);

  async function createKPI(values) {
    const { data, error } = await supabase.from('kpis').insert({
      ...values,
      owner_id:   profile.id,
      created_by: profile.id,
      division:   profile.division,
    }).select().single();
    if (error) throw error;
    return data;
  }

  async function updateKPI(id, values) {
    const { data, error } = await supabase.from('kpis').update(values).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async function submitForApproval(id) {
    return updateKPI(id, { status: 'pending_approval' });
  }

  async function approveKPI(id, comment = '') {
    const { error } = await supabase.from('kpi_approvals').insert({
      kpi_id: id, reviewer_id: profile.id, action: 'approved', comment,
    });
    if (error) throw error;
    return updateKPI(id, { status: 'approved', approved_by: profile.id, approved_at: new Date().toISOString(), target_locked: true });
  }

  async function rejectKPI(id, comment = '') {
    const { error } = await supabase.from('kpi_approvals').insert({
      kpi_id: id, reviewer_id: profile.id, action: 'rejected', comment,
    });
    if (error) throw error;
    return updateKPI(id, { status: 'rejected' });
  }

  async function reportProgress(kpiId, rawScore, notes = '') {
    const { error } = await supabase.from('kpi_progress').insert({
      kpi_id: kpiId, reporter_id: profile.id, raw_score: rawScore, notes,
    });
    if (error) throw error;
  }

  return { kpis, loading, error, createKPI, updateKPI, submitForApproval, approveKPI, rejectKPI, reportProgress, refresh: fetchKPIs };
}
