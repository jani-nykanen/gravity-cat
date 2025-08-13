import { Assets } from "./assets.js"
import { AudioPlayer } from "./audioplayer.js";
import { OscType, Ramp } from "./audiosample.js";
import { applyPalette } from "./bitmapgen.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js"
import { BitmapIndex, SampleIndex } from "./mnemonics.js"


type PaletteLookup = [number, number, number, number][];


const TRANSPARENT_COLOR : number = 0b100;
const PALETTE_TABLE : number[] = [

    0b100, // 0 Transparent

    0, // 1 Black
    511, // 2 White
    0b011011011, // 3 Dark gray
    0b101101101, // 4 Bright gray

    0b010101000, // 5 Dark green
    0b101111000, // 6 Bright green

    0b100010000, // 7 Dark brown
    0b111111100, // 8 Bright yellow

    0b110100010, // 9 Darker beige
    0b111110100, // A Beige


];


const GAME_ART_PALETTE_TABLE : (string | undefined) [] = [

    "1002", "1002", "1002", "109A", "109A", "109A", "0008", "0008",
    "1002", "1002", "1002", "109A", "109A", "109A", "0008", "0008",
    "1056", "1056", "1058", "1076", "1056", "1056", "1078", "1078",
    "1078", "1078", "1078", "1078", "1078", "1078", "1078", "1078", 
];


const generatePaletteLookup = () : PaletteLookup => {

    const MULTIPLIER : number = 255.0/7.0;

    const out : number[][] = new Array<number[]> ();

    for (let i : number = 0; i < 512; ++ i) {

        const r : number = (i >> 6) & 7;
        const g : number = (i >> 3) & 7;
        const b : number = i & 7;

        out[i] = [
            (r*MULTIPLIER) | 0, 
            (g*MULTIPLIER) | 0, 
            (b*MULTIPLIER) | 0,
            i == TRANSPARENT_COLOR ? 0 : 255];
    }
    
    return out as PaletteLookup;
}


const generateTerrainBitmap = (assets : Assets, bmpBase : Bitmap) : void => {

    const GRID_COLORS : string[] = ["#ffdb6d", "#db9224"];
    const BORDER_COLORS : string[] = ["#ffff92", "#924900"];

    const canvas : RenderTarget = new RenderTarget(80, 16, false);

    // Grid
    for (let y : number = 0; y < 2; ++ y) {

        for (let x : number = 0; x < 10; ++ x) {

            let xoff : number = 0;
            let w : number = 8;

            if (x >= 2 && x <= 3) {

                xoff = x == 2 ? 1 : 0;
                w = 7;
            }

            canvas.setColorString(GRID_COLORS[Number(x % 2 == y % 2)]);
            canvas.fillRect(x*8 + xoff, y*8, w, 8);

            // Correction pixels
            if (x >= 2 && x <= 3 && y == 0) {

                canvas.setColorString(BORDER_COLORS[Number(x == 3)]);
                canvas.fillRect(x*8 + (x == 2 ? 1 : 6), 1, 1, 7);
            }
        }
    }
    
    canvas.drawBitmap(bmpBase, Flip.None, 16, 0, 0, 16, 64, 16);

    assets.addBitmap(BitmapIndex.Terrain, canvas.toBitmap());
}


const generateSamples = (assets : Assets, audio : AudioPlayer) : void => {

    const sampleJump = audio.createSample(
        [64,  4, 0.20,
        160, 3, 0.80,
        256, 2, 0.50], 
        0.80,
        OscType.Sawtooth, 
        Ramp.Exponential);
 
    assets.addSample(SampleIndex.Jump, sampleJump);
}


export const generateAssets = (assets : Assets, audio : AudioPlayer) : void => {

    // Fonts
    const rgb333 : PaletteLookup = generatePaletteLookup();
    const bmpFontRaw : Bitmap = assets.getBitmap(BitmapIndex.FontRaw)!;

    const bmpFontWhite : Bitmap = applyPalette(bmpFontRaw, 
        (new Array<(string | undefined)>(16*4)).fill("0002"), 
        PALETTE_TABLE, rgb333);
    assets.addBitmap(BitmapIndex.FontRaw, bmpFontWhite);

    // Game art
    const bmpGameArtRaw : Bitmap = assets.getBitmap(BitmapIndex.BaseRaw)!;
    const bmpGameArt : Bitmap = applyPalette(bmpGameArtRaw, GAME_ART_PALETTE_TABLE, PALETTE_TABLE, rgb333);
        
    assets.addBitmap(BitmapIndex.Base, bmpGameArt);

    // Other bitmaps
    generateTerrainBitmap(assets, bmpGameArt);

    // Sounds
    generateSamples(assets, audio);
}
