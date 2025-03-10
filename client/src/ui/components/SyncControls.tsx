// @deno-types="npm:@types/react@19"
import { useEffect, useState } from "react";
import { useCtx } from "@core/context.ts";
import { useDB, useSyncer } from "@jakobsaadbye/teilen-sql/react";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { twMerge } from "tailwind-merge";

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
                <Sync className={twMerge("fill-gray-200 w-6 h-6", spinSyncIcon && "animate-spin-reverse")}  />
                <p className="text-gray-200">Sync</p>
            </div>
            {showSaveMessage && <p className="ml-4">Saved ...</p>}
        </div>
    )
}
