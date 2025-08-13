

export class Vector {


    public x : number;
    public y : number;
    public z : number;


    constructor(x : number = 0.0, y : number = 0.0, z : number = 0.0) {

        this.x = x;
        this.y = y;
        this.z = z;
    }


    public zero() : void {

        this.x = 0.0;
        this.y = 0.0;
        this.z = 0.0;
    }


    public length() : number {

        return Math.hypot(this.x, this.y, this.z);
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
        this.z /= len;
    }


    public clone() : Vector {

        return new Vector(this.x, this.y, this.z);
    }


    public makeEqual(v : Vector) : void {

        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
    }


    static zero() : Vector {

        return new Vector();
    }
}
