import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { Vector } from "./vector.js";
import { Controller } from "./controller.js";
import { AudioPlayer } from "./audioplayer.js";
import { Assets } from "./assets.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { BitmapIndex, SampleIndex } from "./mnemonics.js";
import { Puzzle } from "./puzzle.js";
import { Direction, directionToVector } from "./direction.js";
import { ParticleGenerator, ParticleType } from "./particle.js";


export const enum ObjectType {

    Player = 0,
    Crate = 1,
    Human = 2,
    Gem = 3,
    Boulder = 4,
    Rubble = 5,
    Fire = 6,
};


const IMMOVABLE_LOOKUP : boolean[] = [false, false, false, true, false, true, true];
const PASSTHROUGH_LOOKUP : boolean[] = [true, false, true, true, false, false, true];
const SMASHABLE_LOOKUP : boolean[] = [true, false, true, false, false, false, false];

const DEATH_TIME : number = 20;


export type PuzzleObjectState = { x : number, y : number, orientation : number, type : ObjectType };


export class PuzzleObject {


    private pos : Vector;
    private renderPos : Vector;
    private zindex : number = 0;

    private animationTimer : number = 0.0;
    private deathTimer : number = 0.0;
    private smokeTimer : number = 0.0;

    private oldOrientation : Direction;
    private orientation : Direction;
    private moveDirection : Vector;
    private moving : boolean = false;
    private hasMoved : boolean = false;

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


    private getCenter() : Vector {

        return new Vector((this.renderPos.x + 0.5)*TILE_WIDTH, (this.renderPos.y + 0.5)*TILE_HEIGHT);
    }


    private spawnBloodParticles(amount : number, type : ParticleType) : void {

        const H_SPEED_RANGE : number = 2.0;
        const V_SPEED_MIN : number = -4.0;
        const V_SPEED_MAX : number = 1.0;
        const PARTICLE_TIME : number = 30;

        const p : Vector = this.getCenter();

        for (let i : number = 0; i < amount; ++ i) {

            const speedx : number = (Math.random()*2 - 1.0)*H_SPEED_RANGE;
            const speedy : number = V_SPEED_MIN + Math.random()*(V_SPEED_MAX - V_SPEED_MIN);

            this.particles.next().spawn(p.x, p.y, speedx, speedy, 
                this.orientation, PARTICLE_TIME, type, true);
        }
    }


    private spawnSplinters(sx : number, sy : number, direction : Direction) : void {

        const BASE_SPEED : number = 1.5;
        const VERTICAL_JUMP : number = -1.0;
        const PARTICLE_TIME : number = 30;

        const cornerx : number = this.renderPos.x*TILE_WIDTH;
        const cornery : number = this.renderPos.y*TILE_HEIGHT;

        for (let i : number = 0; i < 4; ++ i) {

            const angle : number = Math.PI/4 + Math.PI/2*i;

            const speedx : number = Math.cos(angle)*BASE_SPEED;
            const speedy : number = Math.sin(angle)*BASE_SPEED + VERTICAL_JUMP;

            const texX : number = i < 2 ? i % 2 : 1 - (i % 2);
            const texY : number = (i/2) | 0;

            this.particles.next().spawn(cornerx + texX*8 + 4, cornery + texY*8 + 4, 
                speedx, speedy, 
                direction, PARTICLE_TIME, ParticleType.Textured, true,
                (sx + texX)*8, (sy + texY)*8);
        }
    }


    private overlayObject(o : PuzzleObject) : boolean {

        return (this.pos.x | 0) == (o.pos.x | 0) &&
               (this.pos.y | 0) == (o.pos.y | 0);   
    }


    private updateSmoke(moveTimer : number) : void {

        const SMOKE_TIME : number = 1.0;

        if (this.type != ObjectType.Player) {

            return;
        }

        this.smokeTimer += moveTimer;
        if (this.smokeTimer >= SMOKE_TIME) {

            this.smokeTimer -= SMOKE_TIME;

            const p : Vector = this.getCenter();
            this.particles.next().spawn(p.x, p.y, 0.0, 0.0, Direction.None, 30, ParticleType.BlackSmoke, false);
        }
    }


    private updateDeath(tick : number) : void {

        this.zindex = 0;

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

        this.updateSmoke(moveTimer);
    }


    private setZIndex() : void {

        if (this.type == ObjectType.Gem) {

            this.zindex = 2;
            return;
        }
        
        this.zindex = 0;
        if (this.moving) {

            this.zindex = this.type == ObjectType.Player ? 3 : 1;
        }
    }


    private killPlayerOrHuman(audio : AudioPlayer, assets : Assets) : void {

        this.exist = false;
        
        this.spawnBloodParticles(16, 
            this.type == ObjectType.Player ? ParticleType.BlackBlood : ParticleType.RedBlood);
        audio.playSample(assets.getSample(SampleIndex.Kill), 0.50);
    }


