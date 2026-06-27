import { useEffect, useState } from 'react';
import { supabase, Analysis } from '../lib/supabase';

export function useAnalyses() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) setError(error.message);
    else if (data) setAnalyses(data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const saveAnalysis = async (entry: Omit<Analysis, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const { error } = await supabase.from('analyses').insert({ ...entry, user_id: user.id });
    if (error) throw error;
  };

  return { analyses, loading, error, saveAnalysis, refresh: fetch };
}
