export class Cache {
    audioData = new Map<string, AudioBuffer>();
    frequencyData = new Map<string, Float32Array>();

    getAudioData(trackId: string) {
        return this.audioData.get(trackId);
    }

    setAudioData(trackId: string, audioData: AudioBuffer) {
        this.audioData.set(trackId, audioData);
    }
    
    getFrequencyData(trackId: string) {
        return this.frequencyData.get(trackId);
    }

    setFrequencyData(trackId: string, frequencyData: Float32Array) {
        this.frequencyData.set(trackId, frequencyData);
    }
}