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
    private initialTime : number = 0.0;

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

        canvas.setColor(this.colorStr);
        canvas.fillRect(dx, dy, this.diameter, this.diameter);
    }


    public spawn(
        x : number, y : number, 
        speedx : number, speedy : number, 
        gravityDirection : Direction, existTime : number, 
        type : ParticleType, specialParam : Vector | string) : void {

        const MIN_DIAMETER : number = 2;
        const MAX_DIAMETER : number = 5;
        const BASE_GRAVITY : number = 6.0;

        const rotation : number = -gravityDirection*Math.PI/2;

        this.pos.setValues(x, y);
        this.speed.setValues(speedx, speedy).rotate(rotation);
        this.targetSpeed.setValues(speedx, BASE_GRAVITY).rotate(rotation);

        this.timer = existTime;
        this.initialTime = existTime;
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

        this.exists = true;
    }


    public update(tick : number) : void {

        if (!this.exists) {

            return;
        }

        this.timer -= tick;
        if (this.timer <= 0) {

            this.exists = false;
            return;
        }

        this.speed.x = approachValue(this.speed.x, this.targetSpeed.x, this.friction.x*tick);
        this.speed.y = approachValue(this.speed.y, this.targetSpeed.y, this.friction.y*tick);
    
        this.pos.x += this.speed.x*tick;
        this.pos.y += this.speed.y*tick;
    }


    public draw(canvas : RenderTarget, bmp : Bitmap) : void {

        if (!this.exists) {

            return;
        }

        let alpha : number = 1.0;
        if (this.timer < this.initialTime/4.0) {

            alpha = this.timer/(this.initialTime/4.0);
        }
        canvas.setAlpha(alpha);

        if (this.type == ParticleType.SingleColor) {

            this.drawSingleColorParticle(canvas);
        }
        else {

            // TODO: Texture particles!
        }
        canvas.setAlpha();
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


    public update(tick : number) : void {

        for (const p of this.particles) {

            p.update(tick);
        }
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        const bmp : Bitmap = assets.getBitmap(BitmapIndex.Figures);
        for (const p of this.particles) {

            p.draw(canvas, bmp);
        }
    }
}