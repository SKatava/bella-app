import { useState, useEffect, useRef } from "react";
 
const PLAYERS = ["Igrač 1", "Igrač 2", "Igrač 3"];
const SUITS = ["♠", "♥", "♦", "♣"];
const SUIT_COLORS = { "♠": "#e2e8f0", "♥": "#f87171", "♦": "#f87171", "♣": "#e2e8f0" };
 
// Bella = kralj + dama iste boje, vrijedi 20 (truf) ili 10
const ZVANJE_VALUES = [
  { label: "Terz (3 uzastopna)", value: 20 },
  { label: "Kvart (4 uzastopna)", value: 50 },
  { label: "Kvint (5 uzastopnih)", value: 100 },
  { label: "Šesta (6 uzastopnih)", value: 100 },
  { label: "Sedma (7 uzastopnih)", value: 100 },
  { label: "Osam (8 uzast.)", value: 100 },
  { label: "Čtyri iste boje", value: 100 },
  { label: "Četiri deke", value: 200 },
  { label: "Bella (kralj+dama truf)", value: 20 },
];
 
function AnimatedScore({ value }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
 
  useEffect(() => {
    if (prev.current !== value) {
      setDisplay(value);
      prev.current = value;
    }
  }, [value]);
 
  return (
    <span
      key={value}
      style={{
        display: "inline-block",
        animation: "scorepop 0.35s cubic-bezier(.36,.07,.19,.97)",
      }}
    >
      {display}
    </span>
  );
}
 
