import { Align, Bitmap, Flip, RenderTarget } from "./gfx.js";
import { Program } from "./program.js";
import { generateAssets } from "./assetgen.js";
import { BitmapIndex, Controls, SampleIndex } from "./mnemonics.js";
import { Puzzle } from "./puzzle.js";
import { LEVEL_DATA } from "./leveldata.js";
import { InputState } from "./controller.js";
import { drawFrame } from "./frame.js";
import { TILE_HEIGHT, TILE_WIDTH } from "./tilesize.js";
import { Menu, MenuButton } from "./menu.js";
import { LevelMenu } from "./levelmenu.js";
import { Transition, TransitionType } from "./transition.js";
import { Vector } from "./vector.js";
import { TitleScreen } from "./titlescreen.js";

const LEVEL_CLEAR_ANIMATION_TIME : number = 120;

const WATER_COLORS : string[] = ["#92dbff", "#49b6ff", "#248fdb"];
const WATER_YOFF : number[] = [0, 2, 8];

const ENDING_TEXT : string =
`   CONGRATULATIONS!

YOU HAVE BEATEN THE GAME!
I DID NOT HAVE ROOM FOR
A PROPER ENDING. SORRY.`


const enum Scene {

    Game = 0,
    LevelMenu = 1,
    Intro = 2,
    TitleScreen = 3,
    Ending = 4,
    StoryIntro = 5,
}


export class Game extends Program {


    private puzzle : Puzzle;

    private pauseMenu : Menu;
    private levelMenu : LevelMenu;
    private titleScreen : TitleScreen;

    private transition : Transition;

    private backgroundTimer : number = 0.0;
    private levelClearTimer : number = 0.0;
    private levelClearInitiated : boolean = false;

    private endingTimer : number = 0.0;

    private levelIndex : number = 1;

    private scene : Scene = Scene.TitleScreen;


    constructor(audioCtx : AudioContext) {

        super(audioCtx, 256, 192, [
            {id: Controls.Right, keys: ["ArrowRight", "KeyD"], prevent: true},
            {id: Controls.Left, keys: ["ArrowLeft", "KeyA"],  prevent: true},
            {id: Controls.Up, keys: ["ArrowUp", "KeyW"],  prevent: true},
            {id: Controls.Down, keys: ["ArrowDown", "KeyS"],  prevent: true},
            {id: Controls.Select, keys: ["Space", "Enter"],  prevent: true},
            // TODO: Add support for "actual R", not just the key that happens
            // to be in the place of R
            {id: Controls.Restart, keys: ["KeyR"], prevent: true},
            {id: Controls.Undo, keys: ["KeyZ", "Backspace"], prevent: true},
            {id: Controls.Back, keys: ["Escape"], prevent: false},
            {id: Controls.Pause, keys: ["Escape", "Enter"], prevent: false}
        ]);

        // Redundant
        this.puzzle = new Puzzle(LEVEL_DATA[this.levelIndex - 1]);

        this.pauseMenu = new Menu(
        [
            new MenuButton("RESUME", () : boolean => true),
            new MenuButton("UNDO", () : boolean => {

                this.puzzle.undo();
                return true;
            }),
            new MenuButton("RESTART", () : boolean => {

                this.puzzle.restart();
                return true;
            }),
            new MenuButton(this.audio.getStateString(), () : boolean => {

                this.audio.toggleAudio();
                this.pauseMenu.changeMenuText(3, this.audio.getStateString());
                return false;
            }),
            new MenuButton("QUIT", () : boolean => {

                this.transition.activate(TransitionType.Fade, 1.0/20.0, true,
                    () : void => {
                        this.scene = Scene.LevelMenu;
                    }
                )
                return true;
            })  
        ]
        );

        this.levelMenu = new LevelMenu(
            this.canvas.width, this.canvas.height,
            (i : number) : void => {

                const cursorPos : Vector = this.levelMenu.getCursorCenter();
                this.transition.activate(TransitionType.Circle, 1.0/30.0, true,
                    () : void => {
                        
                        this.scene = Scene.Game;
                        this.changeLevel(i + 1);

                        this.transition.setCenter(this.canvas.width/2, this.canvas.height/2);
                    },
                    cursorPos.x, cursorPos.y
                );
            });

        this.titleScreen = new TitleScreen(this.audio, (newGame : boolean) : void => {

            this.transition.activate(TransitionType.Circle, 1.0/30.0, true,
                () : void => {
                        
                    if (!newGame) {

                        this.levelMenu.loadProgress();
                    }
                    this.scene = Scene.LevelMenu;
                }
            );
        });
        this.transition = new Transition(this.canvas.width, this.canvas.height);
    }


    private changeLevel(newLevel : number) : void {

        this.levelIndex = newLevel;
        this.puzzle = new Puzzle(LEVEL_DATA[newLevel - 1]);

        this.levelClearInitiated = false;
        this.levelClearTimer = 0.0;
    }


