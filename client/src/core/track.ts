import { audioContext, Context } from "./context.ts";
import { generateId } from "./id.ts";

type TrackKind = 'audio' | 'midi'

class Track {
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

    regions: Region[]

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

        this.regions = [];
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
            console.warn(`Track has not yet been loaded`);
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
        ctx.S({ ...ctx });
    }

    SetPan(ctx: Context, value: number) {
        this.panner.pan.value = value;
        ctx.S({ ...ctx });
    }
}

const RF = { // Region_Flags
    none: 0,
    hovered: 1,
    hoveredEnds: 2,
    shifting: 4,
    croppingLeft: 8,
    croppingRight: 16,
    selected: 32,

    held: 4 | 8 | 16,
}

class Region {
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

class TrackList {
    selectedIndex: number
    tracks: Track[]

    constructor() {
        this.selectedIndex = 0;
        this.tracks = [];
    }

    async LoadTrack(ctx: Context, track: Track, loadingFromFile: boolean) {

        const fileContent = await track.file.arrayBuffer();

        // Save the audio file to opfs under '/projects/{project-name}/tracks/{filename}'
        if (!loadingFromFile) {
            const opfsRoot = await navigator.storage.getDirectory();
            
            const projectsFolder = await opfsRoot.getDirectoryHandle("projects", { create: true });
            const thisProjectFolder = await projectsFolder.getDirectoryHandle(ctx.project.name, { create: true });
            const tracksFolder = await thisProjectFolder.getDirectoryHandle("tracks", { create: true });
    
            const fileHandle = await tracksFolder.getFileHandle(`${track.file.name}`, { create: true });
            const fileWriter = await fileHandle.createWritable();
            await fileWriter.write(new Uint8Array(fileContent));
            await fileWriter.close();
        }

        console.log(`Load Track called!`);
        
        const audioBuffer = await audioContext.decodeAudioData(fileContent);

        // Make the first region
        if (!loadingFromFile) {
            const region = new Region(track.id, ctx.project.id);
            region.data = audioBuffer;
            region.start = 0.0;
            region.end = audioBuffer.duration;
            region.totalDuration = audioBuffer.duration;
            track.regions.push(region);
        }

        track.audioData = audioBuffer;

        // Load in the frequency data to be visualized
        track.frequencyData = this.loadReducedFrequencyData(audioBuffer);

        track.isLoaded = true;

        this.tracks.push(track);

        if (!loadingFromFile) {
            ctx.S({ ...ctx });
        }
    }

    loadReducedFrequencyData(audioBuffer: AudioBuffer) {
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

        return reducedRawData;
    }
}

class Project {
    id: string
    name: string

    constructor() {
        this.id = generateId();
        this.name = "unnamed";
    }
}

export {
  Track,
  TrackList, 
  Region,
  RF,
  Project
};
export type { 
    TrackKind 
};
