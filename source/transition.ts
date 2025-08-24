import { Align, Bitmap, Flip, RenderTarget } from "./gfx.js";
import { Vector } from "./vector.js";


export const enum TransitionType {

    None = 0,
    Fade = 1,
    Circle = 2,
}


export type TransitionCallback = () => void;


export class Transition {


    private type : TransitionType = TransitionType.None;
    private timer : number = 0.0;
    private speed : number = 0.0;

    private center : Vector;

    private fadingIn : boolean = false;
    private active : boolean = false;

    private fadeEvent : TransitionCallback = () => {};

    private screenWidth : number;
    private screenHeight : number;


    constructor(screenWidth : number, screenHeight : number) {

        this.center = Vector.zero();

        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
    }


    public activate(type : TransitionType, 
        speed : number, fadeIn : boolean, 
        event : TransitionCallback = () => {},
        centerx : number = this.screenWidth/2.0, 
        centery : number = this.screenHeight/2.0) : void {

        this.type = type;
        this.speed = speed;
        this.fadingIn = fadeIn;
        this.fadeEvent = event;

        this.timer = 0.0;

        this.center.setValues(centerx, centery);

        this.active = true;
    }


    public update(tick : number) : void {

        if (!this.active) {

            return;
        }

        this.timer += this.speed*tick;
        if (this.timer >= 1.0) {

            this.timer -= 1.0;
            this.active = this.fadingIn;

            if (this.fadingIn) {

                this.fadeEvent();
            }
            this.fadingIn = false;
        }
    }


    public draw(canvas : RenderTarget) : void {

        if (!this.active || this.type == TransitionType.None) {

            return;
        }
        
        const t : number = this.fadingIn ? this.timer : 1.0 - this.timer;

        switch (this.type) {

        case TransitionType.Fade:

            canvas.setColor(`rgba(0,0,0,${t})`);
            canvas.fillRect();
            break;

        case TransitionType.Circle: {

            const maxRadius : number = Math.max(
                Math.hypot(this.center.x, this.center.y),
                Math.hypot(canvas.width - this.center.x, this.center.y),
                Math.hypot(canvas.width - this.center.x, canvas.height - this.center.y),
                Math.hypot(this.center.x, canvas.height - this.center.y)
            );
            const radius : number = (1.0 - t)*(1.0 - t)*maxRadius;

            canvas.setColor("#000000");
            canvas.fillCircleOutside(radius, this.center.x, this.center.y);
            break;
        }

        default:
            break;
        }
    }


    public isActive() : boolean {

        return this.active;
    }


    public setCenter(x : number, y : number) : void {

        this.center.setValues(x, y);
    }


    public deactivate() : void {

        this.active = false;
    }
}
