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

type TGameStateType = 'started' | 'ended';

interface IGameStateBase {
    type: TGameStateType;
}

interface IGameStartedState extends IGameStateBase {
    type: 'started';
}

interface IGameEndedState extends IGameStateBase {
    type: 'ended';
    status: 'won' | 'lose';
    secondsLeft: number;
}

type TGameState = IGameStartedState | IGameEndedState;

interface IGameHooks extends Record<TGameStateType, (...args: any[]) => void> {
    updateRestartTime: (timeLeft: IGameEndedState['secondsLeft']) => void;
    update: (res: IFieldUpdateRes) => void;
}

interface IFieldLoadRes {
    width: number;
    height: number;
    updatedCells: TCellMetaRes[];
    gameState: TGameState;
    flagsCount: number;
    minesCount: number;
}

export interface IFieldUpdateRes
    extends Pick<IFieldLoadRes, 'updatedCells'>,
        Partial<Pick<IFieldLoadRes, 'flagsCount' | 'gameState'>> {}

interface IMineSweeperConfig {
    restartTimeout: number;
}

const DEFAULT_CONFIG: IMineSweeperConfig = {
    restartTimeout: 3,
};

export class MineSweeper {
    private _field: Cell[][];
    private _gameState: TGameState = { type: 'started' };
    private _hooks: Partial<IGameHooks> = {};
    private _config: IMineSweeperConfig;
    private _flagsCount: number = 0;
    private _minesLeft: number = this.minesCount;
    private _openedCells: number = 0;

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

    get flagsCount() {
        return this._flagsCount;
    }

    constructor(
        private readonly _width: number,
        private readonly _height: number,
        public readonly minesCount: number,
        config: IMineSweeperConfig = DEFAULT_CONFIG,
    ) {
        this._config = {
            ...config,
            ...DEFAULT_CONFIG,
        };
        this._field = this.startGame();
    }

    private generateMines() {
        let count = this.minesCount;

        while (count) {
            const cellIndex = Utils.getCellIndex(
                Utils.getRandomInt(0, this._width),
                Utils.getRandomInt(0, this._height),
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

    private openCell(cellIndex: ICellIndex): TCellMetaRes[] | void {
        const updatedCells: TCellMetaRes[] = [];
        if (this._gameState.type !== 'started') return;

        const recursiveOpen = (cellIndex: ICellIndex) => {
            const cell = this.getCell(cellIndex);

            if (cell.state != ECellState.Closed) return;

            updatedCells.push({
                ...cell.open(),
                cellIndex,
            });

            this._openedCells++;

            if (cell.value === 'X') {
                for (let i = 0; i < this._height; i++) {
                    for (let j = 0; j < this._width; j++) {
                        const cellIndex = Utils.getCellIndex(j, i);
                        const cell = this.getCell(cellIndex);

                        if (
                            cell.state !== ECellState.Opened &&
                            cell.value === 'X'
                        ) {
                            updatedCells.push({
                                ...cell.open(),
                                cellIndex,
                            });
                            this._openedCells++;
                        }
                    }
                }

                return this.endGame('lose', { updatedCells });
            }

            if (cell.value !== 0) return;
            const adjCells = this.getAdjCells(cellIndex);

            for (const cellIndex of adjCells) {
                recursiveOpen(cellIndex);
            }
        };

        recursiveOpen(cellIndex);

        if (
            this.gameState.type !== 'ended' &&
            this._openedCells + this._flagsCount ===
                this._width * this._height - this._minesLeft
        ) {
            return this.endGame('won', { updatedCells });
        }

        return updatedCells;
    }

    private trigger<Type extends keyof IGameHooks>(
        type: Type,
        ...args: Parameters<IGameHooks[Type]>
    ) {
        const callHook = this._hooks[type] as (...args: any[]) => void;
        if (callHook) callHook(...args);
    }

    private startGame() {
        this._gameState = { type: 'started' };
        this._flagsCount = 0;
        this._minesLeft = this.minesCount;
        this._openedCells = 0;

        this._field = Array(this._height)
            .fill(null)
            .map(_ => []);

        this.generateMines();

        const nullValueIndexes: ICellIndex[] = [];

        for (let i = 0; i < this._height; i++) {
            for (let j = 0; j < this._width; j++) {
                const cellIndex = Utils.getCellIndex(j, i);
                const cell = this.getCell(cellIndex) as Nullable<ICell>;

                if (cell?.value === 'X') continue;

                const adjMinesCount = this.getAdjMinesCount(cellIndex);
                const newCell = new Cell(adjMinesCount);
                this.setCell(cellIndex, newCell);
                if (newCell.value === 0) {
                    nullValueIndexes.push(cellIndex);
                }
            }
        }
        if (nullValueIndexes.length > 0) {
            const randomIndex = Utils.getRandomInt(0, nullValueIndexes.length);
            this.openCell(nullValueIndexes[randomIndex]);
        }

        this.trigger('started');

        return this._field;
    }

    private endGame(status: IGameEndedState['status'], res: IFieldUpdateRes) {
        this._gameState = {
            type: 'ended',
            status,
            secondsLeft: this._config.restartTimeout,
        };

        this.trigger('update', { ...res, gameState: this._gameState });

        const intervalId = setInterval(() => {
            if (this._gameState.type !== 'ended') return;

            this._gameState.secondsLeft--;
            this.trigger('updateRestartTime', this._gameState.secondsLeft);

            if (this._gameState.secondsLeft < 1) {
                clearInterval(intervalId);
                this.startGame();
            }
        }, 1_000);
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

    public handleOpenCell(cellIndex: ICellIndex) {
        const updatedCells = this.openCell(cellIndex);
        if (!updatedCells) return;

        if (this.gameState.type !== 'ended') {
            this.trigger('update', { updatedCells });
        }
    }

    public handleFlagCell(cellIndex: ICellIndex) {
        if (this._gameState.type !== 'started') return;

        const cell = this.getCell(cellIndex);

        let state: ECellState;
        switch (cell.state) {
            case ECellState.Closed:
                state = cell.setFlag();
                this._flagsCount++;
                if (cell.value === 'X') {
                    this._minesLeft--;
                }
                break;
            case ECellState.Flagged:
                state = cell.removeFlag();
                this._flagsCount--;
                if (cell.value === 'X') {
                    this._minesLeft++;
                }
                break;
            case ECellState.Opened:
                return;
        }

        const res: IFieldUpdateRes = {
            updatedCells: [
                {
                    state,
                    cellIndex,
                },
            ],
            flagsCount: this.flagsCount,
        };

        if (this._minesLeft === 0 && this._flagsCount === this.minesCount) {
            this.endGame('won', res);
        } else {
            this.trigger('update', res);
        }

        return res;
    }

    public on<Type extends keyof IGameHooks>(
        type: Type,
        callBack: IGameHooks[Type],
    ) {
        this._hooks[type] = callBack;
    }

    public handleLoadField(): IFieldLoadRes {
        const updatedCells: TCellMetaRes[] = [];

        for (let i = 0; i < this._height; i++) {
            for (let j = 0; j < this._height; j++) {
                const cellIndex = Utils.getCellIndex(j, i);
                const cell = this.getCell(cellIndex);
                if (cell.state !== ECellState.Closed) {
                    updatedCells.push({ ...cell.toObj(), cellIndex });
                }
            }
        }

        return {
            width: this._width,
            height: this._height,
            updatedCells,
            flagsCount: this.flagsCount,
            minesCount: this.minesCount,
            gameState: this._gameState,
        };
    }
}
