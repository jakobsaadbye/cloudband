import { audioContext, Context } from "@core/context.ts";
import { off } from "node:process";

type TrackKind = 'audio' | 'midi'

class Track {
    kind: TrackKind
    
    volumer: GainNode
    panner: StereoPannerNode
    analyser: AnalyserNode
    frequencyData: Float32Array | null

    file: File
    isLoaded: boolean
    
    regions: Region[]

    constructor(kind: TrackKind, file: File) {
        this.kind = kind;

        this.volumer = new GainNode(audioContext, { gain: 0.5 });
        this.panner = new StereoPannerNode(audioContext, { pan: 0.0 });

        const result = this.initAnalyser();
        this.analyser = result.analyser;
        this.frequencyData = null;

        this.file = file;
        this.isLoaded = false;

        this.regions = [new Region()];
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

    get pan() {
        return this.panner.pan.value;
    }

    Play(ctx: Context) {
        if (!this.isLoaded) {
            console.warn(`Track ${this.file.name} has not yet been loaded`);
            return;
        }

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
        ctx.S({...ctx});
    }

    SetPan(ctx: Context, value: number) {
        this.panner.pan.value = value;
        ctx.S({...ctx});
    }
}

const RF = { // Region_Flags
    none    : 0,
    hovered : 1,
    hoveredEnds : 2,
    shifting : 4,
    croppingLeft  : 8,
    croppingRight : 16,
    selected : 32,

    held : 4 | 8 | 16,
}

class Region {
    data: AudioBuffer | null
    source: AudioBufferSourceNode | null;

    offsetStart: number // Tells how much is cut from the start
    offsetEnd: number
    start: number // Number of seconds after the track begins to play
    end: number
    totalDuration: number
    started: boolean

    x : number
    y : number
    width : number
    height : number

    dragX : number
    dragY : number

    originalOffsetStart: number
    originalStart: number
    originalEnd: number
    
    flags : number // of Region_Flags
    deleted: boolean

    constructor() {
        this.data = null;
        this.source = null;
        
        this.offsetStart = 0;
        this.offsetEnd = 0;
        this.start = 0.0;
        this.end = 0.0;
        this.totalDuration = 0.0;
        this.started = true;

        // Ui stuff
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.dragX = 0;
        this.dragY = 0;
        this.originalOffsetStart = 0;
        this.originalStart = 0;
        this.originalEnd = 0;

        this.flags = RF.none;
        this.deleted = false;
    }

    get duration() {
        return (this.end - this.offsetEnd) - this.start;
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

class TrackList {
    selectedIndex: number
    tracks: Track[]

    constructor() {
        this.selectedIndex = 0;
        this.tracks = [];
    }

    async LoadTrack(ctx: Context, track: Track) {
        const arrayBuffer = await track.file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // The audio buffer within each region is shared
        for (const region of track.regions) {
            region.data = audioBuffer;

            region.start = 0.0;
            region.end = audioBuffer.duration;
            region.totalDuration = audioBuffer.duration;
        }

        //
        // Load in the frequency data to be visualized
        //
        const rawData = audioBuffer.getChannelData(0);
        const samples = 8000;
        const blockSize = Math.floor(rawData.length / samples);

        const reducedRawData = new Float32Array(samples).fill(0);
        for (let i = 0; i < samples; i++) {
            const blockStart = i * blockSize;
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(rawData[blockStart + j]);
            }
            const avg = sum / blockSize;
            reducedRawData[i] = avg;
        }

        // Normalize all the values
        let maxValue = -Infinity;
        for (let i = 0; i < reducedRawData.length; i++) {
            if (reducedRawData[i] > maxValue) {
                maxValue = reducedRawData[i];
            }
        }
        const normal = (1.0 / maxValue);
        for (let i = 0; i < reducedRawData.length; i++) {
            reducedRawData[i] = reducedRawData[i] * normal;
        }
        track.frequencyData = reducedRawData;
        //////
        
        track.isLoaded = true;

        this.tracks.push(track);

        ctx.S({...ctx});
    }
}

export {
    Track,
    TrackList,
    Region,
    RF,
}