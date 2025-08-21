import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { Assets } from "./assets.js";
import { BitmapIndex } from "./mnemonics.js";


const FRAME_COLORS : string[] = ["#000000", "#ffb66d", "#db6d00", "#922400"];


export const drawFrame = (canvas : RenderTarget, assets : Assets, width : number, height : number) : void => {

    // TODO: Lookup table & for loop to save bytes?

    const FRAME_WIDTH : number = 8;

    // Shadow
    canvas.setColor("rgba(0,0,0,0.2)");
    canvas.fillRect(-4, -4, width + FRAME_WIDTH*2, height + FRAME_WIDTH*2);

    // Edges
    canvas.setColor(FRAME_COLORS[0]);
    canvas.fillRect(-FRAME_WIDTH, -FRAME_WIDTH, width + FRAME_WIDTH*2, height + FRAME_WIDTH*2);

    canvas.setColor(FRAME_COLORS[1]);
    canvas.fillRect(-FRAME_WIDTH + 1, -FRAME_WIDTH + 1, width + FRAME_WIDTH*2 - 2, height + FRAME_WIDTH*2 - 2);

    canvas.setColor(FRAME_COLORS[2]);
    canvas.fillRect(-FRAME_WIDTH + 2, -FRAME_WIDTH + 2, width + FRAME_WIDTH*2 - 4, height + FRAME_WIDTH*2 - 4);

    canvas.setColor(FRAME_COLORS[3]);
    canvas.fillRect(-2, -2, width + 4, height +4);

    canvas.setColor(FRAME_COLORS[0]);
    canvas.fillRect(-1, -1, width + 2, height + 2);

    // Corners
    const bmp : Bitmap = assets.getBitmap(BitmapIndex.Base);

    canvas.drawBitmap(bmp, Flip.Horizontal, -8, -8, 56, 0, 8, 8);
    canvas.drawBitmap(bmp, Flip.None, width, -8, 56, 0, 8, 8);
    canvas.drawBitmap(bmp, Flip.None, -8, height, 56, 0, 8, 8);
    canvas.drawBitmap(bmp, Flip.Horizontal, width, height, 56, 0, 8, 8);
}
