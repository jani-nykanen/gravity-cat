import { Game } from "./game.js";

/*
function waitForInitialEvent() : Promise<AudioContext> {

    return new Promise<AudioContext> ( (resolve : (ctx : AudioContext | PromiseLike<AudioContext>) => void) : void => {

        let activated : boolean = false;
        window.addEventListener("keydown", (e : KeyboardEvent) => {

            if (activated) {

                return;
            }
            activated = true;

            e.preventDefault();
            document.getElementById("_i")?.remove();
    
            const ctx : AudioContext = new AudioContext();
            resolve(ctx);
    
        }, { once: true });
    } );
}
    */


window.onload = () => { /* (async () => {
        
    const div : HTMLDivElement = document.createElement("div");
    div.id = "_i";


    document.getElementById("init_text")!.innerText = "Press Something to Start";
    */
    const ctx : AudioContext = new AudioContext(); // await waitForInitialEvent();
    (new Game(ctx)).run();
   
}
// }) ();
