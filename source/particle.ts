import { Vector } from "./vector.js";
import { Direction, directionToVector } from "./direction.js";
import { approachValue } from "./utility.js";
import { Bitmap, RenderTarget } from "./gfx.js";
import { Assets } from "./assets.js";
import { BitmapIndex } from "./mnemonics.js";


export const enum ParticleType {

    SingleColor = 0,
    Textured = 1,
}


export class Particle {


    private pos : Vector;
    private speed : Vector;
    private targetSpeed : Vector;
    private friction : Vector;

    private timer : number = 0.0;

    private diameter : number = 0;
    private textureSource : Vector;
    private colorStr : string = "white";
    private type : ParticleType = ParticleType.SingleColor;

    private exists : boolean;
    

    constructor() {

        this.pos = Vector.zero();
        this.speed = Vector.zero();
        this.targetSpeed = Vector.zero();
        this.friction = new Vector(0.125, 0.125);

        this.textureSource = Vector.zero();

        this.exists = false;
    }


    private drawSingleColorParticle(canvas : RenderTarget) : void {

        const dx : number = this.pos.x - this.diameter/2;
        const dy : number = this.pos.y - this.diameter/2;

        canvas.setColorString(this.colorStr);
        canvas.fillRect(dx, dy, this.diameter, this.diameter);
    }


    public spawn(
        x : number, y : number, speedx : number, speedy : number, existTime : number, 
        type : ParticleType, specialParam : Vector | string) : void {

        const MIN_DIAMETER : number = 1;
        const MAX_DIAMETER : number = 4;

        this.pos.setValues(x, y);
        this.speed.setValues(speedx, speedy);

        this.timer = existTime;
        this.type = type;

        if (type == ParticleType.SingleColor) {

            this.diameter = MIN_DIAMETER + ((Math.random()*(MAX_DIAMETER - MIN_DIAMETER)) | 0);
        }
        
        if (typeof(specialParam) === "string") {

            this.colorStr = specialParam;
        }
        else {

            this.textureSource.makeEqual(specialParam as Vector);
        }
    }


    public update(gravityDirection : Direction, tick : number) : void {

        const BASE_GRAVITY : number = 4.0;

        if (!this.exists) {

            return;
        }

        this.timer -= tick;
        if (this.timer <= 0) {

            this.exists = false;
            return;
        }

        const gravityVector : Vector = directionToVector(gravityDirection);

        this.targetSpeed.x = gravityVector.x*BASE_GRAVITY;
        this.targetSpeed.y = gravityVector.y*BASE_GRAVITY;

        this.speed.x = approachValue(this.speed.x, this.targetSpeed.x, this.friction.x*tick);
        this.speed.y = approachValue(this.speed.y, this.targetSpeed.y, this.friction.y*tick);
    
        this.pos.x += this.speed.x*tick;
        this.pos.y += this.speed.y*tick;
    }


    public draw(canvas : RenderTarget, bmp : Bitmap) : void {

        if (!this.exists) {

            return;
        }

        if (this.type == ParticleType.SingleColor) {

            this.drawSingleColorParticle(canvas);
            return;
        }

        // TODO: Texture particles!
    }


    public doesExist() : boolean {

        return this.exists;
    }
}



export class ParticleGenerator {

    
    private particles : Particle[];


    constructor() {

        this.particles = new Array<Particle> ();
    }


    public next() : Particle {

        for (const o of this.particles) {

            if (!o.doesExist()) {

                return o;
            }
        } 

        const p : Particle = new Particle();
        this.particles.push(p);

        return p;
    }


    public update(gravityDirection : Direction, tick : number) : void {

        for (const p of this.particles) {

            p.update(gravityDirection, tick);
        }
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        const bmp : Bitmap = assets.getBitmap(BitmapIndex.Figures);
        for (const p of this.particles) {

            p.draw(canvas, bmp);
        }
    }
}