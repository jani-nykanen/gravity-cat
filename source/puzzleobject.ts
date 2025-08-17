import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { Vector } from "./vector.js";
import { Controller } from "./controller.js";
import { AudioPlayer } from "./audioplayer.js";
import { Assets } from "./assets.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { BitmapIndex } from "./mnemonics.js";
import { Puzzle } from "./puzzle.js";
import { Direction, directionToVector } from "./direction.js";


export const enum ObjectType {

    Player = 0,
    Crate = 1,
    Human = 2,
    LuckyClover = 3,
};


const IMMOVABLE_LOOKUP : boolean[] = [false, false, false, true];
const PASSTHROUGH_LOOKUP : boolean[] = [true, false, true, true];
const SMASHABLE_LOOKUP : boolean[] = [true, false, true, false];


export type PuzzleObjectState = { x : number, y : number, orientation : number, type : ObjectType };


export class PuzzleObject {


    private pos : Vector;
    private renderPos : Vector;

    private animationTimer : number;

    private oldOrientation : Direction;
    private orientation : Direction;
    private moveDirection : Vector;
    private moving : boolean = false;

    private exist : boolean = true;
    private causedFailure : boolean = false;
    private type : ObjectType;


    public readonly smashable : boolean;
    public readonly passable : boolean;
    public readonly immovable : boolean;


    constructor(x : number, y : number, type : ObjectType, 
        orientation : Direction = Direction.Down) {

        this.pos = new Vector(x, y);
        this.renderPos = this.pos.clone();

        this.moveDirection = Vector.zero();

        this.type = type;
        this.orientation = orientation;
        this.oldOrientation = orientation;

        this.smashable = SMASHABLE_LOOKUP[this.type] ?? false;
        this.passable = PASSTHROUGH_LOOKUP[this.type] ?? false;
        this.immovable = IMMOVABLE_LOOKUP[this.type] ?? false;

        this.animationTimer = (x % 2 == y % 2) ? 0.0 : 0.5;
    }


    private overlayObject(o : PuzzleObject) : boolean {

        return (this.pos.x | 0) == (o.pos.x | 0) &&
               (this.pos.y | 0) == (o.pos.y | 0);   
    }


    public updateMovement(moveTimer : number) : void {

        this.renderPos.x = this.pos.x - (1.0 - moveTimer)*this.moveDirection.x;
        this.renderPos.y = this.pos.y - (1.0 - moveTimer)*this.moveDirection.y;
    }


    public haltMovement() : void {

        if (!this.exist || !this.moving) {

            return;
        }

        this.moving = false;
        this.moveDirection.zero();
        this.renderPos.makeEqual(this.pos);
    }


    public checkOverlay(o : PuzzleObject) : boolean {

        if (!this.exist || !o.exist || !o.moving || !this.overlayObject(o)) {

            return false;
        }

        if (SMASHABLE_LOOKUP[this.type] ?? false) {

            this.exist = false;
            this.causedFailure = true;
            return true;
        }
        return false;
    }


    public updateAnimation(tick : number) : void {

        const ANIMATION_SPEED : number = 1.0/30.0;

        if (!this.exist) {

            return;
        }

        this.animationTimer = (this.animationTimer + ANIMATION_SPEED*tick) % 1.0;
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        if (!this.exist) {

            return;
        }

        const bmpBase : Bitmap = assets.getBitmap(BitmapIndex.Base);
        const bmpFigures : Bitmap = assets.getBitmap(BitmapIndex.Figures);

        const frame : number = (this.animationTimer*4) | 0;

        const dx : number = this.renderPos.x*TILE_WIDTH;
        const dy : number = this.renderPos.y*TILE_HEIGHT;

        const orientationShift : Vector = directionToVector(this.orientation);
        const rotation : number = this.orientation*Math.PI/2;

        switch (this.type) {

        case ObjectType.Human:
        case ObjectType.Player:

            canvas.drawBitmap(bmpFigures, Flip.None, 
                dx + orientationShift.x , dy + orientationShift.y,
                frame*16, (this.type == ObjectType.Human ? 16 : 0), 16, 16, 16, 16,
                8, 8, rotation);
            break;

        case ObjectType.Crate:

            canvas.drawBitmap(bmpBase, Flip.None, dx, dy, 0, 32, 16, 16);
            break;

        case ObjectType.LuckyClover:

            canvas.drawBitmap(bmpBase, Flip.None, dx, dy, 48, 32, 16, 16);
            break;
        

        default:
            break;
        }
    }


    public drawFailure(canvas : RenderTarget, bmp : Bitmap) : void {
        
        if (!this.causedFailure) {

            return;
        }
    
        const dx : number = (this.renderPos.x + 0.5)*TILE_WIDTH - bmp.width/2;
        const dy : number = (this.renderPos.y + 0.5)*TILE_HEIGHT - bmp.height/2;

        canvas.drawBitmap(bmp, Flip.None, dx, dy);
    }


    public isLocatedIn(x : number, y : number) : boolean {

        if (this.passable) {

            return false;
        }

        return (this.pos.x | 0) == (x | 0) &&
               (this.pos.y | 0) == (y | 0); 
    }


    public move(puzzle : Puzzle, direction : Direction) : boolean {

        if (!this.exist || this.moving || this.immovable || direction == Direction.None) {

            return false;
        }

        this.oldOrientation = this.orientation;
        this.orientation = direction;

        const dir : Vector = directionToVector(direction);
        if (puzzle.isTileFree(this.pos.x + dir.x, this.pos.y + dir.y)) {

            this.moveDirection.makeEqual(dir);
            this.moving = true;
            this.pos.x += this.moveDirection.x;
            this.pos.y += this.moveDirection.y;

            return true;
        }
        return false;
    }


    public doesExist() : boolean {

        return this.exist;
    }


    public toState() : PuzzleObjectState {

        return {
            x: this.pos.x - this.moveDirection.x, 
            y: this.pos.y - this.moveDirection.y,
            orientation: this.oldOrientation,
            type: this.type
        };
    }
}
