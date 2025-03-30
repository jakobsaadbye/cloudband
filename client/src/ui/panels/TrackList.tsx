// @deno-types="npm:@types/react@19"
import { useEffect, useState } from "react";

import { audioElement, useCtx } from "@core/context.ts";
import { Track } from "@core/track.ts";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { twMerge } from "tailwind-merge";
import { SaveEntireWorkspace } from "@/db/save.ts";
import { useDB } from "@jakobsaadbye/teilen-sql/react";

export const TrackList = () => {

    const ctx = useCtx();
    const db = useDB();

    const project = ctx.project;
    const trackList = ctx.trackList;
    const tracks = ctx.trackList.tracks;

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
        await trackList.LoadTrack(ctx, track, false);

        const err = await ctx.fileManager.UploadFile(ctx.project.id, "tracks", file);
        if (err) {
            console.warn(`Failed to upload file to server`, err);
        } else {
            track.isUploaded = true;
            console.log(`Uploaded file '${file.name}'`);
        }
        await SaveEntireWorkspace(db, ctx);
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
        <div className={twMerge("min-w-[300px] flex flex-col h-full border-2 border-black/40", fileBeingDropped && "border-2 border-blue-500")} onDrop={handleDrop} onDragOver={handleDragOver}>
            <div className="flex items-center h-[38px] w-full p-2 bg-black/40">
                <p className="px-6 py-0.5 flex justify-center text-center w-8 rounded-lg font-semibold select-none bg-blue-500 text-gray-100 hover:bg-blue-600" onClick={openFilePicker}>+</p>
            </div>
            <div className="flex flex-col">
                {tracks.map((track: Track, i) => {
                    if (track.deleted) return <div key={i}></div>;

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
    const input = ctx.player.input;

    const { VolumeUp } = useIcons();

    const isSelected = input.selectedTrack?.id === track.id;

    return (
        <div className={twMerge("flex items-center justify-between w-full h-[98px] p-2 bg-gray-200 border-b-1 border-gray-400", isSelected && "bg-gray-300")} onMouseDown={() => input.SelectTrack(ctx, track)}>
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
