import { Region, Track } from "@core/track.ts";
import { audioContext, Context } from "@core/context.ts";

export class TrackManager {
    selectedIndex: number
    tracks: Track[]

    constructor() {
        this.selectedIndex = 0;
        this.tracks = [];
    }

    SoloTrack(ctx: Context, track: Track) {
        track.soloed = !track.soloed;
        
        if (track.soloed) {
            track.muted = false;
            track.mutedBySolo = false;

            for (const other of this.tracks) {
                if (other === track) continue;
                if (other.soloed) continue;
                other.mutedBySolo = true;
            }
        } else {
            if (this.otherTracksSoloed(track)) {
                track.mutedBySolo = true;
            } else {
                for (const other of this.tracks) {
                    other.mutedBySolo = false;
                }
            }
        }
        ctx.S({ ...ctx });
    }

    MuteTrack(ctx: Context, track: Track) {
        if (track.soloed) {
            track.soloed = false;
            track.muted = true;
            
            if (this.otherTracksSoloed(track)) {
                track.mutedBySolo = true;
            } else {
                for (const other of this.tracks) {
                    other.mutedBySolo = false;
                }
            }
            
        } else {
            track.muted = !track.muted;
        }
        ctx.S({ ...ctx });
    }

    otherTracksSoloed(me: Track) {
        for (const other of this.tracks) {
            if (other === me) continue;
            if (other.soloed) {
                return true;
            }
        }
        return false;
    }

    GetRegionWithId(id: string) {
        for (const track of this.tracks) {
            for (const region of track.regions) {
                if (region.id === id) return region;
            }
        }
    }

    GetTrackWithId(id: string) {
        for (const track of this.tracks) {
            if (track.id === id) return track;
        }
    }

    async LoadTrack(ctx: Context, track: Track, performingReload: boolean) {
        const fileContent = await track.file.arrayBuffer();

        // Save the audio file to disk
        if (!performingReload) {
            await ctx.fileManager.WriteLocalFile(ctx.project.id, "tracks", track.file.name, fileContent);
        }

        let audioBuffer = ctx.cache.getAudioData(track.id);
        if (!audioBuffer) {
            audioBuffer = await audioContext.decodeAudioData(fileContent);
            ctx.cache.setAudioData(track.id, audioBuffer);
        }

        // Make the first region
        if (!performingReload) {
            const region = new Region(track.id, ctx.project.id);
            region.data = audioBuffer;
            region.start = 0.0;
            region.end = audioBuffer.duration;
            region.totalDuration = audioBuffer.duration;
            track.regions.push(region);
        }

        track.audioData = audioBuffer;

        // Load in the frequency data to be visualized
        track.frequencyData = this.loadFrequencyData(ctx, track.id, audioBuffer);

        track.isLoaded = true;

        this.tracks.push(track);

        if (!performingReload) {
            ctx.S({ ...ctx });
        }
    }

    loadFrequencyData(ctx: Context, trackId: string, audioBuffer: AudioBuffer) {
        const cached = ctx.cache.getFrequencyData(trackId);
        if (cached) {
            return cached;
        }

        const rawData = audioBuffer.getChannelData(0);
        const samples = rawData.length / 500;
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

        ctx.cache.setFrequencyData(trackId, reducedRawData);

        return reducedRawData;
    }
}