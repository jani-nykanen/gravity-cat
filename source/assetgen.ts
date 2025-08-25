import { Assets } from "./assets.js"
import { AudioPlayer } from "./audioplayer.js";
import { OscType, Ramp } from "./audiosample.js";
import { applyPalette, createBigText } from "./bitmapgen.js";
import { Bitmap, Flip, RenderTarget } from "./gfx.js"
import { BitmapIndex, SampleIndex } from "./mnemonics.js"


type PaletteLookup = [number, number, number, number][];


const enum Note {

    C2 = 65.41,
    D2 = 73.42,
    E2 = 82.41,
    F2 = 87.31,
    G2 = 98.0,
    A2 = 110.0,
    B2 = 123.7,
    C3 = 130.81,
    D3 = 146.83,
    E3 = 164.81,
    F3 = 174.61,
    G3 = 196.0,
    A3 = 220.0,
    B3 = 246.94,
    C4 = 261.63,
    D4 = 293.66,
    E4 = 329.63,
    F4 = 349.23,
    G4 = 392.0,
    A4 = 440.0,
    B4 = 493.88,
}


const TRANSPARENT_COLOR : number = 0b100;
const PALETTE_TABLE : number[] = [

    0b100, // 0 Transparent

    0, // 1 Black
    511, // 2 White
    0b011011011, // 3 Dark gray
    0b101101101, // 4 Bright gray

    0b010101000, // 5 Dark green
    0b101111000, // 6 Bright green

    0b101011000, // 7 Brown
    0b111111100, // 8 Bright yellow

    0b110100010, // 9 Darker beige
    0b111110100, // A Beige

    0b100001000, // B Dark reddish thing
    0b110011000, // C Orange-ish brown 
    0b111110011, // D Yellowish yellow (what)

    0b101001000, // E Dark red
    0b111011000, // F Orange
    0b111101011, // G Bright orange
    0b100001000, // H Dark orange-ish whatever

    0b101001011, // I Darker purple
    0b110011101, // J Brighter purple
    0b111101111, // K Pink

    0b100010000, // L Darker brown

    0b111111010, // M Yellow
];


const GAME_ART_PALETTE_TABLE : (string | undefined) [] = [

    "1002", "1002", "1002", "109A", "109A", "109A", "0009", "10HG",
    "1002", "1002", "1002", "109A", "109A", "109A", "10L9", "10L9",
    "1056", "1056", "1058", "1076", "1056", "1056", "1078", "1078",
    "1078", "1078", "1078", "1078", "1078", "1078", "1078", "1078", 
    "107A", "107A", "10CA", "10CB", "10CD", "10CD", "10EF", "10EF", 
    "107A", "107A", "10CB", "10CB", "10CD", "10CD", "10DF", "10EF", 
    "10JK", "10JK", "10JK", "10JK", "10JK", "10JK", "000I", "000I",
    "10JK", "10JK", "10JK", "10JK", "10JK", "10JK", "000I", "000I",
    "1042", "1042", "0000", "0000", "0000", "0000", "0000", "0000", 
    "1042", "1042", "0000", "0000", "0000", "0000", "0000", "0000", 
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

    const canvas : RenderTarget = new RenderTarget(80, 32, false);

    // Grid
    for (let y : number = 0; y < 2; ++ y) {

        for (let x : number = 0; x < 10; ++ x) {

            let xoff : number = 0;
            let w : number = 8;

            if (x >= 2 && x <= 3) {

                xoff = x == 2 ? 1 : 0;
                w = 7;
            }

            canvas.setColor(GRID_COLORS[Number(x % 2 == y % 2)]);
            canvas.fillRect(x*8 + xoff, y*8, w, 8);

            // Correction pixels
            if (x >= 2 && x <= 3 && y == 0) {

                canvas.setColor(BORDER_COLORS[Number(x == 3)]);
                canvas.fillRect(x*8 + (x == 2 ? 1 : 6), 1, 1, 7);
            }
        }
    }
    canvas.drawBitmap(bmpBase, Flip.None, 16, 0, 0, 16, 64, 16);

    // Bridges
    canvas.drawBitmap(bmpBase, Flip.None, 0, 16, 48, 8, 16, 8);
    canvas.drawBitmap(bmpBase, Flip.Vertical, 0, 24, 48, 8, 16, 8);
    canvas.drawBitmap(bmpBase, Flip.None, 16, 16, 48, 8, 16, 8, 16, 8, 8, 8, Math.PI/2);
    canvas.drawBitmap(bmpBase, Flip.Horizontal, 16, 16, 48, 8, 16, 8, 16, 8, 8, 8, Math.PI/2);

    assets.addBitmap(BitmapIndex.Terrain, canvas.toBitmap());
}


