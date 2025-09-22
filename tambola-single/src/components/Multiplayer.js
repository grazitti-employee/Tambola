import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Ticket from "./Ticket";

const socket = io("http://localhost:5000");

export default function Multiplayer({ onBack }) {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [ticket, setTicket] = useState([]);
  const [players, setPlayers] = useState([]);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [claimedPatterns, setClaimedPatterns] = useState({});
  const [isHost, setIsHost] = useState(false);
  const [mode, setMode] = useState(null); // "create" or "join"

  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinUsername, setJoinUsername] = useState("");

  useEffect(() => {
    socket.on("playerList", setPlayers);
    socket.on("gameStarted", () => alert("Game started!"));
    socket.on("numberCalled", (n) => setCalledNumbers(prev => [...prev, n]));
    socket.on("patternClaimed", ({ pattern, by }) => {
      alert(`${by} claimed ${pattern}`);
      setClaimedPatterns(prev => ({ ...prev, [pattern]: by }));
    });
    socket.on("claimResult", ({ pattern, success, msg }) => {
      if (!success) alert(`Claim failed for ${pattern}: ${msg}`);
    });

    return () => socket.off();
  }, []);

  const createRoom = () => {
    if (!username.trim()) return alert("Enter a username first");
    socket.emit("createRoom", (newRoomId) => {
      setRoomId(newRoomId);
      setIsHost(true);
      setMode("create");

      // Host joins automatically
      socket.emit("joinRoom", { roomId: newRoomId, username }, ({ ticket }) => {
        setTicket(ticket);
      });
    });
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (!joinUsername.trim() || !joinRoomId.trim()) return alert("Enter username and room ID");
    socket.emit("joinRoom", { roomId: joinRoomId, username: joinUsername }, ({ ticket }) => {
      setTicket(ticket);
      setRoomId(joinRoomId);
      setUsername(joinUsername);
      setMode("join");
    });
  };

  const startGame = () => {
    socket.emit("startGame", { roomId });
  };

  const claimPattern = (pattern) => {
    socket.emit("claimPattern", { roomId, pattern, username, ticket });
  };

  return (
    <div>
      <button onClick={onBack}>⬅ Back</button>
      <h2>Multiplayer</h2>

      {!roomId && !ticket.length && (
        <div>
          <h4>Create Room</h4>
          <input
            placeholder="Your Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <button onClick={createRoom}>Create Room</button>

          <hr />

          <h4>Join Existing Room</h4>
          <form onSubmit={joinRoom}>
            <input
              placeholder="Room ID"
              value={joinRoomId}
              onChange={e => setJoinRoomId(e.target.value)}
            />
            <input
              placeholder="Username"
              value={joinUsername}
              onChange={e => setJoinUsername(e.target.value)}
            />
            <button type="submit">Join Room</button>
          </form>
        </div>
      )}

      {roomId && ticket.length > 0 && (
        <div>
          <h4>Room: {roomId}</h4>
          <h4>Players: {players.join(", ")}</h4>
          {isHost && <button onClick={startGame}>Start Game</button>}

          <Ticket
            grid={ticket}
            onCellClick={(cell) => {
              const n = cell.number;
              if (calledNumbers.includes(n)) {
                const newGrid = ticket.map(r =>
                  r.map(c => (c && c.number === n ? { ...c, marked: !c.marked } : c))
                );
                setTicket(newGrid);
              }
            }}
          />

          <div>
            <h4>Called Numbers</h4>
            {calledNumbers.join(", ")}
          </div>

          <div>
            {["First Five", "Top Line", "Middle Line", "Bottom Line", "Full Housie"].map(p => (
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
      )}
    </div>
  );
}
