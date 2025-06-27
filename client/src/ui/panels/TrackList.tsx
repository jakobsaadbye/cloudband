// @deno-types="npm:@types/react@19"
import { useEffect, useState } from "react";

import { audioElement, useCtx } from "@core/context.ts";
import { Track } from "@core/track.ts";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { twMerge } from "tailwind-merge";
import { SaveEntireProject, SaveEntities } from "@/db/save.ts";
import { useDB } from "@jakobsaadbye/teilen-sql/react";

export const TrackList = () => {

    const ctx = useCtx();
    const db = useDB();

    const trackManager = ctx.trackManager;
    const tracks = ctx.trackManager.tracks.toSorted((a, b) => a.createdAt - b.createdAt);

    const [fileBeingDropped, setFileBeingDropped] = useState(false);

    const openFilePicker = () => {
        if (!audioElement) {
            console.error("Couldn't find audio player element");
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = "audio/mpeg, audio/mp3, audio/ogg, audio/wav"
        input.click();
        input.onchange = async () => {
            const files = input.files;
            if (!files) return;

            for (const file of files) {
                LoadTrackFromFile(file);
            }
        }
    }

    const LoadTrackFromFile = async (file: File) => {
        const track = new Track("audio", file, ctx.project.id);
        await trackManager.LoadTrack(ctx, track, false);

        const err = await ctx.fileManager.UploadFile(ctx.project.id, "tracks", file);
        if (err) {
            console.warn(`Failed to upload file to server`, err);
        } else {
            track.isUploaded = true;
            console.log(`Uploaded file '${file.name}'`);
        }
        await SaveEntireProject(ctx);
    }

    const handleDrop = (ev: Event) => {
        ev.preventDefault();

        const files = [] as File[];
        const dataTransfer = ev.dataTransfer;
        if (dataTransfer.items) {
            // Use DataTransferItemList interface to access the file(s)
            [...dataTransfer.items].forEach((item, i) => {
                // If dropped items aren't files, reject them
                if (item.kind === "file") {
                    const file = item.getAsFile();
                    files.push(file);
                }
            });
        } else {
            // Use DataTransfer interface to access the file(s)
            [...dataTransfer.files].forEach((file, i) => {
                files.push(file);
            });
        }

        for (const file of files) {
            LoadTrackFromFile(file);
        }
    }

    const handleDragOver = (ev: Event) => {
        // setFileBeingDropped(true);
        ev.preventDefault();
    }

    return (
        <div className={twMerge("min-w-[300px] flex flex-col h-full border-1 border-gray-400", fileBeingDropped && "border-2 border-blue-500")} onDrop={handleDrop} onDragOver={handleDragOver}>
            <div className="flex items-center h-[38px] w-full p-2 bg-black/40">
                <p className="px-6 py-0.5 flex justify-center text-center w-8 rounded-lg font-semibold select-none bg-blue-500 text-gray-100 hover:bg-blue-600" onClick={openFilePicker}>+</p>
            </div>
            <div className="flex flex-col">
                {tracks.map((track: Track, i) => {
                    if (track.deleted) return;
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

    const trackManager = ctx.trackManager;
    const input = ctx.input;

    const { VolumeUp, VolumeOff, Headset } = useIcons();

    const isSelected = input.selectedTrack?.id === track.id;

    const toggleSolo = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        trackManager.SoloTrack(ctx, track);
        await SaveEntities(ctx, trackManager.tracks);
    }

    const toggleMute = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        trackManager.MuteTrack(ctx, track);
        await SaveEntities(ctx, trackManager.tracks);
    }

    return (
        <>
            <div className={twMerge("flex items-center w-full h-[98px] p-2 bg-gray-200 border-b-1 border-gray-400", isSelected && "bg-gray-300")} onMouseDown={() => input.SelectTrack(ctx, track)}>
                <p className="text-sm select-none w-1/3">{track.file.name}</p>
                <div className="flex gap-x-0 items-center">
                    <div className={twMerge("p-1 rounded-sm", track.soloed && "bg-amber-500")} title="Solo this track" onMouseDown={toggleSolo}>
                        <Headset className={twMerge("w-4.5 h-4.5 fill-gray-700", track.soloed && "fill-gray-50")} />
                    </div>
                    <div className={twMerge("p-1 rounded-sm flex gap-x-1", (track.muted || track.mutedBySolo) && "bg-gray-500")} title="Mute/Unmute this track" onMouseDown={toggleMute}>
                        {(!track.muted && !track.mutedBySolo) && <VolumeUp className={twMerge("w-5 h-5 fill-gray-700")} />}
                        {(track.muted || track.mutedBySolo) && <VolumeOff className={twMerge("w-5 h-5 fill-gray-50")} />}
                    </div>
                    <div className="ml-2 flex gap-x-4">
                        <div className=" flex flex-col items-end">
                            <input style={{ writingMode: 'vertical-lr', direction: 'rtl' }} className="h-16 accent-cyan-700" list="volume-steplist" title="Volume" type="range" min={0} max={1.0} step={0.01} value={track.volume} onChange={e => track.SetVolume(ctx, +e.target.value)} />
                            <datalist id="volume-steplist">
                                <option>0.0</option>
                                <option>0.25</option>
                                <option>0.50</option>
                                <option>0.75</option>
                                <option>1.0</option>
                            </datalist>
                            <p className="text-xs text-center">Vol</p>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                            <input title="Pan" className="w-16 accent-cyan-700" list="pan-steplist" type="range" min={-1.0} max={1.0} step={0.01} value={track.pan} onChange={e => track.SetPan(ctx, +e.target.value)} />
                            <datalist id="pan-steplist">
                                <option>-1</option>
                                <option>0</option>
                                <option>1</option>
                            </datalist>
                            <p className="text-xs text-center">Pan</p>
                        </div>
                    </div>
                </div>
            </div>
            {track.regions.filter(x => x.conflicts).length > 0 && (
                <div className="h-[98px] w-full bg-yellow-200 border-b-1 border-gray-400"></div>
            )}
        </>
    )
}