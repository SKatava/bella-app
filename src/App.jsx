import { useState, useRef, useEffect } from "react";

const PLAYERS = ["Igrač 1", "Igrač 2", "Igrač 3"];
const SUITS = ["♠", "♥", "♦", "♣"];
const SUIT_COLORS = { "♠": "#ffffff", "♥": "#ff453a", "♦": "#ff453a", "♣": "#ffffff" };
const ZVANJA_OPTS = [20, 50, 100, 150, 200];

// iOS dark palette
const C = {
  bg:        "#000000",
  bg2:       "#1c1c1e",
  bg3:       "#2c2c2e",
  bg4:       "#3a3a3c",
  sep:       "#38383a",
  label:     "#ffffff",
  label2:    "#ebebf599",  // secondary ~60%
  label3:    "#ebebf54d",  // tertiary ~30%
  fill:      "#787880",
  white:     "#ffffff",
  danger:    "#ff453a",
  green:     "#32d74b",
};

function AnimatedScore({ value }) {
  const prev = useRef(value);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (prev.current !== value) { setKey(k => k + 1); prev.current = value; }
  }, [value]);
  return <span key={key} style={{ display: "inline-block", animation: "pop 0.3s cubic-bezier(.36,.07,.19,.97)" }}>{value}</span>;
}

// iOS-style segmented control
function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{
      display: "flex", background: C.bg3, borderRadius: 9, padding: 2, gap: 2,
    }}>
      {options.map(({ key, label }) => (
        <button key={key} onClick={() => onChange(key)} style={{
          flex: 1, border: "none", borderRadius: 7, padding: "6px 0",
          background: value === key ? C.bg2 : "transparent",
          color: value === key ? C.white : C.fill,
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          fontFamily: "-apple-system, 'SF Pro Text', sans-serif",
          boxShadow: value === key ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
          transition: "all 0.18s",
        }}>{label}</button>
      ))}
    </div>
  );
}

// iOS-style list row
function Row({ label, right, onPress, last }) {
  return (
    <div onClick={onPress} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px", background: C.bg2,
      borderBottom: last ? "none" : `1px solid ${C.sep}`,
      cursor: onPress ? "pointer" : "default",
    }}>
      <span style={{ fontSize: 16, color: C.label, fontFamily: "-apple-system, 'SF Pro Text', sans-serif" }}>{label}</span>
      <span style={{ fontSize: 16, color: C.label2, fontFamily: "-apple-system, 'SF Pro Text', sans-serif" }}>{right}</span>
    </div>
  );
}

