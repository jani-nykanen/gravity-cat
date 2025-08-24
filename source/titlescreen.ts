import { Align, Bitmap, Flip, RenderTarget } from "./gfx.js";
import { ActionState, Controller, InputState } from "./controller.js";
import { AudioPlayer } from "./audioplayer.js";
import { Assets } from "./assets.js";
import { Vector } from "./vector.js";
import { BitmapIndex, Controls, SampleIndex } from "./mnemonics.js";
import { Menu, MenuButton } from "./menu.js";


export type TitleScreenCallback = (newGame : boolean) => void;


export class TitleScreen {


    private enterPressed : boolean = false;
    private textAnimationTimer : number = 0.0;
    private menu : Menu;

    private startGameEvent : TitleScreenCallback;


    constructor(audio : AudioPlayer, startGameEvent : TitleScreenCallback) {

        this.menu = new Menu(
        [
            new MenuButton("NEW GAME", () : boolean => {

                this.startGameEvent(true);
                return false;
            }),
            new MenuButton("CONTINUE", () : boolean => {

                this.startGameEvent(false);
                return false;
            }),
            new MenuButton(audio.getStateString(), () : boolean => {

                audio.toggleAudio();
                this.menu.changeMenuText(2, audio.getStateString());
                return false;
            }),
        ],
        true);

        this.startGameEvent = startGameEvent;
    }


    public update(controller : Controller, audio : AudioPlayer, assets : Assets, tick : number) : void {

        const TEXT_ANIMATION_SPEED : number = Math.PI*2/90.0;

        this.textAnimationTimer = (this.textAnimationTimer + TEXT_ANIMATION_SPEED*tick) % (Math.PI*2);

        if (!this.enterPressed) {

            if (controller.getAction(Controls.Select).state == InputState.Pressed) {

                audio.playSample(assets.getSample(SampleIndex.Choose), 0.60);
                this.enterPressed = true;
            }
            return;
        }

        this.menu.update(controller, audio, assets, false);
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        canvas.setColor("rgba(0,0,0,0.25)");
        canvas.fillRect();

        const bmpLogo : Bitmap = assets.getBitmap(BitmapIndex.Logo);
        canvas.drawBitmap(bmpLogo, Flip.None, canvas.width/2 - bmpLogo.width/2, 16);

        const bmpFontYellow : Bitmap = assets.getBitmap(BitmapIndex.FontYellow);
        canvas.drawText(bmpFontYellow, "*2025 JANI NYK@NEN", canvas.width/2, canvas.height - 10, -1, 0, Align.Center);

        if (!this.enterPressed) {

            const bmpFontOutlines : Bitmap = assets.getBitmap(BitmapIndex.FontOutlinesWhite);

            canvas.drawText(bmpFontOutlines, "PRESS ENTER OR SPACE", 
                canvas.width/2, canvas.height - 56, -8, 0, Align.Center, 
                Math.PI*3, 4, this.textAnimationTimer);
        }
        else {

            canvas.move(0, 32);
            this.menu.draw(canvas, assets, 4, 4);
            canvas.moveTo();
        }
    }
}
