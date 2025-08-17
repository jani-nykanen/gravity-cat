import { Flip, RenderTarget } from "./gfx.js";
import { Program } from "./program.js";
import { generateAssets } from "./assetgen.js";
import { BitmapIndex, Controls, SampleIndex } from "./mnemonics.js";
import { Puzzle } from "./puzzle.js";
import { LEVEL_DATA } from "./leveldata.js";
import { InputState } from "./controller.js";


export class Game extends Program {


    private puzzle : Puzzle;


    constructor(audioCtx : AudioContext) {

        super(audioCtx, 256, 192, [
            {id: Controls.Right, keys: ["ArrowRight", "KeyD"], prevent: true},
            {id: Controls.Left, keys: ["ArrowLeft", "KeyA"],  prevent: true},
            {id: Controls.Up, keys: ["ArrowUp", "KeyW"],  prevent: true},
            {id: Controls.Down, keys: ["ArrowDown", "KeyS"],  prevent: true},
            {id: Controls.Accept, keys: ["Space"],  prevent: true},
            // TODO: Add support for "actual R", not just the key that happens
            // to be in the place of R
            {id: Controls.Restart, keys: ["KeyR"], prevent: true},
            {id: Controls.Undo, keys: ["KeyZ", "Backspace"], prevent: true}
        ]);

        this.puzzle = new Puzzle(LEVEL_DATA[0]);
    }


    public onInit() : void {
        
        this.assets.loadBitmaps(
            [
            {id: BitmapIndex.FontRaw, path: "f.png"},
            {id: BitmapIndex.BaseRaw, path: "b.png"}
        ]);
    }


    public onLoad() : void {
        
        generateAssets(this.assets, this.audio);
    }


    public onUpdate() : void {
        
        this.puzzle.update(this.controller, this.audio, this.assets, this.tick);

        // Restart
        if (this.controller.getAction(Controls.Restart).state == InputState.Pressed) {

            this.puzzle.restart();
        }

        // Undo
        if (this.controller.getAction(Controls.Undo).state == InputState.Pressed) {

            this.puzzle.undo();
        }
    }


    public onRedraw() : void {
        
        const canvas : RenderTarget = this.canvas;

        canvas.clearScreen(85, 170, 255);

        this.puzzle.setCamera(canvas);
        this.puzzle.draw(canvas, this.assets);

        canvas.moveTo();
        canvas.drawBitmap(this.assets.getBitmap(BitmapIndex.Figures), Flip.None, 0, 0);
    }
}