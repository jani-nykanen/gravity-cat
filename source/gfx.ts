import { clamp } from "./math.js";
import { Vector } from "./vector.js";


export type Bitmap = HTMLImageElement | HTMLCanvasElement;


export const enum Flip {

    None = 0,
    Horizontal = 1,
    Vertical = 2,
    Both = Horizontal | Vertical
};


export const enum Align {

    Left = 0,
    Center = 1,
    Right = 2
};


const createCanvas = (width : number, height : number, embed : boolean = true) : [HTMLCanvasElement, CanvasRenderingContext2D] => {

    let div : HTMLDivElement | null = null;
    if (embed) {

        div = document.createElement("div");
        div.id = "d"; // TODO: Does this have any purpose?
        div.setAttribute("style", "position: absolute; top: 0; left: 0; z-index: -1;");
    }
        
    const canvas : HTMLCanvasElement = document.createElement("canvas")!;
    canvas.setAttribute("style", 
        "position: absolute;" +
        "z-index: -1;" +
        "image-rendering: optimizeSpeed;" + 
        "image-rendering: pixelated;" +
        "image-rendering: -moz-crisp-edges;");

    canvas.width = width;
    canvas.height = height;

    if (embed && div != null) { 

        div.appendChild(canvas);
        document.body.appendChild(div);
    }

    const ctx : CanvasRenderingContext2D = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1.0;

    return [canvas, ctx];
}



export class RenderTarget {

    
    private canvas : HTMLCanvasElement;
    private ctx : CanvasRenderingContext2D;

    private translation : Vector = new Vector();

    public readonly width : number;
    public readonly height : number;


    constructor(width : number, height : number, embed : boolean = false) {

        this.width = width;
        this.height = height;

        [this.canvas, this.ctx] = createCanvas(width, height, embed);
        if (embed) {

            window.addEventListener("resize", () => {

                this.resize(window.innerWidth, window.innerHeight);
            });
            this.resize(window.innerWidth, window.innerHeight);
        }
    }


    private resize(width : number, height : number) : void {

        const canvasRatio : number = this.canvas.width/this.canvas.height;
        const targetRatio : number = width/height;

        let newWidth : number = width;
        let newHeight : number = height;

        if (targetRatio >= canvasRatio) {

            newWidth = Math.round(newHeight*canvasRatio);
        }
        else {

            newHeight = Math.round(newWidth/canvasRatio);
        }

        const cornerx : number = (width/2 - newWidth/2) | 0;
        const cornery : number  = (height/2 - newHeight/2) | 0;

        this.canvas.style.width  = String(newWidth) + "px";
        this.canvas.style.height = String(newHeight) + "px";
    
        this.canvas.style.left = String(cornerx) + "px";
        this.canvas.style.top  = String(cornery) + "px";
    }


