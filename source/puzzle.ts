import { Bitmap, RenderTarget } from "./gfx.js";
import { TerrainMap } from "./terrainmap.js";
import { Assets } from "./assets.js";
import { BitmapIndex } from "./mnemonics.js";
import { TILE_WIDTH, TILE_HEIGHT } from "./tilesize.js";
import { ObjectType, PuzzleObject, PuzzleObjectState } from "./puzzleobject.js";
import { ActionState, Controller, InputState } from "./controller.js";
import { AudioPlayer } from "./audioplayer.js";
import { Vector } from "./vector.js";
import { Direction } from "./direction.js";
import { ParticleGenerator } from "./particle.js";


const FAILURE_SHAKE_TIME : number = 45.0;


class PuzzleState {


    private objects : PuzzleObjectState[];


    constructor(initialObjects : PuzzleObject[]) {

        this.objects = new Array<PuzzleObjectState> ();
        for (const o of initialObjects) {

            if (!o.doesExist() || o.isDying()) {

                continue;
            }
            this.objects.push(o.toState());
        }
    }


    public recover(objects : PuzzleObject[], particles : ParticleGenerator) : void {

        objects.length = 0;
        for (const o of this.objects) {

            objects.push(new PuzzleObject(o.x, o.y, o.type, o.orientation, particles));
        }
    }
}


export class Puzzle {


    private tiles : number[];
    private terrainMap : TerrainMap;

    private objects : PuzzleObject[];
    private particles : ParticleGenerator;

    private initialState : PuzzleState;
    private states : PuzzleState[];

    private moveTimer : number = 0.0;
    private moveTimerSpeed : number = 0.0;
    private somethingMoving : boolean = false;
    private moveDirection : Direction = Direction.None;

    private failed : boolean = false;
    private failureTimer : number = 0.0;

    public readonly width : number;
    public readonly height : number;


    constructor(levelData : string) {

        this.width = parseInt(levelData[0], 32);
        this.height = parseInt(levelData[1], 32);
        this.tiles = levelData.substring(2).split("").map((c : string) => parseInt(c, 32));

        this.terrainMap = new TerrainMap(this.tiles, this.width, this.height);

        this.particles = new ParticleGenerator();
        this.objects = new Array<PuzzleObject> ();
        this.parseObjects();

        this.initialState = new PuzzleState(this.objects);
        this.states = new Array<PuzzleState> ();
    }


    private parseObjects() : void {

        for (let y : number = 0; y < this.height; ++ y) {

            for (let x : number = 0; x < this.width; ++ x) {

                const objectID : number = this.tiles[y*this.width + x];
                if (objectID <= 1) {

                    continue;
                }

                const objectType : ObjectType = (objectID - 2) as ObjectType;
                this.objects.push(new PuzzleObject(x, y, objectType, Direction.Down, this.particles));
            }
        }
    }


    private control(controller : Controller) : void {

        if (this.somethingMoving || this.failed) {

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

            if (this.initiateMovement(dir)) {

                this.states.push(new PuzzleState(this.objects));
            }
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

        if (!this.somethingMoving) {

            return;
        }

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

                    // Note: failure = case 1 || case 2 does not work here
                    // since both functions cause side effects
                    let failure : boolean = this.objects[i].checkOverlay(this.objects[j]);
                    failure = this.objects[j].checkOverlay(this.objects[i]) || failure;

                    if (failure) {

                        this.failed = true;
                        this.failureTimer = FAILURE_SHAKE_TIME;
                    }
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
        }
    }


    private updateFailure(tick : number) : void {

        if (!this.failed) {

            return;
        }

        this.failureTimer -= tick;
        if (this.failureTimer <= 0.0 && !this.somethingMoving) {

            if (!this.undo()) {

                this.restart(true);
            }
            this.failed = false;
            this.failureTimer = 0.0;
        }
    }


    private resetProperties() : void {

        this.somethingMoving = false;
        this.moveTimerSpeed = 0.0;
        this.moveDirection = Direction.None;
        this.failed = false;
        this.failureTimer = 0.0;
    }


    private drawGrid(canvas : RenderTarget) : void {

        canvas.setColor("#248fdb");
        canvas.fillRect(0, 0, this.width*TILE_WIDTH, this.height*TILE_HEIGHT);

        canvas.setColor("#49b6ff");
        for (let y : number = 0; y < this.height; ++ y) {

            for (let x : number = 0; x < this.width; ++ x) {

                if (x % 2 == y % 2) {
                    
                    continue;
                }
                canvas.fillRect(x*TILE_WIDTH, y*TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
            }
        }
    }


    public setCamera(canvas : RenderTarget) : void {

        const FAILURE_SHAKE : number = 4.0;

        let shakeX : number = 0.0;
        let shakeY : number = 0.0;
        if (this.failureTimer > 0.0) {

            shakeX = Math.floor((-1.0 + Math.random()*2.0)*FAILURE_SHAKE);
            shakeY = Math.floor((-1.0 + Math.random()*2.0)*FAILURE_SHAKE);
        }

        canvas.moveTo(
            canvas.width/2 - this.width*TILE_WIDTH/2 + shakeX, 
            canvas.height/2 - this.height*TILE_HEIGHT/2 + shakeY);
    }


    public update(controller : Controller, audio : AudioPlayer, assets : Assets, tick : number) : void {

        if (this.failed) {

            this.failureTimer -= tick;
            if (this.failureTimer <= 0.0) {

                if (!this.undo()) {

                    this.restart(true);
                }
                this.failed = false;
                this.failureTimer = 0.0;
            }
        }

        this.control(controller);
        this.updateMovement(tick);
        this.updateFailure(tick);
        
        for (const o of this.objects) {

            o.update(this.moveTimer, tick);
        }
        this.objects.sort((a : PuzzleObject, b : PuzzleObject) : number => a.getZIndex() - b.getZIndex());

        this.particles.update(tick);
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        this.drawGrid(canvas);

        const bmpTerrain : Bitmap = assets.getBitmap(BitmapIndex.Terrain);
        const bmpGameObjects : Bitmap = assets.getBitmap(BitmapIndex.GameObjects);

        this.terrainMap.draw(canvas, bmpTerrain);

        this.particles.drawBackground(canvas, bmpGameObjects);
        for (const o of this.objects) {

            o.draw(canvas, bmpGameObjects);
        }
        this.particles.drawForeground(canvas, bmpGameObjects);
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


    public restart(noPush : boolean = false) : void {

        if (!noPush && this.states.length > 0) {

            this.states.push(new PuzzleState(this.objects));
        }

        this.resetProperties();

        this.initialState.recover(this.objects, this.particles);
    }


    public undo() : boolean {

        if (this.states.length == 0) {

            return false;
        }

        const newState : PuzzleState = this.states.pop()!;
        newState.recover(this.objects, this.particles);

        this.resetProperties();

        return true;
    }
}
