// src/components/Ticket.js
import React from "react";
import "./Ticket.css"; // Optional 

export default function Ticket({ grid, onCellClick }) {
  return (
    <div className="ticket">
      {grid.map((row, rIdx) => (
        <div className="ticket-row" key={rIdx}>
          {row.map((cell, cIdx) => (
            <div
              key={cIdx}
              className={`ticket-cell ${cell ? "" : "empty"} ${cell && cell.marked ? "marked" : ""}`}
              onClick={() => cell && onCellClick(cell)}
              role="button"
              tabIndex={cell ? 0 : -1}
              onKeyDown={(e) => { if (e.key === "Enter" && cell) onCellClick(cell); }}
            >
              {cell ? cell.number : ""}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
