import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { Vector } from "./vector.js";
import { Controller } from "./controller.js";
import { AudioPlayer } from "./audioplayer.js";
import { Assets } from "./assets.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { BitmapIndex } from "./mnemonics.js";
import { Puzzle } from "./puzzle.js";
import { Direction, directionToVector } from "./direction.js";
import { ParticleGenerator, ParticleType } from "./particle.js";


export const enum ObjectType {

    Player = 0,
    Crate = 1,
    Human = 2,
    LuckyClover = 3,
};


const IMMOVABLE_LOOKUP : boolean[] = [false, false, false, true];
const PASSTHROUGH_LOOKUP : boolean[] = [true, false, true, true];
const SMASHABLE_LOOKUP : boolean[] = [true, false, true, false];

const DEATH_COLORS : (string | undefined) [] = ["black", , "#b62400", ];

const DEATH_TIME : number = 45;


export type PuzzleObjectState = { x : number, y : number, orientation : number, type : ObjectType };


export class PuzzleObject {


    private pos : Vector;
    private renderPos : Vector;

    private animationTimer : number = 0.0;
    private deathTimer : number = 0.0;

    private oldOrientation : Direction;
    private orientation : Direction;
    private moveDirection : Vector;
    private moving : boolean = false;

    private exist : boolean = true;
    private dying : boolean = false;

    private causedFailure : boolean = false;
    private type : ObjectType;

    private readonly particles : ParticleGenerator;

    public readonly smashable : boolean;
    public readonly passable : boolean;
    public readonly immovable : boolean;


    constructor(x : number, y : number, type : ObjectType, 
        orientation : Direction, particles : ParticleGenerator) {

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

        this.particles = particles;
    }


    private spawnBloodParticles(amount : number, textured : boolean, color : string) : void {

        const H_SPEED_RANGE : number = 3.0;
        const V_SPEED_MIN : number = -3.0;
        const V_SPEED_MAX : number = 1.0;
        const PARTICLE_TIME : number = 40;

        const dir : Vector = Vector.zero();

        const dx : number = (this.pos.x + 0.5)*TILE_WIDTH;
        const dy : number = (this.pos.y + 0.5)*TILE_HEIGHT;

        const gravityDirection : Vector = new Vector(0, 1);
        gravityDirection.rotate(-this.orientation*Math.PI/2);

        for (let i : number = 0; i < amount; ++ i) {

            dir.x = (Math.random()*2 - 1.0)*H_SPEED_RANGE;
            dir.y = V_SPEED_MIN + Math.random()*(V_SPEED_MAX - V_SPEED_MIN);
            dir.rotate(-this.orientation*Math.PI/2);

            this.particles.next().spawn(dx, dy, dir.x, dir.y, 
                gravityDirection, PARTICLE_TIME, ParticleType.SingleColor, color)
        }
    }


    private overlayObject(o : PuzzleObject) : boolean {

        return (this.pos.x | 0) == (o.pos.x | 0) &&
               (this.pos.y | 0) == (o.pos.y | 0);   
    }


    private updateDeath(tick : number) : void {

        this.deathTimer += tick;
        if (this.deathTimer >= DEATH_TIME) {

            this.dying = false;
            this.exist = false;
        }
    }
    

    private drawDeath(canvas : RenderTarget, bmp : Bitmap) : void {
        
        const APPEAR_TIME : number = 15.0;

        const dx : number = (this.renderPos.x + 0.5)*TILE_WIDTH - bmp.width/2;
        const dy : number = (this.renderPos.y + 0.5)*TILE_HEIGHT - bmp.height/2;

        if (this.deathTimer < APPEAR_TIME) {

            const alpha : number = this.deathTimer/APPEAR_TIME;
            canvas.setAlpha(alpha);
        }

        canvas.drawBitmap(bmp, Flip.None, dx, dy);
        canvas.setAlpha();
    }


    private updateMovement(moveTimer : number) : void {

        if (!this.exist || this.dying) {

            return;
        }

        this.renderPos.x = this.pos.x - (1.0 - moveTimer)*this.moveDirection.x;
        this.renderPos.y = this.pos.y - (1.0 - moveTimer)*this.moveDirection.y;
    }


    public haltMovement() : void {

        if (!this.exist || this.dying || !this.moving) {

            return;
        }

        this.moving = false;
        this.moveDirection.zero();
        this.renderPos.makeEqual(this.pos);
    }


    public checkOverlay(o : PuzzleObject) : boolean {

        if (!this.exist || this.dying ||
            !o.exist || o.dying || !o.moving || 
            !this.overlayObject(o)) {

            return false;
        }

        if (SMASHABLE_LOOKUP[this.type] ?? false) {

            this.dying = true;
            this.deathTimer = 0.0;
            // this.exist = false;
            this.causedFailure = true;

            this.spawnBloodParticles(16, false, DEATH_COLORS[this.type] ?? "white");

            return true;
        }
        return false;
    }


    public update(moveTimer : number, tick : number) : void {

        const ANIMATION_SPEED : number = 1.0/30.0;

        if (!this.exist) {

            return;
        }

        if (this.dying) {

            this.updateDeath(tick);
            return;
        }

        if (this.moving) {

            this.updateMovement(moveTimer);
        }

        this.animationTimer = (this.animationTimer + ANIMATION_SPEED*tick) % 1.0;
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        if (!this.exist || this.dying) {

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


    public postDraw(canvas : RenderTarget, assets : Assets) {

        if (!this.exist) {

            return;
        }

        if (this.dying) {

            const bmpCross : Bitmap = assets.getBitmap(BitmapIndex.Cross);
            this.drawDeath(canvas, bmpCross);
            return;
        }

        // Possibly something else
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
