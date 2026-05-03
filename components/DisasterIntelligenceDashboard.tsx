"use client";

import type { DisasterDashboardData } from "@/lib/disaster-intel";
import type { DispatcherCase } from "@/lib/tribe-v2/types";
import { useEffect, useRef, useState } from "react";

type Props = {
  initialData: DisasterDashboardData;
  mapsApiKey: string;
};

type ChatRow = { role: "user" | "assistant"; text: string };

const PROMPTS = [
  "Which areas need the most help?",
  "Which shelters are high priority?",
  "Estimate accessibility needs for this disaster.",
  "Where should responders go first?",
  "Summarize this disaster in simple terms.",
];

const GMAPS_SCRIPT_SELECTOR = 'script[data-blackbox-gmaps="1"]';

function formatN(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function severityBadgeClass(sev: string): string {
  switch (sev) {
    case "CRITICAL":
      return "bg-[var(--state-critical)] text-white";
    case "ELEVATED":
      return "bg-orange-500 text-white";
    case "WATCH":
      return "bg-amber-400 text-black";
    default:
      return "bg-emerald-700 text-white";
  }
}

export function DisasterIntelligenceDashboard({ initialData, mapsApiKey }: Props) {
  const [data, setData] = useState(initialData);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatRow[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [dispatcherCases, setDispatcherCases] = useState<DispatcherCase[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const caseMarkersRef = useRef<google.maps.Marker[]>([]);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    async function pollCases() {
      try {
        const res = await fetch("/api/tribe-v2/dispatcher-cases", { cache: "no-store" });
        const j = (await res.json()) as { cases?: DispatcherCase[] };
        if (alive) setDispatcherCases(j.cases ?? []);
      } catch {
        /* ignore transient demo errors */
      }
      if (alive) t = setTimeout(pollCases, 4000);
    }
    void pollCases();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    const key = mapsApiKey?.trim();
    if (!key) return;

    const container = mapContainerRef.current;
    if (!container) return;

    let cancelled = false;

    const mountMap = () => {
      if (cancelled || !mapContainerRef.current) return;
      const g = window.google;
      if (!g?.maps) return;

      const d = dataRef.current;
      const el = mapContainerRef.current;

      const map = new g.maps.Map(el, {
        center: d.map_center,
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
      });
      mapRef.current = map;
      setMapReady(true);

      const info = new g.maps.InfoWindow();

      new g.maps.Marker({
        map,
        position: { lat: d.disaster.latitude, lng: d.disaster.longitude },
        title: d.disaster.title,
      });

      new g.maps.Circle({
        map,
        center: { lat: d.disaster.latitude, lng: d.disaster.longitude },
        radius: d.disaster.affected_radius_miles * 1609.34,
        strokeColor: "#f87171",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "#ef4444",
        fillOpacity: 0.12,
      });

      for (const s of d.shelters) {
        const marker = new g.maps.Marker({
          map,
          position: { lat: s.latitude, lng: s.longitude },
          title: s.name,
          icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        });
        marker.addListener("click", () => {
          info.setContent(
            `<div style="max-width:260px"><strong>${escapeHtml(s.name)}</strong><br/>` +
              `Occupancy: ${s.current_occupancy}/${s.capacity}<br/>` +
              `Accessibility: ${s.wheelchair_accessible ? "wheelchair " : ""}${s.has_medical_support ? "medical " : ""}${s.has_transportation_support ? "transport " : ""}<br/>` +
              `Distance: ${s.distance_from_disaster_miles} miles</div>`
          );
          info.open({ map, anchor: marker });
        });
      }

      for (const h of d.hotspots) {
        const marker = new g.maps.Marker({
          map,
          position: { lat: h.latitude, lng: h.longitude },
          title: h.reason,
          icon: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        });
        marker.addListener("click", () => {
          info.setContent(
            `<div style="max-width:260px"><strong>${escapeHtml(h.risk_level)} hotspot</strong><br/>` +
              `${escapeHtml(h.reason)}<br/>` +
              `Estimated people affected: ${h.estimated_people_affected}<br/>` +
              `Estimated accessibility needs: ${h.estimated_accessibility_needs}</div>`
          );
          info.open({ map, anchor: marker });
        });
      }
    };

    setMapError(null);

    const w = window as Window & { gm_authFailure?: () => void };
    w.gm_authFailure = () => {
      if (!cancelled) {
        setMapError(
          "Google Maps rejected this API key. Enable Maps JavaScript API, billing, and add this origin under Application restrictions (e.g. http://localhost:3000/*)."
        );
      }
    };

    if (window.google?.maps) {
      mountMap();
      return () => {
        cancelled = true;
        setMapReady(false);
        mapRef.current = null;
        if (mapContainerRef.current) mapContainerRef.current.innerHTML = "";
      };
    }

    const existing = document.querySelector<HTMLScriptElement>(GMAPS_SCRIPT_SELECTOR);
    if (existing) {
      const onLoad = () => {
        if (!cancelled) mountMap();
      };
      if (window.google?.maps) {
        onLoad();
      } else {
        existing.addEventListener("load", onLoad);
      }
      return () => {
        cancelled = true;
        setMapReady(false);
        mapRef.current = null;
        existing.removeEventListener("load", onLoad);
        if (mapContainerRef.current) mapContainerRef.current.innerHTML = "";
      };
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async`;
    script.async = true;
    script.dataset.blackboxGmaps = "1";
    script.onload = () => {
      if (!cancelled) mountMap();
    };
    script.onerror = () => {
      if (!cancelled) {
        setMapError("Could not load the Google Maps script. Check your network and API key.");
      }
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      setMapReady(false);
      mapRef.current = null;
      if (mapContainerRef.current) mapContainerRef.current.innerHTML = "";
    };
  }, [mapsApiKey]);

  useEffect(() => {
    const map = mapRef.current;
    const g = typeof window !== "undefined" ? window.google : undefined;
    if (!mapReady || !map || !g?.maps) return;

    for (const m of caseMarkersRef.current) {
      m.setMap(null);
    }
    caseMarkersRef.current = [];

    const info = new g.maps.InfoWindow();

    for (const c of dispatcherCases) {
      const lat = c.location.latitude;
      const lng = c.location.longitude;
      if (typeof lat !== "number" || typeof lng !== "number") continue;

      const marker = new g.maps.Marker({
        map,
        position: { lat, lng },
        title: c.profile.label ?? c.household_id,
        icon: "http://maps.google.com/mapfiles/ms/icons/purple-dot.png",
      });

      const name = escapeHtml(c.profile.label ?? c.household_id);
      const brief = escapeHtml(c.brief.length > 220 ? `${c.brief.slice(0, 220)}…` : c.brief);
      marker.addListener("click", () => {
        info.setContent(
          `<div style="max-width:280px"><strong>${name}</strong><br/>` +
            `<span style="font-size:11px">${escapeHtml(c.severity)} · ${escapeHtml(c.channel)}</span><br/>${brief}</div>`
        );
        info.open({ map, anchor: marker });
      });

      caseMarkersRef.current.push(marker);
    }
  }, [dispatcherCases, mapReady]);

  async function runEstimate() {
    setLoadingEstimate(true);
    setEstimateError(null);
    try {
      const res = await fetch(
        `/api/disasters/${encodeURIComponent(data.disaster.id)}/accessibility-impact`,
        { cache: "no-store" }
      );
      const payload = (await res.json()) as {
        error?: string;
        estimated_people_with_disabilities_affected?: number;
        estimated_mobility_support_needs?: number;
        estimated_hearing_vision_support_needs?: number;
        high_priority_shelters?: number;
      };
      if (!res.ok) {
        setEstimateError(payload.error ?? "Failed to estimate.");
        return;
      }
      setData((prev) => ({
        ...prev,
        accessibility_impact: {
          disaster_id: prev.disaster.id,
          estimated_people_with_disabilities_affected:
            payload.estimated_people_with_disabilities_affected ??
            prev.accessibility_impact.estimated_people_with_disabilities_affected,
          estimated_mobility_support_needs:
            payload.estimated_mobility_support_needs ??
            prev.accessibility_impact.estimated_mobility_support_needs,
          estimated_hearing_vision_support_needs:
            payload.estimated_hearing_vision_support_needs ??
            prev.accessibility_impact.estimated_hearing_vision_support_needs,
          high_priority_shelters:
            payload.high_priority_shelters ?? prev.accessibility_impact.high_priority_shelters,
        },
      }));
    } finally {
      setLoadingEstimate(false);
    }
  }

  async function sendChat(message: string) {
    if (!message.trim()) return;
    setChatBusy(true);
    setChat((prev) => [...prev, { role: "user", text: message }]);
    setChatInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: { active_disaster_id: data.disaster.id },
        }),
      });
      const body = (await res.json()) as { answer?: string; error?: string };
      setChat((prev) => [
        ...prev,
        {
          role: "assistant",
          text: body.answer ?? body.error ?? "No response available.",
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-5 sm:gap-5 sm:px-6 lg:grid-cols-12">
      <section className="min-w-0 space-y-4 lg:col-span-7 xl:col-span-8">
        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h1 className="font-display text-2xl font-extrabold">{data.disaster.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="bg-[var(--state-critical)] px-2 py-1 font-mono text-xs font-bold text-white">
              {data.disaster.severity}
            </span>
            <span className="border border-border px-2 py-1 font-mono text-xs font-bold">
              {data.disaster.urgency}
            </span>
            <span className="border border-border px-2 py-1 font-mono text-xs font-bold">
              {data.disaster.event_type}
            </span>
          </div>
          <p className="mt-3 text-sm text-foreground/80">{data.disaster.location_name}</p>
          <p className="mt-2 text-sm text-foreground/90">{data.disaster.description}</p>
        </article>

        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Accessibility impact estimate
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              Estimated people with disabilities affected:{" "}
              <strong className="text-white">
                {formatN(data.accessibility_impact.estimated_people_with_disabilities_affected)}
              </strong>
            </p>
            <p>
              Estimated mobility-support needs:{" "}
              <strong className="text-white">
                {formatN(data.accessibility_impact.estimated_mobility_support_needs)}
              </strong>
            </p>
            <p>
              Estimated hearing/vision support needs:{" "}
              <strong className="text-white">
                {formatN(data.accessibility_impact.estimated_hearing_vision_support_needs)}
              </strong>
            </p>
            <p>
              High-priority shelters:{" "}
              <strong className="text-white">{formatN(data.accessibility_impact.high_priority_shelters)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runEstimate()}
            disabled={loadingEstimate}
            className="mt-4 border border-border bg-background px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:border-accent disabled:opacity-40"
          >
            {loadingEstimate ? "Estimating..." : "Estimate accessibility"}
          </button>
          {estimateError ? <p className="mt-2 text-sm text-[var(--state-critical)]">{estimateError}</p> : null}
        </article>

        <div className="relative h-[360px] w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:h-[420px]">
          <div ref={mapContainerRef} className="h-full w-full min-h-[200px]" />
          {!mapsApiKey.trim() ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/95 px-4 text-center text-sm text-muted-foreground">
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-foreground/80">Map not loaded</p>
              <p>
                Set <span className="font-mono text-foreground/90">GOOGLE_MAPS_API_KEY</span> or{" "}
                <span className="font-mono text-foreground/90">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</span> in{" "}
                <span className="font-mono text-foreground/90">.env</span>, then restart{" "}
                <span className="font-mono text-foreground/90">npm run dev</span>.
              </p>
            </div>
          ) : null}
          {mapError && mapsApiKey.trim() ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/95 px-4 text-center text-sm text-[var(--state-critical)]">
              <p className="font-mono text-xs uppercase tracking-[0.12em]">Map error</p>
              <p>{mapError}</p>
            </div>
          ) : null}
        </div>

        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-extrabold">Live check-ins (TRIBE)</h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Purple pins · polls every 4s
            </p>
          </div>
          <p className="mt-1 text-sm text-foreground/70">
            After voice or SMS replies, cases appear here with registry avatars. Run{" "}
            <span className="font-mono text-xs">POST /api/demo/kickoff-drill</span> for the full SMS → call
            flow.
          </p>
          {dispatcherCases.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/55">No dispatcher cases yet — complete a check-in to populate.</p>
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {dispatcherCases.map((c) => (
                <li
                  key={c.id}
                  className="flex gap-3 rounded-lg border border-border/80 bg-background p-3 text-sm"
                >
                  {c.profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.profile.avatar_url}
                      alt=""
                      width={56}
                      height={56}
                      className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-muted font-mono text-xs">
                      {c.household_id.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{c.profile.label ?? c.household_id}</p>
                    <p className="mt-1 font-mono text-[10px] text-foreground/60">{c.profile.phone_number}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className={`px-2 py-0.5 font-mono text-[10px] font-bold ${severityBadgeClass(c.severity)}`}>
                        {c.severity}
                      </span>
                      <span className="border border-border px-2 py-0.5 font-mono text-[10px]">{c.channel}</span>
                      <span className="border border-border px-2 py-0.5 font-mono text-[10px]">{c.status}</span>
                    </div>
                    <p className="mt-2 text-xs text-foreground/80">{c.brief}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{c.latest_transcript}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-xl font-extrabold">Hotspots</h2>
          <div className="mt-3 grid gap-3">
            {data.hotspots.map((h) => (
              <div key={h.id} className="break-words rounded-lg border border-border/80 bg-background p-3 text-sm">
                <p className="font-mono text-xs font-bold">{h.risk_level}</p>
                <p className="mt-1">{h.reason}</p>
                <p className="mt-1 text-foreground/80">Estimated people affected: {formatN(h.estimated_people_affected)}</p>
                <p className="text-foreground/80">Estimated accessibility needs: {formatN(h.estimated_accessibility_needs)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <aside className="min-w-0 space-y-4 lg:col-span-5 xl:col-span-4">
        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-xl font-extrabold">Shelters</h2>
          <div className="mt-3 grid gap-3">
            {data.shelters.map((s) => (
              <div key={s.id} className="break-words rounded-lg border border-border/80 bg-background p-3 text-sm">
                <p className="font-semibold">{s.name}</p>
                <p className="text-foreground/75">
                  {s.address}, {s.city}, {s.state}
                </p>
                <p className="mt-1">
                  Occupancy/Capacity: {formatN(s.current_occupancy)}/{formatN(s.capacity)}
                </p>
                <p>Wheelchair accessible: {s.wheelchair_accessible ? "yes" : "no"}</p>
                <p>Medical support: {s.has_medical_support ? "yes" : "no"}</p>
                <p>Backup power: {s.has_power_backup ? "yes" : "no"}</p>
                <p>Transportation support: {s.has_transportation_support ? "yes" : "no"}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  {s.high_priority ? `High priority - ${s.priority_reason}` : "Standard priority"}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-xl font-extrabold">Gemini AI Chatbot</h2>
          <p className="mt-1 text-sm text-foreground/70">
            Aggregate intelligence only. No private personal data is exposed.
          </p>
          <div className="mt-3 h-64 overflow-y-auto rounded-lg border border-border bg-background p-3 text-sm">
            {chat.length === 0 ? (
              <p className="text-foreground/60">Ask about priorities, hotspots, shelters, and accessibility estimates.</p>
            ) : null}
            {chat.map((row, i) => (
              <p key={`${row.role}-${i}`} className="mb-2 whitespace-pre-wrap break-words">
                <strong>{row.role === "user" ? "You" : "BlackBox AI"}:</strong> {row.text}
              </p>
            ))}
          </div>
          <div className="mt-3 flex items-stretch gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask response priorities..."
              className="w-full border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={chatBusy}
              onClick={() => void sendChat(chatInput)}
              className="shrink-0 border border-border px-3 py-2 font-mono text-xs uppercase"
            >
              {chatBusy ? "..." : "Send"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => void sendChat(p)}
                className="max-w-full truncate rounded border border-border px-2 py-1 text-xs text-foreground/80"
              >
                {p}
              </button>
            ))}
          </div>
        </article>
      </aside>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
