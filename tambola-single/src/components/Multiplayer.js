import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Ticket from "./Ticket";
import "./Multiplayer.css";

const socket = io("http://172.16.21.165:5000");

export default function Multiplayer({ onBack }) {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [ticket, setTicket] = useState([]);
  const [players, setPlayers] = useState([]);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [claimedPatterns, setClaimedPatterns] = useState({});
  const [isHost, setIsHost] = useState(false);

  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinUsername, setJoinUsername] = useState("");
  const [notifications, setNotifications] = useState([]);

  function addNotification(msg) {
    setNotifications((prev) => [msg, ...prev].slice(0, 50));
  }

  useEffect(() => {
    socket.on("playerList", setPlayers);

    socket.on("gameStarted", () => addNotification("Game started!"));
    socket.on("numberCalled", (n) => setCalledNumbers((prev) => [...prev, n]));
    socket.on("notification", (msg) => addNotification(msg));
    socket.on("patternClaimed", ({ pattern, by }) => {
      addNotification(`${by} claimed ${pattern}`);
      setClaimedPatterns((prev) => ({ ...prev, [pattern]: by }));
    });
    socket.on("claimResult", ({ pattern, success, msg }) => {
      if (!success) addNotification(`Claim failed for ${pattern}: ${msg}`);
    });

    return () => socket.off();
  }, []);

  const createRoom = () => {
    if (!username.trim()) return alert("Enter a username first");
    socket.emit("createRoom", (newRoomId) => {
      setRoomId(newRoomId);
      setIsHost(true);
      socket.emit("joinRoom", { roomId: newRoomId, username }, ({ ticket }) => setTicket(ticket));
    });
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (!joinUsername.trim() || !joinRoomId.trim()) return alert("Enter username and room ID");
    socket.emit("joinRoom", { roomId: joinRoomId, username: joinUsername }, ({ ticket }) => {
      setTicket(ticket);
      setRoomId(joinRoomId);
      setUsername(joinUsername);
    });
  };

  const startGame = () => socket.emit("startGame", { roomId });
  const claimPattern = (pattern) => socket.emit("claimPattern", { roomId, pattern, username, ticket });

  return (
    <div className="mp-app">
<header className="mp-form-root">
  <button className="mp-form-back-btn" onClick={onBack}>⬅ Back</button>
  <h1 className="mp-form-title">Multiplayer</h1>
</header>

{!roomId && !ticket.length && (
  <main className="mp-form-root">
    <div className="mp-form-card">
      <h4>Create Room</h4>
      <input
        placeholder="Your Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button onClick={createRoom}>Create Room</button>

      <hr />

      <h4>Join Existing Room</h4>
      <form onSubmit={joinRoom}>
        <input
          placeholder="Room ID"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
        />
        <input
          placeholder="Username"
          value={joinUsername}
          onChange={(e) => setJoinUsername(e.target.value)}
        />
        <button type="submit">Join Room</button>
      </form>
    </div>
  </main>
)}


      {roomId && ticket.length > 0 && (
        <main className="mp-main">
          <div className="mp-left-panel">
            <div className="mp-card mp-controls">
              <h4>Room Info</h4>
              <p><strong>Room:</strong> {roomId}</p>
              <p><strong>Players:</strong> {players.join(", ") || "Waiting..."}</p>
              {isHost && <button onClick={startGame}>Start Game</button>}
            </div>

            <div className="mp-card mp-ticket-card">
              <h4>Your Ticket</h4>
              <Ticket
                grid={ticket}
                onCellClick={(cell) => {
                  const n = cell.number;
                  if (calledNumbers.includes(n)) {
                    const newGrid = ticket.map((r) =>
                      r.map((c) => (c && c.number === n ? { ...c, marked: !c.marked } : c))
                    );
                    setTicket(newGrid);
                  }
                }}
              />
            </div>

            <div className="mp-card mp-claim-patterns">
              <h4>Claim Patterns</h4>
              <div>
                {["First Five", "Top Line", "Middle Line", "Bottom Line", "Full Housie"].map((p) => (
                  <button
                    key={p}
                    disabled={claimedPatterns[p]}
                    onClick={() => claimPattern(p)}
                  >
                    {claimedPatterns[p] ? `${p} — Claimed by ${claimedPatterns[p]}` : `Claim ${p}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mp-right-panel">
            <div className="mp-card mp-called-numbers">
              <h4>Called Numbers ({calledNumbers.length})</h4>
              <div className="mp-called-grid">
                {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => (
                  <div
                    key={n}
                    className={`mp-called-num ${calledNumbers.includes(n) ? "mp-highlight" : ""}`}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </div>

            <div className="mp-card mp-notifications">
              <h4>Notifications</h4>
              <div className="mp-notifications-list">
                {notifications.map((n, i) => (
                  <div key={i} className="mp-notification">{n}</div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
