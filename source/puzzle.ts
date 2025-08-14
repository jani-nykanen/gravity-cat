import { Bitmap, RenderTarget } from "./gfx.js";
import { TerrainMap } from "./terrainmap.js";
import { Assets } from "./assets.js";
import { BitmapIndex } from "./mnemonics.js";
import { TILE_WIDTH, TILE_HEIGHT } from "./tilesize.js";
import { ObjectType, PuzzleObject } from "./puzzleobject.js";
import { Controller } from "./controller.js";
import { AudioPlayer } from "./audioplayer.js";


export class Puzzle {


    private tiles : number[];
    private terrainMap : TerrainMap;

    private objects : PuzzleObject[];

    public readonly width : number;
    public readonly height : number;


    constructor(levelData : string) {

        this.width = parseInt(levelData[0], 32);
        this.height = parseInt(levelData[1], 32);
        this.tiles = levelData.substring(2).split("").map((c : string) => parseInt(c, 32));

        this.terrainMap = new TerrainMap(this.tiles, this.width, this.height);

        this.objects = new Array<PuzzleObject> ();
        this.parseObjects();
    }


    private parseObjects() : void {

        for (let y : number = 0; y < this.height; ++ y) {

            for (let x : number = 0; x < this.width; ++ x) {

                const objectID : number = this.tiles[y*this.width + x];
                if (objectID <= 1) {

                    continue;
                }

                const objectType : ObjectType = (objectID - 2) as ObjectType;
                this.objects.push(new PuzzleObject(x, y, objectType));
            }
        }
    }


    public setCamera(canvas : RenderTarget) : void {

        canvas.moveTo(
            canvas.width/2 - this.width*TILE_WIDTH/2, 
            canvas.height/2 - this.height*TILE_HEIGHT/2);
    }


    public update(controller : Controller, audio : AudioPlayer, assets : Assets, tick : number) : void {

        for (const o of this.objects) {

            o.update(controller, audio, assets, tick);
        }
    }


    public draw(canvas : RenderTarget, assets : Assets) : void {

        const bmpTerrain : Bitmap = assets.getBitmap(BitmapIndex.Terrain);

        this.terrainMap.draw(canvas, bmpTerrain);

        for (const o of this.objects) {

            o.draw(canvas, assets);
        }
    } 
}
