import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Game } from './Game';

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 4000;

const game = new Game((gameState) => {
    io.emit('gameStateUpdate', gameState);
});

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    game.addPlayer(socket.id);

    socket.on('requestInitialState', () => {
        socket.emit('gameStateUpdate', game.getState());
    });

    socket.on('startGame', () => {
        console.log(`Player ${socket.id} started the game`);
        game.startGame(socket.id);
    });

    socket.on('playerChoice', (choice: number) => {
        console.log(`Player ${socket.id} chose ${choice}`);
        game.handlePlayerChoice(socket.id, choice);
    });

    socket.on('restartGame', () => {
        console.log(`Player ${socket.id} is restarting the game`);
        game.restartGame(socket.id);
    });
    
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        game.removePlayer(socket.id);
    });
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
