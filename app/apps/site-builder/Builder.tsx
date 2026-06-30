"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { createClient } from "@/utils/supabase/client";

const SiteBuilder = dynamic(() => import("./ServiceSiteBuilder"), {
  ssr: false,
  loading: () => (
    <div className="p-10 text-center text-slate-400">Loading the builder…</div>
  ),
}) as ComponentType<any>;

type PersistPayload = { site: unknown; started: boolean };

export default function Builder() {
  const supabase = useMemo(() => createClient(), []);
  const [loaded, setLoaded] = useState(false);
  const [initialSite, setInitialSite] = useState<unknown>(null);
  const [initialStarted, setInitialStarted] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");

  const rowId = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) setLoaded(true);
        return;
      }
      const { data: rows } = await supabase
        .schema("suite")
        .from("sites")
        .select("id,data")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);
      const row = rows && rows[0];
      if (row) {
        rowId.current = row.id as string;
        const d = (row.data ?? {}) as { site?: unknown; started?: boolean };
        if (d.site && active) {
          setInitialSite(d.site);
          setInitialStarted(!!d.started);
        }
      }
      if (active) setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const onPersist = useCallback(
    (payload: PersistPayload) => {
      if (timer.current) clearTimeout(timer.current);
      setSaveLabel("Saving…");
      timer.current = setTimeout(async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const data = { site: payload.site, started: payload.started };
        if (rowId.current) {
          await supabase
            .schema("suite")
            .from("sites")
            .update({ data, updated_at: new Date().toISOString() })
            .eq("id", rowId.current);
        } else {
          const { data: ins } = await supabase
            .schema("suite")
            .from("sites")
            .insert({ user_id: user.id, data })
            .select("id")
            .single();
          if (ins) rowId.current = ins.id as string;
        }
        setSaveLabel("All changes saved");
      }, 1200);
    },
    [supabase]
  );

  if (!loaded) {
    return (
      <div className="p-10 text-center text-slate-400">Loading your site…</div>
    );
  }

  return (
    <div className="relative">
      {saveLabel && (
        <div className="pointer-events-none absolute right-3 top-1 z-50 text-[11px] text-slate-400">
          {saveLabel}
        </div>
      )}
      <SiteBuilder
        initialSite={initialSite}
        initialStarted={initialStarted}
        onPersist={onPersist}
      />
    </div>
  );
}