const generateGameObjectsBitmap = (assets : Assets, bmpBase : Bitmap) : void => {

    const FRAME_LOOKUP : number[] = [0, 1, 0, 2];
    const SHIFT_Y : number[] = [1, 2, 1, 0];

    const canvas : RenderTarget = new RenderTarget(64, 64, false);

    // Correction shade for the crate
    canvas.setColor("#924900");
    canvas.fillRect(1, 48, 14, 16);

    for (let y : number = 0; y < 4; ++ y) {

        for (let x : number = 0; x < 4; ++ x) {

            // Gems
            if (y == 2) {

                canvas.drawBitmap(bmpBase, Flip.None, x*16 + 2, y*16 + 2, 48, 48, 12, 12);
                canvas.drawBitmap(bmpBase, Flip.None, x*16 + 2, y*16 + 2, x*12, 48, 12, 12);
                continue;
            }

            if (y == 3) {

                canvas.drawBitmap(bmpBase, Flip.None, x*16, y*16, x*16, 32, 16, 16);
                continue;
            }

            const sx : number = y*24 + FRAME_LOOKUP[x]*8;

            canvas.drawBitmap(bmpBase, Flip.None, x*16, y*16, sx, 0, 8, 16);
            canvas.drawBitmap(bmpBase, Flip.Horizontal, x*16 + 8, y*16, sx, 0, 8, 16);

            if (y == 1) {

                canvas.drawBitmap(bmpBase, Flip.None, x*16 + 5, y*16 + SHIFT_Y[x], 48, 0, 8, 8);
            }
        }
    }
    
    assets.addBitmap(BitmapIndex.GameObjects, canvas.toBitmap());
}


const generateBackground = (assets : Assets) : void => {

    const CLOUDS_WIDTH : number = 128;
    const CLOUDS_HEIGHT : number = 64;
    const SUN_DIAMETER : number = 48;
    const PERIOD : number = 16;
    const SINE_FACTOR : number = 1.0;
    const AMPLITUDE : number = 12;
    const COLORS : string[] = ["#248fdb", "#92dbff", "#ffffff"];
    const YOFF : number[] = [0, 2, 5];

    const canvas : RenderTarget = new RenderTarget(CLOUDS_WIDTH, CLOUDS_HEIGHT + SUN_DIAMETER);

    // Clouds
    for (let y : number = 0; y < 3; ++ y) {

        canvas.setColor(COLORS[y]);
        for (let x : number = 0; x < CLOUDS_WIDTH; ++ x) {

            const t : number = ((x % PERIOD) - PERIOD/2)/(PERIOD/2 + 2);
            const s : number = x/CLOUDS_WIDTH*Math.PI*2;
            const dy = 1 + (1.0 - Math.sqrt(1.0 - t*t) + (1.0 + Math.sin(s))*SINE_FACTOR)*AMPLITUDE + YOFF[y];

            canvas.fillRect(x, dy, 1, CLOUDS_HEIGHT - dy + 1);
        }
    }

    // Sun
    canvas.setColor("#ffb600");
    canvas.fillEllipse(SUN_DIAMETER/2, CLOUDS_HEIGHT + SUN_DIAMETER/2, SUN_DIAMETER/2, SUN_DIAMETER/2);
    canvas.setColor("#ffff92");
    canvas.fillEllipse(SUN_DIAMETER/2 - 2, CLOUDS_HEIGHT + SUN_DIAMETER/2 - 2, SUN_DIAMETER/2 - 2, SUN_DIAMETER/2 - 2);

    assets.addBitmap(BitmapIndex.Background, canvas.toBitmap());
}


const generateOutlinedFont = (fontBlack : Bitmap, fontColored : Bitmap) : Bitmap => {

    const canvas : RenderTarget = new RenderTarget(fontColored.width*2, fontColored.height*2);

    const h : number = (fontColored.height/8) | 0;

    // Nested loops let's GOOOOOOO!
    for (let y : number = 0; y < h; ++ y) {

        const dy : number = y*16 + 4;

        for (let x : number = 0; x < 16; ++ x) {

            const dx : number = x*16 + 4;

            for (let i : number = -1; i <= 1; ++ i) {

                for (let j : number = -1; j <= 2; ++ j) {

                    if (i == 0 && j == 0) {

                        continue;
                    }
                    canvas.drawBitmap(fontBlack, Flip.None, dx + i, dy + j, x*8, y*8, 8, 8);
                }
                canvas.drawBitmap(fontColored, Flip.None, dx, dy, x*8, y*8, 8, 8);
            }
        }
    }

    return canvas.toBitmap();
}


const generateFonts = (assets : Assets, rgb333 : PaletteLookup) : void => {

    const bmpFontRaw : Bitmap = assets.getBitmap(BitmapIndex.FontRaw)!;

    // Single-colored fonts
    const bmpFontWhite : Bitmap = applyPalette(bmpFontRaw, 
        (new Array<(string | undefined)>(16*4)).fill("0002"), 
        PALETTE_TABLE, rgb333);
    const bmpFontYellow : Bitmap = applyPalette(bmpFontRaw, 
        (new Array<(string | undefined)>(16*4)).fill("000M"), 
        PALETTE_TABLE, rgb333);
    const bmpFontBlack : Bitmap = applyPalette(bmpFontRaw, 
        (new Array<(string | undefined)>(16*4)).fill("0001"), 
        PALETTE_TABLE, rgb333);
        
    assets.addBitmap(BitmapIndex.FontRaw, bmpFontRaw);

    assets.addBitmap(BitmapIndex.FontWhite, bmpFontWhite);
    assets.addBitmap(BitmapIndex.FontYellow, bmpFontYellow);

    // Outlined fonts
    assets.addBitmap(BitmapIndex.FontOutlinesWhite, 
        generateOutlinedFont(bmpFontBlack, bmpFontWhite));
}


