import { AudioSample, OscType, Ramp } from "./audiosample.js";



export class AudioPlayer {

    private globalVolume : number;
    private enabled : boolean = true;

    private readonly ctx : AudioContext;


    constructor(ctx : AudioContext, globalVolume : number = 0.60) {

        this.globalVolume = globalVolume;

        this.ctx = ctx;
    }


     public createSample(sequence : number[], baseVolume : number = 1.0,
        type : OscType = OscType.Square, ramp : Ramp = Ramp.Exponential,
        attackTime : number = 0.40) : AudioSample {

        return new AudioSample(this.ctx, sequence, baseVolume, type, ramp, attackTime);
    }


    public playSample(sample : AudioSample, volume : number = 0.60) : void {

        if (!this.enabled) {

            return;
        }
        try {

            sample.play(volume*this.globalVolume);
        }
        catch (e) {}
    }


    public toggleAudio(state : boolean = !this.enabled) : void {

        this.enabled = state;
    }


    public getStateString() : string {

        return "AUDIO: " + (this.enabled ? "ON " : "OFF");
    }
}
