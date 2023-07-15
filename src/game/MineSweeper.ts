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
    status: 'won' | 'lost';
    secondsLeft: number;
}

type TGameState = IGameStartedState | IGameEndedState;

interface IGameHooks extends Record<TGameStateType, (...args: any[]) => void> {
    updateRestartTime: (timeLeft: IGameEndedState['secondsLeft']) => void;
    update: (res: IFieldUpdateRes) => void;
}

interface IFieldUpdateRes {
    updatedCells: TCellMetaRes[];
    gameState?: IGameEndedState;
}

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

    private trigger<Type extends keyof IGameHooks>(
        type: Type,
        ...args: Parameters<IGameHooks[Type]>
    ) {
        const callHook = this._hooks[type] as (...args: any[]) => void;
        if (callHook) callHook(...args);
    }

    private startGame() {
        this._gameState = { type: 'started' };

        this._field = Array(this._height)
            .fill(null)
            .map(_ => []);

        this.generateMines();

        for (let i = 0; i < this._height; i++) {
            for (let j = 0; j < this._width; j++) {
                const cellIndex = Utils.getCellIndex(j, i);

                if (this.getCell(cellIndex)?.value === 'X') continue;

                const adjMinesCount = this.getAdjMinesCount(cellIndex);
                this.setCell(cellIndex, new Cell(adjMinesCount));
            }
        }

        this.trigger('started');

        return this._field;
    }

    private endGame(status: IGameEndedState['status']) {
        this._gameState = {
            type: 'ended',
            status,
            secondsLeft: this._config.restartTimeout,
        };

        let secondsLeft = this._config.restartTimeout;
        const intervalId = setInterval(() => {
            secondsLeft--;
            this.trigger('updateRestartTime', secondsLeft);

            if (secondsLeft < 1) {
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
        const updatedCells: TCellMetaRes[] = [];
        if (this._gameState.type !== 'started') return;

        const recursiveOpen = (cellIndex: ICellIndex) => {
            const cell = this.getCell(cellIndex);

            if (cell.state != ECellState.Closed) return;

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
                        }
                    }
                }

                return this.endGame('lost');
            }

            updatedCells.push({
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

        let gameState: IGameEndedState | undefined;
        if (this.gameState.type === 'ended') {
            gameState = this.gameState;
        }

        this.trigger('update', { updatedCells, gameState });
    }

    public handleFlagCell(cellIndex: ICellIndex) {
        const cell = this.getCell(cellIndex);

        if (this._gameState.type !== 'started') return;

        const state = cell.toggleFlag();
        if (state === undefined) return;

        this.trigger('update', {
            updatedCells: [
                {
                    state,
                    cellIndex,
                },
            ],
        });
    }

    public on<Type extends keyof IGameHooks>(
        type: Type,
        callBack: IGameHooks[Type],
    ) {
        this._hooks[type] = callBack;
    }
}
