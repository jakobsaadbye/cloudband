import { Context } from "@core/context.ts";
import { Action } from "@core/input.ts";
import { Region } from "@core/track.ts";

export const UndoRegionDelete = (ctx: Context, action: Action) => {
    const region = action.data as Region;
    region.deleted = false;
}

export const RedoRegionDelete = (ctx: Context, action: Action) => {
    const region = action.data as Region;
    region.deleted = true;
}

export const UndoRegionPaste = (ctx: Context, action: Action) => {
    const region = action.data as Region;
    region.deleted = true;
}

export const RedoRegionPaste = (ctx: Context, action: Action) => {
    const region = action.data as Region;
    region.deleted = false;
}

export const UndoRegionCropStart = (ctx: Context, action: Action) => {
    const [region, start, offset, origStart, origOffset] = action.data as [Region, number, number, number, number];
    region.start = origStart;
    region.offsetStart = origOffset;
}

export const RedoRegionCropStart = (ctx: Context, action: Action) => {
    const [region, start, offset] = action.data as [Region, number, number, number, number];
    region.start = start;
    region.offsetStart = offset;
}

export const UndoRegionCropEnd = (ctx: Context, action: Action) => {
    const [region,,, origEnd, origOffset] = action.data as [Region, number, number, number, number];
    region.end = origEnd;
    region.offsetEnd = origOffset;
}

export const RedoRegionCropEnd = (ctx: Context, action: Action) => {
    const [region, end, offset] = action.data as [Region, number, number, number, number];
    region.end = end;
    region.offsetEnd = offset;
}

export const UndoRegionShift = (ctx: Context, action: Action) => {
    const [region,,, origStart, origEnd] = action.data as [Region, number, number, number, number];
    region.start = origStart;
    region.end = origEnd;
    region.originalStart = origStart;
    region.originalEnd = origEnd;
}

export const RedoRegionShift = (ctx: Context, action: Action) => {
    const [region, start, end] = action.data as [Region, number, number, number, number];
    region.start = start;
    region.end = end;
}