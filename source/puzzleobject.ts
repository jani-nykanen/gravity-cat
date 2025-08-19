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

const DEATH_COLORS : (string | undefined) [] = ["black", , "#ff2400", ];

const DEATH_TIME : number = 20;


export type PuzzleObjectState = { x : number, y : number, orientation : number, type : ObjectType };


export class PuzzleObject {


    private pos : Vector;
    private renderPos : Vector;
    private zindex : number = 0;

    private animationTimer : number = 0.0;
    private deathTimer : number = 0.0;

    private oldOrientation : Direction;
    private orientation : Direction;
    private moveDirection : Vector;
    private moving : boolean = false;

    private exist : boolean = true;
    private dying : boolean = false;
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

        this.animationTimer = (x % 2 == y % 2) ? 0.0 : 1.0;

        this.particles = particles;
    }


    private spawnBloodParticles(amount : number, textured : boolean, color : string) : void {

        const H_SPEED_RANGE : number = 2.5;
        const V_SPEED_MIN : number = -4.0;
        const V_SPEED_MAX : number = 2.0;
        const PARTICLE_TIME : number = 40;

        const dx : number = (this.pos.x + 0.5)*TILE_WIDTH;
        const dy : number = (this.pos.y + 0.5)*TILE_HEIGHT;

        for (let i : number = 0; i < amount; ++ i) {

            const speedx : number = (Math.random()*2 - 1.0)*H_SPEED_RANGE;
            const speedy : number = V_SPEED_MIN + Math.random()*(V_SPEED_MAX - V_SPEED_MIN);

            this.particles.next().spawn(dx, dy, speedx, speedy, 
                this.orientation, PARTICLE_TIME, ParticleType.SingleColor, color)
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


    private updateMovement(moveTimer : number) : void {

        if (!this.exist || this.dying) {

            return;
        }

        this.renderPos.x = this.pos.x - (1.0 - moveTimer)*this.moveDirection.x;
        this.renderPos.y = this.pos.y - (1.0 - moveTimer)*this.moveDirection.y;
    }


    private setZIndex() : void {

        if (this.type == ObjectType.LuckyClover) {

            this.zindex = 2;
            return;
        }
        this.zindex = this.moving ? 1 : 0;
    }


    private drawDeath(canvas : RenderTarget) : void {

        const t : number = this.deathTimer/DEATH_TIME;
        const dx : number = (this.renderPos.x + 0.5)*TILE_WIDTH;
        const dy : number = (this.renderPos.y + 0.5)*TILE_HEIGHT;

        if (this.type == ObjectType.LuckyClover) {

            const innerRadius : number = t*t*12;
            const outerRadius : number = 4 + t*8;

            canvas.setColorString("#b6ff00");
            canvas.fillRing(dx, dy, innerRadius, outerRadius);

            return;
        }

        // TODO: Other objects, maybe (at least the fire)
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

        if (this.type == ObjectType.LuckyClover && o.type == ObjectType.Player) {

            // this.exist = false;
            this.dying = true;
            this.deathTimer = 0.0;

            return false;
        }

        if (SMASHABLE_LOOKUP[this.type] ?? false) {

            this.exist = false;
            this.deathTimer = 0.0;

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

        this.animationTimer = (this.animationTimer + ANIMATION_SPEED*tick) % 2.0;
        this.setZIndex();
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        if (!this.exist) {

            return;
        }

        if (this.dying) {

            this.drawDeath(canvas);
            return;
        }

        const bmpBase : Bitmap = assets.getBitmap(BitmapIndex.Base);
        const bmpFigures : Bitmap = assets.getBitmap(BitmapIndex.Figures);

        const frame : number = ((this.animationTimer % 1)*4) | 0;

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

            canvas.drawBitmap(bmpBase, Flip.None, 
                dx, 
                dy + Math.round(Math.sin(this.animationTimer*Math.PI)), 
                48, 32, 16, 16);
            break;
        

        default:
            break;
        }
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


    public getZIndex() : number {

        return this.zindex;
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
