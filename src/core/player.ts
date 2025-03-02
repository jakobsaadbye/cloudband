import { Note } from "@core/note.ts";
import { Context, audioContext } from "@core/context.ts";
import { wavetable } from "@core/wavetable.ts";
import { TrackList } from "@core/track.ts";


class Player {
    trackList: TrackList

    volumer: GainNode;
    panner: StereoPannerNode;
    attackTime: number;
    releaseTime: number;
    pulseHz: number;
    lfoHz: number;
    noiceHz: number;
    noiceDuration: number;

    tempo: number;
    bar: number;
    beat: number;
    nextNoteTime: number;
    timerID: number;

    lookahead: number
    scheduleAheadTime: number

    startedAt: number
    pausedAt: number
    elapsedTime: number // Specifies where we are on the timeline

    sweepEnabled: boolean
    pulseEnabled: boolean
    noiceEnabled: boolean

    isPlaying: boolean;

    #wave = new PeriodicWave(audioContext, {
        real: wavetable.real,
        imag: wavetable.imag
    });

    constructor(trackList: TrackList) {
        this.trackList = trackList;

        this.volumer = new GainNode(audioContext);
        this.panner = new StereoPannerNode(audioContext, { pan : 0 });

        this.attackTime = 0.0;
        this.releaseTime = 0.5;
        this.pulseHz = 440;
        this.lfoHz = 30;
        this.noiceHz = 1000;
        this.noiceDuration = 1;

        this.tempo = 100;
        this.bar = 1;
        this.beat = 1;
        this.nextNoteTime = 0.0;
        this.timerID = 0;

        this.lookahead = 16.67; // How frequently to call scheduling function (in milliseconds)

        this.startedAt = 0;
        this.pausedAt = 0;
        this.elapsedTime = 0;

        this.sweepEnabled = false;
        this.pulseEnabled = false;
        this.noiceEnabled = false;

        this.isPlaying = false;
    }
    
    get volume() {
        return this.volumer.gain.value;
    }
    
    get pan() {
        return this.panner.pan.value;
    }

    /**
     * Returns the amount of elapsed time
     * @Note - the property 'elapsedTime' only gets the last delta between pausedAt - startedAt updated when pausing.
     * This function is continious as it uses the current time of the audioContext
     */
    GetCurrentTime() {
        let currentTime = this.elapsedTime + audioContext.currentTime - this.startedAt;
        if (this.isPlaying === false) {
          currentTime = this.elapsedTime;
        }
        return currentTime;
    }
    
    // @Cleanup - All this setter shenanigan we could probably find a cleaner way for
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
        this.beat = value;
        ctx.S({...ctx});
    }

    SetSweepEnabled(ctx: Context, value: boolean) {
        this.sweepEnabled = value;
        ctx.S({...ctx});
    }

    SetPulseEnabled(ctx: Context, value: boolean) {
        this.pulseEnabled = value;
        ctx.S({...ctx});
    }

    SetNoiceEnabled(ctx: Context, value: boolean) {
        this.noiceEnabled = value;
        ctx.S({...ctx});
    }
    
    SetElapsedTime(ctx: Context, value: number) {
        this.elapsedTime = value;
        ctx.S({...ctx});
    }

    SetBar(ctx: Context, value: number) {
        this.bar = value;
        ctx.S({...ctx});
    }

    BeginPlay(ctx: Context) {
        this.SetIsPlaying(ctx, true);
        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        this.startedAt = audioContext.currentTime;

        this.recalibrateBarAndBeat(ctx);

        for (const track of this.trackList.tracks) {
            const offset = this.elapsedTime;
            let when = 2 - this.elapsedTime;
            if (when < 0) when = 0;

            track.Play(ctx, when, offset);
        }

        // We wait to play the next note untill the next beat so that we stay in sync
        const t = this.elapsedTime;
        const bps = 60.0 / this.tempo;
        const timeTillNextBeat = bps - t % bps;

        this.nextNoteTime = audioContext.currentTime + timeTillNextBeat;
        this.scheduler(ctx);
    }

    PausePlay(ctx: Context) {
        this.SetIsPlaying(ctx, false);

        this.pausedAt = audioContext.currentTime;
        this.elapsedTime += this.pausedAt - this.startedAt;

        for (const track of this.trackList.tracks) {
            track.Pause(ctx);
        }

        clearTimeout(this.timerID);
    }

    ResetPlay(ctx: Context) {
        this.startedAt = audioContext.currentTime;
        this.elapsedTime = 0;
        this.bar = 1;
        this.beat = 1;
        this.PausePlay(ctx);
        ctx.S({...ctx});
    }

    recalibrateBarAndBeat(ctx: Context) {
        const secondsPerBeat = 60.0 / this.tempo;
        const secondsPerBar = 240.0 / this.tempo;

        const t = this.GetCurrentTime();

        this.bar  = 1 + Math.floor(t / secondsPerBar);
        this.beat = 1 + (Math.floor(t / secondsPerBeat) % 4);

        ctx.S({...ctx})
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
    ////
    nextNote(ctx: Context) {
        const secondsPerBeat = 60.0 / this.tempo;
    
        this.nextNoteTime += secondsPerBeat;
    
        if ((this.beat + 1) % 5 === 0) {
            this.beat = 1;
            this.bar += 1;
        } else {
            this.beat += 1;
        }

        ctx.S({...ctx});
    }
    
    scheduleNote(ctx: Context, time: number) {
        if (this.sweepEnabled) this.playSweep(time);
        if (this.pulseEnabled) this.playPulse(time);
        if (this.noiceEnabled) this.playNoise(time);
    }
    
    scheduler(ctx: Context) {
        while (this.nextNoteTime < audioContext.currentTime) {
            this.scheduleNote(ctx, this.nextNoteTime);
            this.nextNote(ctx);
        }
        this.timerID = setTimeout(() => this.scheduler.bind(this)(ctx), this.lookahead);
    }
}

export {
    Player
}