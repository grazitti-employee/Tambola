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

// ----------------- New Ticket Grid Generator -----------------
function generateTicketGrid(attempt = 0) {
  if (attempt > 50) throw new Error("Failed to generate ticket after many attempts");

  const columnsPool = [];
  for (let i = 0; i < 9; i++) {
    const start = i * 10 + 1;
    const end = i === 8 ? 90 : (i + 1) * 10;
    const nums = [];
    for (let n = start; n <= end; n++) nums.push(n);
    nums.sort(() => Math.random() - 0.5);
    columnsPool.push(nums);
  }

  const ticket = Array.from({ length: 3 }, () => Array(9).fill(null));
  const rowCounts = [0, 0, 0];
  const splits = [
    [2, 2, 1],
    [2, 1, 2],
    [1, 2, 2],
  ];

  for (let block = 0; block < 3; block++) {
    const cols = [block * 3, block * 3 + 1, block * 3 + 2];

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

    if (!chosenSplit) {
      return generateTicketGrid(attempt + 1);
    }

    for (let r = 0; r < 3; r++) rowCounts[r] += chosenSplit[r];

    const allPositions = [];
    for (let r = 0; r < 3; r++) {
      const colsCopy = [...cols];
      for (let k = 0; k < chosenSplit[r]; k++) {
        const idx = Math.floor(Math.random() * colsCopy.length);
        const col = colsCopy.splice(idx, 1)[0];
        allPositions.push([r, col]);
      }
    }

    const colBuckets = {};
    for (const c of cols) colBuckets[c] = [];
    allPositions.forEach(([r, c]) => colBuckets[c].push(r));

    for (const c of cols) {
      colBuckets[c].sort((a, b) => a - b);
      const takeCount = colBuckets[c].length;
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

  const finalRowCounts = ticket.map((row) => row.filter(Boolean).length);
  const totalNumbers = finalRowCounts.reduce((s, n) => s + n, 0);
  if (finalRowCounts.some((c) => c !== 5) || totalNumbers !== 15) {
    return generateTicketGrid(attempt + 1);
  }

  return ticket;
}

// ----------------- Rooms Management -----------------
const rooms = {}; 
// { roomId: { host, players: {socket.id: {username, ticket}}, calledNumbers, claimed, interval } }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Create Room
  socket.on("createRoom", (callback) => {
    const roomId = Math.random().toString(36).substring(2, 8);
    rooms[roomId] = {
      host: socket.id,
      players: {},
      calledNumbers: [],
      interval: null,
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

  // Join Room
  socket.on("joinRoom", ({ roomId, username }, callback) => {
    const room = rooms[roomId];
    if (!room) return callback({ error: "Room not found" });

    const ticket = generateTicketGrid();
    room.players[socket.id] = { username, ticket };
    socket.join(roomId);

    console.log(`${username} joined room ${roomId}`);
    io.to(roomId).emit("playerList", Object.values(room.players).map(p => p.username));

    callback({ 
      ticket, 
      roomId, 
      claimed: room.claimed, 
      calledNumbers: room.calledNumbers 
    });
  });

  // Start Game (auto number calling every 3s)
  socket.on("startGame", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.host !== socket.id) return;

    // Reset
    room.calledNumbers = [];
    if (room.interval) clearInterval(room.interval);

    io.to(roomId).emit("gameStarted");
    io.to(roomId).emit("notification", "Game Started!");

    let numbers = shuffleArray(range(90, 1));

    room.interval = setInterval(() => {
      if (numbers.length === 0) {
        clearInterval(room.interval);
        io.to(roomId).emit("notification", "All numbers called. Game over!");
        return;
      }

      const next = numbers.shift();
      room.calledNumbers.push(next);

      io.to(roomId).emit("numberCalled", next);
      io.to(roomId).emit("notification", `Number called: ${next}`);
    }, 3000);
  });

  // Claim Pattern
  socket.on("claimPattern", ({ roomId, pattern, username, ticket }) => {
    const room = rooms[roomId];
    if (!room) return;

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

    if (room.claimed[pattern]) {
      socket.emit("claimResult", { pattern, success: false, msg: "Already claimed" });
      return;
    }

    room.claimed[pattern] = { by: username, time: new Date().toLocaleTimeString() };
    io.to(roomId).emit("patternClaimed", { pattern, by: username });
  });

  // Disconnect
  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId] && rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        io.to(roomId).emit(
          "playerList", 
          Object.values(rooms[roomId].players).map(p => p.username)
        );
      }
    }
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("Socket.IO server running on port 5000"));
