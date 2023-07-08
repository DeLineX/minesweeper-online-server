export type TCellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 'X';

export enum ECellState {
    Closed,
    Opened,
    Flagged,
}

export interface ICell {
    value: TCellValue;
    state: ECellState;
}

export interface ICellMeta {
    y: number;
    x: number;
    value?: TCellValue;
    state?: ECellState;
}
