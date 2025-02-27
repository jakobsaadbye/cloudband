import { Note } from "@core/note.ts";
import { Context, audioContext } from "./context.ts";
import { wavetable } from "@core/wavetable.ts";

class Player {
    volumer: GainNode;
    panner: StereoPannerNode;
    attackTime: number;
    releaseTime: number;
    pulseHz: number;
    lfoHz: number;
    noiceHz: number;
    noiceDuration: number;

    tempo: number;
    currentNote: number;
    nextNoteTime: number;
    noteQueue: Note[];
    timerID: number;

    lookahead: number
    scheduleAheadTime: number

    isPlaying: boolean;


    #wave = new PeriodicWave(audioContext, {
        real: wavetable.real,
        imag: wavetable.imag
    });

    constructor() {
        this.volumer = new GainNode(audioContext);
        this.panner = new StereoPannerNode(audioContext, { pan : 0 });

        this.attackTime = 0.2;
        this.releaseTime = 0.5;
        this.pulseHz = 440;
        this.lfoHz = 30;
        this.noiceHz = 1000;
        this.noiceDuration = 1;

        this.tempo = 60;
        this.currentNote = 0;
        this.nextNoteTime = 0.0;
        this.noteQueue = [];
        this.timerID = 0;

        this.lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
        this.scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

        this.isPlaying = false;
    }

    get beat() {
        return this.currentNote;
    }
    
    get volume() {
        return this.volumer.gain.value;
    }
    
    get pan() {
        return this.panner.pan.value;
    }
    
    SetVolume(ctx: Context, value: number) {
        this.volumer.gain.value = value;
        ctx.S({...ctx});
    }

    SetPan(ctx: Context, value: number) {
        this.panner.pan.value = value;
        ctx.S({...ctx});
    }

    SetTempo(ctx: Context, value: number) {
        this.tempo = value;
        ctx.S({...ctx});
    }
    
    SetAttackTime(ctx: Context, value: number) {
        this.attackTime = value;
        ctx.S({...ctx});
    }

    SetReleaseTime(ctx: Context, value: number) {
        this.releaseTime = value;
        ctx.S({...ctx});
    }

    SetLfoHz(ctx: Context, value: number) {
        this.lfoHz = value;
        ctx.S({...ctx});
    }

    SetPulseHz(ctx: Context, value: number) {
        this.pulseHz = value;
        ctx.S({...ctx});
    }

    SetNoiceDuration(ctx: Context, value: number) {
        this.noiceDuration = value;
        ctx.S({...ctx});
    }

    SetNoiceHz(ctx: Context, value: number) {
        this.noiceHz = value;
        ctx.S({...ctx});
    }

    SetIsPlaying(ctx: Context, value: boolean) {
        this.isPlaying = value;
        ctx.S({...ctx});
    }
    
    SetCurrentNote(ctx: Context, value: number) {
        this.currentNote = value;
        ctx.S({...ctx});
    }

    BeginPlay(ctx: Context) {
        this.SetIsPlaying(ctx, true);

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        this.SetCurrentNote(ctx, 0);
        this.nextNoteTime = audioContext.currentTime;
        this.scheduler(ctx); // kick off scheduling
    }

    StopPlay(ctx: Context) {
        this.SetIsPlaying(ctx, false);
        clearTimeout(this.timerID);
    }

    playSweep(time: number) {
        const sweepLength = 2.0;

        const osc = new OscillatorNode(audioContext, {
            frequency: 380,
            type: "custom",
            periodicWave: this.#wave,
        });
    
        const sweepEnv = new GainNode(audioContext);
        sweepEnv.gain.cancelScheduledValues(time);
        sweepEnv.gain.setValueAtTime(0, time);
        sweepEnv.gain.linearRampToValueAtTime(1, time + this.attackTime);
        sweepEnv.gain.linearRampToValueAtTime(0, time + sweepLength - this.releaseTime);
    
        osc.connect(sweepEnv).connect(audioContext.destination);
        osc.start(time);
        osc.stop(time + sweepLength);
    }
    
    playPulse(time: number) {
        const pulseTime = 0.3;

        const osc = new OscillatorNode(audioContext, {
            type: "sine",
            frequency: this.pulseHz,
        });
    
        const amp = new GainNode(audioContext);
        amp.gain.value = 1;
    
        const lfo = new OscillatorNode(audioContext, {
            type: "square",
            frequency: this.lfoHz,
        });
    
        lfo.connect(amp.gain);
        osc.connect(amp).connect(audioContext.destination);
        lfo.start();
        // osc.connect(audioContext.destination);
        osc.start(time);
        osc.stop(time + pulseTime);
    }
    
    playNoise(time: number) {
        const bufferSize = audioContext.sampleRate * this.noiceDuration;
        // Create an empty buffer
        const noiseBuffer = new AudioBuffer({
            length: bufferSize,
            sampleRate: audioContext.sampleRate,
        });
    
        // Fill the buffer with noise
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    
        // Create a buffer source for our created data
        const noise = new AudioBufferSourceNode(audioContext, {
            buffer: noiseBuffer,
        });
    
        // Filter the output
        const bandpass = new BiquadFilterNode(audioContext, {
            type: "lowpass",
            frequency: this.noiceHz,
        });
    
        noise.connect(bandpass).connect(audioContext.destination);
        noise.start(time);
    }

    //
    // Scheduling functions
    //
    nextNote(ctx: Context) {
        const secondsPerBeat = 60.0 / this.tempo;
    
        this.nextNoteTime += secondsPerBeat; // Add beat length to last beat time
    
        // Advance the beat number, wrap to zero when reaching 4
        this.SetCurrentNote(ctx, (this.currentNote + 1) % 4);
    }
    
    scheduleNote(beatNumber: number, time: number) {
        // Push the note on the queue, even if we're not playing.
        this.noteQueue.push({ note: beatNumber, time });
    
        // playSweep(time);
        // playPulse(time);
        this.playNoise(time);
    }
    
    scheduler(ctx: Context) {
        // While there are notes that will need to play before the next interval,
        // schedule them and advance the pointer.
        while (this.nextNoteTime < audioContext.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentNote, this.nextNoteTime);
            this.nextNote(ctx);
        }
        this.timerID = setTimeout(() => this.scheduler.bind(this)(ctx), this.lookahead);
    }
}

export {
    Player
}