export class AudioDataCache {
    cache = new Map<string, AudioBuffer>();

    get(trackId: string) {
        return this.cache.get(trackId);
    }

    set(trackId: string, audioData: AudioBuffer) {
        this.cache.set(trackId, audioData);
    }
}