    private updateGameScene() : void {
        
        const BACKGROUND_ANIMATION_SPEED : number = 1.0/240.0;

        if (this.pauseMenu.isActive()) {

            this.pauseMenu.update(this.controller, this.audio, this.assets, true);
            return;
        }

        if (!this.puzzle.hasCleared() &&
            this.controller.getAction(Controls.Pause).state == InputState.Pressed) {

            this.audio.playSample(this.assets.getSample(SampleIndex.Choose), 0.60);
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

                this.transition.activate(TransitionType.Fade, 1.0/20.0, true,
                    () : void => {
                        
                        if (this.levelIndex == 13) {

                            this.endingTimer = 0.0;
                            this.scene = Scene.Ending;
                            return;
                        }

                        this.levelMenu.markLevelAsCleared(this.levelIndex - 1);

                        if (this.levelMenu.everythingCleared()) {

                            this.changeLevel(13);
                            return;
                        }

                        this.scene = Scene.LevelMenu;
                    }
                );
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


    private updateEnding() : void {

        const ENDING_TIME : number = 300;

        this.endingTimer += this.tick;
        if (this.endingTimer >= ENDING_TIME) {

            this.transition.activate(TransitionType.Fade, 1.0/30.0, true,
                () : void => {

                    this.scene = Scene.LevelMenu;
                }
            )
        }
    }


    private drawLevelClearScreen() : void {

        const LEVEL_CLEAR_ANIMATION_STOP_TIME : number = 30;

        const canvas : RenderTarget = this.canvas;

        const bmpLevelClear : Bitmap = this.assets.getBitmap(BitmapIndex.LevelClear);

        const dx : number = canvas.width/2 - bmpLevelClear.width/2;
        const dy : number = canvas.height/2 - bmpLevelClear.height/2;

        const t : number = Math.min(1.0, this.levelClearTimer/LEVEL_CLEAR_ANIMATION_STOP_TIME);
        const shiftx : number = (canvas.width/2 + bmpLevelClear.width/2)*(1.0 - t);
        
        canvas.setColor("rgba(0,0,0,0.33)");
        canvas.fillRect();

        for (let i : number = 0; i < 2; ++ i) {

            const dir : number = -1 + 2*(1 - i);
            const shifty : number = bmpLevelClear.height/2*i;

            canvas.drawBitmap(bmpLevelClear, Flip.None, 
                dx + dir*shiftx, dy + shifty, 
                0, shifty, 
                bmpLevelClear.width, bmpLevelClear.height/2);
        }
    }


    private drawBackground() : void {

        const CLOUD_Y : number = 88;

        const canvas : RenderTarget = this.canvas;

        canvas.clearScreen("#49b6ff");
    
        const bmp : Bitmap = this.assets.getBitmap(BitmapIndex.Background);
    
        // Clouds
        const loop : number = Math.ceil(canvas.width/bmp.width) + 1;
        const shiftx : number = this.backgroundTimer*bmp.width;
        for (let x : number = 0; x < loop; ++ x) {
    
            canvas.drawBitmap(bmp, Flip.None, x*bmp.width - shiftx, CLOUD_Y, 0, 0, 128, 64);
        }
    
        // Water
        const waterSurface : number = CLOUD_Y + 64;
        for (let y : number = 0; y < 3; ++ y) {
    
            canvas.setColor(WATER_COLORS[y]);
            const dy : number = waterSurface + WATER_YOFF[y];
            canvas.fillRect(0, dy, canvas.width, canvas.height - dy);
        }
    
        // Sun
        canvas.drawBitmap(bmp, Flip.None, canvas.width - 56, 8, 0, 64, 48, 48);
    }


    private drawGameScene() : void {
        
        const canvas : RenderTarget = this.canvas;

        this.drawBackground();

        this.puzzle.setCamera(canvas);
        drawFrame(canvas, this.assets, this.puzzle.width*TILE_WIDTH, this.puzzle.height*TILE_HEIGHT);
        this.puzzle.draw(canvas, this.assets);

        canvas.moveTo();
        canvas.drawText(this.assets.getBitmap(BitmapIndex.FontOutlinesWhite), `LEVEL ${this.levelIndex}`,
            canvas.width/2, 5, -7, 0, Align.Center, Math.PI*2, 2, this.backgroundTimer*Math.PI*6);
        
        if (this.pauseMenu.isActive()) {

            this.pauseMenu.draw(canvas, this.assets, 2, 2, 0.50);
            return;
        }

        if (this.puzzle.hasCleared()) {

            this.drawLevelClearScreen();
        }

        
        // canvas.drawBitmap(this.assets.getBitmap(BitmapIndex.Terrain));
    }


    private drawEnding() : void {

        const canvas : RenderTarget = this.canvas;

        canvas.clearScreen("#000000");

        const bmpFont : Bitmap = this.assets.getBitmap(BitmapIndex.FontWhite);

        canvas.drawText(bmpFont, ENDING_TEXT, canvas.width/2 - 25*3.5, 48, -1, 2);
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
        
        const TITLE_SCREEN_BACKGROUND_SPEED : number = 1.0/480;

        if (this.transition.isActive()) {

            this.transition.update(this.tick);
            return;
        }

        switch (this.scene) {

        case Scene.Game:
            
            this.updateGameScene();
            break;

        case Scene.LevelMenu:

            this.levelMenu.update(this.controller, this.audio, this.assets, this.tick);
            break;

        case Scene.Ending:

            this.updateEnding();
            break;

        case Scene.TitleScreen:

            this.backgroundTimer = (this.backgroundTimer + TITLE_SCREEN_BACKGROUND_SPEED*this.tick) % 1.0;
            this.titleScreen.update(this.controller, this.audio, this.assets, this.tick);
            break;

        default:
            break;
        }
    }


    public onRedraw() : void {
        
        switch (this.scene) {

        case Scene.Game:
            
            this.drawGameScene();
            break;

        case Scene.LevelMenu:

            this.levelMenu.draw(this.canvas, this.assets);
            break;

        case Scene.Ending:

            this.drawEnding();
            break;

        case Scene.TitleScreen:

            this.drawBackground();
            this.titleScreen.draw(this.canvas, this.assets);
            break;

        default:
            break;
        }

        this.transition.draw(this.canvas);
    }
}