const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static(__dirname));

// Serve the game on root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Generate random room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Matchmaking queue
let waitingPlayer = null;
const rooms = new Map(); // roomCode -> {host, guest, status: 'waiting'|'playing'}
const activeGames = new Map(); // gameId -> {player1, player2, currentTurn, gameState}

io.on('connection', (socket) => {
  console.log('New player connected:', socket.id);

  // Handle player joining matchmaking
  socket.on('joinMatchmaking', () => {
    console.log('Player joining matchmaking:', socket.id);

    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      // Match found! Create a game
      const gameId = `game_${Date.now()}`;
      const player1 = waitingPlayer;
      const player2 = socket;

      // Randomly assign teams
      const player1Team = Math.random() < 0.5 ? 'player' : 'enemy';
      const player2Team = player1Team === 'player' ? 'enemy' : 'player';

      // Create game session
      const game = {
        id: gameId,
        player1: {
          socket: player1,
          team: player1Team,
          id: player1.id
        },
        player2: {
          socket: player2,
          team: player2Team,
          id: player2.id
        },
        currentTurn: 'player', // Mouse team always starts
        gameState: null
      };

      activeGames.set(gameId, game);

      // Join both players to the game room
      player1.join(gameId);
      player2.join(gameId);

      // Store gameId in socket for later reference
      player1.gameId = gameId;
      player2.gameId = gameId;

      // Notify both players that the game is starting
      player1.emit('gameMatched', {
        gameId: gameId,
        yourTeam: player1Team,
        opponentId: player2.id,
        startsFirst: player1Team === 'player'
      });

      player2.emit('gameMatched', {
        gameId: gameId,
        yourTeam: player2Team,
        opponentId: player1.id,
        startsFirst: player2Team === 'player'
      });

      console.log(`Game ${gameId} created: ${player1.id} (${player1Team}) vs ${player2.id} (${player2Team})`);

      waitingPlayer = null;
    } else {
      // No match yet, add to waiting queue
      waitingPlayer = socket;
      socket.emit('waitingForOpponent');
      console.log('Player waiting for opponent:', socket.id);
    }
  });

  // Handle player moves
  socket.on('playerMove', (data) => {
    const gameId = socket.gameId;
    if (!gameId) return;

    const game = activeGames.get(gameId);
    if (!game) return;

    // Broadcast the move to the opponent
    socket.to(gameId).emit('opponentMove', data);
    console.log(`Move in game ${gameId}:`, data);
  });

  // Handle player attacks
  socket.on('playerAttack', (data) => {
    const gameId = socket.gameId;
    if (!gameId) return;

    const game = activeGames.get(gameId);
    if (!game) return;

    // Broadcast the attack to the opponent
    socket.to(gameId).emit('opponentAttack', data);
    console.log(`Attack in game ${gameId}:`, data);
  });

  // Handle turn end
  socket.on('endTurn', () => {
    const gameId = socket.gameId;
    if (!gameId) return;

    const game = activeGames.get(gameId);
    if (!game) return;

    // Switch turn
    game.currentTurn = game.currentTurn === 'player' ? 'enemy' : 'player';

    // Notify both players
    io.to(gameId).emit('turnChanged', game.currentTurn);
    console.log(`Turn changed in game ${gameId} to: ${game.currentTurn}`);
  });

  // Handle game over
  socket.on('gameOver', (data) => {
    const gameId = socket.gameId;
    if (!gameId) return;

    // Broadcast game over to the opponent
    socket.to(gameId).emit('opponentGameOver', data);
    console.log(`Game over in ${gameId}:`, data);
  });

  // Handle cancel matchmaking
  socket.on('cancelMatchmaking', () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
      console.log('Player cancelled matchmaking:', socket.id);
    }
  });

  // Handle create room
  socket.on('createRoom', () => {
    let roomCode;
    // Generate unique room code
    do {
      roomCode = generateRoomCode();
    } while (rooms.has(roomCode));

    rooms.set(roomCode, {
      host: socket,
      guest: null,
      status: 'waiting'
    });

    socket.roomCode = roomCode;
    socket.emit('roomCreated', { roomCode });
    console.log(`Room ${roomCode} created by ${socket.id}`);
  });

  // Handle join room
  socket.on('joinRoom', (data) => {
    const roomCode = data.roomCode.toUpperCase();
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('joinRoomError', { message: 'Room not found' });
      console.log(`Failed join attempt: Room ${roomCode} not found`);
      return;
    }

    if (room.status !== 'waiting') {
      socket.emit('joinRoomError', { message: 'Room is full' });
      console.log(`Failed join attempt: Room ${roomCode} is full`);
      return;
    }

    if (room.host.id === socket.id) {
      socket.emit('joinRoomError', { message: 'Cannot join your own room' });
      return;
    }

    // Match found! Create a game
    room.guest = socket;
    room.status = 'playing';

    const gameId = `game_${Date.now()}`;
    const player1 = room.host;
    const player2 = socket;

    // Randomly assign teams
    const player1Team = Math.random() < 0.5 ? 'player' : 'enemy';
    const player2Team = player1Team === 'player' ? 'enemy' : 'player';

    // Create game session
    const game = {
      id: gameId,
      player1: {
        socket: player1,
        team: player1Team,
        id: player1.id
      },
      player2: {
        socket: player2,
        team: player2Team,
        id: player2.id
      },
      currentTurn: 'player',
      gameState: null,
      roomCode: roomCode
    };

    activeGames.set(gameId, game);

    // Join both players to the game room
    player1.join(gameId);
    player2.join(gameId);

    // Store gameId in socket for later reference
    player1.gameId = gameId;
    player2.gameId = gameId;

    // Notify both players
    player1.emit('gameMatched', {
      gameId: gameId,
      yourTeam: player1Team,
      opponentId: player2.id,
      startsFirst: player1Team === 'player'
    });

    player2.emit('gameMatched', {
      gameId: gameId,
      yourTeam: player2Team,
      opponentId: player1.id,
      startsFirst: player2Team === 'player'
    });

    console.log(`Room ${roomCode} game started: ${player1.id} (${player1Team}) vs ${player2.id} (${player2Team})`);
  });

  // Handle cancel room
  socket.on('cancelRoom', () => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms.has(roomCode)) {
      rooms.delete(roomCode);
      delete socket.roomCode;
      console.log(`Room ${roomCode} cancelled by ${socket.id}`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);

    // Remove from waiting queue if present
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }

    // Remove from rooms if present
    const roomCode = socket.roomCode;
    if (roomCode && rooms.has(roomCode)) {
      const room = rooms.get(roomCode);
      if (room.status === 'waiting') {
        rooms.delete(roomCode);
        console.log(`Room ${roomCode} deleted due to disconnection`);
      }
    }

    // Handle active game disconnection
    const gameId = socket.gameId;
    if (gameId) {
      const game = activeGames.get(gameId);
      if (game) {
        // Notify opponent that player disconnected
        socket.to(gameId).emit('opponentDisconnected');

        // Clean up room if it exists
        if (game.roomCode && rooms.has(game.roomCode)) {
          rooms.delete(game.roomCode);
        }

        activeGames.delete(gameId);
        console.log(`Game ${gameId} ended due to disconnection`);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
