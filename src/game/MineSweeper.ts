import { Nullable } from '../types';
import { Utils } from '../utils';
import { Cell, ECellState, ICell } from './Cell';

export interface ICellIndex {
    x: number;
    y: number;
}

type TCellWithMeta = ICell & ICellIndex;

type TCellMetaRes = { cellIndex: ICellIndex } & (
    | {
          state: ECellState.Opened;
          value: Cell['value'];
      }
    | {
          state: Exclude<ECellState, ECellState.Opened>;
      }
);

type TGameState = 'started' | 'gameOver' | 'gameWon';
type TGameHooks = TGameState;

export class MineSweeper {
    private _field: Cell[][];
    private _gameState: TGameState = 'started';
    private _hooks: Partial<Record<TGameHooks, () => void>> = {};

    get field() {
        return this._field.map(row =>
            row.map(({ state, value }) =>
                state === ECellState.Opened ? { state, value } : { state },
            ),
        );
    }

    get gameState() {
        return this._gameState;
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
            const cellIndex = Utils.getCellIndex(
                Utils.getRandomInt(0, this.WIDTH),
                Utils.getRandomInt(0, this.HEIGHT),
            );

            if (this.getCell(cellIndex)?.value !== 'X') {
                this.setCell(cellIndex, new Cell('X'));
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

            const cell = this.getCell(cellIndex);

            return {
                ...cell.toObj(),
                ...cellIndex,
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

    private getAdjMinesCount(cellIndex: ICellIndex) {
        const adjCells = this.getAdjCells(cellIndex);

        type TCellNumValue = Exclude<Cell['value'], 'X'>;
        return adjCells.reduce<TCellNumValue>(
            (prev, cell) =>
                (prev + Number(cell.value === 'X')) as TCellNumValue,
            0,
        );
    }

    private getCell({ x, y }: ICellIndex): Cell {
        return this._field[y][x];
    }

    private setCell({ x, y }: ICellIndex, cell: Cell) {
        this._field[y][x] = cell;
    }

    private trigger(type: TGameHooks) {
        const callHook = this._hooks[type];
        if (callHook) callHook();
    }

    public isCellIndexValid({ x, y }: ICellIndex) {
        const typeCheck = typeof x === 'number' && typeof y === 'number';
        const isValidNumber = (...args: number[]) => {
            for (const x of args) {
                if (isNaN(x) || !isFinite(x)) return false;
            }
            return true;
        };
        return (
            typeCheck &&
            isValidNumber(x, y) &&
            this._field &&
            !!(this._field[y] && this._field[y][x])
        );
    }

    public initField() {
        this._field = Array(this.HEIGHT)
            .fill(null)
            .map(_ => []);

        this.generateMines();

        for (let i = 0; i < this.HEIGHT; i++) {
            for (let j = 0; j < this.WIDTH; j++) {
                const cellIndex = Utils.getCellIndex(j, i);

                if (this.getCell(cellIndex)?.value === 'X') continue;

                const adjMinesCount = this.getAdjMinesCount(cellIndex);
                this.setCell(cellIndex, new Cell(adjMinesCount));
            }
        }

        return this._field;
    }

    public openCell(cellIndex: ICellIndex): TCellMetaRes[] {
        const openedCells: TCellMetaRes[] = [];
        if (this._gameState !== 'started') return openedCells;

        const recursiveOpen = (cellIndex: ICellIndex) => {
            const cell = this.getCell(cellIndex);

            if (cell.state != ECellState.Closed) return;

            if (cell.value === 'X') {
                for (let i = 0; i < this.HEIGHT; i++) {
                    for (let j = 0; j < this.WIDTH; j++) {
                        const cellIndex = Utils.getCellIndex(j, i);
                        const cell = this.getCell(cellIndex);

                        if (
                            cell.state !== ECellState.Opened &&
                            cell.value === 'X'
                        ) {
                            openedCells.push({
                                ...cell.open(),
                                cellIndex,
                            });
                        }
                    }
                }

                this._gameState = 'gameOver';
                this.trigger('gameOver');

                setTimeout(() => {
                    this.initField();
                    this._gameState = 'started';
                    this.trigger('started');
                }, 3000);

                return;
            }

            openedCells.push({
                ...cell.open(),
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

        if (this._gameState !== 'started') return;

        const state = cell.toggleFlag();
        if (state === undefined) return;

        return {
            state,
            cellIndex,
        };
    }

    public on(type: TGameHooks, callBack: () => void) {
        this._hooks[type] = callBack;
    }
}
