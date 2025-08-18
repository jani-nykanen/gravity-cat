import { Vector } from "./vector.js";
import { Direction, directionToVector } from "./direction.js";
import { approachValue } from "./utility.js";
import { Bitmap, RenderTarget } from "./gfx.js";


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

    private textureSource : Vector;
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


    public spawn(
        x : number, y : number, speedx : number, speedy : number, existTime : number, 
        type : ParticleType, textureSource? : Vector) : void {

        this.pos.setValues(x, y);
        this.speed.setValues(speedx, speedy);

        this.timer = existTime;
        this.type = type;

        if (textureSource !== undefined) {

            this.textureSource.makeEqual(textureSource);
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

        // TODO: Implement
    }
}
