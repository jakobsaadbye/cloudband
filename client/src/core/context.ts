// @deno-types="npm:@types/react@19"
import { createContext, useContext } from "react";
import { Player } from "@core/player.ts";
import { TrackManager } from "@core/trackManager.ts";
import { Cache } from "@core/cache.ts";
import { createFileManager, FileManager } from "@core/file_manager.ts";
import { SqliteDB } from "@jakobsaadbye/teilen-sql";
import { Project } from "@core/project.ts";
import { PlayerInput } from "@core/input.ts";

const audioContext = new AudioContext();
const audioElement: HTMLMediaElement = document.getElementById("audio-element");

export type Context = {
    S: (ctx) => void
    db: SqliteDB

    player: Player
    input: PlayerInput
    trackManager: TrackManager
    project: Project
    cache: Cache
    fileManager: FileManager
}

const project = new Project();
const trackManager = new TrackManager();
const player = new Player(trackManager, project.id);
const input = new PlayerInput(project.id);
const cache = new Cache()
const fileManager = await createFileManager();

const stateCtx: Context = {
    S: (c) => {}, // A setter function for changing any value in the context. Its instantiated in App.tsx to react's 'setX' in useState so that it knows when values change in the context and can re-render any components dependend on that value ...
    db: null,
    
    player,
    input,
    trackManager,
    project,
    cache,
    fileManager
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
