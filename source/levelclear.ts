import { Bitmap, Flip, RenderTarget } from "./gfx.js";
import { Assets } from "./assets.js";
import { BitmapIndex } from "./mnemonics.js";


export const drawLevelClearAnimation = (canvas : RenderTarget, assets : Assets, t : number) : void => {

    const bmpLevelClear : Bitmap = assets.getBitmap(BitmapIndex.LevelClear);

    const dx : number = canvas.width/2 - bmpLevelClear.width/2;
    const dy : number = canvas.height/2 - bmpLevelClear.height/2;

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
