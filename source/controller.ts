

export const enum InputState {

    Up = 0,
    Down = 1,
    Released = 2,
    Pressed = 3,

    DownOrPressed = 1
};


export type ActionConfig = {id : number, keys: string[], prevent: boolean};
export type ActionState = {state : InputState, timestamp : number};


class Action {


    public keys : string[];
    public state : InputState = InputState.Up;
    public timestamp : number = 0.0;


    constructor(keys : string[] = []) {

        this.keys = keys;
    }


    public toActionState() : ActionState {

        return {state: this.state, timestamp: this.timestamp};
    }
}


export class Controller {

    private keyStates : Map<string, [InputState, number]>;
    private actions : Map<number, Action>;
    private preventableKeys : string[];
    private anyPressed : boolean = false;


    constructor(actions : ActionConfig[]) {

        this.keyStates = new Map<string, [InputState, number]> ();
        this.actions = new Map<number, Action> ();

        const preventableRaw : string[] = [];
        for (const a of actions) {

            preventableRaw.push(...a.keys);
            this.actions.set(a.id, new Action(a.keys));
        }
        // This way we *prevent* duplicates
        this.preventableKeys = Array.from(new Set(preventableRaw));

        // Set listeners
        window.addEventListener("keydown", (ev : KeyboardEvent) : void => {

            if (this.preventableKeys.includes(ev.key)) {

                ev.preventDefault();
            }
            this.keyEvent(ev.code, ev.timeStamp, true);
        });
        window.addEventListener("keyup", (ev : KeyboardEvent) : void => {

            if (this.preventableKeys.includes(ev.key)) {

                ev.preventDefault();
            }
            this.keyEvent(ev.code, ev.timeStamp, false);
        });
    }


    private keyEvent(key : string, timestamp : number, pressed : boolean) : void {

        let state : [InputState, number] | undefined = this.keyStates.get(key);
        if (state === undefined) {

            state = [InputState.Up, 0.0];
            this.keyStates.set(key, state);
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


    private updateActionState(action : Action) : void {

        action.state = InputState.Up;
        action.timestamp = 0.0;

        for (const k of action.keys) {

            const state : [InputState, number] = this.keyStates.get(k) ?? [InputState.Up, 0.0];

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

        // Update keys
        for (const state of this.keyStates.values()) {

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

        this.anyPressed = false;
    }


    public getAction(id : number) : ActionState {

        return this.actions.get(id)?.toActionState() ?? {state: InputState.Up, timestamp: 0.0};
    }


    public anythingPressed() : boolean {

        return this.anyPressed;
    }
}