export default function BellaTracker() {
  const [names, setNames] = useState(PLAYERS.slice());
  const [scores, setScores] = useState([0, 0, 0]);
  const [history, setHistory] = useState([]);
  const [round, setRound] = useState({
    adut: "♠", zvacPlayer: 0,
    points: ["", "", ""], zvanja: [[], [], []],
  });
  const [tab, setTab] = useState("igra");
  const [editName, setEditName] = useState(-1);
  const [toast, setToast] = useState(null);
  const [autoField, setAutoField] = useState(-1);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function handlePointChange(idx, val) {
    const p = [...round.points];
    p[idx] = val;
    let newAutoField = autoField;
    if (idx === autoField) { newAutoField = -1; setAutoField(-1); }
    const others = [0, 1, 2].filter(i => i !== idx);
    const otherFilled = others.filter(i => p[i] !== "" && i !== newAutoField);
    if (otherFilled.length === 1) {
      const calcIdx = others.find(i => i !== otherFilled[0]);
      const sum = (parseInt(p[idx]) || 0) + (parseInt(p[otherFilled[0]]) || 0);
      const third = 162 - sum;
      if (third >= 0 && third <= 162) { p[calcIdx] = String(third); setAutoField(calcIdx); }
    } else if (otherFilled.length === 2 && newAutoField !== -1) {
      const sum = [0, 1, 2].filter(i => i !== newAutoField).reduce((s, i) => s + (parseInt(p[i]) || 0), 0);
      const third = 162 - sum;
      if (third >= 0 && third <= 162) p[newAutoField] = String(third);
    }
    setRound(r => ({ ...r, points: p }));
  }

  function addZvanje(playerIdx, val) {
    setRound(r => ({ ...r, zvanja: r.zvanja.map((arr, i) => i === playerIdx ? [...arr, val] : arr) }));
  }
  function removeZvanje(playerIdx, j) {
    setRound(r => ({ ...r, zvanja: r.zvanja.map((arr, i) => i === playerIdx ? arr.filter((_, k) => k !== j) : arr) }));
  }
  function totalZvanja(i) { return round.zvanja[i].reduce((s, v) => s + v, 0); }

  function commitRound() {
    const pts = round.points.map(p => parseInt(p) || 0);
    const sum = pts.reduce((a, b) => a + b, 0);
    if (sum !== 162) { showToast(`Zbroj mora biti 162 (sada: ${sum})`); return; }
    const zvacIdx = round.zvacPlayer;
    const zvanjaSums = [0, 1, 2].map(i => totalZvanja(i));
    const maxZvanja = Math.max(...zvanjaSums);
    const winnerZvanja = zvanjaSums.indexOf(maxZvanja);
    const zvanjaBonus = [0, 0, 0];
    if (maxZvanja > 0) zvanjaBonus[winnerZvanja] = maxZvanja;
    const fell = pts[zvacIdx] < 82;
    const entry = { round: history.length + 1, adut: round.adut, zvac: zvacIdx, pts: [...pts], zvanja: zvanjaSums, fall: fell, delta: [0, 0, 0] };
    if (fell) {
      const others = [0, 1, 2].filter(i => i !== zvacIdx);
      const totalBase = 162 + zvanjaBonus.reduce((a, b) => a + b, 0);
      others.forEach(i => { entry.delta[i] = Math.ceil(totalBase / 2); });
    } else {
      [0, 1, 2].forEach(i => { entry.delta[i] = pts[i] + zvanjaBonus[i]; });
    }
    setScores(scores.map((s, i) => s + entry.delta[i]));
    setHistory([...history, entry]);
    setAutoField(-1);
    setRound({ adut: "♠", zvacPlayer: (zvacIdx + 1) % 3, points: ["", "", ""], zvanja: [[], [], []] });
    showToast(fell ? `${names[zvacIdx]} je pao! 😬` : "Runda dodana ✓");
  }

  function resetGame() {
    if (!window.confirm("Resetirati igru?")) return;
    setScores([0, 0, 0]); setHistory([]); setAutoField(-1);
    setRound({ adut: "♠", zvacPlayer: 0, points: ["", "", ""], zvanja: [[], [], []] });
  }

  const leader = scores.indexOf(Math.max(...scores));
  const sf = "-apple-system, 'SF Pro Text', sans-serif";
  const sfDisplay = "-apple-system, 'SF Pro Display', sans-serif";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.label, fontFamily: sf, WebkitFontSmoothing: "antialiased" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pop { 0% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes slideUp { from { transform: translateY(12px) translateX(-50%); opacity: 0; } to { transform: translateY(0) translateX(-50%); opacity: 1; } }
        input::placeholder { color: #3a3a3c; }
        button { -webkit-tap-highlight-color: transparent; }
        button:active { opacity: 0.6 !important; }
      `}</style>

      {/* iOS nav bar */}
      <div style={{
        background: `${C.bg2}ee`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.sep}`,
        padding: "52px 16px 12px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: sfDisplay, letterSpacing: "-0.5px" }}>
          Bella u troje
        </div>
        <button onClick={resetGame} style={{
          background: "none", border: "none", color: C.danger,
          fontSize: 16, fontWeight: 400, cursor: "pointer", padding: "4px 0",
        }}>Reset</button>
      </div>

      {/* Scoreboard */}
      <div style={{ padding: "16px 16px 0", display: "flex", gap: 10 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            flex: 1, background: i === leader ? C.bg3 : C.bg2,
            borderRadius: 16, padding: "14px 10px", textAlign: "center",
            border: i === leader ? `1px solid ${C.bg4}` : `1px solid ${C.sep}`,
            position: "relative",
          }}>
            {i === leader && (
              <div style={{ position: "absolute", top: 8, right: 10, fontSize: 12 }}>👑</div>
            )}
            {editName === i ? (
              <input
                style={{
                  background: "none", border: "none", color: C.label2, fontSize: 12,
                  textAlign: "center", width: "100%", outline: "none", fontFamily: sf,
                  marginBottom: 4,
                }}
                value={names[i]} autoFocus
                onChange={e => { const n = [...names]; n[i] = e.target.value; setNames(n); }}
                onBlur={() => setEditName(-1)}
                onKeyDown={e => e.key === "Enter" && setEditName(-1)}
              />
            ) : (
              <div style={{ fontSize: 12, color: C.label2, marginBottom: 4, cursor: "pointer" }}
                onClick={() => setEditName(i)}>
                {names[i]}
              </div>
            )}
            <div style={{ fontSize: 30, fontWeight: 700, fontFamily: sfDisplay, color: i === leader ? C.white : C.label }}>
              <AnimatedScore value={scores[i]} />
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ padding: "14px 16px 0" }}>
        <SegmentedControl
          options={[{ key: "igra", label: "Igra" }, { key: "povijest", label: "Povijest" }, { key: "pravila", label: "Pravila" }]}
          value={tab} onChange={setTab}
        />
      </div>

      {/* ── TAB: IGRA ── */}
      {tab === "igra" && (
        <div style={{ padding: "20px 16px 100px" }}>

          {/* Adut */}
          <div style={{ fontSize: 12, color: C.label2, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, paddingLeft: 4 }}>Adut</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {SUITS.map(s => (
              <button key={s} onClick={() => setRound(r => ({ ...r, adut: s }))} style={{
                flex: 1, background: round.adut === s ? C.bg3 : C.bg2,
                border: round.adut === s ? `2px solid ${C.white}` : `1px solid ${C.sep}`,
                borderRadius: 12, padding: "12px 0", fontSize: 22,
                color: SUIT_COLORS[s], cursor: "pointer", transition: "all 0.15s",
              }}>{s}</button>
            ))}
          </div>

          {/* Tko je zvao */}
          <div style={{ fontSize: 12, color: C.label2, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, paddingLeft: 4 }}>Tko je zvao</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[0, 1, 2].map(i => (
              <button key={i} onClick={() => setRound(r => ({ ...r, zvacPlayer: i }))} style={{
                flex: 1, background: round.zvacPlayer === i ? C.white : C.bg2,
                border: `1px solid ${round.zvacPlayer === i ? C.white : C.sep}`,
                borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 600,
                color: round.zvacPlayer === i ? C.bg : C.label2,
                cursor: "pointer", transition: "all 0.15s",
              }}>{names[i]}</button>
            ))}
          </div>

          {/* Bodovi */}
          <div style={{ fontSize: 12, color: C.label2, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, paddingLeft: 4 }}>
            Bodovi · unesi 2, treći se računa sam
          </div>
          <div style={{ background: C.bg2, borderRadius: 12, overflow: "hidden", marginBottom: 20, border: `1px solid ${C.sep}` }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                display: "flex", alignItems: "center",
                borderBottom: i < 2 ? `1px solid ${C.sep}` : "none",
                padding: "0 16px",
              }}>
                <div style={{ fontSize: 16, color: C.label, flex: 1, minWidth: 0 }}>{names[i]}</div>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*"
                  placeholder="—"
                  value={round.points[i]}
                  onChange={e => handlePointChange(i, e.target.value.replace(/[^0-9]/g, ""))}
                  style={{
                    width: 72, flexShrink: 0, background: "none", border: "none", outline: "none",
                    color: i === autoField ? C.label2 : C.white,
                    fontSize: 22, fontWeight: 600, fontFamily: sfDisplay,
                    padding: "14px 0", textAlign: "right",
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ textAlign: "right", fontSize: 13, color: round.points.reduce((s, p) => s + (parseInt(p) || 0), 0) === 162 ? C.green : C.label2, marginTop: -14, marginBottom: 20, paddingRight: 4 }}>
            {round.points.reduce((s, p) => s + (parseInt(p) || 0), 0)} / 162
          </div>

          {/* Zvanja */}
          <div style={{ fontSize: 12, color: C.label2, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, paddingLeft: 4 }}>Zvanja</div>
          <div style={{ background: C.bg2, borderRadius: 12, overflow: "hidden", marginBottom: 20, border: `1px solid ${C.sep}` }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ borderBottom: i < 2 ? `1px solid ${C.sep}` : "none", padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 16, color: C.label }}>{names[i]}</span>
                  {totalZvanja(i) > 0 && (
                    <span style={{ fontSize: 15, fontWeight: 600, color: C.green }}>+{totalZvanja(i)}</span>
                  )}
                </div>
                {round.zvanja[i].length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {round.zvanja[i].map((v, j) => (
                      <button key={j} onClick={() => removeZvanje(i, j)} style={{
                        background: C.bg3, border: `1px solid ${C.bg4}`,
                        borderRadius: 20, color: C.label, fontSize: 13,
                        padding: "4px 12px", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 5,
                      }}>
                        {v} <span style={{ color: C.danger, fontSize: 11, fontWeight: 700 }}>✕</span>
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  {ZVANJA_OPTS.map(v => (
                    <button key={v} onClick={() => addZvanje(i, v)} style={{
                      flex: 1, background: C.bg3, border: `1px solid ${C.bg4}`,
                      borderRadius: 8, color: C.label2, fontSize: 13,
                      padding: "6px 0", cursor: "pointer",
                    }}>+{v}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Potvrdi */}
          <button onClick={commitRound} style={{
            width: "100%", background: C.white, color: C.bg,
            border: "none", borderRadius: 14, padding: "16px",
            fontSize: 17, fontWeight: 600, cursor: "pointer",
            fontFamily: sf, letterSpacing: "-0.2px",
          }}>
            Potvrdi rundu
          </button>
        </div>
      )}

      {/* ── TAB: POVIJEST ── */}
      {tab === "povijest" && (
        <div style={{ padding: "20px 16px 100px" }}>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", color: C.label2, padding: "60px 0", fontSize: 16 }}>
              Još nema odigranih rundi
            </div>
          ) : (
            [...history].reverse().map((h, idx) => (
              <div key={idx} style={{ background: C.bg2, borderRadius: 12, marginBottom: 12, border: `1px solid ${C.sep}`, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.sep}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: C.label2 }}>Runda {h.round} · Adut {h.adut}</span>
                  {h.fall && (
                    <span style={{ fontSize: 12, background: C.danger, color: C.white, borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>PAD</span>
                  )}
                </div>
                <div style={{ display: "flex" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      flex: 1, textAlign: "center", padding: "12px 6px",
                      borderRight: i < 2 ? `1px solid ${C.sep}` : "none",
                      background: i === h.zvac ? C.bg3 : "none",
                    }}>
                      <div style={{ fontSize: 11, color: C.label2, marginBottom: 4 }}>
                        {names[i]}{i === h.zvac ? " ⚡" : ""}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: h.delta[i] > 0 ? C.white : C.label2 }}>
                        +{h.delta[i]}
                      </div>
                      <div style={{ fontSize: 11, color: C.label2, marginTop: 2 }}>
                        {h.pts[i]}{h.zvanja[i] > 0 ? ` +${h.zvanja[i]}zv` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB: PRAVILA ── */}
      {tab === "pravila" && (
        <div style={{ padding: "20px 16px 100px" }}>
          {[
            ["Bodovi karata", "A=11, 10=10, K=4, Q=3, J=2. J aduta=20, 9 aduta=14. Ukupno: 162."],
            ["Zvanje", "Igrač koji zove bira adut. Mora skupiti više od 82 boda ili pada."],
            ["Zvanja (sekvence)", "Terz(3)=20 · Kvart(4)=50 · Kvint+(5+)=100 · Četiri iste=100 · Četiri deke(J)=200. Samo igrač s najvišim zvanjem uzima sve."],
            ["Pad", "Zvač skupi <82: ne dobiva ništa. Ostala dvojica dijele sve bodove runde na pola."],
          ].map(([t, txt], i, arr) => (
            <div key={t} style={{
              background: C.bg2, overflow: "hidden",
              borderRadius: i === 0 ? "12px 12px 0 0" : i === arr.length - 1 ? "0 0 12px 12px" : 0,
              borderBottom: i < arr.length - 1 ? `1px solid ${C.sep}` : "none",
              border: `1px solid ${C.sep}`,
              marginBottom: i < arr.length - 1 ? -1 : 0,
              padding: "14px 16px",
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.label, marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 14, color: C.label2, lineHeight: 1.6 }}>{txt}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
          background: C.bg3, borderRadius: 20, padding: "12px 20px",
          fontSize: 14, fontWeight: 500, color: C.white,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          animation: "slideUp 0.25s ease", whiteSpace: "nowrap", zIndex: 999,
        }}>{toast}</div>
      )}
    </div>
  );
}