export default function BellaTracker() {
  const [names, setNames] = useState(PLAYERS.slice());
  const [scores, setScores] = useState([0, 0, 0]);
  const [history, setHistory] = useState([]);
  const [round, setRound] = useState({
    adut: "♠",
    zvacPlayer: 0,
    points: ["", "", ""],
    zvanja: [[], [], []],
    bellaPlayer: -1,
    bellaValue: 20,
    fall: false,
  });
  const [tab, setTab] = useState("igra"); // 'igra' | 'povijest' | 'pravila'
  const [editName, setEditName] = useState(-1);
  const [toast, setToast] = useState(null);
 
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }
 
  function addZvanje(playerIdx, zvanje) {
    setRound((r) => {
      const z = r.zvanja.map((arr, i) =>
        i === playerIdx ? [...arr, zvanje] : arr
      );
      return { ...r, zvanja: z };
    });
  }
 
  function removeZvanje(playerIdx, idx) {
    setRound((r) => {
      const z = r.zvanja.map((arr, i) =>
        i === playerIdx ? arr.filter((_, j) => j !== idx) : arr
      );
      return { ...r, zvanja: z };
    });
  }
 
  function totalZvanja(playerIdx) {
    return round.zvanja[playerIdx].reduce((s, z) => s + z.value, 0);
  }
 
  function commitRound() {
    const pts = round.points.map((p) => parseInt(p) || 0);
    const sum = pts.reduce((a, b) => a + b, 0);
    if (sum !== 162) {
      showToast(`Zbroj bodova mora biti 162 (trenutno: ${sum})`);
      return;
    }
 
    const zvacIdx = round.zvacPlayer;
    const zvacPts = pts[zvacIdx];
 
    // Tko ima viši zov ne može biti pao
    const zvanjaSums = [0, 1, 2].map((i) => totalZvanja(i));
    const maxZvanja = Math.max(...zvanjaSums);
    const winnerZvanja = zvanjaSums.indexOf(maxZvanja);
 
    let newScores = [...scores];
    const entry = {
      round: history.length + 1,
      adut: round.adut,
      zvac: zvacIdx,
      pts: [...pts],
      zvanja: zvanjaSums,
      bella: round.bellaPlayer,
      bellaVal: round.bellaValue,
      fall: false,
      delta: [0, 0, 0],
    };
 
    // Bella bonus
    let bellaBonus = [0, 0, 0];
    if (round.bellaPlayer >= 0) {
      bellaBonus[round.bellaPlayer] = round.bellaValue;
    }
 
    // Zvanja: samo viši pobjeđuje
    let zvanjaBonus = [0, 0, 0];
    if (maxZvanja > 0) {
      zvanjaBonus[winnerZvanja] = maxZvanja;
    }
 
    // Fall check: zvač ima manje od pola
    const fell = !round.fall && zvacPts < 82;
 
    if (fell) {
      entry.fall = true;
      // Zvač pada: ne dobiva ništa od bodova, protivnici dijele sve
      // U troje: ostala dvojica dobivaju zbir svih bodova + zvač-ove zvanje idu njima
      const others = [0, 1, 2].filter((i) => i !== zvacIdx);
      const totalBase = 162 + zvanjaBonus.reduce((a, b) => a + b, 0) + bellaBonus.reduce((a, b) => a + b, 0);
      // Podjela pada: protivnici dijele jednako
      others.forEach((i) => {
        entry.delta[i] = Math.ceil(totalBase / 2);
      });
      entry.delta[zvacIdx] = 0;
    } else {
      [0, 1, 2].forEach((i) => {
        entry.delta[i] = pts[i] + zvanjaBonus[i] + bellaBonus[i];
      });
    }
 
    newScores = newScores.map((s, i) => s + entry.delta[i]);
 
    setScores(newScores);
    setHistory([...history, entry]);
    setRound({
      adut: "♠",
      zvacPlayer: (zvacIdx + 1) % 3,
      points: ["", "", ""],
      zvanja: [[], [], []],
      bellaPlayer: -1,
      bellaValue: 20,
      fall: false,
    });
    showToast(fell ? `${names[zvacIdx]} je pao! 😬` : "Runda dodana! ✓");
  }
 
  function resetGame() {
    if (!window.confirm("Resetirati cijelu igru?")) return;
    setScores([0, 0, 0]);
    setHistory([]);
    setRound({
      adut: "♠",
      zvacPlayer: 0,
      points: ["", "", ""],
      zvanja: [[], [], []],
      bellaPlayer: -1,
      bellaValue: 20,
      fall: false,
    });
  }
 
  const maxScore = Math.max(...scores);
  const leader = scores.indexOf(maxScore);
 
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f1117",
        fontFamily: "'Syne', sans-serif",
        color: "#e2e8f0",
        padding: "0 0 80px",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes scorepop {
          0% { transform: scale(1.4); color: #facc15; }
          100% { transform: scale(1); color: inherit; }
        }
        @keyframes toastIn {
          from { transform: translateY(20px) translateX(-50%); opacity: 0; }
          to { transform: translateY(0) translateX(-50%); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .tab-btn { transition: all 0.2s; }
        .tab-btn:hover { opacity: 0.8; }
        .card { background: #1a1d27; border: 1px solid #2d3148; border-radius: 12px; }
        .zvanje-tag {
          display: inline-flex; align-items: center; gap: 4px;
          background: #2d3148; border-radius: 6px;
          padding: 2px 8px; font-size: 12px; font-family: 'JetBrains Mono', monospace;
          cursor: pointer; transition: background 0.15s;
        }
        .zvanje-tag:hover { background: #3d4168; }
        .btn { cursor: pointer; border: none; border-radius: 8px; font-family: 'Syne', sans-serif; font-weight: 700; transition: all 0.18s; }
        .btn:active { transform: scale(0.96); }
        .btn-primary { background: #4f46e5; color: white; padding: 12px 24px; font-size: 15px; }
        .btn-primary:hover { background: #4338ca; }
        .btn-danger { background: #991b1b; color: #fca5a5; padding: 8px 16px; font-size: 13px; }
        .btn-danger:hover { background: #7f1d1d; }
        .btn-sm { padding: 6px 12px; font-size: 13px; }
        .input-field {
          background: #0f1117; border: 1px solid #2d3148; color: #e2e8f0;
          border-radius: 8px; padding: 8px 12px; font-family: 'JetBrains Mono', monospace;
          font-size: 15px; width: 100%; outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus { border-color: #4f46e5; }
        .leader-glow {
          background: linear-gradient(135deg, #1a1d27 60%, #1e1b4b);
          border-color: #4f46e5 !important;
          box-shadow: 0 0 20px rgba(79,70,229,0.15);
        }
      `}</style>
 
      {/* Header */}
      <div style={{ background: "#1a1d27", borderBottom: "1px solid #2d3148", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>
            🃏 Bella
            <span style={{ color: "#4f46e5" }}> u troje</span>
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "JetBrains Mono", marginTop: 2 }}>
            Runda {history.length + 1} · Adut: {round.adut}
          </div>
        </div>
        <button className="btn btn-danger btn-sm" onClick={resetGame}>Reset</button>
      </div>
 
      {/* Score bar */}
      <div style={{ display: "flex", gap: 0, padding: "16px 16px 0" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`card ${i === leader ? "leader-glow" : ""}`}
            style={{ flex: 1, padding: "12px 10px", textAlign: "center", margin: "0 4px", position: "relative" }}
          >
            {i === leader && (
              <div style={{ position: "absolute", top: 6, right: 8, fontSize: 12 }}>👑</div>
            )}
            {editName === i ? (
              <input
                className="input-field"
                style={{ textAlign: "center", fontSize: 13, padding: "4px 8px", marginBottom: 4 }}
                value={names[i]}
                autoFocus
                onChange={(e) => {
                  const n = [...names]; n[i] = e.target.value; setNames(n);
                }}
                onBlur={() => setEditName(-1)}
                onKeyDown={(e) => e.key === "Enter" && setEditName(-1)}
              />
            ) : (
              <div
                style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4, cursor: "pointer" }}
                onClick={() => setEditName(i)}
              >
                {names[i]} ✎
              </div>
            )}
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "JetBrains Mono", color: i === leader ? "#a5b4fc" : "#e2e8f0" }}>
              <AnimatedScore value={scores[i]} />
            </div>
          </div>
        ))}
      </div>
 
      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, padding: "12px 16px 0", borderBottom: "1px solid #2d3148", marginBottom: 16 }}>
        {[["igra", "Igra"], ["povijest", "Povijest"], ["pravila", "Pravila"]].map(([key, label]) => (
          <button
            key={key}
            className="tab-btn"
            onClick={() => setTab(key)}
            style={{
              flex: 1, background: "none", border: "none", cursor: "pointer",
              padding: "8px 0", fontFamily: "Syne", fontWeight: 700, fontSize: 13,
              color: tab === key ? "#a5b4fc" : "#6b7280",
              borderBottom: tab === key ? "2px solid #4f46e5" : "2px solid transparent",
              transition: "all 0.2s",
            }}
          >
            {label}
          </button>
        ))}
      </div>
 
      {/* Tab: Igra */}
      {tab === "igra" && (
        <div style={{ padding: "0 16px" }}>
 
          {/* Adut */}
          <div className="card" style={{ padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>ADUT (truf)</div>
            <div style={{ display: "flex", gap: 8 }}>
              {SUITS.map((s) => (
                <button
                  key={s}
                  onClick={() => setRound((r) => ({ ...r, adut: s }))}
                  style={{
                    flex: 1, background: round.adut === s ? "#2d3148" : "#0f1117",
                    border: round.adut === s ? "2px solid #4f46e5" : "2px solid #2d3148",
                    borderRadius: 8, padding: "10px 0", fontSize: 22, cursor: "pointer",
                    color: SUIT_COLORS[s], transition: "all 0.15s",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
 
          {/* Zvač */}
          <div className="card" style={{ padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>TKO JE ZVAO</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  onClick={() => setRound((r) => ({ ...r, zvacPlayer: i }))}
                  style={{
                    flex: 1, background: round.zvacPlayer === i ? "#312e81" : "#0f1117",
                    border: round.zvacPlayer === i ? "2px solid #4f46e5" : "2px solid #2d3148",
                    borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700,
                    color: round.zvacPlayer === i ? "#a5b4fc" : "#6b7280", cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {names[i]}
                </button>
              ))}
            </div>
          </div>
 
          {/* Bodovi po igraču */}
          <div className="card" style={{ padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>BODOVI (ukupno mora biti 162)</div>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
                <div style={{ width: 70, fontSize: 13, color: "#9ca3af" }}>{names[i]}</div>
                <input
                  type="number"
                  className="input-field"
                  placeholder="0"
                  min="0" max="162"
                  value={round.points[i]}
                  onChange={(e) => {
                    const p = [...round.points]; p[i] = e.target.value;
                    setRound((r) => ({ ...r, points: p }));
                  }}
                />
                <div style={{ fontSize: 12, color: "#4b5563", width: 30, textAlign: "right" }}>
                  {round.points[i] ? `+${totalZvanja(i)}` : ""}
                </div>
              </div>
            ))}
            <div style={{
              marginTop: 10, fontSize: 12, textAlign: "right",
              color: round.points.reduce((s, p) => s + (parseInt(p) || 0), 0) === 162 ? "#4ade80" : "#f87171"
            }}>
              Zbroj: {round.points.reduce((s, p) => s + (parseInt(p) || 0), 0)} / 162
            </div>
          </div>
 
          {/* Zvanja */}
          <div className="card" style={{ padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>ZVANJA</div>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ marginBottom: i < 2 ? 14 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>{names[i]}</span>
                  <span style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "#a5b4fc" }}>
                    {totalZvanja(i) > 0 ? `+${totalZvanja(i)}` : ""}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                  {round.zvanja[i].map((z, j) => (
                    <span key={j} className="zvanje-tag" onClick={() => removeZvanje(i, j)}>
                      {z.label} <span style={{ color: "#f87171" }}>✕</span>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {ZVANJE_VALUES.map((z, j) => (
                    <button
                      key={j}
                      className="btn"
                      style={{
                        background: "#0f1117", border: "1px solid #2d3148",
                        color: "#6b7280", fontSize: 11, padding: "3px 8px", borderRadius: 6,
                      }}
                      onClick={() => addZvanje(i, z)}
                    >
                      +{z.label} ({z.value})
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
 
          {/* Bella */}
          <div className="card" style={{ padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
              BELLA (kralj + dama truf) — <span style={{ color: "#a5b4fc" }}>posebni bonus</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button
                className="btn btn-sm"
                style={{
                  background: round.bellaPlayer === -1 ? "#2d3148" : "#0f1117",
                  border: round.bellaPlayer === -1 ? "2px solid #4f46e5" : "2px solid #2d3148",
                  color: round.bellaPlayer === -1 ? "#a5b4fc" : "#6b7280",
                  flex: 1,
                }}
                onClick={() => setRound((r) => ({ ...r, bellaPlayer: -1 }))}
              >
                Bez belle
              </button>
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  className="btn btn-sm"
                  style={{
                    background: round.bellaPlayer === i ? "#312e81" : "#0f1117",
                    border: round.bellaPlayer === i ? "2px solid #4f46e5" : "2px solid #2d3148",
                    color: round.bellaPlayer === i ? "#a5b4fc" : "#6b7280",
                    flex: 1, fontSize: 12,
                  }}
                  onClick={() => setRound((r) => ({ ...r, bellaPlayer: i }))}
                >
                  {names[i]}
                </button>
              ))}
            </div>
            {round.bellaPlayer >= 0 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>Vrijednost:</span>
                {[10, 20].map((v) => (
                  <button
                    key={v}
                    className="btn btn-sm"
                    style={{
                      background: round.bellaValue === v ? "#312e81" : "#0f1117",
                      border: round.bellaValue === v ? "2px solid #4f46e5" : "2px solid #2d3148",
                      color: round.bellaValue === v ? "#a5b4fc" : "#6b7280",
                    }}
                    onClick={() => setRound((r) => ({ ...r, bellaValue: v }))}
                  >
                    {v} {v === 20 ? "(truf)" : "(obična)"}
                  </button>
                ))}
              </div>
            )}
            <div style={{ marginTop: 10, fontSize: 12, color: "#4b5563", lineHeight: 1.6 }}>
              Bella se prijavljuje kada igrač odigra kralja ili damu trufova govoreći <em style={{ color: "#6b7280" }}>"bela"</em>. Vrijednost: 20 bodova ako su trufovi (20 u adut), 10 ako nisu.
            </div>
          </div>
 
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={commitRound}>
            Potvrdi rundu →
          </button>
        </div>
      )}
 
      {/* Tab: Povijest */}
      {tab === "povijest" && (
        <div style={{ padding: "0 16px" }}>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", color: "#4b5563", padding: "40px 0", fontSize: 14 }}>
              Još nema odigranih rundi.
            </div>
          ) : (
            [...history].reverse().map((h, idx) => (
              <div key={idx} className="card" style={{ padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontFamily: "JetBrains Mono" }}>
                    Runda {h.round} · Adut: {h.adut}
                  </div>
                  {h.fall && (
                    <span style={{ fontSize: 11, background: "#7f1d1d", color: "#fca5a5", borderRadius: 4, padding: "2px 8px" }}>
                      PAD 💀
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{
                      flex: 1, textAlign: "center", background: "#0f1117", borderRadius: 8,
                      padding: "8px 6px",
                      border: i === h.zvac ? "1px solid #4f46e5" : "1px solid #2d3148",
                    }}>
                      <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
                        {names[i]} {i === h.zvac ? "⚡" : ""}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "JetBrains Mono", color: h.delta[i] > 0 ? "#4ade80" : "#4b5563" }}>
                        +{h.delta[i]}
                      </div>
                      <div style={{ fontSize: 11, color: "#4b5563" }}>
                        {h.pts[i]} bod.{h.zvanja[i] > 0 ? ` +${h.zvanja[i]} zv.` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
 
      {/* Tab: Pravila */}
      {tab === "pravila" && (
        <div style={{ padding: "0 16px" }}>
          {[
            ["🃏 Osnovni cilj", "Skupiti što više bodova osvajanjem štihova. Bodovi karte: A=11, 10=10, K=4, Q=3, J=2 (i J truf=20, 9 truf=14). Ukupno u špilu: 162 boda."],
            ["⚡ Zvanje / Adut", "Igrač koji zove bira adut (truf). Cilj mu je skupiti više od 82 boda. Ako skupi manje — pada."],
            ["🎴 Bella", "Kralj + dama aduta u rukama jednog igrača. Vrijednost: 20 bodova ako su adut, 10 ako nisu. Prijavljuje se govoreći 'bela' pri odigravanju kralja ili dame trufova. U troje: bella vrijedi istom igraču koji ju je imao, bez obzira tko je zvao."],
            ["📣 Zvanja (Sekvence)", "Uzastopne karte iste boje. Terz(3)=20, Kvart(4)=50, Kvint+(5+)=100. Četiri iste boje (četiri asa, četiri desetke...)=100. Četiri deke (J)=200. Samo igrač s najvišim zvanjem uzima sve bodove zvanja."],
            ["💀 Pad", "Ako zvač skupi manje od 82 boda, pada. Protivnici (ostala dvojica) dijele sve bodove te runde: 162 + zvanja + bella, podijeljeno na dva."],
            ["🏆 Pobjeda", "Igra se do dogovorenog broja bodova (npr. 1001). Pobjeđuje prvi koji prođe taj prag."],
          ].map(([title, text]) => (
            <div key={title} className="card" style={{ padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>{title}</div>
              <div style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.7 }}>{text}</div>
            </div>
          ))}
        </div>
      )}
 
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%",
          transform: "translateX(-50%)",
          background: "#1a1d27", border: "1px solid #4f46e5",
          borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600,
          color: "#a5b4fc", boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          animation: "toastIn 0.25s ease",
          whiteSpace: "nowrap", zIndex: 999,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}


