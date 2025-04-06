import { Action } from "@core/input.ts";
import { Region, Track } from "@core/track.ts";
import { Context } from "@core/context.ts";
import { SaveEntities } from "@/db/save.ts";

export const undo = {
    RegionDelete(ctx: Context, action: Action) {
        const region = action.data as Region;
        region.deleted = false;
        SaveEntities(ctx, [region]);
    },
    RegionPaste(ctx: Context, action: Action) {
        const region = action.data as Region;
        region.deleted = true;
        SaveEntities(ctx, [region]);
    },
    RegionCropStart(ctx: Context, action: Action) {
        const [region, start, offset, origStart, origOffset] = action.data as [Region, number, number, number, number];
        region.start = origStart;
        region.offsetStart = origOffset;
        SaveEntities(ctx, [region]);
    },
    RegionCropEnd(ctx: Context, action: Action) {
        const [region,,, origEnd, origOffset] = action.data as [Region, number, number, number, number];
        region.end = origEnd;
        region.offsetEnd = origOffset;
        SaveEntities(ctx, [region]);
    },
    RegionShift(ctx: Context, action: Action) {
        const [region,,, origStart, origEnd] = action.data as [Region, number, number, number, number];
        region.start = origStart;
        region.end = origEnd;
        region.originalStart = origStart;
        region.originalEnd = origEnd;
        SaveEntities(ctx, [region]);
    },
    RegionSplit(ctx: Context, action: Action) {
        const [A, B] = action.data as [Region, Region];
        A.end = B.end;
        B.deleted = true;
        SaveEntities(ctx, [A, B]);
    },
    TrackDelete(ctx: Context, action: Action) {
        const [track] = action.data as [Track];
        track.deleted = false;
        SaveEntities(ctx, [track]);
    },
}

export const redo = {
    RegionDelete(ctx: Context, action: Action) {
        const region = action.data as Region;
        region.deleted = true;
        SaveEntities(ctx, [region]);
    },
    RegionPaste(ctx: Context, action: Action) {
        const region = action.data as Region;
        region.deleted = false;
        SaveEntities(ctx, [region]);
    },
    RegionCropStart(ctx: Context, action: Action) {
        const [region, start, offset] = action.data as [Region, number, number, number, number];
        region.start = start;
        region.offsetStart = offset;
        SaveEntities(ctx, [region]);
    },
    RegionCropEnd(ctx: Context, action: Action) {
        const [region, end, offset] = action.data as [Region, number, number, number, number];
        region.end = end;
        region.offsetEnd = offset;
        SaveEntities(ctx, [region]);
    },
    RegionShift(ctx: Context, action: Action) {
        const [region, start, end] = action.data as [Region, number, number, number, number];
        region.start = start;
        region.end = end;
        SaveEntities(ctx, [region]);
    },
    RegionSplit(ctx: Context, action: Action) {
        const [A, B] = action.data as [Region, Region];
        
        A.end = B.start;
        B.deleted = false;
        SaveEntities(ctx, [A, B]);
    },
    TrackDelete(ctx: Context, action: Action) {
        const [track] = action.data as [Track];
        track.deleted = true;
        SaveEntities(ctx, [track]);
    }
}