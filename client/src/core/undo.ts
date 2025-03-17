import { Action } from "@core/input.ts";
import { Region, Track } from "@core/track.ts";

export const undo = {
    RegionDelete(action: Action) {
        const region = action.data as Region;
        region.deleted = false;
    },
    RegionPaste(action: Action) {
        const region = action.data as Region;
        region.deleted = true;
    },
    RegionCropStart(action: Action) {
        const [region, start, offset, origStart, origOffset] = action.data as [Region, number, number, number, number];
        region.start = origStart;
        region.offsetStart = origOffset;
    },
    RegionCropEnd(action: Action) {
        const [region,,, origEnd, origOffset] = action.data as [Region, number, number, number, number];
        region.end = origEnd;
        region.offsetEnd = origOffset;
    },
    RegionShift(action: Action) {
        const [region,,, origStart, origEnd] = action.data as [Region, number, number, number, number];
        region.start = origStart;
        region.end = origEnd;
        region.originalStart = origStart;
        region.originalEnd = origEnd;
    },
    RegionSplit(action: Action) {
        const [A, B] = action.data as [Region, Region];
        A.end = B.end;
        B.deleted = true;
    },
    TrackDelete(action: Action) {
        const [track] = action.data as [Track];
        track.deleted = false;
    },
}

export const redo = {
    RegionDelete(action: Action) {
        const region = action.data as Region;
        region.deleted = true;
    },
    RegionPaste(action: Action) {
        const region = action.data as Region;
        region.deleted = false;
    },
    RegionCropStart(action: Action) {
        const [region, start, offset] = action.data as [Region, number, number, number, number];
        region.start = start;
        region.offsetStart = offset;
    },
    RegionCropEnd(action: Action) {
        const [region, end, offset] = action.data as [Region, number, number, number, number];
        region.end = end;
        region.offsetEnd = offset;
    },
    RegionShift(action: Action) {
        const [region, start, end] = action.data as [Region, number, number, number, number];
        region.start = start;
        region.end = end;
    },
    RegionSplit(action: Action) {
        const [A, B] = action.data as [Region, Region];
        
        A.end = B.start;
        B.deleted = false;
    },
    TrackDelete(action: Action) {
        const [track] = action.data as [Track];
        track.deleted = true;
    }
}