import { Align, Bitmap, Flip, RenderTarget } from "./gfx.js";
import { Controller, InputState } from "./controller.js";
import { AudioPlayer } from "./audioplayer.js";
import { Assets } from "./assets.js";
import { Vector } from "./vector.js";
import { BitmapIndex, Controls } from "./mnemonics.js";
import { negMod } from "./math.js";


const BACKGROUND_COLORS : string[] = ["#6db6ff", "#4992db"];
const BUTTON_COLORS : string[][] = [
    ["#000000", "#b66d00", "#ffb649"],
    ["#000000", "#db6d00", "#ffdb6d"]
];


export type LevelMenuCallback = (i : number) => void;


export class LevelMenu {


    private cursorPos : Vector;

    private backgroundTimer : number = 0.0;
    
    private selectEvent : LevelMenuCallback;


    constructor(selectEvent : LevelMenuCallback) {

        this.cursorPos = new Vector();

        this.selectEvent = selectEvent;
    }


    private drawBackground(canvas : RenderTarget) : void {

        const loopx : number = ((canvas.width/32) | 0) + 1;
        const loopy : number = ((canvas.height/32) | 0) + 1;

        const shift : number = (this.backgroundTimer % 1)*32;

        for (let y : number = 0; y < loopy; ++ y) {

            for (let x : number = 0; x < loopx; ++ x) {

                canvas.setColor(BACKGROUND_COLORS[Number(x % 2 == y % 2)]);
                canvas.fillRect(x*32 - shift, (y - 1)*32 + shift, 32, 32);
            }
        }
    }


    private drawBoxes(canvas : RenderTarget, assets : Assets) : void {

        const BOX_WIDTH : number = 32;
        const BOX_HEIGHT : number = 24;
        const BOX_COUNT_H : number = 4;
        const BOX_COUNT_V : number = 3;
        const BOX_OFF_X : number = 16;
        const BOX_OFF_Y : number = 16;
        const BOX_DEPTH : number = 6;
        const BOX_ACTIVE_DEPTH : number = 2;

        const TOP_OFF : number = 8;

        const w : number = BOX_COUNT_H*BOX_WIDTH + (BOX_COUNT_H - 1)*BOX_OFF_X;
        const h : number = BOX_COUNT_V*BOX_HEIGHT + (BOX_COUNT_V - 1)*BOX_OFF_Y;

        const cornerx : number = canvas.width/2 - w/2;
        const cornery : number = canvas.height/2 - h/2 + TOP_OFF;

        const bmpFont : Bitmap = assets.getBitmap(BitmapIndex.FontOutlinesWhite);

        let i : number = 1;
        for (let y : number = 0; y < BOX_COUNT_V; ++ y) {

            const dy : number = cornery + (BOX_HEIGHT + BOX_OFF_Y)*y;

            for (let x : number = 0; x < BOX_COUNT_H; ++ x) {

                const dx : number = cornerx + (BOX_WIDTH + BOX_OFF_X)*x;

                const active : boolean = x == this.cursorPos.x && y == this.cursorPos.y;
                const depthShift : number = active ? BOX_DEPTH - BOX_ACTIVE_DEPTH : 0; 

                const colorArray : string[] = BUTTON_COLORS[Number(active)];

                canvas.setColor(colorArray[0]);
                canvas.fillRect(dx, dy + depthShift, BOX_WIDTH, BOX_HEIGHT + BOX_DEPTH - depthShift);

                canvas.setColor(colorArray[1]);
                canvas.fillRect(dx + 1, dy + depthShift + 1, BOX_WIDTH - 2, BOX_HEIGHT + BOX_DEPTH - 2 - depthShift);

                canvas.setColor(colorArray[2]);
                canvas.fillRect(dx + 1, dy + depthShift + 1, BOX_WIDTH - 2, BOX_HEIGHT - 2 );

                for (let j : number = 0; j < 2; ++ j) {
                
                    canvas.drawText(bmpFont, `${i}`, dx + BOX_WIDTH/2, -j + dy + depthShift + BOX_HEIGHT/2 - 7, -8, 0, Align.Center);
                }
                ++ i;
            }
        }

        const bmpBase : Bitmap = assets.getBitmap(BitmapIndex.Base);

        const handx : number = cornerx + this.cursorPos.x*(BOX_WIDTH + BOX_OFF_X) + BOX_WIDTH*0.67;
        const handy : number = cornery + this.cursorPos.y*(BOX_HEIGHT + BOX_OFF_Y) + BOX_HEIGHT*0.67;

        canvas.drawBitmap(bmpBase, Flip.None, handx, handy, 0, 64, 16, 16);
    }


    public update(controller : Controller, audio : AudioPlayer, assets : Assets, tick : number) : void {

        const BACKGROUND_SPEED : number = 1.0/32.0;

        this.backgroundTimer = (this.backgroundTimer + BACKGROUND_SPEED*tick) % 4.0;

        if (controller.getAction(Controls.Right).state == InputState.Pressed) {

            ++ this.cursorPos.x;
        }
        else if (controller.getAction(Controls.Left).state == InputState.Pressed) {

            -- this.cursorPos.x;
        }
        else if (controller.getAction(Controls.Down).state == InputState.Pressed) {

            ++ this.cursorPos.y;
        }
        else if (controller.getAction(Controls.Up).state == InputState.Pressed) {

            -- this.cursorPos.y;
        }

        this.cursorPos.x = negMod(this.cursorPos.x, 4);
        this.cursorPos.y = negMod(this.cursorPos.y, 3);

        if (controller.getAction(Controls.Select).state == InputState.Pressed) {

            this.selectEvent(this.cursorPos.y*4 + this.cursorPos.x);
        }
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        this.drawBackground(canvas);
    
        // Header
        for (let i : number = 0; i < 2; ++ i) {
        
            canvas.drawText(assets.getBitmap(BitmapIndex.FontOutlinesWhite), "SELECT A LEVEL",
                    canvas.width/2, 8 - i, -7, 0, Align.Center, Math.PI*4, 2, this.backgroundTimer*Math.PI);
        }

        // Boxes
        this.drawBoxes(canvas, assets);
    }   
}
