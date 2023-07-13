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

export interface ICellIndex {
    x: number;
    y: number;
}

export type TCellWithMeta = ICell & ICellIndex;

export type TCellMetaRes = { cellIndex: ICellIndex } & (
    | {
          state: ECellState.Opened;
          value: TCellValue;
      }
    | {
          state: Exclude<ECellState, ECellState.Opened>;
      }
);

export type Nullable<T> = T | null | undefined;
