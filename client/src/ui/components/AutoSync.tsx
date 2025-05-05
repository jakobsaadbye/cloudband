// @deno-types="npm:@types/react@19"
import { useEffect, useState } from "react";
import { useCtx } from "@core/context.ts";
import { useDB, useSyncer } from "@jakobsaadbye/teilen-sql/react";
import { sqlPlaceholders, Syncer, SyncEvent } from "@jakobsaadbye/teilen-sql";
import { ReloadProject } from "@/db/load.ts";
import { SaveEntities } from "@/db/save.ts";
import { Track } from "@core/track.ts";

const ENABLED = false;

export const AutoSync = () => {
    const ctx = useCtx();
    const db = useDB();
    const syncer = useSyncer();

    const [showSaveMessage, setShowSaveMessage] = useState(false);
    const [spinSyncIcon, setSpinSyncIcon] = useState(false);
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        const socket = new WebSocket(`ws://127.0.0.1:3000/start_web_socket?clientId=${db.siteId}`);

        if (ENABLED) {
            socket.onmessage = (e) => syncer.handleWebSocketMessage(socket, e);
        }
        socket.onopen = onConnection;

        setSocket(socket);
    }, []);

    const onConnection = async (event: MessageEvent) => {
        console.log(`Connected to the server ...`);

        // Begin uploading any files that are not yet uploaded
        await ctx.fileManager.UploadNonUploadedFiles(ctx);
        
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

            await ReloadProject(ctx);
        }

        if (ENABLED) {
            syncer.addEventListener("change", handleIncommingChanges);
        }

        return () => {
            syncer.removeEventListener(handleIncommingChanges);
        }
    }, [ctx]);


    useEffect(() => {
        if (ctx.input.lastSave === 0) return;

        setShowSaveMessage(true);
        const msgId = setTimeout(() => {
            setShowSaveMessage(false);
        }, 3000);
        setSpinSyncIcon(true);
        const spinId = setTimeout(() => {
            setSpinSyncIcon(false);
        }, 500);

        // Push latest changes to the server
        if (ENABLED) {
            syncChanges();
        }

        return () => {
            clearTimeout(msgId);
            clearTimeout(spinId);
        }
    }, [ctx.input.lastSave]);

    const syncChanges = () => {
        if (!socket) return;
        syncer.pushChangesWs(socket);
    }

    return;
}

