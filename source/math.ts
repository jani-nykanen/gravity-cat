

export const clamp = (x : number, min : number, max : number) => Math.max(min, Math.min(max, x));


export const signedMod = (m : number, n : number) : number => {

    m |= 0;
    n |= 0;

    return ((m % n) + n) % n;
}
export const negMod = signedMod; // Because I'll forget that I renamed this function
