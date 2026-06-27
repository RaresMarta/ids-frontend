import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/** A registered worker (the droplet sensor) as the dashboard sees it. */
export interface Monitor {
  id: string;
  monitor_key: string;
  name: string;
  status: string;
  public_ip: string | null;
  protected_ips: string[] | null;
  last_seen_at: string | null;
}

/** The victim identifier to display for a monitor: its protected IP, else public IP, else name. */
export function monitorLabel(m: Monitor): string {
  return m.protected_ips?.[0] ?? m.public_ip ?? m.name ?? m.monitor_key;
}

/**
 * Lists the monitors the signed-in user owns and keeps the list fresh as workers
 * register or heartbeat (postgres_changes on the monitors table). Source for the
 * live-monitor picker.
 */
export function useMonitors() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from('monitors')
        .select('id, monitor_key, name, status, public_ip, protected_ips, last_seen_at')
        // Most-recently-seen first, so the live sensor is always monitors[0] even if a
        // stale row from an old IDS_MONITOR_ID lingers (single-customer robustness).
        .order('last_seen_at', { ascending: false, nullsFirst: false });
      if (!active) return;
      if (!error && data) setMonitors(data as Monitor[]);
      setLoading(false);
    };

    load();
    const channel = supabase
      .channel('monitors-registry')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monitors' }, () => load())
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { monitors, loading };
}
