

export const approachValue = (x : number, target : number, step : number) : number => {

    if (x < target) {

        return Math.min(target, x + step);
    }
    return Math.max(target, x - step);
}