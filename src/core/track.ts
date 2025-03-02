import { audioContext, Context } from "@core/context.ts";

type TrackKind = 'line' | 'midi'

class Track {
    kind: TrackKind
    file: File

    volumer: GainNode
    panner: StereoPannerNode

    started: boolean

    source: AudioBufferSourceNode | null
    data: AudioBuffer | null
    isLoaded: boolean

    constructor(kind: TrackKind, file: File) {
        this.kind = kind;
        this.file = file;
        this.volumer = new GainNode(audioContext, { gain: 0.5 });
        this.panner = new StereoPannerNode(audioContext, { pan: 0.0 });

        this.started = true;

        this.source = null;
        this.data = null;
        this.isLoaded = false;
    }

    Play(ctx: Context, when: number, offset: number) {
        if (!this.isLoaded) {
            console.warn(`Track ${this.file.name} has not yet been loaded`);
            return;
        }

        this.started = true

        const source = new AudioBufferSourceNode(audioContext, {
            buffer: this.data,
            playbackRate: 1.0
        });

        // Wire up the track to the rest of the pipeline
        source.connect(this.volumer).connect(this.panner).connect(audioContext.destination);

        source.start(when, offset);

        this.source = source;
    }

    Pause(ctx: Context) {
        if (!this.source) {
            console.warn(`Track ${this.file.name} has not been started`);
            return;
        }

        this.source!.stop();
    }
}

class TrackList {
    selectedIndex: number
    tracks: Track[];

    constructor() {
        this.selectedIndex = 0;
        this.tracks = [];
    }

    async LoadTrack(ctx: Context, track: Track) {
        this.tracks.push(track);

        const arrayBuffer = await track.file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        track.data = audioBuffer;
        track.isLoaded = true;

        ctx.S({...ctx});
    }
}

export {
    Track,
    TrackList
}