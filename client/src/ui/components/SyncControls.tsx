// @deno-types="npm:@types/react@19"
import { useEffect, useState } from "react";
import { Context, useCtx } from "@core/context.ts";
import { useDB, useSyncer } from "@jakobsaadbye/teilen-sql/react";
import { Change, SqliteDB, sqlPlaceholders, SyncEvent } from "@jakobsaadbye/teilen-sql";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { twMerge } from "tailwind-merge";
import { GetOrDownloadFile } from "@core/file_manager.ts";
import { RegionRow } from "@/db/types.ts";
import { LoadProject } from "@/db/load.ts";
import { SaveEntireProject } from "@/db/save.ts";

export const SyncControls = () => {
    const ctx = useCtx();
    const db = useDB();
    const syncer = useSyncer("");
    const { Sync } = useIcons();

    const [showSaveMessage, setShowSaveMessage] = useState(false);
    const [spinSyncIcon, setSpinSyncIcon] = useState(false);
    const [socket, setSocket] = useState<WebSocket | null>(null);

    useEffect(() => {
        const socket = new WebSocket(`ws://127.0.0.1:3000/start_web_socket?clientId=${db.siteId}`);

        socket.onmessage = (ev: MessageEvent) => syncer.handleWebSocketMessage(socket, db, ev);

        console.log(`Connected to the server ...`);
        setSocket(socket);
    }, []);

    useEffect(() => {
        const handleIncommingChanges = async (event: SyncEvent) => {
            const changes = event.data;

            // If a new track is inserted, we check if we should download the file for it
            const insertedTrackFilenames = [];
            for (const change of changes) {
                if (change.type === "insert" && change.tbl_name === "tracks" && change.col_id === "filename") {
                    insertedTrackFilenames.push(change.value);
                }
            }

            for (const filename of insertedTrackFilenames) {
                GetOrDownloadFile(ctx.project.id, "tracks", filename).then(file => {
                    if (!file) {
                        console.error(`Failed to download file '${filename}'`);
                    }
                })
            }

            console.log(`Pulled ${changes.length} changes`);

            // @Temp - Reload the entire project
            // SaveEntireProject(db, ctx);
            await LoadProject(ctx, db, ctx.project.name);
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

        syncChanges();

        return () => {
            clearTimeout(msgId);
            clearTimeout(spinId);
        }
    }, [ctx.player.input.lastSave]);

    const syncChanges = () => {
        if (!socket) return;

        // Push new changes to the server
        syncer.pushChangesWs(socket);
    }

    return (
        <div className="flex items-center">
            <div tabIndex={0} className="flex gap-x-2 p-2 bg-gray-800 hover:bg-gray-950 rounded-lg select-none" onClick={syncChanges}>
                <Sync className={twMerge("fill-gray-200 w-6 h-6", spinSyncIcon && "animate-spin-reverse")} />
                <p className="text-gray-200">Sync</p>
            </div>
            {showSaveMessage && <p className="ml-4">Saved ...</p>}
        </div>
    )
}

const injectChangesIntoContext = async (db: SqliteDB, ctx: Context, changes: Change[]) => {
    const regionChanges = changes.filter(change => change.tbl_name === "regions");
    const trackChanges = changes.filter(change => change.tbl_name === "tracks");
    const playerChanges = changes.filter(change => change.tbl_name === "players");
    const projectChanges = changes.filter(change => change.tbl_name === "projects");

    const regionIds = regionChanges.map(change => change.pk);
    const trackIds = trackChanges.map(change => change.pk);
    const playerIds = playerChanges.map(change => change.pk);
    const projectIds = projectChanges.map(change => change.pk);

    let regionRows = [];
    let trackRows = [];
    let playerRows = [];
    let projectRows = [];

    if (regionIds.length > 0) {
        regionRows = await db.select<RegionRow[]>(`SELECT * FROM "regions" WHERE id IN (${sqlPlaceholders(regionIds)})`, [...regionIds]);
    }
    if (trackIds.length > 0) {
        trackRows = await db.select<RegionRow[]>(`SELECT * FROM "regions" WHERE id IN (${sqlPlaceholders(trackIds)})`, [...trackIds]);
    }
    if (playerIds.length > 0) {
        playerRows = await db.select<RegionRow[]>(`SELECT * FROM "regions" WHERE id IN (${sqlPlaceholders(playerIds)})`, [...playerIds]);
    }
    if (projectIds.length > 0) {
        projectRows = await db.select<RegionRow[]>(`SELECT * FROM "regions" WHERE id IN (${sqlPlaceholders(projectIds)})`, [...projectIds]);
    }

    const tracks = ctx.trackList.tracks;

}