import { Server } from 'socket.io';
import { MineSweeper } from './src/game';

const io = new Server(3000, {
    cors: {
        origin: '*',
    },
});

const mineSweeper = new MineSweeper(20, 20, 100);

mineSweeper.on('gameOver', () => {
    io.emit('game:over', 3);
});

mineSweeper.on('started', () => {
    io.emit('field:loaded', mineSweeper.field);
});

io.on('connection', socket => {
    console.log(`a user ${socket.id} connected`);

    socket.emit('field:loaded', mineSweeper.field);

    if (mineSweeper.gameState === 'gameOver') {
        io.emit('game:over', 3);
    }

    socket.on('cell:open:req', data => {
        if (!mineSweeper.isCellIndexValid(data)) return;
        const updatedCells = mineSweeper.openCell(data);
        if (updatedCells.length) {
            io.emit('field:update', updatedCells);
        }
    });

    socket.on('cell:flag:req', data => {
        if (!mineSweeper.isCellIndexValid(data)) return;
        const updatedCells = mineSweeper.handleFlagCell(data);
        if (updatedCells) {
            io.emit('field:update', mineSweeper.handleFlagCell(data));
        }
    });
});