    private drawDeath(canvas : RenderTarget) : void {

        const t : number = this.deathTimer/DEATH_TIME;
        const dx : number = (this.renderPos.x + 0.5)*TILE_WIDTH;
        const dy : number = (this.renderPos.y + 0.5)*TILE_HEIGHT;

        if (this.type != ObjectType.Gem && this.type != ObjectType.Fire) {

            return;
        }

        const innerRadius : number = t*t*16;
        const outerRadius : number = 4 + t*12;

        const foregroundCOlor : string = this.type == ObjectType.Gem ? "#ffdbff" : "#ff9200";
        const backgroundColor : string = this.type == ObjectType.Gem ? "#db6db6" : "#b62400";

        canvas.setColor(backgroundColor);
        canvas.fillRing(dx, dy, innerRadius, outerRadius);

        canvas.setColor(foregroundCOlor);
        canvas.fillRing(dx - 1, dy - 1, innerRadius, outerRadius - 2);
    }


    public haltMovement() : void {

        if (!this.exist || this.dying || !this.moving) {

            return;
        }

        this.moving = false;
        this.hasMoved = true;

        this.moveDirection.zero();
        this.renderPos.makeEqual(this.pos);
    }


    public checkOverlay(o : PuzzleObject, audio : AudioPlayer, assets : Assets) : boolean {

        if (!this.exist || this.dying ||
            !o.exist || o.dying || !o.moving || 
            !this.overlayObject(o)) {

            return false;
        }

        // Collect a gem
        if (this.type == ObjectType.Gem && o.type == ObjectType.Player) {

            // this.exist = false;
            this.dying = true;
            this.deathTimer = 0.0;

            audio.playSample(assets.getSample(SampleIndex.Collect), 0.60);

            return false;
        }

        // Destroy a crate or rubble
        if ((this.type == ObjectType.Crate || this.type == ObjectType.Rubble)
            && o.type == ObjectType.Boulder) {

            this.exist = false;

            this.spawnSplinters(this.type == ObjectType.Rubble ? 4 : 0, 6, o.orientation);

            audio.playSample(assets.getSample(SampleIndex.Break), 0.80);

            return false;
        }

        // FIIIIIIREEEEE!
        if (this.type == ObjectType.Fire) {
            
            let returnValue : boolean = false;

            if (o.type == ObjectType.Crate) {

                o.exist = false;
                o.spawnSplinters(0, 6, o.orientation);

                audio.playSample(assets.getSample(SampleIndex.Break), 0.80);
            }
            else if (o.type == ObjectType.Boulder) {

                audio.playSample(assets.getSample(SampleIndex.Break), 0.80);
            }
            else if (o.type == ObjectType.Player || o.type == ObjectType.Human) {

                audio.playSample(assets.getSample(SampleIndex.Kill), 0.50);
                o.killPlayerOrHuman(audio, assets);
                
                returnValue = true;
            }

            this.deathTimer = 0.0;
            this.dying = true;

            return returnValue;
        }

        // Kill the cat or a human
        if (SMASHABLE_LOOKUP[this.type] ?? false) {

            this.killPlayerOrHuman(audio, assets);

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

        this.hasMoved = false;
    }


    public draw(canvas : RenderTarget, bmp : Bitmap) : void {

        if (!this.exist) {

            return;
        }

        if (this.dying) {

            this.drawDeath(canvas);
            return;
        }

        const frame : number = ((this.animationTimer % 1)*4) | 0;

        const dx : number = this.renderPos.x*TILE_WIDTH;
        const dy : number = this.renderPos.y*TILE_HEIGHT;

        const orientationShift : Vector = directionToVector(this.orientation);
        const rotation : number = this.orientation*Math.PI/2;

        switch (this.type) {

        case ObjectType.Human:
        case ObjectType.Player:

            canvas.drawBitmap(bmp, Flip.None, 
                dx + orientationShift.x , dy + orientationShift.y,
                frame*16, (this.type == ObjectType.Human ? 16 : 0), 16, 16, 16, 16,
                8, 8, rotation);
            break;

        case ObjectType.Crate:

            canvas.drawBitmap(bmp, Flip.None, dx, dy, 0, 48, 16, 16);
            break;

        case ObjectType.Boulder:
        case ObjectType.Rubble:

            canvas.drawBitmap(bmp, Flip.None, dx, dy, (this.type - ObjectType.Gem)*16, 48, 16, 16);
            break;

        case ObjectType.Gem:

            canvas.drawBitmap(bmp, Flip.None, 
                dx, 
                dy + Math.round(Math.sin(this.animationTimer*Math.PI)), 
                frame*16, 32, 16, 16);
            break;

        case ObjectType.Fire:

            canvas.drawHorizontallyWavingBitmap(bmp, 
                1.0, Math.PI*4, this.animationTimer/2.0*Math.PI*2, Flip.None, 
                dx, dy + 1, 48, 48, 16, 16);
            break;

        default:
            break;
        }
    }


    public isLocatedIn(x : number, y : number) : boolean {

        if (!this.exist || this.dying || this.passable) {

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
        if (puzzle.isTileFree(this.pos.x + dir.x, this.pos.y + dir.y, direction, this)) {

            this.moveDirection.makeEqual(dir);
            this.moving = true;
            this.pos.x += this.moveDirection.x;
            this.pos.y += this.moveDirection.y;

            this.smokeTimer = 0.0;

            return true;
        }
        return false;
    }


    public doesExist() : boolean {

        return this.exist;
    }


    public isDying() : boolean {

        return this.dying;
    }


    public getZIndex() : number {

        return this.zindex;
    }


    public getType() : ObjectType {

        return this.type;
    }


    public didMoveBefore() : boolean {

        return this.hasMoved;
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