const generateBigText = (assets : Assets) : void => {

    const bmpLevelClear : Bitmap = createBigText(
        "LEVEL\nCLEAR!", "bold 22px Arial", 96, 48, 20, 3, [
            [255, 219, 0],
            [219, 109, 0]
        ]);
    assets.addBitmap(BitmapIndex.LevelClear, bmpLevelClear);

    const bmpLogoUpper : Bitmap = createBigText(
        "GRAVITY", "bold 36px Arial", 160, 40, 32, 5, [
            [255, 146, 0],
            [182, 36, 0]
        ]);
    const bmpLogoLower : Bitmap = createBigText(
        "CATASTROPHE", "bold 24px Arial", 192, 32, 24, 4, [
            [255, 146, 0],
            [182, 36, 0]
        ]);

    const canvas : RenderTarget = new RenderTarget(192, 64);

    canvas.drawBitmap(bmpLogoUpper, Flip.None, 16, 0);
    canvas.drawBitmap(bmpLogoLower, Flip.None, 0, 32);

    assets.addBitmap(BitmapIndex.Logo, canvas.toBitmap());
}


const generateSamples = (assets : Assets, audio : AudioPlayer) : void => {

    assets.addSample(SampleIndex.Collect, 
        audio.createSample(
            [160, 4, 0.60,
            100, 2, 0.80,
            256, 8, 1.00],
            0.35,
            OscType.Square, 
            Ramp.Instant)
        );

    assets.addSample(SampleIndex.Kill,
        audio.createSample(
            [128, 2, 0.80,
            160, 3, 1.0,  
            96, 12, 0.60],
            0.60,
            OscType.Square, 
            Ramp.Exponential)
        );

    assets.addSample(SampleIndex.Move,
        audio.createSample(
            [112, 4, 1.0,
            80, 2, 0.30], 
            0.40,
            OscType.Square, 
            Ramp.Instant)
        );

     assets.addSample(SampleIndex.Break,
        audio.createSample(
            [128, 4, 1.0,
            112, 3, 0.90,
            80, 12, 0.60], 
            0.40,
            OscType.Sawtooth, 
            Ramp.Linear)
        );

    assets.addSample(SampleIndex.LevelClear,
        audio.createSample( 
            [
            Note.C3, 15, 0.50,
            Note.D3, 7.5, 0.70,
            Note.E3, 7.5, 1.0,
            Note.F3, 7.5, 1.0,
            Note.E3, 7.5, 1.0,
            Note.F3, 15, 1.0,
            Note.A3, 40, 0.80,
            ], 
            0.30,
            OscType.Square, 
            Ramp.Instant)
        );

    for (let i : number = 0; i < 2; ++ i) {

        assets.addSample(i == 0 ? SampleIndex.Select : SampleIndex.Choose,
            audio.createSample( 
            [128 - i*8, 6 + i*2, 1.0,
            96 - i*8, 2 + i*4, 0.30], 
            0.25,
            OscType.Square, 
            Ramp.Instant)
        );
    }

    assets.addSample(SampleIndex.Undo,
        audio.createSample( 
        [128, 5, 1.0,
         96, 3, 0.40], 
        0.40,
        OscType.Sawtooth, 
        Ramp.Instant)
    );

    assets.addSample(SampleIndex.Restart,
        audio.createSample( 
        [144, 6, 0.90,
         96, 6, 0.20], 
        0.40,
        OscType.Square, 
        Ramp.Instant)
    );

    assets.addSample(SampleIndex.Pause,
        audio.createSample( 
            [136, 10, 0.90], 
            0.30,
            OscType.Square, 
            Ramp.Instant)
    );
}


export const generateAssets = (assets : Assets, audio : AudioPlayer) : void => {

    const rgb333 : PaletteLookup = generatePaletteLookup();

    // Fonts
    generateFonts(assets, rgb333);

    // Game art
    const bmpGameArtRaw : Bitmap = assets.getBitmap(BitmapIndex.BaseRaw)!;
    const bmpGameArt : Bitmap = applyPalette(bmpGameArtRaw, GAME_ART_PALETTE_TABLE, PALETTE_TABLE, rgb333);
    assets.addBitmap(BitmapIndex.Base, bmpGameArt);

    // Other bitmaps
    generateTerrainBitmap(assets, bmpGameArt);
    generateGameObjectsBitmap(assets, bmpGameArt);
    generateBackground(assets);
    generateBigText(assets);

    // Sounds
    generateSamples(assets, audio);
}
