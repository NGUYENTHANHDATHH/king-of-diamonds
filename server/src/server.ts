
import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { Game } from './Game';
import { GameState } from './types';
import { MAX_PLAYERS } from './constants';

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 4000;

const rooms = new Map<string, Game>();
const ROOMS_FILE = path.join(__dirname, '..', 'data', 'rooms.json');

// Ensure data directory exists
const dataDir = path.dirname(ROOMS_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Persistence functions
const saveRooms = () => {
    try {
        const roomsData: { [roomId: string]: GameState } = {};
        rooms.forEach((game, roomId) => {
            roomsData[roomId] = game.getState();
        });
        fs.writeFileSync(ROOMS_FILE, JSON.stringify(roomsData, null, 2));
        console.log(`Saved ${rooms.size} rooms to storage`);
    } catch (error) {
        console.error('Error saving rooms:', error);
    }
};

const loadRooms = () => {
    try {
        if (fs.existsSync(ROOMS_FILE)) {
            const data = fs.readFileSync(ROOMS_FILE, 'utf8');
            const roomsData: { [roomId: string]: GameState } = JSON.parse(data);
            
            Object.entries(roomsData).forEach(([roomId, gameState]) => {
                // Only load rooms that are in lobby state (not active games)
                if (gameState.gamePhase === 'LOBBY' && gameState.players.length > 0) {
                    const game = new Game(roomId, (state) => {
                        io.to(roomId).emit('gameStateUpdate', state);
                        // Save rooms after each state update
                        saveRooms();
                    });
                    
                    // Restore the game state
                    game.setState(gameState);
                    rooms.set(roomId, game);
                    console.log(`Loaded room ${roomId} with ${gameState.players.length} players`);
                }
            });
            
            console.log(`Loaded ${rooms.size} rooms from storage`);
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
};

// Load existing rooms on startup
loadRooms();

// Periodic save every 30 seconds to ensure data persistence
setInterval(() => {
    saveRooms();
}, 30000);

// API endpoint to get available rooms
app.get('/api/rooms', (req, res) => {
    try {
        const availableRooms = Array.from(rooms.entries())
            .filter(([roomId, game]) => {
                const state = game.getState();
                return state.gamePhase === 'LOBBY' && state.players.length > 0;
            })
            .map(([roomId, game]) => {
                const state = game.getState();
                return {
                    roomId,
                    playerCount: state.players.length,
                    maxPlayers: MAX_PLAYERS,
                    hostName: state.players.find(p => p.isHost)?.name || 'Unknown'
                };
            });
        
        res.json({ rooms: availableRooms });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

interface SocketWithRoom extends Socket {
    roomId?: string;
}

const generateRoomId = (): string => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    // Ensure room ID is unique
    if(rooms.has(result)) return generateRoomId();
    return result;
}

io.on('connection', (socket: SocketWithRoom) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('createRoom', ({ name }: { name: string }) => {
        const roomId = generateRoomId();
        const game = new Game(roomId, (gameState) => {
            io.to(roomId).emit('gameStateUpdate', gameState);
            // Save rooms after each state update
            saveRooms();
        });
        rooms.set(roomId, game);
        console.log(`Room created: ${roomId} by ${name}`);
        socket.join(roomId);
        socket.roomId = roomId;
        game.addPlayer(socket.id, name);
        socket.emit('roomCreated', { roomId });
        // Save the new room
        saveRooms();
    });

    socket.on('joinRoom', ({ roomId, name }: { roomId: string, name: string }) => {
        const game = rooms.get(roomId);
        if (game) {
            socket.join(roomId);
            socket.roomId = roomId;
            game.addPlayer(socket.id, name);
            console.log(`${name} (${socket.id}) joined room ${roomId}`);
        } else {
            socket.emit('error', { message: `Room ${roomId} not found.` });
        }
    });

    socket.on('startGame', ({ roomId }: { roomId: string }) => {
        const game = rooms.get(roomId);
        if (game) {
            console.log(`Player ${socket.id} started the game in room ${roomId}`);
            game.startGame(socket.id);
        }
    });

    socket.on('playerChoice', ({ choice, roomId }: { choice: number, roomId: string }) => {
        const game = rooms.get(roomId);
        if (game) {
            console.log(`Player ${socket.id} chose ${choice} in room ${roomId}`);
            game.handlePlayerChoice(socket.id, choice);
        }
    });

    socket.on('restartGame', ({ roomId }: { roomId: string }) => {
        const game = rooms.get(roomId);
        if (game) {
            console.log(`Player ${socket.id} is restarting the game in room ${roomId}`);
            game.restartGame(socket.id);
        }
    });
    
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        const roomId = socket.roomId;
        if (roomId) {
            const game = rooms.get(roomId);
            if (game) {
                game.removePlayer(socket.id);
                // Clean up room if it's empty
                const state = game.getState();
                if (state.players.length === 0 && state.spectators.length === 0) {
                    rooms.delete(roomId);
                    console.log(`Room ${roomId} is empty and has been closed.`);
                }
                // Save rooms after player disconnect
                saveRooms();
            }
        }
    });
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    saveRooms();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down server...');
    saveRooms();
    process.exit(0);
});
