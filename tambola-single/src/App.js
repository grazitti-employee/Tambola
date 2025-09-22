import React, { useState } from "react";
import GameModeSelection from "./components/GameModeSelection";
import SinglePlayer from "./components/SinglePlayer";
import Multiplayer from "./components/Multiplayer";

export default function App() {
  const [page, setPage] = useState("gamemode"); // start directly at game mode selection

  return (
    <div>
      {page === "gamemode" && (
        <GameModeSelection
          onSinglePlayer={() => setPage("singleplayer")}
          onMultiPlayer={() => setPage("multiplayer")} // lowercase to match below
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
