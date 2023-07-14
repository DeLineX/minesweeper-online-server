import { ICellIndex } from '../game';

export class Utils {
    static getRandomInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    static getCellIndex(x: number, y: number): ICellIndex {
        return { x, y };
    }
}
