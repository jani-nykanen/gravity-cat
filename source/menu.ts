import { RenderTarget, Bitmap } from "./gfx.js";
import { negMod } from "./math.js";
import { ActionState, Controller, InputState } from "./controller.js";
import { AudioPlayer } from "./audioplayer.js";
import { BitmapIndex, Controls, SampleIndex } from "./mnemonics.js";
import { Assets } from "./assets.js";


export type MenuButtonCallback = () => boolean;


const BOX_COLORS : string[] = ["#00246d", "#929292", "#ffffff", "#000000"];


const drawBox = (canvas : RenderTarget, dx : number, dy : number, dw : number, dh : number) : void => {
    
    const SHADOW_OFFSET : number = 2;

    const extraThickness : number = BOX_COLORS.length - 1;

    // Shadow
    canvas.setColor("rgba(0,0,0,0.33)");
    canvas.fillRect(
        dx - extraThickness + SHADOW_OFFSET, 
        dy - extraThickness + SHADOW_OFFSET, 
        dw + extraThickness*2, 
        dh + extraThickness*2);

    // The box, THE BOX!
    for (let i : number = BOX_COLORS.length - 1; i >= 0 ; -- i) {

        canvas.setColor(BOX_COLORS[i]);
        canvas.fillRect(dx - i, dy - i, dw + i*2, dh + i*2);
    }
}


export class MenuButton {


    private callback : MenuButtonCallback;

    private buttonText : string;


    public get text() : string {

        return this.buttonText;
    }

    
    constructor(text : string, callback : MenuButtonCallback) {

        this.buttonText = text;
        this.callback = callback;
    }


    public evaluate() : boolean {

        return this.callback();
    }


    public changeText(newText : string) : void {

        this.buttonText = newText;
    }
}


export class Menu {


    private buttons : MenuButton[];

    private cursorPos : number = 0;
    
    private height : number;
    private width : number;

    private active : boolean;


    constructor(buttons : MenuButton[], makeActive : boolean = false) {

        this.buttons = buttons; 
        this.active = makeActive;

        this.width = Math.max(...this.buttons.map(b => b.text.length + 2));
        this.height = this.buttons.length;
    }


    public changeMenuText(buttonIndex : number, newText : string) : void {

        this.buttons[buttonIndex].changeText(newText);
        if (newText.length >= this.width - 2) {

            this.width = newText.length + 2;
        }
    }


    public activate(cursorPos : number = this.cursorPos) : void {

        this.cursorPos = negMod(cursorPos, this.buttons.length);
        this.active = true;
    }


    public update(controller : Controller, audio : AudioPlayer, 
        assets : Assets, canQuit : boolean = false) : void {

        if (!this.active) {

            return;
        }

        if (canQuit && controller.getAction(Controls.Back).state == InputState.Pressed) {
            
            audio.playSample(assets.getSample(SampleIndex.Choose), 0.60);
            this.active = false;
            return;
        }
        

        const oldPos : number = this.cursorPos;

        if (controller.getAction(Controls.Up).state  == InputState.Pressed) {

            -- this.cursorPos;
        }
        else if (controller.getAction(Controls.Down).state  == InputState.Pressed) {

            ++ this.cursorPos;
        }

        if (oldPos != this.cursorPos) {

            this.cursorPos = negMod(this.cursorPos, this.buttons.length);
            
            audio.playSample(assets.getSample(SampleIndex.Select), 0.50);
        }

        if (controller.getAction(Controls.Select).state == InputState.Pressed) {

            if (this.buttons[this.cursorPos].evaluate()) {

                this.active = false;
            }
            audio.playSample(assets.getSample(SampleIndex.Choose), 0.60);
        }
    }


    public draw(canvas : RenderTarget, assets : Assets, 
        xoff : number = 0, yoff : number = 0, darkenAlpha : number = 0.0) : void {

        const FONT_YOFF : number = 12;

        if (!this.active) {

            return;
        }

        if (darkenAlpha > 0.0) {

            canvas.setColor(`rgba(0,0,0,${darkenAlpha})`);
            canvas.fillRect();
        }

        const dx : number = canvas.width/2 - this.width*4;
        const dy : number = canvas.height/2 - this.height*FONT_YOFF/2;

        const bmpFontWhite : Bitmap = assets.getBitmap(BitmapIndex.FontWhite);
        const bmpFontYellow : Bitmap = assets.getBitmap(BitmapIndex.FontYellow);

        // Box
        drawBox(canvas, dx, dy, this.width*8 + xoff*2, this.height*FONT_YOFF + yoff*2);
        // Text
        for (let i = 0; i < this.buttons.length; ++ i) {

            const b : MenuButton = this.buttons[i];
            
            const text : string = (i == this.cursorPos ? "$%" : "") + b.text;
            const font : Bitmap = i == this.cursorPos ? bmpFontYellow : bmpFontWhite;

            canvas.drawText(font, text, dx + xoff + 2, dy + yoff + 2 + i*FONT_YOFF, -1);
        }
    }


    public isActive() : boolean {

        return this.active;
    }


    public setCursor(pos : number) : void {

        this.cursorPos = negMod(pos, this.buttons.length - 1);
    }
}
