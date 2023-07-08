import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { MineSweeper } from './src/mine-sweeper';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', socket => {
    console.log('a user connected');
    const mineSweeper = new MineSweeper(5, 5, 5);

    socket.emit('game:loaded', mineSweeper.getField());
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

// const mineSweeper = new MineSweeper(5, 5, 5);
