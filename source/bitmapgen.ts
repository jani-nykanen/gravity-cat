import { Bitmap } from "./gfx.js";


const createEmptyCanvas = (width : number, height : number) : HTMLCanvasElement => {

    const canvas : HTMLCanvasElement = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    return canvas;
}


const convertTile = (imageData : ImageData, 
    dx : number, dy : number, dw : number, dh : number, offset : number,
    colorTable : number[], paletteIndices : number[], 
    paletteLookUp : [number, number, number, number][]) : void => {

    for (let y : number = dy; y < dy + dh; ++ y) {

        for (let x : number = dx; x < dx + dw; ++ x) {

            const i : number = y*offset + x;
            const colorIndex : number = (imageData.data[i*4]/85) | 0;
            const paletteEntry : number[] = paletteLookUp[paletteIndices[colorTable[colorIndex] ?? 0] ?? 0] ?? [];

            for (let j : number = 0; j < 4; ++ j) {

                imageData.data[i*4 + j] = paletteEntry[j] ?? 255;
            }
        }
    }
}


export const applyPalette = (image : Bitmap,
    colorTables: (string | undefined) [], 
    paletteIndices : number[], 
    paletteLookUp : [number, number, number, number][]) : Bitmap => {

    const canvas : HTMLCanvasElement = createEmptyCanvas(image.width, image.height);
    const ctx : CanvasRenderingContext2D = canvas.getContext("2d")!;

    ctx.drawImage(image, 0, 0);

    const imageData : ImageData = ctx.getImageData(0, 0, image.width, image.height);

    const w : number = (canvas.width/8) | 0;
    const h : number = (canvas.height/8) | 0;

    let j : number = 0;
    for (let y = 0; y < h; ++ y) {

        for (let x = 0; x < w; ++ x) {

            if (j >= colorTables.length) {

                continue;
            }

            const colorTable : number[] = (colorTables[j] ?? "0000").split("").map((s : string) => parseInt(s, 32));
            convertTile(imageData, 
                x*8, y*8, 8, 8, 
                image.width, colorTable, paletteIndices, paletteLookUp);
            ++ j;
        }
    }
    ctx.putImageData(imageData, 0, 0);

    return canvas;
} 


export const cropBitmap = (source : Bitmap, sx : number, sy : number, sw : number, sh : number) : Bitmap => {

    const canvas : HTMLCanvasElement = createEmptyCanvas(sw, sh);
    const ctx : CanvasRenderingContext2D = canvas.getContext("2d")!;

    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);

    return canvas;
}