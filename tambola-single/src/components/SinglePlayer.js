import React, { useEffect, useRef, useState } from "react";
// import "../App.css"; // keep your styles
import "./SinglePlayer.css";

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
//18
function getNRandomUnique(from, to, count) {
  const pool = range(to - from + 1, from);
  return shuffleArray(pool).slice(0, count);
}

/* Generate ticket grid (3x9, 15 numbers total) */
// Drop-in replacement for generateTicketGrid() using the exact balanced logic you provided
function generateTicketGrid(attempt = 0) {
  if (attempt > 50) throw new Error("Failed to generate ticket after many attempts");

  // helper: shuffled column pools (1..10, 11..20, ..., 81..90)
  const columnsPool = [];
  for (let i = 0; i < 9; i++) {
    const start = i * 10 + 1;
    const end = i === 8 ? 90 : (i + 1) * 10;
    const nums = [];
    for (let n = start; n <= end; n++) nums.push(n);
    // shuffle
    nums.sort(() => Math.random() - 0.5);
    columnsPool.push(nums);
  }

  // ticket skeleton: 3 rows x 9 cols, initialized with null
  const ticket = Array.from({ length: 3 }, () => Array(9).fill(null));
  const rowCounts = [0, 0, 0];

  // Allowed splits for each 3-column block (they sum to 5)
  const splits = [
    [2, 2, 1],
    [2, 1, 2],
    [1, 2, 2],
  ];

  for (let block = 0; block < 3; block++) {
    const cols = [block * 3, block * 3 + 1, block * 3 + 2];

    // choose a valid split that doesn't overflow rowCounts
    let chosenSplit = null;
    const shuffledSplits = splits.slice().sort(() => Math.random() - 0.5);
    for (const split of shuffledSplits) {
      let ok = true;
      for (let r = 0; r < 3; r++) {
        if (rowCounts[r] + split[r] > 5) {
          ok = false;
          break;
        }
      }
      if (ok) {
        chosenSplit = split;
        break;
      }
    }

    // if no split works, retry whole ticket
    if (!chosenSplit) {
      return generateTicketGrid(attempt + 1);
    }

    // update rowCounts
    for (let r = 0; r < 3; r++) rowCounts[r] += chosenSplit[r];

    // allocate positions for this block according to chosenSplit
    const allPositions = []; // entries of form [row, col]
    for (let r = 0; r < 3; r++) {
      const colsCopy = [...cols];
      for (let k = 0; k < chosenSplit[r]; k++) {
        const idx = Math.floor(Math.random() * colsCopy.length);
        const col = colsCopy.splice(idx, 1)[0];
        allPositions.push([r, col]);
      }
    }

    // group by column -> rows to fill that column
    const colBuckets = {};
    for (const c of cols) colBuckets[c] = [];
    allPositions.forEach(([r, c]) => colBuckets[c].push(r));

    // for each column in block: pick required numbers (from that column pool), sort ascending, place in rows ascending
    for (const c of cols) {
      colBuckets[c].sort((a, b) => a - b); // top-to-bottom order
      const takeCount = colBuckets[c].length;
      // take numbers from the column pool (they were pre-shuffled), then sort numerically ascending
      const picked = columnsPool[c].splice(0, takeCount).sort((a, b) => a - b);
      for (let i = 0; i < takeCount; i++) {
        const rowIndex = colBuckets[c][i];
        ticket[rowIndex][c] = {
          number: picked[i],
          marked: false,
          row: rowIndex,
          col: c,
        };
      }
    }
  }

  // Final sanity check: each row must have exactly 5 numbers and total 15
  const finalRowCounts = ticket.map((row) => row.filter(Boolean).length);
  const totalNumbers = finalRowCounts.reduce((s, n) => s + n, 0);
  if (finalRowCounts.some((c) => c !== 5) || totalNumbers !== 15) {
    // if somehow invalid, retry
    return generateTicketGrid(attempt + 1);
  }

  // Success
  console.log("Generated balanced Tambola ticket:", ticket);
  return ticket;
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
              className={`ticket-cell ${cell ? "" : "empty"} ${cell && cell.marked ? "marked" : ""
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
      <h4>Called Numbers ({called.length}/90)</h4>
      <div className="called-grid">
        {Array.from({ length: 90 }, (_, i) => {
          const num = i + 1;
          const isCalled = called.includes(num);
          return (
            <div
              key={num}
              className={`called-num ${isCalled ? "highlight" : ""}`}
            >
              {num}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// function CalledNumbers({ called }) {
//   return (
//     <div className="called-numbers">
//       <h4>Called Numbers ({called.length})</h4>
//       <div className="called-grid">
//         {called.map((n) => (
//           <div key={n} className="called-num">
//             {n}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

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



      <header>
        <div>
          <button onClick={onBack} className="back-btn">⬅ Back</button>
        </div>

        <div><h1>Tambola — Single Player</h1></div>
      </header>

      <main>
        <section className="left-panel">
          <div className="card controls">
            <h4>Controls</h4>
            <div>
              <button onClick={generateNewTicketAndReset}>New Ticket & Reset</button>
              <button onClick={callNextNumber}>Call Next (manual)</button>
              <button onClick={resetPauseResume}>
                {status === "running" ? "Pause" : "Start"}
              </button>
              {/* <button onClick={pauseCalling}>Pause</button> */}
            </div>

            <div>Status: {status}</div>
            <div>Called: {called.length}</div>
            <div>Marked: {totalMarked}</div>
          </div>

          <div className="card ticket-card">
            <h4>Your Ticket</h4>
            <Ticket grid={grid} onCellClick={handleCellClick} />
          </div>

          <div className="card claim-patterns">
            <h4>Claim Patterns</h4>
            <div>
              {["First Five", "Top Line", "Middle Line", "Bottom Line", "Full Housie"].map(
                (p) => (
                  <button key={p} disabled={!eligible[p] || claimed[p]} onClick={() => claimPattern(p)}>
                    {claimed[p] ? `${p} — Claimed` : `Claim ${p}`}
                  </button>
                )
              )}
            </div>
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
