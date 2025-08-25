

export const enum InputState {

    Up = 0,
    Down = 1,
    Released = 2,
    Pressed = 3,

    DownOrPressed = 1
};


export type ActionConfig = {id : number, keys: string[], specialKeys: string[], prevent: boolean};
export type ActionState = {state : InputState, timestamp : number};


class Action {


    public keys : string[];
    public specialKeys : string[];
    public state : InputState = InputState.Up;
    public timestamp : number = 0.0;


    constructor(keys : string[] = [], specialKeys : string[] = []) {

        this.keys = keys;
        this.specialKeys = specialKeys;
    }


    public toActionState() : ActionState {

        return {state: this.state, timestamp: this.timestamp};
    }
}


export class Controller {

    private keyStates : Map<string, [InputState, number]>;
    // NOTE: Misleading name here: "special key" is one that takes
    // event.key intead of event.code, i.e. the physical location
    // does not matter, but what the key actual is.
    private specialKeyStates : Map<string, [InputState, number]>;

    private actions : Map<number, Action>;
    private preventableKeys : string[];
    private preventableSpecialKeys : string[];
    private anyPressed : boolean = false;


    constructor(actions : ActionConfig[]) {

        this.keyStates = new Map<string, [InputState, number]> ();
        this.specialKeyStates = new Map<string, [InputState, number]> ();

        this.actions = new Map<number, Action> ();

        const preventableRaw : string[] = [];
        const preventableSpecialRaw : string[] = [];

        for (const a of actions) {

            if (a.prevent) {

                preventableRaw.push(...a.keys);
                preventableSpecialRaw.push(...a.specialKeys);
            }
            this.actions.set(a.id, new Action(a.keys, a.specialKeys));
        }
        // This way we *prevent* duplicates
        this.preventableKeys = Array.from(new Set(preventableRaw));
        this.preventableSpecialKeys = Array.from(new Set(preventableSpecialRaw));

        // Set listeners
        window.addEventListener("keydown", (ev : KeyboardEvent) : void => {

            if (this.preventableKeys.includes(ev.code) ||
                this.preventableSpecialKeys.includes(ev.key)) {

                ev.preventDefault();
            }
            this.inputEvent(this.keyStates, ev.code, ev.timeStamp, true);
            this.inputEvent(this.specialKeyStates, ev.key, ev.timeStamp, true);
        });
        window.addEventListener("keyup", (ev : KeyboardEvent) : void => {

            if (this.preventableKeys.includes(ev.code) ||
                this.preventableSpecialKeys.includes(ev.key)) {

                ev.preventDefault();
            }
            this.inputEvent(this.keyStates, ev.code, ev.timeStamp, false);
            this.inputEvent(this.specialKeyStates, ev.key, ev.timeStamp, false);
        });

        window.addEventListener("mousemove", (ev : MouseEvent) : void => window.focus());
        window.addEventListener("mousedown", (ev : MouseEvent) : void => window.focus());
    }


    private inputEvent(states : Map<string, [InputState, number]>, key : string, timestamp : number, pressed : boolean) : void {

        let state : [InputState, number] | undefined = states.get(key);
        if (state === undefined) {

            state = [InputState.Up, 0.0];
            states.set(key, state);
        }

        if (pressed) {

            if (state![0] == InputState.Down) {

                return;
            }
            state![0] = InputState.Pressed;
            state![1] = timestamp;

            this.anyPressed = true;

            return;
        }

        if (state![0] == InputState.Up) {

            return;
        }
        state![0] = InputState.Released;
        state![1] = 0; // timestamp;
    }


    private updateStateArray(states : Map<string, [InputState, number]>) : void {

        for (const state of states.values()) {

            if (state[0] == InputState.Pressed) {

                state[0] = InputState.Down;
            }
            else if (state[0] == InputState.Released) {

                state[0] = InputState.Up;
            }

            // Set timestamp to zero if not pressed (since we do not care
            // about the timestamp when something is released)
            if ((state[0] & InputState.DownOrPressed) == 0) {

                state[1] = 0.0;
            }
        }
    }


    private updateActionState(action : Action) : void {

        action.state = InputState.Up;
        action.timestamp = 0.0;

        // Check keys
        for (const k of action.keys) {

            const state : [InputState, number] = this.keyStates.get(k) ?? [InputState.Up, 0.0];

            if (state[0] != InputState.Up) {

                action.state = state[0];
                if (state[1] > action.timestamp) {
                    
                    action.timestamp = state[1];
                }
            }
        }

        if (action.state != InputState.Up) {

            return;
        }

        // Check "special" keys
        for (const k of action.specialKeys) {

            const state : [InputState, number] = this.specialKeyStates.get(k) ?? [InputState.Up, 0.0];

            if (state[0] != InputState.Up) {

                action.state = state[0];
                if (state[1] > action.timestamp) {
                    
                    action.timestamp = state[1];
                }
            }
        }
    } 


    public preUpdate() : void {

        // Update actions
        for (const action of this.actions.values()) {

            this.updateActionState(action);
        }
    }


    public postUpdate() : void {

        this.updateStateArray(this.keyStates);
        this.updateStateArray(this.specialKeyStates);

        this.anyPressed = false;
    }


    public getAction(id : number) : ActionState {

        return this.actions.get(id)?.toActionState() ?? {state: InputState.Up, timestamp: 0.0};
    }


    public anythingPressed() : boolean {

        return this.anyPressed;
    }
}
