import { Align, Bitmap, Flip, RenderTarget } from "./gfx.js";
import { Program } from "./program.js";
import { generateAssets } from "./assetgen.js";
import { BitmapIndex, Controls, SampleIndex } from "./mnemonics.js";
import { Puzzle } from "./puzzle.js";
import { LEVEL_DATA } from "./leveldata.js";
import { InputState } from "./controller.js";
import { drawFrame } from "./frame.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { drawBackground } from "./background.js";
import { drawLevelClearAnimation } from "./levelclear.js";
import { Menu, MenuButton } from "./menu.js";


const LEVEL_CLEAR_ANIMATION_TIME : number = 120;


export class Game extends Program {


    private puzzle : Puzzle;

    private pauseMenu : Menu;

    private backgroundTimer : number = 0.0;
    private levelClearTimer : number = 0.0;
    private levelClearInitiated : boolean = false;

    private levelIndex : number = 13;


    constructor(audioCtx : AudioContext) {

        super(audioCtx, 256, 192, [
            {id: Controls.Right, keys: ["ArrowRight", "KeyD"], prevent: true},
            {id: Controls.Left, keys: ["ArrowLeft", "KeyA"],  prevent: true},
            {id: Controls.Up, keys: ["ArrowUp", "KeyW"],  prevent: true},
            {id: Controls.Down, keys: ["ArrowDown", "KeyS"],  prevent: true},
            {id: Controls.Accept, keys: ["Space", "Enter"],  prevent: true},
            // TODO: Add support for "actual R", not just the key that happens
            // to be in the place of R
            {id: Controls.Restart, keys: ["KeyR"], prevent: true},
            {id: Controls.Undo, keys: ["KeyZ", "Backspace"], prevent: true},
            {id: Controls.Back, keys: ["Escape"], prevent: false},
            {id: Controls.Pause, keys: ["Escape"], prevent: false}
        ]);

        this.puzzle = new Puzzle(LEVEL_DATA[this.levelIndex - 1]);

        this.pauseMenu = new Menu(
        [
            new MenuButton("RESUME", () : boolean => true),
            new MenuButton("UNDO", () : boolean => {

                // TODO: Undo
                return true;
            }),
            new MenuButton("RESTART", () : boolean => {

                // TODO: Restart
                return true;
            }),
            new MenuButton("QUIT", () : boolean => {

                // TODO: Quit
                return true;
            })  
        ]
        );
    }


    private nextLevel() : void {

        ++ this.levelIndex;
        // Not very elegant, but meh
        this.puzzle = new Puzzle(LEVEL_DATA[this.levelIndex - 1]);
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
        
        const BACKGROUND_ANIMATION_SPEED : number = 1.0/256.0;

        if (this.pauseMenu.isActive()) {

            this.pauseMenu.update(this.controller, this.audio, true);
            return;
        }

        if (!this.puzzle.hasCleared() &&
            this.controller.getAction(Controls.Pause).state == InputState.Pressed) {

            this.pauseMenu.activate(0);
            return;
        }


        this.puzzle.update(this.controller, this.audio, this.assets, this.tick);
        this.backgroundTimer = (this.backgroundTimer + BACKGROUND_ANIMATION_SPEED) % 1.0;

        if (this.puzzle.hasCleared()) {

            if (!this.levelClearInitiated) {

                this.audio.playSample(this.assets.getSample(SampleIndex.LevelClear), 0.60);
                this.levelClearInitiated = true;
            }

            this.levelClearTimer += this.tick;
            if (this.levelClearTimer >= LEVEL_CLEAR_ANIMATION_TIME) {

                this.nextLevel();
            }
            return;
        }

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
        
        const LEVEL_CLEAR_ANIMATION_STOP_TIME : number = 30;

        const canvas : RenderTarget = this.canvas;

        drawBackground(canvas, this.assets, this.backgroundTimer);

        this.puzzle.setCamera(canvas);
        drawFrame(canvas, this.assets, this.puzzle.width*TILE_WIDTH, this.puzzle.height*TILE_HEIGHT);
        this.puzzle.draw(canvas, this.assets);

        canvas.moveTo();
        for (let i : number = 0; i < 2; ++ i) {

            canvas.drawText(this.assets.getBitmap(BitmapIndex.FontOutlinesWhite), `LEVEL ${this.levelIndex}`,
                canvas.width/2, 5 - i, -7, 0, Align.Center, Math.PI*2, 2, this.backgroundTimer*Math.PI*6);
        }

        if (this.pauseMenu.isActive()) {

            this.pauseMenu.draw(canvas, this.assets, 2, 2, 0.50);
            return;
        }

        if (this.puzzle.hasCleared()) {

            const t : number = Math.min(1.0, this.levelClearTimer/LEVEL_CLEAR_ANIMATION_STOP_TIME);
            drawLevelClearAnimation(canvas, this.assets, t);
        }

        
        // canvas.drawBitmap(this.assets.getBitmap(BitmapIndex.Terrain));
    }
}