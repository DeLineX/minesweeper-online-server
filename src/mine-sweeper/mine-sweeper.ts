import { Utils } from '../utils';
import { ECellState, ICell, ICellMeta, TCellValue } from './types';

export class MineSweeper {
    public readonly width: number;
    public readonly height: number;
    public readonly minesCount: number;
    private gameField: ICell[][];

    constructor(width: number, height: number, minesCount: number) {
        this.width = width;
        this.height = height;
        this.minesCount = minesCount;
        this.gameField = this.generateField();

        this.printField();
    }

    public printField() {
        console.log(
            this.gameField
                .map(row => row.reduce((prev, cell) => prev + cell.value, ''))
                .join('\n'),
            '\n',
        );
    }

    private generateMines() {
        let count = this.minesCount;
        while (count) {
            const y = Utils.getRandomInt(0, this.height);
            const x = Utils.getRandomInt(0, this.width);

            if (this.gameField[y][x].value !== 'X') {
                this.gameField[y][x] = { value: 'X', state: ECellState.Closed };
                count--;
            }
        }
    }

    private getAdjCells(y: number, x: number) {
        const getAdjCell = (y: number, x: number): ICellMeta => {
            const cell = this.gameField[y]?.[x];
            if (!cell) return cell;

            return {
                y,
                x,
                value: cell.value,
            };
        };

        const res: ICellMeta[] = [
            getAdjCell(y - 1, x - 1),
            getAdjCell(y - 1, x),
            getAdjCell(y - 1, x + 1),
            getAdjCell(y, x + 1),
            getAdjCell(y + 1, x + 1),
            getAdjCell(y + 1, x),
            getAdjCell(y + 1, x - 1),
            getAdjCell(y, x - 1),
        ];

        return res.filter(Boolean);
    }

    private calculateFieldValues() {
        for (let i = 0; i < this.height; i++) {
            for (let j = 0; j < this.width; j++) {
                if (this.gameField[i][j].value === 'X') continue;

                const adjCells = this.getAdjCells(i, j);
                const adjMines = adjCells.reduce(
                    (prev, cell) => (cell.value === 'X' ? prev + 1 : prev),
                    0,
                );
                this.gameField[i][j].value = adjMines as TCellValue;
            }
        }
    }

    public generateField() {
        this.gameField = Array(this.height)
            .fill(null)
            .map<ICell[]>(_ =>
                Array(this.width)
                    .fill(null)
                    .map<ICell>(_ => ({ value: 0, state: ECellState.Closed })),
            );

        this.generateMines();
        this.calculateFieldValues();

        return this.gameField;
    }

    public getField() {
        return this.gameField.map(row =>
            row.map(({ state, value }) =>
                state === ECellState.Opened ? { state, value } : { state },
            ),
        );
    }

    public openCell(y: number, x: number) {
        const openedCells: ICellMeta[] = [];

        const recursiveOpen = (y: number, x: number) => {
            const cell = this.gameField[y][x];

            if (cell.state != ECellState.Closed) return;

            cell.state = ECellState.Opened;
            openedCells.push({
                y,
                x,
                value: cell.value,
            });

            if (cell.value !== 0) return;

            const adjCells = this.getAdjCells(y, x);

            for (const { y, x } of adjCells) {
                recursiveOpen(y, x);
            }
        };

        recursiveOpen(y, x);

        return openedCells;
    }

    public handleFlagCell(y: number, x: number): ICellMeta {
        const cell = this.gameField[y][x];

        switch (cell.state) {
            case ECellState.Closed:
                cell.state = ECellState.Flagged;
                break;
            case ECellState.Flagged:
                cell.state = ECellState.Closed;
                break;
        }

        return { y, x, state: cell.state };
    }
}
