import { Utils } from '../utils';
import {
    ECellState,
    ICell,
    TCellWithMeta,
    ICellIndex,
    TCellValue,
    Nullable,
    TCellMetaRes,
} from './types';

export class MineSweeper {
    private _field: ICell[][];

    get field() {
        const l = this._field.map(row =>
            row.map(({ state, value }) =>
                state === ECellState.Opened ? { state, value } : { state },
            ),
        );
        return l;
    }

    public getField() {
        return this._field.map(row =>
            row.map(({ state, value }) =>
                state === ECellState.Opened ? { state, value } : { state },
            ),
        );
    }

    constructor(
        private readonly WIDTH: number,
        private readonly HEIGHT: number,
        public readonly MINES_COUNT: number,
    ) {
        this._field = this.initField();
    }

    private generateMines() {
        let count = this.MINES_COUNT;
        while (count) {
            const cellIndex: ICellIndex = Utils.getCellIndex(
                Utils.getRandomInt(0, this.WIDTH),
                Utils.getRandomInt(0, this.HEIGHT),
            );

            const cell = this.getCell(cellIndex);

            if (cell.value !== 'X') {
                cell.value = 'X';
                cell.state = ECellState.Closed;
                count--;
            }
        }
    }

    private getAdjCells({ x, y }: ICellIndex) {
        const getAdjCell = (
            offsetX: number,
            offsetY: number,
        ): TCellWithMeta | undefined => {
            const cellIndex = Utils.getCellIndex(x + offsetX, y + offsetY);
            if (!this.isCellIndexValid(cellIndex)) return;

            const cell = this.getCell({
                ...cellIndex,
            });
            return {
                ...cellIndex,
                ...cell,
            };
        };

        const res: Nullable<TCellWithMeta>[] = [
            getAdjCell(-1, -1),
            getAdjCell(-1, 0),
            getAdjCell(-1, 1),
            getAdjCell(0, -1),
            getAdjCell(0, 1),
            getAdjCell(1, -1),
            getAdjCell(1, 0),
            getAdjCell(1, 1),
        ];

        return res.filter(Boolean) as TCellWithMeta[];
    }

    private calculateFieldValues() {
        for (let i = 0; i < this.HEIGHT; i++) {
            for (let j = 0; j < this.WIDTH; j++) {
                const cellIndex: ICellIndex = { x: j, y: i };
                const cell = this.getCell(cellIndex);

                if (cell.value === 'X') continue;

                const adjCells = this.getAdjCells(cellIndex);
                const adjMines = adjCells.reduce(
                    (prev, cell) => prev + Number(cell.value === 'X'),
                    0,
                );
                cell.value = adjMines as TCellValue;
            }
        }
    }

    private getCell({ x, y }: ICellIndex) {
        return this._field[y][x];
    }

    public isCellIndexValid({ x, y }: ICellIndex) {
        return !!(this._field[y] && this._field[y][x]);
    }

    public initField() {
        this._field = Array(this.HEIGHT)
            .fill(null)
            .map<ICell[]>(_ =>
                Array(this.WIDTH)
                    .fill(null)
                    .map<ICell>(_ => ({ value: 0, state: ECellState.Closed })),
            );

        this.generateMines();
        this.calculateFieldValues();

        return this._field;
    }

    public openCell(cellIndex: ICellIndex): TCellMetaRes[] {
        const openedCells: TCellMetaRes[] = [];

        const recursiveOpen = (cellIndex: ICellIndex) => {
            const cell = this.getCell(cellIndex);

            if (cell.state != ECellState.Closed) return;

            cell.state = ECellState.Opened;
            openedCells.push({
                ...cell,
                cellIndex,
            });

            if (cell.value !== 0) return;
            const adjCells = this.getAdjCells(cellIndex);

            for (const cellIndex of adjCells) {
                recursiveOpen(cellIndex);
            }
        };

        recursiveOpen(cellIndex);

        return openedCells;
    }

    public handleFlagCell(cellIndex: ICellIndex): TCellMetaRes | void {
        const cell = this.getCell(cellIndex);
        if (cell.state === ECellState.Opened) return;

        switch (cell.state) {
            case ECellState.Closed:
                cell.state = ECellState.Flagged;
                break;
            case ECellState.Flagged:
                cell.state = ECellState.Closed;
                break;
        }

        return {
            state: cell.state,
            cellIndex,
        };
    }
}
