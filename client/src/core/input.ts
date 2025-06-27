import { Region, Track } from "./track.ts";
import { Context } from "./context.ts";
import { SaveAction, SaveEntireProject, SaveEntities, SaveEntity } from "../db/save.ts";
import { undo, redo } from "@core/undo.ts";
import { Entity } from "@core/entity.ts";
import { generateId } from "@core/id.ts";
import { sqlPlaceholders } from "@jakobsaadbye/teilen-sql";

export type ActionKind =
    | "region-delete"
    | "region-paste"
    | "region-crop-start"
    | "region-crop-end"
    | "region-shift"
    | "region-split"
    | "region-accept-their"
    | "region-decline-their"
    | "track-delete"

export type Action = {
    kind: ActionKind
    data: any[]
}

export const getActionName = (action: Action) => {
    switch (action.kind) {
        case "region-delete": return "Region delete";
        case "region-paste": return "Region paste";
        case "region-crop-start": return "Region crop start";
        case "region-crop-end": return "Region crop end";
        case "region-shift": return "Region shift";
        case "region-split": return "Region split";
        case "track-delete": return "Track delete";
        default: return action.kind;
    }
}

class PlayerInput implements Entity {
    table = "input"
    replicated = false;
    id: string
    projectId: string
    static serializedFields = [
        "id",
        "projectId",
        // "selectedTrack",
        // "selectedRegion",
        "undos",
    ] as const;

    selectedTrack: Track | null
    selectedRegion: Region | null
    clipboard: Region | null
    undos: number
    undoStack: Action[]
    lastSave: number

    constructor(projectId: string) {
        this.id = generateId();
        this.projectId = projectId;
        this.selectedTrack = null;
        this.selectedRegion = null;
        this.clipboard = null;

        this.undos = 0;
        this.undoStack = [];
        this.lastSave = 0;
    }

    async SaveAll(ctx: Context) {
        const t1 = performance.now();

        await SaveEntireProject(ctx);

        const t2 = performance.now();

        const time = t2 - t1;
        console.log(`Saved project in ${time.toFixed(2)} ms.`);

        this.lastSave = (new Date()).getTime();

        ctx.S({ ...ctx });
    }

    async Undo(ctx: Context) {
        if (this.undoStack.length - this.undos <= 0) return;

        this.undos += 1;

        ctx.S({ ...ctx });

        const index = this.undoStack.length - this.undos;
        const lastAction = this.undoStack[index];
        const undoFn = undo[lastAction.kind];

        if (!undoFn) return;
        await undoFn(ctx, lastAction);

        await SaveEntity(ctx, this);
    }

    async Redo(ctx: Context) {
        if (this.undos === 0) return;

        this.undos -= 1;

        ctx.S({ ...ctx });

        const index = this.undoStack.length - this.undos - 1;
        const lastAction = this.undoStack[index];
        const redoFn = redo[lastAction.kind];

        if (!redoFn) return;
        await redoFn(ctx, lastAction);

        await SaveEntity(ctx, this);
    }

    async Performed(ctx: Context, actionKind: ActionKind, data: any[]) {
        if (this.undos > 0) {
            const end = this.undoStack.length - this.undos;
            this.undoStack = this.undoStack.slice(0, end);
            this.undos = 0;
            await SaveEntity(ctx, this);
            await this.SliceUndoStack(ctx, 0, end)
        }

        const action = { kind: actionKind, data } as Action;
        this.undoStack.push(action);

        await SaveAction(ctx, action, this.undoStack.length - 1);

        ctx.S({ ...ctx });
    }

    async AcceptRegionChange(ctx: Context, region: Region) {
        // Delete our region and take theirs
        const theirRegion = region;
        const ourRegion = ctx.trackManager.GetRegionWithId(region.conflictsWith);
        if (!ourRegion) {
            console.error("Failed to find our conflicting region");
            return;
        }

        theirRegion.conflicts = false;
        theirRegion.conflictsWith = "";

        ourRegion.deleted = true;

        await SaveEntities(ctx, [theirRegion, ourRegion]);
        this.Performed(ctx, "region-accept-their", [theirRegion, ourRegion]);
    }

    async DeclineRegionChange(ctx: Context, region: Region) {
        // Delete their region. Ours is already in the list
        const theirRegion = region;
        const ourRegion = ctx.trackManager.GetRegionWithId(region.conflictsWith);
        if (!ourRegion) {
            console.error("Failed to find our conflicting region");
            return;
        }

        theirRegion.conflicts = false;
        theirRegion.conflictsWith = "";
        theirRegion.deleted = true;

        ourRegion.deleted = false;

        await SaveEntities(ctx, [theirRegion, ourRegion]);
        this.Performed(ctx, "region-decline-their", [theirRegion, ourRegion]);
    }

    CopyRegion(ctx: Context) {
        if (this.selectedRegion === null) return;
        this.clipboard = this.selectedRegion;
    }

    async PasteRegion(ctx: Context) {
        if (this.clipboard === null) return;
        if (this.selectedTrack === null) return;

        const track = this.selectedTrack;
        const region = this.clipboard;

        const newRegion = new Region(track.id, region.projectId);
        newRegion.data = region.data;
        newRegion.start = region.end;
        newRegion.end = region.end + region.duration;
        newRegion.totalDuration = region.totalDuration;
        newRegion.createdBy = ctx.db.siteId;

        track.regions.push(newRegion);
        await this.Performed(ctx, "region-paste", [newRegion]);
        await SaveEntities(ctx, [newRegion]);
    }

    async DeleteRegion(ctx: Context) {
        if (this.selectedRegion === null) return;
        this.selectedRegion.deleted = true;

        const copy = this.selectedRegion;
        await this.Performed(ctx, "region-delete", [copy]);
        await SaveEntities(ctx, [this.selectedRegion]);
    }

    async SplitRegion(ctx: Context) {
        if (this.selectedRegion === null) return;
        if (this.selectedTrack === null) return;
        if (ctx.player.elapsedTime < this.selectedRegion.start || ctx.player.elapsedTime > this.selectedRegion.end) return;

        const splitTime = ctx.player.elapsedTime;

        const track = this.selectedTrack;

        const A = this.selectedRegion;
        const B = new Region(track.id, A.projectId);
        B.data = A.data;
        B.createdBy = ctx.db.siteId;
        B.totalDuration = A.totalDuration;

        B.start = splitTime;
        B.offsetStart = splitTime - A.start + A.offsetStart;
        B.end = A.end;

        A.end = splitTime;

        track.regions.push(B);
        this.selectedRegion = B;
        await this.Performed(ctx, "region-split", [A, B]);
        await SaveEntities(ctx, [A, B]);
    }

    async DeleteTrack(ctx: Context) {
        if (this.selectedRegion) return;

        const track = this.selectedTrack;
        if (!track) return;

        track.deleted = true;
        await this.Performed(ctx, "track-delete", [track]);
        await SaveEntities(ctx, [track]);
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

    async SliceUndoStack(ctx: Context, from: number, to: number) {
        const db = ctx.db;
        await db.execOrThrow(`DELETE FROM "undo_stack" WHERE projectId = ? AND (position < ? OR position > ?)`, [ctx.project.id, from, to]);
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