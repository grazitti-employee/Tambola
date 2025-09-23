import React, { useState } from "react";
import GameModeSelection from "./components/GameModeSelection";
import SinglePlayer from "./components/SinglePlayer";
import Multiplayer from "./components/Multiplayer";
// import "./App.css";

export default function App() {
  const [page, setPage] = useState("gamemode"); 

  return (
    <div className="gamemode-root">
      {page === "gamemode" && (
        <GameModeSelection
          onSinglePlayer={() => setPage("singleplayer")}
          onMultiPlayer={() => setPage("multiplayer")} 
        />
      )}

      {page === "singleplayer" && (
        <SinglePlayer onBack={() => setPage("gamemode")} />
      )}

      {page === "multiplayer" && (
        <Multiplayer onBack={() => setPage("gamemode")} />
      )}
    </div>
  );
}