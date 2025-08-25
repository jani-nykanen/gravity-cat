

const LOCALSTORAGE_KEY = "lsjn25a";


export const saveProgress = (levelsBeaten : boolean[]) : void => {

    try {

        const data : string = levelsBeaten.map((v : boolean) : string => String(Number(v))).join("");
        window["localStorage"]["setItem"](LOCALSTORAGE_KEY, data);
    }
    catch(e) {}
}


export const loadProgress = () : boolean[] => {

    try {

        return (window["localStorage"]["getItem"](LOCALSTORAGE_KEY) ?? "")
            .split("").map((i : string) : boolean => Number(i) == 1);
    }
    catch(e) {}
    return (new Array<boolean> (12)).fill(false);
}


export const savedataExists = () : boolean => {

    try {

        return window["localStorage"]["getItem"](LOCALSTORAGE_KEY) != null;
    }
    catch(e){}

    return false;
}
