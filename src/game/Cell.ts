type TCellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 'X';

export enum ECellState {
    Closed,
    Opened,
    Flagged,
}

export interface ICell {
    value: TCellValue;
    state: ECellState;
}

export class Cell implements ICell {
    private _state: ECellState;

    get state() {
        return this._state;
    }

    constructor(
        public readonly value: TCellValue = 0,
        state: ECellState = ECellState.Closed,
    ) {
        this._state = state;
    }

    public open() {
        this._state = ECellState.Opened;

        return this.toObj();
    }

    public toggleFlag() {
        if (this._state === ECellState.Opened) return;

        switch (this._state) {
            case ECellState.Closed:
                return (this._state = ECellState.Flagged);
            case ECellState.Flagged:
                return (this._state = ECellState.Closed);
        }
    }

    public toObj(): ICell {
        return {
            state: this.state,
            value: this.value,
        };
    }
}
