import { signedMod } from "./math.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { Direction } from "./direction.js";


export class TerrainMap {


    private tileData : number[];

    public readonly width : number;
    public readonly height : number;


    constructor(tilemap : number[], width : number, height : number) {

        this.width = width;
        this.height = height;

        const solidLayer : number[] = tilemap.map((v : number) => v <= 8 ? v : 0);

        this.tileData = (new Array<number> (this.width*this.height*4)).fill(0);
        this.computeTileData(solidLayer);
    }


    private computeNeighborhood(solidLayer : number[], dx : number, dy : number) : boolean[] {

        const out : boolean[] = (new Array<boolean> (9)).fill(false);

        for (let j : number = -1; j <= 1; ++ j) {

            const y : number = signedMod(dy + j, this.height);
            for (let i : number = -1; i <= 1; ++ i) {

                const x : number = signedMod(dx + i, this.width);

                out[(j + 1)*3 + (i + 1)] = solidLayer[y*this.width + x] == 1;
            }
        }
        return out;
    }


    private determineTile(solidLayer : number[], x : number, y : number) : void {

        const neighborhood : boolean[] = this.computeNeighborhood(solidLayer, x, y);

        // Top-left corner
        let p : number = y*this.width*4 + x*2;
        this.tileData[p] = 1;
        if (!neighborhood[1]) {

            this.tileData[p] = neighborhood[3] ? 7 : 3;
        }
        else {

            if (neighborhood[3] && !neighborhood[0]) {

                this.tileData[p] = 5;
            }
            else if (!neighborhood[3]) {

                this.tileData[p] = 9;
            }
        }

        // Top-right corner
        ++ p;
        this.tileData[p] = 2;
        if (!neighborhood[1]) {

            this.tileData[p] = neighborhood[5] ? 8 : 4;
        }
        else {

            if (neighborhood[5] && !neighborhood[2]) {

                this.tileData[p] = 6;
            }
            else if (!neighborhood[5]) {

                this.tileData[p] = 10;
            }
        }

        // Bottom-left corner
        p += this.width*2 - 1;
        this.tileData[p] = 11;
        if (!neighborhood[7]) {

            this.tileData[p] = neighborhood[3] ? 17 : 13;
        }
        else {

            if (neighborhood[3] && !neighborhood[6]) {

                this.tileData[p] = 15;
            }
            else if (!neighborhood[3]) {

                this.tileData[p] = 19;
            }
        }
        
        // Bottom-right corner
        ++ p;
        this.tileData[p] = 12;
        if (!neighborhood[7]) {

            this.tileData[p] = neighborhood[5] ? 18 : 14;
        }
        else {

            if (neighborhood[5] && !neighborhood[8]) {

                this.tileData[p] = 16;
            }
            else if (!neighborhood[5]) {

                this.tileData[p] = 20;
            }
        }
    }


    private setBridge(x : number, y : number, value : number) : void {

        let p : number = y*this.width*4 + x*2;

        switch (value) {

        case Direction.Up:

            this.tileData[p] = 21;
            this.tileData[p + 1] = 22;
            break;

        case Direction.Down:

            p += this.width*2;
            this.tileData[p] = 31;
            this.tileData[p + 1] = 32;
            break;

        case Direction.Left:

            this.tileData[p] = 23;
            this.tileData[p + this.width*2] = 33;
            break;

        case Direction.Right:

            this.tileData[p + 1] = 24;
            this.tileData[p + this.width*2 + 1] = 34;
            break;

        default:
            break;
        }
    }


    private computeTileData(solidLayer : number[]) : void {

        for (let y : number = 0; y < this.height; ++ y) {

            for (let x : number = 0; x < this.width; ++ x) {

                const v : number = solidLayer[y*this.width + x];
                if (v == 0) {

                    continue;
                }

                if (v == 1) {
                
                    this.determineTile(solidLayer, x, y);
                }
                else {

                    this.setBridge(x, y, v - 1);
                }
            }
        }
    }


    public draw(canvas : RenderTarget, bmp : Bitmap) : void {

        for (let y : number = 0; y < this.height*2; ++ y) {

            for (let x : number = 0; x < this.width*2; ++ x) {

                const tile : number = this.tileData[y*this.width*2 + x] - 1;
                if (tile == -1) {

                    continue;
                }

                const sx : number = tile % 10;
                const sy : number = Math.floor(tile/10);

                canvas.drawBitmap(bmp, Flip.None, x*8, y*8, sx*8, sy*8, 8, 8);
            }
        }
    }
}
