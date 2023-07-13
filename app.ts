import { Server } from 'socket.io';
import { MineSweeper } from './src/mine-sweeper';

const io = new Server(3000, {
    cors: {
        origin: '*',
    },
});

const mineSweeper = new MineSweeper(20, 20, 35);

io.on('connection', socket => {
    console.log(`a user ${socket.id} connected`);

    socket.emit('field:loaded', mineSweeper.field);

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
