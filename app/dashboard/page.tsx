"use client";
import { useEffect, useMemo, useState } from "react";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const lakh = (n: number) => "₹" + (n / 1e5).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + " lakh";
const lk = (n: number) => (n >= 1e7 ? "₹" + (n / 1e7).toFixed(2) + " Cr" : lakh(n));

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [src, setSrc] = useState<"all" | "live" | "replay">("all");
  // ASSUMPTIONS (editable). Project value range is from the case; conversion rate is NOT in the case.
  const [lo, setLo] = useState(8), [hi, setHi] = useState(14), [conv, setConv] = useState(10);
  useEffect(() => { const f = () => fetch("/api/enquiries").then((r) => r.json()).then(setData); f(); const t = setInterval(f, 8000); return () => clearInterval(t); }, []);

  const m = useMemo(() => {
    if (!data) return null;
    const recs = data.records.filter((r: any) => src === "all" || (src === "live" ? r.source !== "transcript-replay" : r.source === "transcript-replay"));
    const n = recs.length, q = recs.filter((r: any) => r.verdict.qualified).length;
    const resp = recs.map((r: any) => r.responseSeconds).sort((a: number, b: number) => a - b);
    const med = resp.length ? resp[Math.floor(resp.length / 2)] : 0;
    const R = data.rates;
    const llm = recs.reduce((s: number, r: any) => s + r.costInr, 0);
    const voice = recs.reduce((s: number, r: any) => s + r.durationMin * R.voiceUsdPerMin * R.usdInr, 0);
    const cost = llm + voice;
    const handoffs = recs.filter((r: any) => r.handoff.sent).length;
    const after = recs.filter((r: any) => r.outsideOfficeHours).length;
    const mid = (lo + hi) / 2 * 1e5;
    const lowV = q * (conv / 100) * lo * 1e5, highV = q * (conv / 100) * hi * 1e5, midV = q * (conv / 100) * mid;
    return { recs, n, q, med, cost, llm, voice, handoffs, after, perEnq: n ? cost / n : 0, lowV, highV, midV, mid };
  }, [data, src, lo, hi, conv]);

  if (!m) return <p className="sub">Loading…</p>;
  const empty = m.n === 0;
  return (<>
    <h1>Founder dashboard</h1>
    <p className="sub">Replaces the monthly hand-pulled numbers. Auto-refreshes every 8 s.</p>
    <div className="flex" style={{ marginBottom: 12 }}>
      <span>Show:</span>
      <select value={src} onChange={(e) => setSrc(e.target.value as any)}>
        <option value="all">All enquiries</option><option value="live">Live calls only</option><option value="replay">Replay of the 40 Sept transcripts (phone-call subset)</option>
      </select>
      <span className="tag">Replay rows are the case's real transcripts run through the agent — not live traffic</span>
    </div>
    {empty && <p className="sub">No enquiries yet — <a href="/call">simulate a call</a> or run <code>npm run eval</code>.</p>}
    <div className="grid">
      <Kpi k="Enquiries handled" v={String(m.n)} s={`${m.after} outside 10am–7pm`} />
      <Kpi k="Median first response" v={`${m.med.toFixed(1)}s`} s="Case baseline: 48% unanswered in 48h (from case)" />
      <Kpi k="Qualified / not" v={`${m.q} / ${m.n - m.q}`} s={m.n ? `${Math.round((m.q / m.n) * 100)}% qualified` : ""} />
      <Kpi k="Handoffs sent" v={String(m.handoffs)} s="Telegram (or dry-run if no token set)" />
    </div>

    <div className="row two">
      <div className="card">
        <h2>What it costs us</h2>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <Kpi k="Total running cost" v={inr(m.cost)} s={`LLM ${inr(m.llm)} + voice ${inr(m.voice)}`} />
          <Kpi k="Cost per enquiry" v={inr(m.perEnq)} s="LLM + voice" />
        </div>
        <p className="assump">ASSUMED rates (not in the case; set via env): LLM ${data.rates.llmInUsdPerMTok}/MTok in, ${data.rates.llmOutUsdPerMTok}/MTok out · voice ${data.rates.voiceUsdPerMin}/min · ₹{data.rates.usdInr}/USD. Voice minutes for replay rows use the call length in the transcript header.</p>
      </div>
      <div className="card">
        <h2>What it generates (editable assumptions)</h2>
        <div className="flex">
          <label>Project value ₹<input type="number" value={lo} onChange={(e) => setLo(+e.target.value)} style={{ width: 60 }} />–<input type="number" value={hi} onChange={(e) => setHi(+e.target.value)} style={{ width: 60 }} /> lakh</label>
          <label>Conversion % <input type="number" value={conv} onChange={(e) => setConv(+e.target.value)} style={{ width: 60 }} /></label>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 10 }}>
          <Kpi k="Expected pipeline value" v={lk(m.midV)} s={`range ${lk(m.lowV)} – ${lk(m.highV)}`} />
          <Kpi k="Value per ₹1 of running cost" v={m.cost ? `${Math.round(m.midV / m.cost).toLocaleString("en-IN")}×` : "—"} s="at midpoint" />
        </div>
        <p className="assump">Qualified enquiries × conversion % × avg project value. ₹8–14 lakh is from the case. <b>The conversion rate is an assumption, not a measured number</b> — the case gives only "4× if answered within 1 hour". Treat the output as pipeline, not revenue.</p>
      </div>
    </div>

    <div className="card" style={{ marginTop: 12 }}>
      <h2>Enquiries</h2>
      <div style={{ overflowX: "auto" }}><table>
        <thead><tr><th>When</th><th>Src</th><th>Name</th><th>Project</th><th>Area</th><th>Verdict</th><th>Reason</th><th>Resp.</th><th>Handoff</th></tr></thead>
        <tbody>{[...m.recs].reverse().slice(0, 60).map((r: any) => <tr key={r.id}>
          <td>{new Date(r.receivedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}{r.outsideOfficeHours ? " 🌙" : ""}</td>
          <td>{r.source === "transcript-replay" ? (r.transcriptId ?? "replay") : r.source}</td>
          <td>{r.fields.name ?? "—"}</td><td>{r.fields.project_type ?? "—"}</td><td>{r.fields.area_sqft ?? "—"}</td>
          <td className={r.verdict.qualified ? "ok" : "no"}><b>{r.verdict.qualified ? "Qualified" : "No"}</b></td>
          <td>{r.verdict.reason}{r.verdict.uncertainty ? <div className="warn">⚠ {r.verdict.uncertainty}</div> : null}</td>
          <td>{r.responseSeconds}s</td><td>{r.handoff.sent ? "✓ " + r.handoff.channel : "—"}</td></tr>)}</tbody>
      </table></div>
    </div>
  </>);
}
function Kpi({ k, v, s }: { k: string; v: string; s?: string }) { return <div className="card"><div className="k">{k}</div><div className="v">{v}</div><div className="s">{s}</div></div>; }
