"use client";
import { useRef, useState } from "react";

interface Turn { role: "caller" | "agent"; text: string }

const SCRIPTS: Record<string, string[]> = {
  "Qualified (Kothrud 3BHK)": ["Hi, I'm Priya. We have a 3BHK in Kothrud, about 1,400 sq ft. We want to redo the whole flat.", "We own it, my husband is fine with it. We'd like to be done by March.", "9800000000. How much would it cost roughly?"],
  "Out of area (Nashik)": ["Hi, I'm Suresh. I have a home office in Nashik I want redone."],
  "Advice only": ["Hi, can someone come and give us ideas on colours for our living room? We're not doing the full thing."],
};

export default function CallPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const [err, setErr] = useState("");
  const st = useRef({ id: "", receivedAt: "", startedMs: 0, first: undefined as number | undefined, usage: { input_tokens: 0, output_tokens: 0 } });

  async function send(history: Turn[]) {
    setBusy(true); setErr("");
    const res = await fetch("/api/call", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ callId: st.current.id, history, receivedAt: st.current.receivedAt, startedMs: st.current.startedMs, firstResponseMs: st.current.first, usageSoFar: st.current.usage }) });
    const d = await res.json(); setBusy(false);
    if (d.error) return setErr(d.error);
    st.current.first = d.firstResponseMs; st.current.usage = d.usage;
    setTurns([...history, { role: "agent", text: d.reply }]); setInfo(d);
  }
  function start() {
    st.current = { id: "call-" + Date.now(), receivedAt: new Date().toISOString(), startedMs: Date.now(), first: undefined, usage: { input_tokens: 0, output_tokens: 0 } };
    setTurns([]); setInfo(null); send([]);
  }
  const ended = info?.ended;
  async function say(t: string) { if (!t.trim() || ended) return; const h = [...turns, { role: "caller" as const, text: t }]; setTurns(h); setInput(""); await send(h); }

  return (<>
    <h1>Simulate an incoming call</h1>
    <p className="sub">Text-simulated call. The same <code>processTurn()</code> core is what the Vaani webhook (<code>/api/vaani</code>) calls, so voice drops in without changing the logic.</p>
    <div className="flex" style={{ marginBottom: 12 }}>
      <button onClick={start} disabled={busy}>{turns.length ? "Restart call" : "Start call"}</button>
      {Object.entries(SCRIPTS).map(([k, v]) => <button key={k} className="ghost" disabled={busy || !turns.length || ended} onClick={async () => { for (const l of v) { await say(l); } }} title="Plays the scripted caller lines">{k}</button>)}
    </div>
    <div className="row two">
      <div className="card"><div className="chat">
        {turns.length === 0 && <span className="sub">Press “Start call”. The agent answers instantly.</span>}
        {turns.map((t, i) => <div key={i} className={"msg " + t.role}>{t.text}</div>)}
        {busy && <div className="msg agent">…</div>}
      </div>
      <div className="flex" style={{ marginTop: 10 }}>
        <input style={{ flex: 1 }} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && say(input)} placeholder={ended ? "Call ended" : "Type what the caller says"} disabled={!turns.length || busy || ended} />
        <button onClick={() => say(input)} disabled={!turns.length || busy || ended}>Say</button>
      </div>
      {err && <p className="no">{err}</p>}</div>
      <div className="card">
        <h2>What the agent has captured</h2>
        {info ? <>
          <table><tbody>{Object.entries(info.fields).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v === null ? <span className="sub">—</span> : String(v)}</td></tr>)}</tbody></table>
          <h2 style={{ marginTop: 12 }}>Criteria (qualified.md)</h2>
          <div className="flex">{Object.entries(info.criteria).map(([k, v]) => <span key={k} className={"pill " + (v === "pass" ? "ok" : v === "fail" ? "no" : "warn")}>{k}: {String(v)}</span>)}</div>
          <p className="sub">First reply in {(info.firstResponseMs / 1000).toFixed(1)}s{info.priceGuardTriggered ? " · price guard blocked a figure" : ""}</p>
          {info.verdict && <p><b className={info.verdict.qualified ? "ok" : "no"}>{info.verdict.qualified ? "QUALIFIED" : "NOT QUALIFIED"}</b> — {info.verdict.reason}{info.verdict.uncertainty ? <><br /><span className="warn">Confirm: {info.verdict.uncertainty}</span></> : null}</p>}
          {info.record && <p>Handoff: <b>{info.record.handoff.sent ? "sent" : info.record.verdict.qualified ? "FAILED" : "not needed"}</b>{info.record.handoff.channel ? ` via ${info.record.handoff.channel}` : ""}. <a href="/dashboard">See dashboard →</a></p>}
        </> : <span className="sub">Nothing yet.</span>}
      </div>
    </div>
  </>);
}
