import React from "react";

export default function GameModeSelection({ onSinglePlayer, onMultiPlayer }) {
  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>Select Game Mode</h2>
      <button
        onClick={onSinglePlayer}
        style={{
          margin: "10px",
          padding: "10px 20px",
          background: "green",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Single Player
      </button>
      <button
        onClick={onMultiPlayer}
        style={{
          margin: "10px",
          padding: "10px 20px",
          background: "blue",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Multiplayer
      </button>
    </div>
  );
}
