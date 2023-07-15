import { Server } from 'socket.io';
import { MineSweeper } from './src/game';

const io = new Server(3000, {
    cors: {
        origin: '*',
    },
});

const mineSweeper = new MineSweeper(20, 20, 80);

mineSweeper.on('updateRestartTime', secondsLeft => {
    io.emit('game:update:restartTime', secondsLeft);
});

mineSweeper.on('started', () => {
    io.emit('field:loaded', mineSweeper.field);
});

mineSweeper.on('update', res => {
    if (res) {
        io.emit('field:update', res);
    }
});

io.on('connection', socket => {
    console.log(`a user ${socket.id} connected`);

    socket.emit('field:loaded', mineSweeper.field);

    socket.on('cell:open:req', cellIndex => {
        if (!mineSweeper.isCellIndexValid(cellIndex)) return;
        mineSweeper.handleOpenCell(cellIndex);
    });

    socket.on('cell:flag:req', cellIndex => {
        if (!mineSweeper.isCellIndexValid(cellIndex)) return;
        mineSweeper.handleFlagCell(cellIndex);
    });
});
