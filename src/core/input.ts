import { Region, Track } from "@core/track.ts";
import { Context } from "@core/context.ts";
import { assert } from "jsr:@std/assert@0.217/assert";

class PlayerInput {

    selectedTrack: Track | null
    selectedRegion: Region | null

    clipboard: Region | null

    constructor() {
        this.selectedTrack = null;
        this.selectedRegion = null;
        this.clipboard = null;
    }

    CopyRegion(ctx: Context) {
        if (this.selectedRegion === null) return;

        this.clipboard = this.selectedRegion;
    }

    PasteRegion(ctx: Context) {
        if (this.clipboard === null) return;
        if(this.selectedTrack === null) return;

        const track = this.selectedTrack;
        const region = this.clipboard;

        const newRegion = new Region();
        newRegion.data = region.data;
        newRegion.start = region.end;
        newRegion.end = region.end + region.duration;
        newRegion.totalDuration = region.totalDuration;

        console.log("Paste!");
        
        track.regions.push(newRegion);
    }

    DeleteRegion(ctx: Context) {
        if (this.selectedRegion === null) return;

        // Soft delete the region
        this.selectedRegion.deleted = true;

        console.log("Deleted!");
    }

    ResetSelection(ctx: Context) {
        this.selectedRegion = null;
    }
}

export {
    PlayerInput
}