import { Vector } from "./vector.js";
import { Direction, directionToVector } from "./direction.js";
import { approachValue } from "./utility.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { Assets } from "./assets.js";
import { BitmapIndex } from "./mnemonics.js";


export const enum ParticleType {

    BlackBlood = 0,
    RedBlood = 1,
    Textured = 2,
    BlackSmoke = 3,
}


const COLORS : string[] = ["#000000", "#ff2400",]


export class Particle {


    private pos : Vector;
    private speed : Vector;
    private targetSpeed : Vector;
    private friction : Vector;

    private timer : number = 0.0;
    private initialTime : number = 0.0;

    private diameter : number = 0;
    private textureSource : Vector;
    private type : ParticleType = ParticleType.BlackBlood;

    private exists : boolean;
    private foreground : boolean = true;
    

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

        canvas.setColor(COLORS[this.type]);
        canvas.fillRect(dx, dy, this.diameter, this.diameter);
    }


    private drawBlackSmokeParticle(canvas : RenderTarget) : void {

        const MAX_RADIUS : number = 6;

        const radius : number = this.timer/this.initialTime*MAX_RADIUS;

        canvas.setColor("#000000");
        canvas.fillEllipse(this.pos.x, this.pos.y, radius, radius);
    }


    private drawTexturedParticle(canvas : RenderTarget, bmp : Bitmap) : void {

        const dx : number = this.pos.x - 4;
        const dy : number = this.pos.y - 4;

        canvas.drawBitmap(bmp, Flip.None, dx, dy, 
            this.textureSource.x, this.textureSource.y, 8, 8);
    }


    public spawn(
        x : number, y : number, 
        speedx : number, speedy : number, 
        gravityDirection : Direction, existTime : number, 
        type : ParticleType, foreground : boolean, texX : number = 0.0, texY : number = 0.0) : void {

        const MIN_DIAMETER : number = 2;
        const MAX_DIAMETER : number = 5;
        const BASE_GRAVITY : number = 6.0;

        const rotation : number = -gravityDirection*Math.PI/2;

        this.pos.setValues(x, y);
        this.speed.setValues(speedx, speedy).rotate(rotation);
        this.targetSpeed.makeEqual(this.speed);
        
        this.timer = existTime;
        this.initialTime = existTime;
        this.type = type;

        if (type == ParticleType.BlackBlood || type == ParticleType.RedBlood) {

            this.diameter = MIN_DIAMETER + ((Math.random()*(MAX_DIAMETER - MIN_DIAMETER)) | 0);
        }

        if (type != ParticleType.BlackSmoke) {

            this.targetSpeed.setValues(speedx, BASE_GRAVITY).rotate(rotation);
        }
        
        this.textureSource.setValues(texX, texY);

        this.foreground = foreground;
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

        switch (this.type) {

        case ParticleType.BlackBlood:
        case ParticleType.RedBlood:

            this.drawSingleColorParticle(canvas);
            break;

        case ParticleType.BlackSmoke:

            this.drawBlackSmokeParticle(canvas);
            break

        case ParticleType.Textured:

            this.drawTexturedParticle(canvas, bmp);
            break;

        default:
            break;
        }

        canvas.setAlpha();
    }


    public doesExist() : boolean {

        return this.exists;
    }


    public isForeground() : boolean {

        return this.foreground;
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


    public drawBackground(canvas : RenderTarget, bmp : Bitmap) : void {

        for (const p of this.particles) {

            if (!p.isForeground()) {
                
                p.draw(canvas, bmp);
            }
        }
    }


    public drawForeground(canvas : RenderTarget, bmp : Bitmap) : void {

        for (const p of this.particles) {

            if (p.isForeground()) {
                
                p.draw(canvas, bmp);
            }
        }
    }
}