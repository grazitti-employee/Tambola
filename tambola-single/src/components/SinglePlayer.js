import React, { useEffect, useRef, useState } from "react";
import "../App.css"; // keep your styles

/* ---------------- Helper functions ---------------- */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function range(n, start = 1) {
  return Array.from({ length: n }, (_, i) => i + start);
}

function getNRandomUnique(from, to, count) {
  const pool = range(to - from + 1, from);
  return shuffleArray(pool).slice(0, count);
}

/* Generate ticket grid (3x9, 15 numbers total) */
function generateTicketGrid() {
  const rows = 3;
  const cols = 9;

  const chosenPositions = [];
  for (let r = 0; r < rows; r++) {
    const colsIndices = shuffleArray(range(cols, 0)).slice(0, 5);
    for (const c of colsIndices) {
      chosenPositions.push({ r, c: c - 1 });
    }
  }

  const numbers = getNRandomUnique(1, 90, 15);
  const shuffledNumbers = shuffleArray(numbers);

  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  );

  for (let i = 0; i < chosenPositions.length; i++) {
    const { r, c } = chosenPositions[i];
    grid[r][c] = {
      number: shuffledNumbers[i],
      marked: false,
      row: r,
      col: c,
    };
  }

  console.log("Generated ticket grid", grid);
  return grid;
}

/* Verify winning patterns */
function verifyPattern(grid, pattern) {
  const flatten = grid.flat().filter(Boolean);
  const markedCells = flatten.filter((cell) => cell.marked);
  const totalNumbers = flatten.length;

  if (pattern === "First Five") return markedCells.length >= 5;

  if (pattern === "Top Line") return grid[0].filter(Boolean).every((c) => c.marked);

  if (pattern === "Middle Line") return grid[1].filter(Boolean).every((c) => c.marked);

  if (pattern === "Bottom Line") return grid[2].filter(Boolean).every((c) => c.marked);

  if (pattern === "Full Housie") return markedCells.length === totalNumbers;

  return false;
}

