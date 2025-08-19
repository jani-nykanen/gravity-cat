

export class Vector {


    public x : number;
    public y : number;


    constructor(x : number = 0.0, y : number = 0.0) {

        this.x = x;
        this.y = y;
    }


    public zero() : void {

        this.x = 0.0;
        this.y = 0.0;
    }


    public length() : number {

        return Math.hypot(this.x, this.y);
    }


    public normalize(forceUnit : boolean = false) : void {

        const THRESHOLD : number = 0.001;

        const len : number = this.length();
        if (len < THRESHOLD) {

            this.zero();
            if (forceUnit) {
             
                this.x = 1.0;
            }
            return;
        }

        this.x /= len;
        this.y /= len;
    }


    public rotate(angle : number) : Vector {

        const s : number = Math.sin(angle);
        const c : number = Math.cos(angle);

        const x : number = this.x;
        const y : number = this.y;

        this.x = c*x - s*y;
        this.y = s*x + c*y;     
        
        return this;
    }


    public clone() : Vector {

        return new Vector(this.x, this.y);
    }


    public makeEqual(v : Vector) : void {

        this.x = v.x;
        this.y = v.y;
    }


    public setValues(x : number, y : number) : Vector {

        this.x = x;
        this.y = y;

        return this;
    }


    static zero() : Vector {

        return new Vector();
    }
    
}
