import { Action, ActionKind } from "@core/input.ts";
import { Region, Track } from "@core/track.ts";
import { Context } from "@core/context.ts";
import { SaveEntities } from "@/db/save.ts";

type UndoFn = (ctx: Context, action: Action) => void;
type UndoableActions = {
  [actionKind in ActionKind]: UndoFn | undefined;
};

export const undo: UndoableActions = {
  "region-delete": async function RegionDelete(ctx: Context, action: Action) {
    const [region] = action.data as [Region];
    region.deleted = false;
    await SaveEntities(ctx, [region]);
  },
  "region-paste": async function RegionPaste(ctx: Context, action: Action) {
    const [region] = action.data as [Region];
    region.deleted = true;
    await SaveEntities(ctx, [region]);
  },
  "region-crop-start": async function RegionCropStart(ctx: Context, action: Action) {
    const [region, start, offset, origStart, origOffset] = action.data as [Region, number, number, number, number];
    region.start = origStart;
    region.offsetStart = origOffset;
    await SaveEntities(ctx, [region]);
  },
  "region-crop-end": async function RegionCropEnd(ctx: Context, action: Action) {
    const [region, , , origEnd, origOffset] = action.data as [Region, number, number, number, number];
    region.end = origEnd;
    region.offsetEnd = origOffset;
    await SaveEntities(ctx, [region]);
  },
  "region-shift": async function RegionShift(ctx: Context, action: Action) {
    const [region, , , origStart, origEnd] = action.data as [Region, number, number, number, number];
    region.start = origStart;
    region.end = origEnd;
    region.originalStart = origStart;
    region.originalEnd = origEnd;
    await SaveEntities(ctx, [region]);
  },
  "region-split": async function RegionSplit(ctx: Context, action: Action) {
    const [A, B] = action.data as [Region, Region];
    A.end = B.end;
    B.deleted = true;
    await SaveEntities(ctx, [A, B]);
  },
  "track-delete": async function TrackDelete(ctx: Context, action: Action) {
    const [track] = action.data as [Track];
    track.deleted = false;
    await SaveEntities(ctx, [track]);
  },
  "region-accept-their": undefined,
  "region-decline-their": undefined
}

export const redo: UndoableActions = {
  "region-delete": async function RegionDelete(ctx: Context, action: Action) {
    const [region] = action.data as [Region];
    region.deleted = true;
    await SaveEntities(ctx, [region]);
  },
  "region-paste": async function RegionPaste(ctx: Context, action: Action) {
    const [region] = action.data as [Region];
    region.deleted = false;
    await SaveEntities(ctx, [region]);
  },
  "region-crop-start": async function RegionCropStart(ctx: Context, action: Action) {
    const [region, start, offset] = action.data as [Region, number, number];
    region.start = start;
    region.offsetStart = offset;
    await SaveEntities(ctx, [region]);
  },
  "region-crop-end": async function RegionCropEnd(ctx: Context, action: Action) {
    const [region, end, offset] = action.data as [Region, number, number];
    region.end = end;
    region.offsetEnd = offset;
    await SaveEntities(ctx, [region]);
  },
  "region-shift": async function RegionShift(ctx: Context, action: Action) {
    const [region, start, end] = action.data as [Region, number, number];
    region.start = start;
    region.end = end;
    await SaveEntities(ctx, [region]);
  },
  "region-split": async function RegionSplit(ctx: Context, action: Action) {
    const [A, B] = action.data as [Region, Region];

    A.end = B.start;
    B.deleted = false;
    await SaveEntities(ctx, [A, B]);
  },
  "track-delete": async function TrackDelete(ctx: Context, action: Action) {
    const [track] = action.data as [Track];
    track.deleted = true;
    await SaveEntities(ctx, [track]);
  },
  "region-accept-their": undefined,
  "region-decline-their": undefined
}