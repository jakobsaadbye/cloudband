import { Region, Track } from "./track.ts";
import { Context } from "./context.ts";
import { SqliteDB } from "@jakobsaadbye/teilen-sql";
import { SaveEntireWorkspace, SaveRegions } from "../db/save.ts";
import { undo, redo } from "@core/undo.ts";

export type ActionKind =
    | "region-delete"
    | "region-paste"
    | "region-crop-start"
    | "region-crop-end"
    | "region-shift"
    | "region-split"
    | "track-delete"

export type Action = {
    kind: ActionKind
    data: any
}

class PlayerInput {

    selectedTrack: Track | null
    selectedRegion: Region | null

    clipboard: Region | null

    undos: number
    undoBuffer: Action[]

    lastSave: number

    constructor() {
        this.selectedTrack = null;
        this.selectedRegion = null;
        this.clipboard = null;

        this.undos = 0;
        this.undoBuffer = [];
        this.lastSave = 0;
    }

    async SaveAll(ctx: Context, db: SqliteDB) {
        const t1 = performance.now();

        await SaveEntireWorkspace(db, ctx);

        const t2 = performance.now();

        const time = t2 - t1;
        console.log(`Saved project in ${time.toFixed(2)} ms.`);

        this.lastSave = (new Date()).getTime();

        ctx.S({ ...ctx });
    }

    Undo(ctx: Context) {
        if (this.undoBuffer.length - this.undos <= 0) return;

        this.undos += 1;

        ctx.S({ ...ctx });

        const index = this.undoBuffer.length - this.undos;
        const lastAction = this.undoBuffer[index];
        switch (lastAction.kind) {
            case "region-delete": return undo.RegionDelete(lastAction);
            case "region-paste": return undo.RegionPaste(lastAction);
            case "region-crop-start": return undo.RegionCropStart(lastAction);
            case "region-crop-end": return undo.RegionCropEnd(lastAction);
            case "region-shift": return undo.RegionShift(lastAction);
            case "region-split": return undo.RegionSplit(lastAction);
            case "track-delete": return undo.TrackDelete(lastAction);
        }
    }

    Redo(ctx: Context) {
        if (this.undos === 0) return;

        this.undos -= 1;

        ctx.S({ ...ctx });

        const index = this.undoBuffer.length - this.undos - 1;
        const lastAction = this.undoBuffer[index];
        switch (lastAction.kind) {
            case "region-delete": return redo.RegionDelete(lastAction);
            case "region-paste": return redo.RegionPaste(lastAction);
            case "region-crop-start": return redo.RegionCropStart(lastAction);
            case "region-crop-end": return redo.RegionCropEnd(lastAction);
            case "region-shift": return redo.RegionShift(lastAction);
            case "region-split": return redo.RegionSplit(lastAction);
            case "track-delete": return redo.TrackDelete(lastAction);
        }
    }

    Perfomed(ctx: Context, actionKind: ActionKind, data: any) {
        if (this.undos > 0) {
            this.undoBuffer = this.undoBuffer.slice(0, -(this.undos + 1));
            this.undos = 0;
        }
        this.undoBuffer.push({ kind: actionKind, data });
        ctx.S({ ...ctx });
    }

    CopyRegion(ctx: Context) {
        if (this.selectedRegion === null) return;
        this.clipboard = this.selectedRegion;
    }

    PasteRegion(ctx: Context) {
        if (this.clipboard === null) return;
        if (this.selectedTrack === null) return;

        const track = this.selectedTrack;
        const region = this.clipboard;

        const newRegion = new Region(track.id, region.projectId);
        newRegion.data = region.data;
        newRegion.start = region.end;
        newRegion.end = region.end + region.duration;
        newRegion.totalDuration = region.totalDuration;

        track.regions.push(newRegion);
        this.Perfomed(ctx, "region-paste", newRegion);
    }

    DeleteRegion(ctx: Context) {
        if (this.selectedRegion === null) return;
        this.selectedRegion.deleted = true;

        const copy = this.selectedRegion;
        this.Perfomed(ctx, "region-delete", copy);
    }

    SplitRegion(ctx: Context) {
        if (this.selectedRegion === null) return;
        if (this.selectedTrack === null) return;
        if (ctx.player.elapsedTime < this.selectedRegion.start || ctx.player.elapsedTime > this.selectedRegion.end) return;

        const splitTime = ctx.player.elapsedTime;

        const track = this.selectedTrack;

        const A = this.selectedRegion;
        const B = new Region(track.id, A.projectId);
        B.data = A.data;
        B.totalDuration = A.totalDuration;

        B.start = splitTime;
        B.offsetStart = splitTime - A.start + A.offsetStart;
        B.end = A.end;

        A.end = splitTime;

        track.regions.push(B);
        this.selectedRegion = B;
        this.Perfomed(ctx, "region-split", [A, B]);
    }

    DeleteTrack(ctx: Context) {
        if (this.selectedRegion) return;

        const track = this.selectedTrack;
        if (!track) return;

        track.deleted = true;
        this.Perfomed(ctx, "track-delete", [track]);
    }

    ResetSelection(save: () => void) {
        this.selectedRegion = null;
        save();
    }

    SelectRegion(ctx: Context, region: Region, track: Track) {
        this.selectedTrack = track;
        this.selectedRegion = region;
        ctx.S({ ...ctx });
    }

    SelectTrack(ctx: Context, track: Track) {
        this.selectedTrack = track;
        ctx.S({ ...ctx });
    }

    RegionChanged(db: SqliteDB, region: Region) {
        SaveRegions(db, [region])
    }
}

export const globalKeyboardInputIsDisabled = (e: Event) => {
    if (e.target.matches("textarea, select, [contenteditable]")) {
      return true;
    }
    if (e.target.matches("input")) {
      if (e.target.type === "range") {
        return false;
      } else {
        return true;
      }
    }
  
    return false;
  }

export {
    PlayerInput
}