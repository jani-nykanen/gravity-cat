import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { Vector } from "./vector.js";
import { Controller } from "./controller.js";
import { AudioPlayer } from "./audioplayer.js";
import { Assets } from "./assets.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { BitmapIndex } from "./mnemonics.js";
import { Puzzle } from "./puzzle.js";


export const enum ObjectType {

    Player = 0,
    Crate = 1,
    Human = 2,
    // etc

};



export class PuzzleObject {


    private pos : Vector;
    private renderPos : Vector;

    private animationTimer : number;

    private moveDirection : Vector;
    private moving : boolean = false;

    private exist : boolean = true;
    private dying : boolean = false;

    private type : ObjectType;


    constructor(x : number, y : number, type : ObjectType) {

        this.pos = new Vector(x, y);
        this.renderPos = this.pos.clone();

        this.moveDirection = Vector.zero();

        this.type = type;

        this.animationTimer = (x % 2 == y % 2) ? 0.0 : 0.5;
    }


    public updateMovement(moveTimer : number) : void {

        this.renderPos.x = this.pos.x + moveTimer*this.moveDirection.x;
        this.renderPos.y = this.pos.y + moveTimer*this.moveDirection.y;
    }


    public haltMovement(puzzle : Puzzle) : boolean {

        if (!this.moving) {

            return false;
        }

        this.pos.x += this.moveDirection.x;
        this.pos.y += this.moveDirection.y;
        this.renderPos.makeEqual(this.pos);

        this.moving = false;

        if (this.move(puzzle, this.moveDirection.x, this.moveDirection.y)) {

            return true;
        }
        this.moveDirection.zero();

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

        const bmpBase : Bitmap = assets.getBitmap(BitmapIndex.Base);
        const bmpFigures : Bitmap = assets.getBitmap(BitmapIndex.Figures);

        const frame : number = (this.animationTimer*4) | 0;

        const dx : number = this.renderPos.x*TILE_WIDTH;
        const dy : number = this.renderPos.y*TILE_HEIGHT;

        switch (this.type) {

        case ObjectType.Human:
        case ObjectType.Player:

            canvas.drawBitmap(bmpFigures, Flip.None, 
                dx, dy + 1,
                frame*16, (this.type == ObjectType.Human ? 16 : 0), 16, 16);
            break;

        case ObjectType.Crate:

            canvas.drawBitmap(bmpBase, Flip.None, dx, dy, 0, 32, 16, 16);
            break;

        default:
            break;
        }
    }


    public overlay(o : PuzzleObject) : boolean {

        return (this.pos.x | 0) == (o.pos.x | 0) &&
               (this.pos.y | 0) == (o.pos.y | 0);   
    }


    public isLocatedIn(x : number, y : number) : boolean {

        return (this.pos.x | 0) == (x | 0) &&
               (this.pos.y | 0) == (y | 0); 
    }


    public move(puzzle : Puzzle, dirx : number, diry : number) : boolean {

        if (this.moving || (dirx == 0 && diry == 0)) {

            return false;
        }

        if (puzzle.isTileFree(this, this.pos.x + dirx, this.pos.y + diry)) {

            this.moving = true;
            this.moveDirection = new Vector(dirx, diry);
            return true;
        }
        return false;
    }
}
