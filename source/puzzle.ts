import { Bitmap, RenderTarget } from "./gfx.js";
import { TerrainMap } from "./terrainmap.js";
import { Assets } from "./assets.js";
import { BitmapIndex } from "./mnemonics.js";
import { TILE_WIDTH, TILE_HEIGHT } from "./tilesize.js";
import { ObjectType, PuzzleObject } from "./puzzleobject.js";
import { ActionState, Controller, InputState } from "./controller.js";
import { AudioPlayer } from "./audioplayer.js";
import { Vector } from "./vector.js";
import { Direction } from "./direction.js";


export class Puzzle {


    private tiles : number[];
    private terrainMap : TerrainMap;

    private objects : PuzzleObject[];

    private moveTimer : number = 0.0;
    private moveTimerSpeed : number = 0.0;
    private somethingMoving : boolean = false;
    private moveDirection : Direction = Direction.None;

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

        let dir : Direction = Direction.None;
        let maxTimestamp : number = 0;
        let directionPressed : boolean = false;

        for (let i : number = 0; i < 4; ++ i) {

            const state : ActionState = controller.getAction(i);
            if ((state.state & InputState.DownOrPressed) != 0 && 
                state.timestamp >= maxTimestamp) {

                maxTimestamp = state.timestamp;
                dir = (i + 1) as Direction;

                directionPressed = true;
            }
        }

        if (directionPressed) {

            this.initiateMovement(dir);
        }
    }


    private initiateMovement(dir : Direction) : boolean {

        this.somethingMoving = false;
        let somethingNewMoved : boolean = false;
        do {

            somethingNewMoved = false;
            for (const o of this.objects) {

                if (o.move(this, dir)) {

                    this.somethingMoving = true;
                    somethingNewMoved = true;
                }
            }
        }
        while (somethingNewMoved);

        if (this.somethingMoving) {

            this.moveTimer = 0.0;
            this.moveDirection = dir;
        }
        return this.somethingMoving;
    }


    private updateMovement(tick : number) : void {

        const GRAVITY : number = 1.0/120.0;
        const MAX_GRAVITY : number = 1.0/2.0;

        this.moveTimerSpeed += GRAVITY*tick;
        if (this.moveTimerSpeed > MAX_GRAVITY) {

            this.moveTimerSpeed = MAX_GRAVITY;
        }

        this.moveTimer += this.moveTimerSpeed*tick;
        if(this.moveTimer >= 1.0) {

            this.somethingMoving = false;
            this.moveTimer -= 1.0;

            // Check for overlays
            for (let i : number = 0; i < this.objects.length; ++ i) {

                for (let j : number = i + 1; j < this.objects.length; ++ j) {

                    this.objects[i].checkOverlay(this.objects[j]);
                    this.objects[j].checkOverlay(this.objects[i]);
                }
            }

            // Halt movement
            for (const o of this.objects) {

                o.haltMovement();
            }

            // Check if movement still continues
            if (!this.initiateMovement(this.moveDirection)) {

                this.moveDirection = Direction.None;
                this.moveTimerSpeed = 0.0;
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

//        for (const o of this.objects) {
//
//            o.drawDebug(canvas);
//        }

        for (const o of this.objects) {

            o.draw(canvas, assets);
        }
    } 


    public isTileFree(x : number, y : number) : boolean {
        
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {

            return false;
        }

        if (this.tiles[y*this.width + x] == 1) {

            return false;
        }

        for (const o of this.objects) {

            if (o.isLocatedIn(x, y)) {
                
                return false;
            }
        }
        return true;
    }
}