    public clearScreen(colorStr : string) : void {

        this.ctx.fillStyle = colorStr;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    

    public setColor(str : string) : void {

        this.ctx.fillStyle = str;
        this.ctx.strokeStyle = str;
    }


    public fillRect(dx : number = 0.0, dy : number = 0.0, dw : number = this.width, dh : number = this.height) : void {

        this.ctx.fillRect(
            (dx + this.translation.x) | 0, 
            (dy + this.translation.y) | 0, 
            dw | 0, dh | 0);
    }
    

    public drawBitmap(bmp : Bitmap, flip : Flip = Flip.None,
        dx : number = 0.0, dy : number = 0.0, 
        sx : number = 0.0, sy : number = 0.0, sw : number = bmp.width, sh : number = bmp.height,
        dw : number = sw, dh : number = sh,
        centerx : number = dw/2.0, centery : number = dh/2.0, rotation : number | undefined = undefined) : void {

        sx |= 0;
        sy |= 0;
        sw |= 0;
        sh |= 0;
        dx = (dx + this.translation.x) | 0;
        dy = (dy + this.translation.y) | 0;
        dw |= 0;
        dh |= 0;

        const ctx : CanvasRenderingContext2D = this.ctx;
        const transform : boolean = flip != Flip.None || rotation !== undefined;

         if (transform) {

            ctx.save();
        }

        if ((flip & Flip.Horizontal) != 0) {

            ctx.translate(sw, 0);
            ctx.scale(-1, 1);
            dx *= -1;
        }
        if ((flip & Flip.Vertical) != 0) {

            ctx.translate(0, sh);
            ctx.scale(1, -1);
            dy *= -1;
        }

        if (rotation !== undefined) {

            ctx.translate(centerx + dx, centery + dy);
            ctx.rotate(-rotation);
            
            dx = -centerx;
            dy = -centery;
        }
        
        ctx.drawImage(bmp, sx, sy, sw, sh, dx, dy, dw, dh);

        if (transform) {

            ctx.restore();
        }
    }


    public drawHorizontallyWavingBitmap(bmp : Bitmap, 
        amplitude : number, period : number, shift : number, flip : Flip = Flip.None,
        dx : number = 0, dy : number = 0, sx : number = 0, sy : number = 0,
        sw : number = bmp.width, sh : number = bmp.height) : void {

        const phaseStep : number = Math.PI*2/period;
        // TODO: This should not work like this
        const xshift : number = -Math.sin(shift)*amplitude/2;

        for (let y : number = 0; y < sh; ++ y) {

            const phase : number = shift + phaseStep*y;
            const x : number = dx + Math.sin(phase)*amplitude + xshift;
            const py : number = (flip & Flip.Vertical) != 0 ? (sh - 1) - y : y;

            this.drawBitmap(bmp, Flip.Horizontal & flip, x, dy + y, sx, sy + py, sw, 1);
        }
    }
         


    public drawText(font : Bitmap, text : string, 
        dx : number, dy : number, xoff : number = 0, yoff : number = 0, 
        align : Align = Align.Left,
        period : number = 0.0, amplitude : number = 0.0, shift : number = 0.0 ) : void {

        const LINE_SHIFT : number = 2;

        const cw : number = (font.width/16) | 0;
        const ch : number = cw;

        dx = (dx + this.translation.x) | 0;
        dy = (dy + this.translation.y) | 0;

        const len : number = (text.length + 1)*(cw + xoff);
        if (align == Align.Center) {

            dx -= (len/2.0) | 0;
        }
        else if (align == Align.Right) {
            
            dx -= len | 0;
        }
        
        let x : number = dx;
        let y : number = dy;

        const waveShift : number = period/text.length;
        
        for (let i : number = 0; i < text.length; ++ i) {

            const chr : number = text.charCodeAt(i);
            if (chr == '\n'.charCodeAt(0)) {

                x = dx;
                y += ch + yoff;
                continue;
            }

            const wave : number = Math.round(Math.sin(shift + i*waveShift)*amplitude);

            this.ctx.drawImage(font, 
                (chr % 16)*cw, 
                (((chr/16) | 0) - LINE_SHIFT)*ch, 
                cw, ch, x, y + wave, cw, ch);
            x += cw + xoff;
        }
    }


    public fillEllipse(cx : number, cy : number, hradius : number, vradius : number = hradius) : void {

        cx = (cx + this.translation.x) | 0;
        cy = (cy + this.translation.y) | 0;

        hradius |= 0;
        vradius |= 0;

        for (let y : number = -vradius; y <= vradius; ++ y) {

            const ny : number = y/vradius;
            const r : number = Math.round(Math.sqrt(1 - ny*ny)*hradius);

            if (r <= 0) {

                continue;
            }
            this.ctx.fillRect(cx - r, cy + y, r*2, 1);
        }
    }


    public fillCircleOutside(r : number, cx : number = this.width/2, cy : number = this.height/2) : void {

        cx = (cx + this.translation.x) | 0;
        cy = (cy + this.translation.y) | 0;

        const start : number = Math.max(0, cy - r) | 0;
        const end : number = Math.min(this.height, cy + r) | 0;

        if (start > 0) {

            this.fillRect(0, 0, this.width, start);
        }
        if (end < this.height) {

            this.fillRect(0, end, this.width, this.height - end);
        }

        for (let y : number = start; y < end; ++ y) {

            const dy : number = y - cy;
            if (Math.abs(dy) >= r) {

                this.ctx.fillRect(0, y, this.width, 1);
                continue;
            }

            const px1 : number = Math.round(cx - Math.sqrt(r*r - dy*dy));
            const px2 : number = Math.round(cx + Math.sqrt(r*r - dy*dy));

            if (px1 > 0) {

                this.ctx.fillRect(0, y, px1, 1);
            }
            if (px2 < this.width) {

                this.ctx.fillRect(px2, y, this.width - px1, 1);
            }
        }
    }


    public fillRing(cx : number, cy : number, innerRadius : number, outerRadius : number) : void {
        
        innerRadius |= 0;
        outerRadius |= 0;

        if (innerRadius >= outerRadius) {

           return;
        }

        cx = (cx + this.translation.x) | 0;
        cy = (cy + this.translation.y) | 0;

        for (let y : number = -outerRadius; y <= outerRadius; ++ y) {

            const ny1 : number = y/outerRadius;
            const r1 : number = Math.round(Math.sqrt(1 - ny1*ny1) * outerRadius);
            if (r1 <= 0)
                continue;

            let r2 : number = 0;
            if (Math.abs(y) < innerRadius) {

                const ny2 : number = y/innerRadius;
                r2 = Math.round(Math.sqrt(1 - ny2*ny2) * innerRadius);
            }

            if (r2 <= 0) {

                this.ctx.fillRect(cx - r1, cy + y, r1*2, 1);
                continue;
            }
           
            this.ctx.fillRect(cx - r1, cy + y, r1 - r2, 1);
            this.ctx.fillRect(cx + r2, cy + y, r1 - r2, 1);
        }    
    }


    public fillCross(dx : number, dy : number, diameter : number, lineWidth : number) : void {

        // Does not work with even widths yet
        if (lineWidth % 2 == 0) {

            ++ lineWidth;
        }

        dx = (dx + this.translation.x) | 0;
        dy = (dy + this.translation.y) | 0;

        diameter |= 0;
        lineWidth |= 0;

        const ctx : CanvasRenderingContext2D = this.ctx;
        const offset : number = (lineWidth/2) | 0;

        // Smaller lines
        for (let y : number = 0; y < offset; ++ y) {

            for (let x : number = 0; x < 2; ++ x) {

                ctx.fillRect(
                    dx + offset - y + (diameter - 1 - offset*2)*x ,
                    dy + y, 
                    1 + y*2, 1);
                ctx.fillRect(
                    dx + 1 + y + (diameter - 1 - offset*2)*x, 
                    dy + diameter - offset + y, 
                    1 + (offset - 1 - y)*2, 1);
            }
        }

        // Main lines
        for (let y : number = offset; y < diameter - offset; ++ y) {

            ctx.fillRect(dx + y - offset, dy + y, lineWidth, 1);
            ctx.fillRect(dx + y - offset, dy + diameter - 1 - y, lineWidth, 1);
        }
    }


    public move(dx : number, dy : number) : void {

        this.translation.x += dx;
        this.translation.y += dy;
    }


    public moveTo(x : number = 0.0, y : number = 0.0) : void {

        this.translation.x = x;
        this.translation.y = y;
    }


    public setAlpha(a : number = 1.0) : void {

        this.ctx.globalAlpha = clamp(a, 0.0, 1.0);
    }


    public toBitmap() : Bitmap {

        return this.canvas;
    }
}
