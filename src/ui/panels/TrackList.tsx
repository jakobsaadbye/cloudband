import { audioElement, useCtx } from "../../core/context.ts";
import { Track } from "@core/track.ts";

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
                const track = new Track("line", file);

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
    return (
        <div className="w-full h-24 p-2 flex justify-center items-center bg-gray-100 border-b-1 border-gray-400">
            <p className="select-none">{track.file.name}</p>
        </div>
    )
}
