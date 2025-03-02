// @deno-types="npm:@types/react@19"
import { createContext, useContext } from "react";
import { Player } from "@core/player.ts";
import { TrackList } from "@core/track.ts";

const audioContext = new AudioContext();
const audioElement: HTMLMediaElement = document.getElementById("audio-element");

export type Context = {
    S: (ctx) => void

    player: Player,
    trackList: TrackList
}

const trackList = new TrackList();
const player = new Player(trackList);

const stateCtx: Context = {
    S: (c) => {}, // A setter function for changing any value in the context. Its instantiated in App.tsx to react's 'setX' in useState so that it knows when values change in the context and can re-render any components dependend on that value ...
    
    player,
    trackList,
};

const StateCtx = createContext(stateCtx);

const useCtx = () => {
    const ctx = useContext(StateCtx);
    return ctx!;
}

export {
    audioContext,
    audioElement,
    StateCtx,
    useCtx,
    stateCtx,
}
