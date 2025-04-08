import { Action } from "@core/input.ts";
import { Region, Track } from "@core/track.ts";
import { Context } from "@core/context.ts";
import { SaveEntities } from "@/db/save.ts";

export const undo = {
    async RegionDelete(ctx: Context, action: Action) {
        const [region] = action.data as [Region];
        region.deleted = false;
        await SaveEntities(ctx, [region]);
    },
    async RegionPaste(ctx: Context, action: Action) {
        const [region] = action.data as [Region];
        region.deleted = true;
        await SaveEntities(ctx, [region]);
    },
    async RegionCropStart(ctx: Context, action: Action) {
        const [region, start, offset, origStart, origOffset] = action.data as [Region, number, number, number, number];
        region.start = origStart;
        region.offsetStart = origOffset;
        await SaveEntities(ctx, [region]);
    },
    async RegionCropEnd(ctx: Context, action: Action) {
        const [region,,, origEnd, origOffset] = action.data as [Region, number, number, number, number];
        region.end = origEnd;
        region.offsetEnd = origOffset;
        await SaveEntities(ctx, [region]);
    },
    async RegionShift(ctx: Context, action: Action) {
        const [region,,, origStart, origEnd] = action.data as [Region, number, number, number, number];
        region.start = origStart;
        region.end = origEnd;
        region.originalStart = origStart;
        region.originalEnd = origEnd;
        await SaveEntities(ctx, [region]);
    },
    async RegionSplit(ctx: Context, action: Action) {
        const [A, B] = action.data as [Region, Region];
        A.end = B.end;
        B.deleted = true;
        await SaveEntities(ctx, [A, B]);
    },
    async TrackDelete(ctx: Context, action: Action) {
        const [track] = action.data as [Track];
        track.deleted = false;
        await SaveEntities(ctx, [track]);
    },
}

export const redo = {
    async RegionDelete(ctx: Context, action: Action) {
        const [region] = action.data as [Region];
        region.deleted = true;
        await SaveEntities(ctx, [region]);
    },
    async RegionPaste(ctx: Context, action: Action) {
        const [region] = action.data as [Region];
        region.deleted = false;
        await SaveEntities(ctx, [region]);
    },
    async RegionCropStart(ctx: Context, action: Action) {
        const [region, start, offset] = action.data as [Region, number, number];
        region.start = start;
        region.offsetStart = offset;
        await SaveEntities(ctx, [region]);
    },
    async RegionCropEnd(ctx: Context, action: Action) {
        const [region, end, offset] = action.data as [Region, number, number];
        region.end = end;
        region.offsetEnd = offset;
        await SaveEntities(ctx, [region]);
    },
    async RegionShift(ctx: Context, action: Action) {
        const [region, start, end] = action.data as [Region, number, number];
        region.start = start;
        region.end = end;
        await SaveEntities(ctx, [region]);
    },
    async RegionSplit(ctx: Context, action: Action) {
        const [A, B] = action.data as [Region, Region];
        
        A.end = B.start;
        B.deleted = false;
        await SaveEntities(ctx, [A, B]);
    },
    async TrackDelete(ctx: Context, action: Action) {
        const [track] = action.data as [Track];
        track.deleted = true;
        await SaveEntities(ctx, [track]);
    }
}