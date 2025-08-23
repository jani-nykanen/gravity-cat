import { Align, Bitmap, Flip, RenderTarget } from "./gfx.js";
import { ActionState, Controller, InputState } from "./controller.js";
import { AudioPlayer } from "./audioplayer.js";
import { Assets } from "./assets.js";
import { Vector } from "./vector.js";
import { BitmapIndex, Controls, SampleIndex } from "./mnemonics.js";
import { negMod } from "./math.js";
import { approachValue } from "./utility.js";


const BACKGROUND_COLORS : string[] = ["#6db6ff", "#4992db"];
const BUTTON_COLORS : string[][] = [
    ["#000000", "#b66d00", "#ffb649"],
    ["#000000", "#db6d00", "#ffdb6d"],
    ["#000000", "#499200", "#92db00"],
    ["#000000", "#6db600", "#dbff49"]
];

const BUTTON_COUNT_H : number = 4;
const BUTTON_COUNT_V : number = 3;

const BOX_WIDTH : number = 32;
const BOX_HEIGHT : number = 24;
const BOX_OFF_X : number = 16;
const BOX_OFF_Y : number = 16;
const BUTTONS_TOP_OFF : number = 8;

const CURSOR_MOVE_SPEED : number = 1.0/12.0;


export type LevelMenuCallback = (i : number) => void;


export class LevelMenu {


    private buttonDepths : number[];
    private clearedLevels : boolean[];

    private cursorPos : Vector;
    private cursorTarget : Vector;
    private cursorRenderPos : Vector;

    private moveTimer : number = 0.0;
    private cursorMoving : boolean = false;

    private backgroundTimer : number = 0.0;
    
    private selectEvent : LevelMenuCallback;

    private screenWidth : number;
    private screenHeight : number;


    constructor(screenWidth : number, screenHeight : number, selectEvent : LevelMenuCallback) {

        this.cursorPos = Vector.zero();
        this.cursorTarget = Vector.zero();
        this.cursorRenderPos = Vector.zero();

        this.selectEvent = selectEvent;

        this.buttonDepths = (new Array<number> (BUTTON_COUNT_H*BUTTON_COUNT_V)).fill(0.0);
        this.clearedLevels = (new Array<boolean> (BUTTON_COUNT_H*BUTTON_COUNT_V)).fill(false);

        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
    }


    private updateButtonDepths(tick : number) : void {

        for (let y : number = 0; y < BUTTON_COUNT_V; ++ y) {

            for (let x : number = 0; x < BUTTON_COUNT_H; ++ x) {

                const index : number = y*BUTTON_COUNT_H + x;
                const active : boolean = this.cursorTarget.x == x && this.cursorTarget.y == y;
                const target : number = Number(active);

                this.buttonDepths[index] = approachValue(this.buttonDepths[index], target, CURSOR_MOVE_SPEED*tick);
            }
        }
    }


