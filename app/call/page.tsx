"use client";
import { useEffect, useRef, useState } from "react";

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
  const [talking, setTalking] = useState(false);
  const [phase, setPhase] = useState<"" | "speaking" | "listening" | "thinking">("");
  const [heard, setHeard] = useState("");
  const [canTalk, setCanTalk] = useState(true);
  const talkingRef = useRef(false);
  const recRef = useRef<any>(null);
  useEffect(() => { setCanTalk(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && "speechSynthesis" in window); }, []);
  const st = useRef({ id: "", receivedAt: "", startedMs: 0, first: undefined as number | undefined, usage: { input_tokens: 0, output_tokens: 0 } });

  async function send(history: Turn[]) {
    setBusy(true); setErr("");
    const res = await fetch("/api/call", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ callId: st.current.id, history, receivedAt: st.current.receivedAt, startedMs: st.current.startedMs, firstResponseMs: st.current.first, usageSoFar: st.current.usage }) });
    const d = await res.json(); setBusy(false);
    if (d.error) { setErr(d.error); return null; }
    st.current.first = d.firstResponseMs; st.current.usage = d.usage;
    setTurns([...history, { role: "agent", text: d.reply }]); setInfo(d);
    return d;
  }
  function begin() {
    st.current = { id: "call-" + Date.now(), receivedAt: new Date().toISOString(), startedMs: Date.now(), first: undefined, usage: { input_tokens: 0, output_tokens: 0 } };
    setTurns([]); setInfo(null); setErr(""); setHeard("");
  }
  function start() { stopTalk(); begin(); send([]); }

  // ---- "Talk to Us Now": browser speech-to-text + text-to-speech around the same /api/call agent ----
  function speak(text: string) {
    return new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-IN"; u.rate = 1;
      const v = speechSynthesis.getVoices().find((x) => x.lang === "en-IN") || speechSynthesis.getVoices().find((x) => x.lang.startsWith("en"));
      if (v) u.voice = v;
      u.onend = () => resolve(); u.onerror = () => resolve();
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    });
  }
  // Keeps listening through short pauses (people read digits slowly) and stops after `silenceMs` of quiet.
  function listen(silenceMs = 1800) {
    return new Promise<string>((resolve) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const r = new SR(); recRef.current = r;
      r.lang = "en-IN"; r.interimResults = true; r.maxAlternatives = 1; r.continuous = true;
      let text = "", timer: any = null, done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(timer); try { r.stop(); } catch {} };
      const arm = (ms: number) => { clearTimeout(timer); timer = setTimeout(finish, ms); };
      r.onresult = (e: any) => {
        text = Array.from(e.results).map((x: any) => x[0].transcript).join(" ").replace(/\s+/g, " ").trim();
        setHeard(text); arm(silenceMs);
      };
      r.onerror = (e: any) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") setErr("Microphone blocked. Allow the mic for this site (lock icon in the address bar) and press Talk again."); };
      r.onend = () => { clearTimeout(timer); resolve(text); };
      try { r.start(); arm(9000); } catch { resolve(""); }
    });
  }
  function stopTalk() {
    talkingRef.current = false; setTalking(false); setPhase("");
    try { recRef.current?.abort(); } catch {}
    try { speechSynthesis.cancel(); } catch {}
  }
  async function talk() {
    if (talking) return stopTalk();
    talkingRef.current = true; setTalking(true); begin();
    let h: Turn[] = [];
    setPhase("thinking");
    let d = await send(h);
    let misses = 0;
    let turnsTaken = 0;
    while (talkingRef.current && d && turnsTaken++ < 16) {
      h = [...h, { role: "agent", text: d.reply }];
      setPhase("speaking"); await speak(d.reply);
      if (d.ended || !talkingRef.current) break;
      let said = "";
      while (talkingRef.current && !said && misses < 3) {
        setPhase("listening"); said = await listen(/number|phone|call you back/i.test(d.reply) ? 3200 : 1800);
        if (!said && talkingRef.current) { misses++; if (misses < 3) { setPhase("speaking"); await speak("Sorry, I didn't catch that. Could you say it again?"); } }
      }
      if (!said || !talkingRef.current) break;
      misses = 0; setHeard(said);
      h = [...h, { role: "caller", text: said }]; setTurns(h);
      setPhase("thinking"); d = await send(h);
    }
    stopTalk();
  }
  const ended = info?.ended;
  async function say(t: string) { if (!t.trim() || ended) return; const h = [...turns, { role: "caller" as const, text: t }]; setTurns(h); setInput(""); await send(h); }

  return (<>
    <h1>Simulate an incoming call</h1>
    <p className="sub">Text-simulated call. The same <code>processTurn()</code> core is what the Vaani webhook (<code>/api/vaani</code>) calls, so voice drops in without changing the logic.</p>
    <div className="flex" style={{ marginBottom: 12 }}>
      <button onClick={talk} disabled={!canTalk || (busy && !talking)} title={canTalk ? "Speak to the agent and hear it reply" : "Needs Chrome with microphone access"} style={{ fontSize: 16, padding: "10px 18px" }}>{talking ? "⏹ End call" : "🎤 Talk to Us Now"}</button>
      <button className="ghost" onClick={start} disabled={busy || talking}>{turns.length ? "Restart (typed)" : "Start typed call"}</button>
      {Object.entries(SCRIPTS).map(([k, v]) => <button key={k} className="ghost" disabled={busy || !turns.length || ended} onClick={async () => { for (const l of v) { await say(l); } }} title="Plays the scripted caller lines">{k}</button>)}
    </div>
    {talking && <p className="sub"><b>{phase === "listening" ? "🎙 Listening… speak now" : phase === "speaking" ? "🔊 Agent speaking…" : "… thinking"}</b>{heard ? <> · you said: “{heard}”</> : null}</p>}
    {!canTalk && <p className="sub warn">“Talk to Us Now” needs Chrome (or Edge) with microphone access. Typing still works below.</p>}
    <div className="row two">
      <div className="card"><div className="chat">
        {turns.length === 0 && <span className="sub">Press “Talk to Us Now” (or start a typed call). The agent answers instantly.</span>}
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
