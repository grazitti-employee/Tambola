const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ----------------- Helpers -----------------
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

function generateTicketGrid() {
  const rows = 3;
  const cols = 9;
  const chosenPositions = [];

  for (let r = 0; r < rows; r++) {
    const colsIndices = shuffleArray(range(cols, 0)).slice(0, 5);
    for (const c of colsIndices) chosenPositions.push({ r, c: c - 1 });
  }

  const numbers = getNRandomUnique(1, 90, 15);
  const shuffledNumbers = shuffleArray(numbers);

  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  );

  for (let i = 0; i < chosenPositions.length; i++) {
    const { r, c } = chosenPositions[i];
    grid[r][c] = { number: shuffledNumbers[i], marked: false, row: r, col: c };
  }

  return grid;
}

// ----------------- Rooms Management -----------------
const rooms = {}; // { roomId: { host: socket.id, players: {socket.id: {...}} , calledNumbers: [], claimed: {} } }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("createRoom", (callback) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    rooms[roomId] = {
      host: socket.id,
      players: {},
      calledNumbers: [],
      claimed: {
        "First Five": null,
        "Top Line": null,
        "Middle Line": null,
        "Bottom Line": null,
        "Full Housie": null,
      },
    };
    console.log(`Room created: ${roomId} by ${socket.id}`);
    callback(roomId);
  });

  socket.on("joinRoom", ({ roomId, username }, callback) => {
    const room = rooms[roomId];
    if (!room) return callback({ error: "Room not found" });

    // Assign unique ticket
    const ticket = generateTicketGrid();
    room.players[socket.id] = { username, ticket };
    socket.join(roomId);

    console.log(`${username} joined room ${roomId}`);
    io.to(roomId).emit("playerList", Object.values(room.players).map(p => p.username));
    callback({ ticket, roomId, claimed: room.claimed, calledNumbers: room.calledNumbers });
  });

  socket.on("startGame", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.host !== socket.id) return;
    room.calledNumbers = [];
    io.to(roomId).emit("gameStarted");
  });

  socket.on("callNumber", ({ roomId, number }) => {
    const room = rooms[roomId];
    if (!room || room.host !== socket.id) return;

    if (!room.calledNumbers.includes(number)) {
      room.calledNumbers.push(number);
      io.to(roomId).emit("numberCalled", number);
    }
  });

  socket.on("claimPattern", ({ roomId, pattern, username, ticket }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Server verifies
    const flatten = ticket.flat().filter(Boolean);
    const markedCells = flatten.filter((c) => c.marked);
    let valid = false;

    if (pattern === "First Five") valid = markedCells.length >= 5;
    if (pattern === "Top Line") valid = ticket[0].filter(Boolean).every(c => c.marked);
    if (pattern === "Middle Line") valid = ticket[1].filter(Boolean).every(c => c.marked);
    if (pattern === "Bottom Line") valid = ticket[2].filter(Boolean).every(c => c.marked);
    if (pattern === "Full Housie") valid = markedCells.length === flatten.length;

    if (!valid) {
      socket.emit("claimResult", { pattern, success: false, msg: "Invalid claim" });
      return;
    }

    // Check if already claimed
    if (room.claimed[pattern]) {
      socket.emit("claimResult", { pattern, success: false, msg: "Already claimed" });
      return;
    }

    room.claimed[pattern] = { by: username, time: new Date().toLocaleTimeString() };
    io.to(roomId).emit("patternClaimed", { pattern, by: username });
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId] && rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        io.to(roomId).emit("playerList", Object.values(rooms[roomId].players).map(p => p.username));
      }
    }
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("Socket.IO server running on port 5000"));
