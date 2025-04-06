// @deno-types="npm:@types/react@19"
import { useEffect, useState } from "react";
import { useCtx } from "@core/context.ts";
import { useDB, useSyncer } from "@jakobsaadbye/teilen-sql/react";
import { Syncer, SyncEvent } from "@jakobsaadbye/teilen-sql";
import { ReloadProject } from "@/db/load.ts";
import { SaveEntities } from "@/db/save.ts";
import { Track } from "@core/track.ts";

export const AutoSync = () => {
    const ctx = useCtx();
    const db = useDB();
    const syncer = useSyncer();

    const project = ctx.project;

    const [showSaveMessage, setShowSaveMessage] = useState(false);
    const [spinSyncIcon, setSpinSyncIcon] = useState(false);
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        const socket = new WebSocket(`ws://127.0.0.1:3000/start_web_socket?clientId=${db.siteId}`);

        socket.onmessage = (e) => syncer.handleWebSocketMessage(socket, e);
        socket.onopen = onConnection;

        setSocket(socket);
    }, []);

    const onConnection = async (event: MessageEvent) => {
        console.log(`Connected to the server ...`);

        // Begin uploading any files that are not yet uploaded
        const nonUploadedTracks = await db.select<Track[]>(`SELECT * FROM "tracks" WHERE isUploaded = 0`, []);

        for (const track of nonUploadedTracks) {
            const file = await ctx.fileManager.GetLocalFile(track.projectId, "tracks", track.filename);
            if (!file) {
                console.warn(`Missing local file ${track.filename}`);
                continue;
            }

            const err = await ctx.fileManager.UploadFile(track.projectId, "tracks", file);
            if (err) {
                console.warn(`Failed to upload file '${track.filename}' to the server. `, err);
                continue;
            }

            track.isUploaded = true;
        }

        await SaveEntities(db, nonUploadedTracks);
    }

    useEffect(() => {
        const handleIncommingChanges = async (event: SyncEvent) => {
            const changes = event.data;
            
            // Download any newly inserted tracks
            const trackInserts = [];
            for (let i = 0; i < changes.length; i++) {
                const change = changes[i];
                if (change.type === "insert" && change.tbl_name === "tracks" && change.col_id === "id") {

                    // Scan for the filename and project id that also got inserted to get the download path
                    let filename = "";
                    let projectId = "";
                    for (let j = i; j < changes.length; j++) {
                        const c = changes[j];

                        if (c.type === "insert" && c.tbl_name === "tracks" && c.pk === change.pk) {
                            if (c.col_id === "filename") filename = c.value;
                            if (c.col_id === "projectId") projectId = c.value;
                        }
                    }

                    trackInserts.push({ projectId, filename });
                }
            }

            for (const track of trackInserts) {
                const file = await ctx.fileManager.GetOrDownloadFile(ctx.project.id, "tracks", track.filename);
                if (!file) {
                    console.error(`Failed to download file '${track.filename}'`, track.projectId);
                }
            }

            console.log(`Pulled ${changes.length} changes`);

            await ReloadProject(ctx, db, changes);
        }

        syncer.addEventListener("change", handleIncommingChanges);

        return () => {
            syncer.removeEventListener(handleIncommingChanges);
        }
    }, [ctx]);


    useEffect(() => {
        if (ctx.player.input.lastSave === 0) return;

        setShowSaveMessage(true);
        const msgId = setTimeout(() => {
            setShowSaveMessage(false);
        }, 3000);
        setSpinSyncIcon(true);
        const spinId = setTimeout(() => {
            setSpinSyncIcon(false);
        }, 500);

        // Push latest changes to the server
        syncChanges();

        return () => {
            clearTimeout(msgId);
            clearTimeout(spinId);
        }
    }, [ctx.player.input.lastSave]);

    const syncChanges = () => {
        if (!socket) return;
        syncer.pushChangesWs(socket);
    }

    return <></>;
    // (
    //     <div className="flex items-center">
    //         <div tabIndex={0} className="flex gap-x-2 p-2 bg-gray-800 hover:bg-gray-950 rounded-lg select-none" onClick={syncChanges}>
    //             <Sync className={twMerge("fill-gray-200 w-6 h-6", spinSyncIcon && "animate-spin-reverse")} />
    //             <p className="text-gray-200">Sync</p>
    //         </div>
    //         {showSaveMessage && <p className="ml-4">Saved ...</p>}
    //     </div>
    // )
}

