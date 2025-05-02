import { audioContext, Context } from "./context.ts";
import { Entity } from "@core/entity.ts";
import { generateId } from "./id.ts";
import { RegionRow } from "@/db/types.ts";

type TrackKind = 'audio' | 'midi'

class Track implements Entity {
    table = "tracks";
    replicated = true;
    static serializedFields = [
        "id",
        "projectId",
        "volume",
        "pan",
        "kind",
        "filename",
        "isUploaded",
        "deleted",
        "muted",
        "mutedBySolo",
        "soloed",
    ] as const;

    id: string
    projectId: string
    kind: TrackKind

    volumer: GainNode
    panner: StereoPannerNode
    analyser: AnalyserNode
    frequencyData: Float32Array | null

    filename: string
    file: File
    audioData: AudioBuffer | null
    isLoaded: boolean
    isUploaded: boolean

    regions: Region[]
    conflictingSections: Region[][]

    deleted: boolean
    muted: boolean
    mutedBySolo: boolean
    soloed: boolean

    constructor(kind: TrackKind, file: File, projectId: string) {
        this.id = generateId();
        this.projectId = projectId;
        this.kind = kind;

        this.volumer = new GainNode(audioContext, { gain: 0.5 });
        this.panner = new StereoPannerNode(audioContext, { pan: 0.0 });

        const result = this.initAnalyser();
        this.analyser = result.analyser;
        this.frequencyData = null;

        this.filename = file.name;
        this.file = file;
        this.audioData = null;
        this.isLoaded = false;
        this.isUploaded = false;

        this.regions = [];

        this.conflictingSections = [];

        this.deleted = false;
        this.muted = false;
        this.mutedBySolo = false;
        this.soloed = false;
    }

    initAnalyser() {
        const analyser = new AnalyserNode(audioContext);
        analyser.fftSize = 2048;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.85;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        return { analyser, dataArray };
    }

    get volume() {
        return this.volumer.gain.value;
    }

    set volume(value: number) {
        this.volumer.gain.value = value;
    }

    get pan() {
        return this.panner.pan.value;
    }

    set pan(value: number) {
        this.panner.pan.value = value;
    }

    Play(ctx: Context) {
        if (!this.isLoaded) {
            console.warn(`Track has not yet been loaded`);
            return;
        }
        if (this.deleted) return;
        if (this.muted || this.mutedBySolo) return;

        for (const region of this.regions) {
            region.Play(ctx, this);
        }
    }

    Pause(ctx: Context) {
        for (const region of this.regions) {
            region.Pause(ctx);
        }
    }

    SetVolume(ctx: Context, value: number) {
        this.volumer.gain.value = value;
        ctx.S({ ...ctx });
    }

    SetPan(ctx: Context, value: number) {
        this.panner.pan.value = value;
        ctx.S({ ...ctx });
    }

    RemoveConflictingSection(toRemove: Region[]) {
        if (toRemove.length === 0) return;
        const first = toRemove[0];
        this.conflictingSections = this.conflictingSections.filter(section => {
            if (section.find(region => region.id === first.id)) return false;
            return true;
        })
    }
}

const RF = { // Region_Flags
    none: 0,
    hovered: 1,
    hoveredEnds: 2,
    shifting: 4,
    croppingLeft: 8,
    croppingRight: 16,

    held: 4 | 8 | 16,
}

export type Rectangle = { 
    x: number, 
    y: number, 
    width: number, 
    height: number 
}

class Region implements Entity {
    table = "regions";
    replicated = true;
    static serializedFields = [
        "id",
        "projectId",
        "trackId",
        "offsetStart",
        "offsetEnd",
        "start",
        "end",
        "totalDuration",
        "deleted",
    ] as const;

    id: string
    projectId: string
    trackId: string
    data: AudioBuffer | null
    source: AudioBufferSourceNode | null;

    offsetStart: number // Number of seconds cut from the left
    offsetEnd: number
    start: number // When the region begins to play
    end: number
    totalDuration: number

    flags: number // of Region_Flags
    deleted: boolean

    acceptHitbox: Rectangle
    declineHitbox: Rectangle
    acceptHovered: boolean
    declineHovered: boolean

    x: number
    y: number
    width: number
    height: number
    dragX: number
    dragY: number
    originalOffsetStart: number
    originalOffsetEnd: number
    originalStart: number
    originalEnd: number

    constructor(trackId: string, projectId: string) {
        this.id = generateId();
        this.trackId = trackId;
        this.projectId = projectId;
        this.data = null;
        this.source = null;

        this.offsetStart = 0;
        this.offsetEnd = 0;
        this.start = 0.0;
        this.end = 0.0;
        this.totalDuration = 0.0;

        this.flags = RF.none;
        this.deleted = false;

        this.acceptHitbox = { x: 0, y: 0, width: 0, height: 0 };
        this.declineHitbox = { x: 0, y: 0, width: 0, height: 0 };
        this.acceptHovered = false;
        this.declineHovered = false;

        // Ui stuff
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.dragX = 0;
        this.dragY = 0;
        this.originalOffsetStart = 0;
        this.originalOffsetEnd = 0;
        this.originalStart = 0;
        this.originalEnd = 0;
    }

    get duration() {
        return this.end - this.start;
    }

    Play(ctx: Context, track: Track) {
        if (this.deleted) return;

        const source = new AudioBufferSourceNode(audioContext, {
            buffer: this.data,
            playbackRate: 1.0
        });

        // Wire up the region to the track and to the rest of the pipeline
        source.connect(track.volumer).connect(track.panner).connect(ctx.player.volumer).connect(track.analyser).connect(audioContext.destination);

        // Calculate when, offset and the duration the region should be playing 
        const elapsedTime = ctx.player.elapsedTime;
        const currentTime = audioContext.currentTime;

        let offset = elapsedTime - this.start // + this.offsetStart;
        if (offset < 0) offset = 0;
        offset += this.offsetStart;

        let when = currentTime + this.start - elapsedTime;
        if (when < 0) when = 0;

        let duration = this.duration;
        if (elapsedTime > this.start) {
            duration = this.end - elapsedTime;
        }
        if (duration > this.totalDuration) {
            duration = this.totalDuration;
        }
        if (duration < 0) duration = 0;

        source.start(when, offset, duration);

        this.source = source;
    }

    Pause(ctx: Context) {
        if (!this.source) {
            return;
        }

        this.source!.stop();
    }

    Is(flag: number) {
        return this.flags & flag;
    }

    Unset(flag: number) {
        this.flags = this.flags & (~flag);
    }
}

export {
    Track,
    Region,
    RF,
};

export type {
    TrackKind
};
