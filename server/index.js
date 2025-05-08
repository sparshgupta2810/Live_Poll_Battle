// server.js
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const wss = new WebSocket.Server({ port: 8080 });
console.log("✅ WebSocket server started on ws://localhost:8080");

const rooms = {}; // roomCode -> { votes, clients }

function generateRoomCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function broadcast(roomCode, message) {
  const room = rooms[roomCode];
  if (!room) return;

  room.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

wss.on("connection", (ws) => {
  let currentRoom = null;

  ws.on("message", (msg) => {
    try {
      const { type, data } = JSON.parse(msg);

      if (type === "CREATE_ROOM") {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
          votes: { optionA: 0, optionB: 0 },
          clients: [ws],
        };
        currentRoom = roomCode;
        ws.send(JSON.stringify({ type: "ROOM_CREATED", data: roomCode }));
        console.log(`🆕 Room created: ${roomCode}`);
      }

      else if (type === "JOIN_ROOM") {
        const { name, roomCode } = data;
        const room = rooms[roomCode];
        if (!room) {
          ws.send(JSON.stringify({ type: "ERROR", data: "Room not found" }));
          return;
        }
        room.clients.push(ws);
        currentRoom = roomCode;
        ws.send(JSON.stringify({
          type: "ROOM_JOINED",
          data: { roomCode, votes: room.votes }
        }));
        console.log(`👥 User joined room ${roomCode}: ${name}`);
      }

      else if (type === "VOTE") {
        const { roomCode, option } = data;
        const room = rooms[roomCode];
        if (!room || !["optionA", "optionB"].includes(option)) return;

        room.votes[option]++;
        broadcast(roomCode, {
          type: "VOTE_UPDATE",
          data: room.votes,
        });
        console.log(`🗳 Vote in room ${roomCode}: ${option}`);
      }

      else if (type === "TIMER_END") {
        const roomCode = data;
        broadcast(roomCode, { type: "VOTING_ENDED" });
        console.log(`⏰ Voting ended for room: ${roomCode}`);
      }

    } catch (err) {
      console.error("❌ Error parsing message:", err);
      ws.send(JSON.stringify({ type: "ERROR", data: "Invalid message format" }));
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].clients = rooms[currentRoom].clients.filter((c) => c !== ws);
      if (rooms[currentRoom].clients.length === 0) {
        delete rooms[currentRoom];
        console.log(`🗑 Room deleted: ${currentRoom}`);
      }
    }
  });
});
