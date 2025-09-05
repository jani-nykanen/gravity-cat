import { ActionConfig, Controller } from "./controller.js";
import { RenderTarget } from "./gfx.js";
import { Assets } from "./assets.js";
import { AudioPlayer } from "./audioplayer.js";


export class Program {

    private timeSum : number = 0.0;
    private oldTime : number = 0.0;

    private initialized : boolean = false;

    protected readonly canvas : RenderTarget;
    protected readonly controller : Controller;
    protected readonly audio : AudioPlayer;
    protected readonly assets : Assets;
    protected readonly tick : number = 1.0;


    constructor(audioCtx : AudioContext,
        canvasWidth : number, canvasHeight : number,
        controllerActions : ActionConfig[], 
        ticksPerSecond : number = 60, globalAudioVolume : number = 0.60,
    ) {

        this.canvas = new RenderTarget(canvasWidth, canvasHeight, true);
        this.controller = new Controller(controllerActions);
        this.audio = new AudioPlayer(audioCtx, globalAudioVolume);
        this.assets = new Assets();

        ticksPerSecond = Math.max(1, ticksPerSecond) | 0;
        this.tick = 1.0/ticksPerSecond/(1.0/60.0);
    }


    public loop(ts : number) : void {

        const MAX_REFRESH_COUNT : number = 5; 
        const BASE_FRAME_TIME : number = 1000.0/60.0;
    
        const frameTime : number = BASE_FRAME_TIME*this.tick;
        const loaded : boolean = this.assets.loaded;

        this.timeSum = Math.min(
            this.timeSum + (ts - this.oldTime), 
            MAX_REFRESH_COUNT*frameTime);
        this.oldTime = ts;

        const refreshScreen : boolean = this.timeSum >= frameTime;
        let firstFrame : boolean = true;
        for (; this.timeSum >= frameTime; this.timeSum -= frameTime) {

            this.controller.preUpdate();

            if (this.initialized) {

                this.onUpdate();
            }

            if (loaded && !this.initialized) {
                
                this.onLoad();
                this.initialized = true;
            }
                
            if (firstFrame) {

                this.controller.postUpdate();
                firstFrame = false;
            }
        }

        if (refreshScreen && loaded) {

            this.onRedraw();
        }

        window.requestAnimationFrame((ts : number) => this.loop(ts));
    }


    public run() : void {

        this.onInit();
        this.loop(0.0);
    }


    // NOTE: I could have onInit?() instead, but defining
    // these make some Closure warning go away (although I 
    // did lose 5 bytes in the process...)
    public onInit() : void {};
    public onLoad() : void {};
    public onUpdate() : void {};
    public onRedraw() : void {};
}
