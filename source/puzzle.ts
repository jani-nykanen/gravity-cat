import { Bitmap, RenderTarget } from "./gfx.js";
import { TerrainMap } from "./terrainmap.js";
import { Assets } from "./assets.js";
import { BitmapIndex } from "./mnemonics.js";
import { TILE_WIDTH, TILE_HEIGHT } from "./tilesize.js";
import { ObjectType, PuzzleObject } from "./puzzleobject.js";
import { ActionState, Controller, InputState } from "./controller.js";
import { AudioPlayer } from "./audioplayer.js";


const MOVE_SPEED : number = 1.0/8.0;

const MOVEDIR_X_LOOKUP : number[] = [1, 0, -1, 0];
const MOVEDIR_Y_LOOKUP : number[] = [0, -1, 0, 1];


export class Puzzle {


    private tiles : number[];
    private terrainMap : TerrainMap;

    private objects : PuzzleObject[];

    private moveTimer : number = 0.0;
    private somethingMoving : boolean = false;

    public readonly width : number;
    public readonly height : number;


    constructor(levelData : string) {

        this.width = parseInt(levelData[0], 32);
        this.height = parseInt(levelData[1], 32);
        this.tiles = levelData.substring(2).split("").map((c : string) => parseInt(c, 32));

        this.terrainMap = new TerrainMap(this.tiles, this.width, this.height);

        this.objects = new Array<PuzzleObject> ();
        this.parseObjects();
    }


    private parseObjects() : void {

        for (let y : number = 0; y < this.height; ++ y) {

            for (let x : number = 0; x < this.width; ++ x) {

                const objectID : number = this.tiles[y*this.width + x];
                if (objectID <= 1) {

                    continue;
                }

                const objectType : ObjectType = (objectID - 2) as ObjectType;
                this.objects.push(new PuzzleObject(x, y, objectType));
            }
        }
    }


    private control(controller : Controller) : void {

        if (this.somethingMoving) {

            return;
        }

        let dirx : number = 0;
        let diry : number = 0;
        let maxTimestamp : number = 0;
        let directionPressed : boolean = false;

        for (let i : number = 0; i < 4; ++ i) {

            const state : ActionState = controller.getAction(i);
            if ((state.state & InputState.DownOrPressed) != 0 && 
                state.timestamp >= maxTimestamp) {

                maxTimestamp = state.timestamp;
                dirx = MOVEDIR_X_LOOKUP[i];
                diry = MOVEDIR_Y_LOOKUP[i];

                directionPressed = true;
            }
        }

        if (directionPressed) {

            for (const o of this.objects) {

                if (o.move(this, dirx, diry)) {

                    this.somethingMoving = true;
                    this.moveTimer = 0.0;
                }
            }
        }
    }


    private updateMovement(tick : number) : void {

        this.moveTimer += MOVE_SPEED*tick;
        if(this.moveTimer >= 1.0) {

            this.somethingMoving = false;
            for (const o of this.objects) {

                if (o.haltMovement(this)) {

                    this.somethingMoving = true;
                }
            }

            if (this.somethingMoving) {

                this.moveTimer -= 1.0;
            }
            else {

                this.moveTimer = 0.0;
            }
            return;
        }

        for (const o of this.objects) {

            o.updateMovement(this.moveTimer);
        }
    }


    public setCamera(canvas : RenderTarget) : void {

        canvas.moveTo(
            canvas.width/2 - this.width*TILE_WIDTH/2, 
            canvas.height/2 - this.height*TILE_HEIGHT/2);
    }


    public update(controller : Controller, audio : AudioPlayer, assets : Assets, tick : number) : void {

        this.control(controller);
        if (this.somethingMoving) {

            this.updateMovement(tick);
        }

        for (const o of this.objects) {

            o.updateAnimation(tick);
        }
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        const bmpTerrain : Bitmap = assets.getBitmap(BitmapIndex.Terrain);

        this.terrainMap.draw(canvas, bmpTerrain);

        for (const o of this.objects) {

            o.draw(canvas, assets);
        }
    } 


    public isTileFree(self : PuzzleObject, x : number, y : number) : boolean {
        
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {

            return false;
        }

        if (this.tiles[y*this.width + x] == 1) {

            return false;
        }

        for (const o of this.objects) {

            if (o === self) {

                continue;
            }
            // TODO: Some objects may overlap
            if (o.isLocatedIn(x, y)) {
                
                return false;
            }
        }
        return true;
    }
}