/* ---------------- UI Components ---------------- */
function Ticket({ grid, onCellClick }) {
  return (
    <div className="ticket">
      {grid.map((row, rIdx) => (
        <div className="ticket-row" key={rIdx}>
          {row.map((cell, cIdx) => (
            <div
              key={cIdx}
              className={`ticket-cell ${cell ? "" : "empty"} ${
                cell && cell.marked ? "marked" : ""
              }`}
              onClick={() => cell && onCellClick(cell)}
            >
              {cell ? cell.number : ""}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CalledNumbers({ called }) {
  return (
    <div className="called-numbers">
      <h4>Called Numbers ({called.length})</h4>
      <div className="called-grid">
        {called.map((n) => (
          <div key={n} className="called-num">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}

function Notifications({ list }) {
  return (
    <div className="notifications">
      <h4>Notifications</h4>
      <div className="notifications-list">
        {list.map((n, i) => (
          <div key={i} className="notification">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Main Component ---------------- */
export default function SinglePlayer({ onBack }) {
  const [grid, setGrid] = useState(() => generateTicketGrid());
  const [callerPool, setCallerPool] = useState(() => shuffleArray(range(90, 1)));
  const [called, setCalled] = useState([]);
  const [status, setStatus] = useState("idle");
  const [intervalMs, setIntervalMs] = useState(3000);
  const [notifications, setNotifications] = useState([]);
  const [claimed, setClaimed] = useState({
    "First Five": null,
    "Top Line": null,
    "Middle Line": null,
    "Bottom Line": null,
    "Full Housie": null,
  });
  const [eligible, setEligible] = useState({
    "First Five": false,
    "Top Line": false,
    "Middle Line": false,
    "Bottom Line": false,
    "Full Housie": false,
  });

  const intervalRef = useRef(null);
  const prevEligibleRef = useRef({ ...eligible });

  function addNotification(text) {
    setNotifications((prev) => {
      if (prev.length > 0 && prev[0] === text) return prev;
      return [text, ...prev].slice(0, 50);
    });
  }

  function generateNewTicketAndReset() {
    setGrid(generateTicketGrid());
    setCallerPool(shuffleArray(range(90, 1)));
    setCalled([]);
    setStatus("idle");
    setClaimed({
      "First Five": null,
      "Top Line": null,
      "Middle Line": null,
      "Bottom Line": null,
      "Full Housie": null,
    });
    setEligible({
      "First Five": false,
      "Top Line": false,
      "Middle Line": false,
      "Bottom Line": false,
      "Full Housie": false,
    });
    prevEligibleRef.current = { ...eligible };
    setNotifications([]);
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  function callNextNumber() {
    setCallerPool((prevPool) => {
      if (!prevPool || prevPool.length === 0) {
        addNotification("All numbers have been called.");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setStatus("finished");
        return prevPool;
      }

      const next = prevPool[0];
      const newPool = prevPool.slice(1);

      setCalled((prevCalled) => {
        if (prevCalled.includes(next)) return prevCalled;
        addNotification(`Number called: ${next}`);
        return [next, ...prevCalled];
      });

      return newPool;
    });
  }

  function startCalling() {
    if (status === "running") return;
    if (callerPool.length === 0) return;
    setStatus("running");
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(callNextNumber, intervalMs);
  }

  function pauseCalling() {
    setStatus("paused");
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  function resetPauseResume() {
    if (status === "running") pauseCalling();
    else startCalling();
  }

  function handleCellClick(cell) {
    const num = cell.number;
    if (!called.includes(num)) {
      addNotification(`Cannot mark ${num} — not called yet.`);
      return;
    }
    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((c) => (c && c.number === num ? { ...c, marked: !c.marked } : c))
      )
    );
  }

  function claimPattern(patternName) {
    if (claimed[patternName]) {
      addNotification(`${patternName} already claimed.`);
      return;
    }
    const ok = verifyPattern(grid, patternName);
    if (!ok) {
      addNotification(`Claim verification failed for ${patternName}.`);
      return;
    }
    const time = new Date().toLocaleTimeString();
    setClaimed((prev) => ({ ...prev, [patternName]: { by: "You", time } }));
    addNotification(`${patternName} claimed!`);
    if (patternName === "Full Housie") {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setStatus("finished");
      addNotification("Game finished: Full Housie!");
    }
  }

  useEffect(() => {
    const patterns = ["First Five", "Top Line", "Middle Line", "Bottom Line", "Full Housie"];
    const newElig = {};
    for (const p of patterns) {
      if (claimed[p]) newElig[p] = false;
      else newElig[p] = verifyPattern(grid, p);
    }
    setEligible(newElig);
    prevEligibleRef.current = { ...newElig };
  }, [grid, called, claimed]);

  useEffect(() => {
    if (status === "running") {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(callNextNumber, intervalMs);
    }
  }, [intervalMs]);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const totalMarked = grid.flat().filter(Boolean).filter((c) => c.marked).length;

  return (
    <div className="app">
      {/* Back Button */}
      <button onClick={onBack} className="back-btn">
        ⬅ Back
      </button>

      <header>
        <h1>Tambola — Single Player</h1>
      </header>

      <main>
        <section className="left-panel">
          <div className="controls card">
            <h4>Controls</h4>
            <button onClick={generateNewTicketAndReset}>New Ticket & Reset</button>
            <button onClick={callNextNumber}>Call Next (manual)</button>
            <button onClick={resetPauseResume}>
              {status === "running" ? "Pause" : "Start"}
            </button>
            <button onClick={pauseCalling}>Pause</button>
            <div>Status: {status}</div>
            <div>Called: {called.length}</div>
            <div>Marked: {totalMarked}</div>
          </div>

          <div className="card">
            <h4>Your Ticket</h4>
            <Ticket grid={grid} onCellClick={handleCellClick} />
          </div>

          <div className="card">
            <h4>Claim Patterns</h4>
            {["First Five", "Top Line", "Middle Line", "Bottom Line", "Full Housie"].map(
              (p) => (
                <button key={p} disabled={!eligible[p] || claimed[p]} onClick={() => claimPattern(p)}>
                  {claimed[p] ? `${p} — Claimed` : `Claim ${p}`}
                </button>
              )
            )}
          </div>
        </section>

        <section className="right-panel">
          <div className="card">
            <CalledNumbers called={called} />
          </div>
          <div className="card">
            <Notifications list={notifications} />
          </div>
        </section>
      </main>
    </div>
  );
}
