import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { Assets } from "./assets.js";
import { BitmapIndex } from "./mnemonics.js";


const WATER_COLORS : string[] = ["#92dbff", "#49b6ff", "#248fdb"];
const WATER_YOFF : number[] = [0, 2, 8];


export const drawBackground = (canvas : RenderTarget, assets : Assets, timer : number) : void => {

    const CLOUD_Y : number = 88;

    canvas.clearScreen("#49b6ff");

    const bmp : Bitmap = assets.getBitmap(BitmapIndex.Background);

    // Clouds
    const loop : number = Math.ceil(canvas.width/bmp.width) + 1;
    const shiftx : number = timer*bmp.width;
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
}
