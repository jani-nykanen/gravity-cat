import { Vector } from "./vector.js";


const DIR_X : number[] = [0, 1, 0, -1, 0];
const DIR_Y : number[] = [0, 0, -1, 0, 1];


export const enum Direction {

    None = 0,
    Right = 1,
    Up = 2,
    Left = 3,
    Down = 4
};


export const directionToVector = (dir : Direction) : Vector => {

    return new Vector(DIR_X[dir], DIR_Y[dir]);
}
