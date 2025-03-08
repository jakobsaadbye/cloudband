import { Region, Track } from "@core/track.ts";
import { Context } from "@core/context.ts";
import { SqliteDB } from "@jakobsaadbye/teilen-sql";
import { SaveEntireProject } from "../db/save.ts";

type ActionKind =
    "delete_region"
    | "paste_region"

type Action = {
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

    async Save(db: SqliteDB, ctx: Context) {
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

        const index = this.undoBuffer.length - this.undos;
        const lastAction = this.undoBuffer[index];
        switch (lastAction.kind) {
            case "delete_region": { this.UndoDeleteRegion(ctx, lastAction) } break;
            case "paste_region": { this.UndoPasteRegion(ctx, lastAction) } break;
        }
    }

    Redo(ctx: Context) {
        if (this.undos === 0) return;

        this.undos -= 1;

        const index = this.undoBuffer.length - this.undos - 1;
        const lastAction = this.undoBuffer[index];
        switch (lastAction.kind) {
            case "delete_region": { this.RedoDeleteRegion(ctx, lastAction) } break;
            case "paste_region": { this.RedoPasteRegion(ctx, lastAction) } break;
        }
    }

    Perfomed(actionKind: ActionKind, data: any) {
        this.undoBuffer.push({ kind: actionKind, data });
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

        const newRegion = new Region(track.id);
        newRegion.data = region.data;
        newRegion.start = region.end;
        newRegion.end = region.end + region.duration;
        newRegion.totalDuration = region.totalDuration;

        track.regions.push(newRegion);
        this.Perfomed("paste_region", newRegion);
    }

    UndoPasteRegion(ctx: Context, action: Action) {
        const region = action.data as Region;
        region.deleted = true;
    }

    RedoPasteRegion(ctx: Context, action: Action) {
        const region = action.data as Region;
        region.deleted = false;
    }

    DeleteRegion(ctx: Context) {
        if (this.selectedRegion === null) return;
        this.selectedRegion.deleted = true;

        const copy = this.selectedRegion;
        this.Perfomed("delete_region", copy);
    }

    UndoDeleteRegion(ctx: Context, action: Action) {
        const region = action.data as Region;
        region.deleted = false;
    }

    RedoDeleteRegion(ctx: Context, action: Action) {
        const region = action.data as Region;
        region.deleted = true;
    }

    ResetSelection(ctx: Context) {
        this.selectedRegion = null;
    }
}

export {
    PlayerInput
}