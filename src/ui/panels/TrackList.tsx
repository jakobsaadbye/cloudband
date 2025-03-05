import { audioElement, useCtx } from "../../core/context.ts";
import { Track } from "@core/track.ts";
import { useIcons } from "@ui/hooks/useIcons.tsx";

export const TrackList = () => {

    const ctx = useCtx();

    const trackList = ctx.trackList;
    const tracks    = ctx.trackList.tracks;

    const openFilePicker = () => {
        if (!audioElement) {
            console.error("Couldn't find audio player element");
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = "audio/mpeg, audio/mp3, audio/ogg"
        input.click();
        input.onchange = () => {
            const files = input.files;
            if (!files) return;

            for (const file of files) {
                const track = new Track("audio", file);

                trackList.LoadTrack(ctx, track);
            }
        }
    }

    return (
        <div className="min-w-[300px] flex flex-col h-full bg-gray-300 border-r-1 border-black/40">
            <div className="flex items-center h-[40px] w-full p-2 bg-black/40">
                <p className="px-6 py-0.5 flex justify-center text-center w-8 rounded-lg font-semibold select-none bg-blue-500 text-gray-100 hover:bg-blue-600" onClick={openFilePicker}>+</p>
            </div>
            <div className="flex flex-col">
                {tracks.map((track: Track, i) => {
                    return <TrackCard key={i} track={track} />
                })}
            </div>
        </div>
    )
}

type CardProps = {
    track: Track
}

const TrackCard = ({ track }: CardProps) => {
    const ctx = useCtx();

    const { VolumeUp } = useIcons();

    return (
        <div className="flex items-center justify-between w-full h-24 p-2 bg-gray-100 border-b-1 border-gray-400">
            <p className="text-sm select-none">{track.file.name}</p>
            <div className="flex gap-x-2">
                <div className="flex gap-x-1">
                    <VolumeUp className="w-6 h-6 fill-gray-600" />
                    <input title="Volume" className="w-16" type="range" min={0} max={1.0} step={0.01} value={track.volume} onChange={e => track.SetVolume(ctx, +e.target.value)} />
                </div>
                <div className="flex gap-x-1 items-center">
                    <p className="text-sm text-center">LR</p>
                    <input title="Pan" className="w-16" type="range" min={-1.0} max={1.0} step={0.01} value={track.pan} onChange={e => track.SetPan(ctx, +e.target.value)} />
                </div>
            </div>
        </div>
    )
}
