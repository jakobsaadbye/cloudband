// @deno-types="npm:@types/react@19"
import { useEffect, useState } from "react";
import { useCtx } from "@core/context.ts";
import { useDB, useQuery, useSyncer } from "@jakobsaadbye/teilen-sql/react";
import { SyncEvent } from "@jakobsaadbye/teilen-sql";
import { ReloadProject } from "@/db/load.ts";
import { ProjectRow } from "@/db/types.ts";
import { handleSyncEvent } from "@core/sync.ts";

const ENABLED = false;

export const AutoSync = () => {
    const ctx = useCtx();
    const db = useDB();
    const syncer = useSyncer();

    const changeCount = useQuery((db, projectId) => db.getChangeCount(projectId), [ctx.project.id], { tableDependencies: ["crr_changes", "crr_documents"] }).data ?? 0;

    const [socket, setSocket] = useState<WebSocket | null>(null);

    // Push on any new changes
    useEffect(() => {
        if (changeCount > 0 && ENABLED) {
            setTimeout(() => {
                syncChanges(ctx.project.id);
            }, 10);
        }
    }, [ctx, changeCount]);

    // Open a connection
    useEffect(() => {
        const openConnection = async () => {
            // Make sure that the project actually exists in our database before opening a connection on it
            const project = await db.first<ProjectRow>(`SELECT * FROM "projects" WHERE id = ?`, [ctx.project.id]);
            if (!project) return;

            const socket = new WebSocket(`ws://127.0.0.1:3000/start_web_socket?clientId=${db.siteId}&docId=${ctx.project.id}`);

            if (ENABLED) {
                socket.onmessage = (e) => syncer.handleWebSocketMessage(socket, e);
            }
            socket.onopen = onConnection;
            setSocket(socket);
        }
        openConnection();

    }, [ctx.project.id]);

    // Handle incomming changes
    useEffect(() => {
        if (ENABLED) {
            syncer.addEventListener("change", (event) => handleSyncEvent(ctx, event));
        }
        return () => {
            syncer.removeEventListener(handleSyncEvent);
        }
    }, [ctx]);


    const syncChanges = (projectId: string) => {
        if (!socket) return;
        syncer.pushChangesWs(socket, projectId);
    }

    const onConnection = async (event: MessageEvent) => {
        console.log(`Connected to the server ...`);

        // Begin uploading any files that are not yet uploaded
        await ctx.fileManager.UploadNonUploadedFiles(ctx);
    }

    return;
}

