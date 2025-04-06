// @deno-types="npm:@types/react@19"
import { createContext, useContext } from "react";
import { Player } from "@core/player.ts";
import { TrackList } from "@core/track.ts";
import { Cache } from "@core/cache.ts";
import { Workspace } from "@core/workspace.ts";
import { createFileManager, FileManager } from "@core/file_manager.ts";
import { SqliteDB } from "@jakobsaadbye/teilen-sql";
import { Project } from "@core/project.ts";

const audioContext = new AudioContext();
const audioElement: HTMLMediaElement = document.getElementById("audio-element");

export type Context = {
    S: (ctx) => void
    db: SqliteDB

    player: Player,
    trackList: TrackList
    project: Project,
    workspace: Workspace,
    cache: Cache,
    fileManager: FileManager
}

const project = new Project();
const trackList = new TrackList();
const player = new Player(trackList, project.id);
const workspace = new Workspace();
const cache = new Cache()
const fileManager = await createFileManager();

const stateCtx: Context = {
    S: (c) => {}, // A setter function for changing any value in the context. Its instantiated in App.tsx to react's 'setX' in useState so that it knows when values change in the context and can re-render any components dependend on that value ...
    db: null,
    
    player,
    trackList,
    project,
    workspace,
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