    private computeCursorRenderPosition() : void {

        const w : number = BUTTON_COUNT_H*BOX_WIDTH + (BUTTON_COUNT_H - 1)*BOX_OFF_X;
        const h : number = BUTTON_COUNT_V*BOX_HEIGHT + (BUTTON_COUNT_V - 1)*BOX_OFF_Y;

        const cornerx : number = this.screenWidth/2 - w/2;
        const cornery : number = this.screenHeight/2 - h/2 + BUTTONS_TOP_OFF;

        const cursorx : number = (1.0 - this.moveTimer)*this.cursorPos.x + this.moveTimer*this.cursorTarget.x;
        const cursory : number = (1.0 - this.moveTimer)*this.cursorPos.y + this.moveTimer*this.cursorTarget.y;

        this.cursorRenderPos.x = cornerx + cursorx*(BOX_WIDTH + BOX_OFF_X) + BOX_WIDTH/2;
        this.cursorRenderPos.y = cornery + cursory*(BOX_HEIGHT + BOX_OFF_Y) + BOX_HEIGHT/2;
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

        const BOX_DEPTH : number = 6;
        const BOX_ACTIVE_DEPTH : number = 2;

        const w : number = BUTTON_COUNT_H*BOX_WIDTH + (BUTTON_COUNT_H - 1)*BOX_OFF_X;
        const h : number = BUTTON_COUNT_V*BOX_HEIGHT + (BUTTON_COUNT_V - 1)*BOX_OFF_Y;

        const cornerx : number = canvas.width/2 - w/2;
        const cornery : number = canvas.height/2 - h/2 + BUTTONS_TOP_OFF;

        const bmpFont : Bitmap = assets.getBitmap(BitmapIndex.FontOutlinesWhite);

        let i : number = 1;
        for (let y : number = 0; y < BUTTON_COUNT_V; ++ y) {

            const dy : number = cornery + (BOX_HEIGHT + BOX_OFF_Y)*y;

            for (let x : number = 0; x < BUTTON_COUNT_H; ++ x) {

                const dx : number = cornerx + (BOX_WIDTH + BOX_OFF_X)*x;

                const active : boolean = x == this.cursorPos.x && y == this.cursorPos.y;
                const buttonDepth : number = this.buttonDepths[y*BUTTON_COUNT_H + x];
                const depthShift : number = ((BOX_DEPTH - BOX_ACTIVE_DEPTH)*buttonDepth) | 0;

                const levelCleared : boolean = this.clearedLevels[y*BUTTON_COUNT_H + x];
                const colorArray : string[] = BUTTON_COLORS[Number(active) + Number(levelCleared)*2];

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

        // Cursor
        const bmpBase : Bitmap = assets.getBitmap(BitmapIndex.Base);

        const handx : number = this.cursorRenderPos.x + BOX_WIDTH/6.0;
        const handy : number = this.cursorRenderPos.y + BOX_HEIGHT/4.0;

        const shifty : number = Math.round(Math.sin(this.backgroundTimer*Math.PI*2));

        canvas.drawBitmap(bmpBase, Flip.None, handx, handy + shifty, 0, 64, 16, 16);
    }


    public update(controller : Controller, audio : AudioPlayer, assets : Assets, tick : number) : void {

        const BACKGROUND_SPEED : number = 1.0/32.0;

        this.backgroundTimer = (this.backgroundTimer + BACKGROUND_SPEED*tick) % 4.0;
        this.updateButtonDepths(tick);

        if (controller.getAction(Controls.Select).state == InputState.Pressed) {

            audio.playSample(assets.getSample(SampleIndex.Choose), 0.60);

            this.cursorMoving = false;
            this.cursorPos.makeEqual(this.cursorTarget);
            this.selectEvent(this.cursorPos.y*4 + this.cursorPos.x);
        }
        this.computeCursorRenderPosition();

        if (this.cursorMoving) {

            this.moveTimer += CURSOR_MOVE_SPEED*tick;
            if (this.moveTimer >= 1.0) {

                this.cursorMoving = false;
                this.moveTimer = 0.0;
                this.cursorPos.makeEqual(this.cursorTarget);
            }
            return;
        }


        const right : ActionState = controller.getAction(Controls.Right);
        const up : ActionState = controller.getAction(Controls.Up);
        const left : ActionState = controller.getAction(Controls.Left);
        const down : ActionState = controller.getAction(Controls.Down);

        const maxTimestamp : number = Math.max(right.timestamp, up.timestamp, left.timestamp, down.timestamp);

        if ((right.state & InputState.DownOrPressed) != 0 && right.timestamp >= maxTimestamp) {

            ++ this.cursorTarget.x;
        }
        else if ((left.state & InputState.DownOrPressed) != 0 && left.timestamp >= maxTimestamp) {

            -- this.cursorTarget.x;
        }
        else if ((down.state & InputState.DownOrPressed) != 0 && down.timestamp >= maxTimestamp) {

            ++ this.cursorTarget.y;
        }
        else if ((up.state & InputState.DownOrPressed) != 0 && up.timestamp >= maxTimestamp) {

            -- this.cursorTarget.y;
        }

        this.cursorTarget.x = negMod(this.cursorTarget.x, 4);
        this.cursorTarget.y = negMod(this.cursorTarget.y, 3);

        if (this.cursorTarget.x != this.cursorPos.x || 
            this.cursorTarget.y != this.cursorPos.y) {
            
            this.cursorMoving = true;
            this.moveTimer = 0.0;

            audio.playSample(assets.getSample(SampleIndex.Select), 0.50);
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


    public getCursorCenter() : Vector {

        return this.cursorRenderPos.clone();
    }


    public markLevelAsCleared(index : number) : void {

        this.clearedLevels[index] = true;
    }
}
