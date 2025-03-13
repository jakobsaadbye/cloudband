import { Region, Track } from "./track.ts";
import { Context } from "./context.ts";
import { SqliteDB } from "@jakobsaadbye/teilen-sql";
import { SaveEntireProject, SaveRegions } from "../db/save.ts";
import "@core/undo.ts";
import * as E from "@core/undo.ts";

export type ActionKind =
    | "region-delete"
    | "region-paste"
    | "region-crop-start"
    | "region-crop-end"
    | "region-shift"

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

    async SaveAll(db: SqliteDB, ctx: Context) {
        const t1 = performance.now();

        await SaveEntireProject(db, ctx);

        const t2 = performance.now();

        const time = t2 - t1;
        console.log(`Saved project in ${time.toFixed(2)} ms.`);

        this.lastSave = (new Date()).getTime();

        ctx.S({...ctx});
    }

    Undo(ctx: Context) {
        if (this.undoBuffer.length - this.undos <= 0) return;

        this.undos += 1;

        ctx.S({...ctx});

        const index = this.undoBuffer.length - this.undos;
        const lastAction = this.undoBuffer[index];
        switch (lastAction.kind) {
            case "region-delete": return E.UndoRegionDelete(ctx, lastAction);
            case "region-paste": return E.UndoRegionPaste(ctx, lastAction);
            case "region-crop-start": return E.UndoRegionCropStart(ctx, lastAction);
            case "region-crop-end": return E.UndoRegionCropEnd(ctx, lastAction);
            case "region-shift": return E.UndoRegionShift(ctx, lastAction);
        }
    }

    Redo(ctx: Context) {
        if (this.undos === 0) return;

        this.undos -= 1;

        ctx.S({...ctx});

        const index = this.undoBuffer.length - this.undos - 1;
        const lastAction = this.undoBuffer[index];
        switch (lastAction.kind) {
            case "region-delete": return E.RedoRegionDelete(ctx, lastAction);
            case "region-paste": return E.RedoRegionPaste(ctx, lastAction);
            case "region-crop-start": return E.RedoRegionCropStart(ctx, lastAction);
            case "region-crop-end": return E.RedoRegionCropEnd(ctx, lastAction);
            case "region-shift": return E.RedoRegionShift(ctx, lastAction);
        }
    }

    Perfomed(ctx: Context, actionKind: ActionKind, data: any) {
        console.log(`Performed ${actionKind}`);
        if (this.undos > 0) {
            this.undoBuffer = this.undoBuffer.slice(0, -(this.undos + 1));
            this.undos = 0;
        }
        this.undoBuffer.push({ kind: actionKind, data });
        ctx.S({...ctx});
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

    ResetSelection(save: () => void) {
        this.selectedRegion = null;
        save();
    }

    SelectRegion(save: () => void, region: Region, track: Track) {
        this.selectedTrack = track;
        this.selectedRegion = region;
        save();
    }

    RegionChanged(db: SqliteDB, region: Region) {
        SaveRegions(db, [region])
    }
}

export {
    PlayerInput
}