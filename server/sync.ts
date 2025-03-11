import { Context } from "@oak/oak";
import { applyChanges, Change, SqliteDB } from "@jakobsaadbye/teilen-sql";
import { db } from "./db.ts";

type MyWebSocket = WebSocket & {
    clientId: string
};

const connectedClients = new Map<string, MyWebSocket>();

export async function handleWebSocketConnection(ctx: Context) {
    const socket = await ctx.upgrade() as MyWebSocket;
    const clientId = ctx.request.url.searchParams.get("clientId");

    if (!clientId) {
        socket.close(1008, "'clientId' was not provided as a search parameter");
        return;
    }

    socket.clientId = clientId;
    socket.onopen = () => clientConnected(socket);
    socket.onclose = () => clientDisconnected.bind(clientId);
    socket.onmessage = (msg: MessageEvent) => handleMessage(socket, msg);

    connectedClients.set(clientId, socket);

    console.log(`New client connected ${clientId} ...`);
}

const clientConnected = (ws: MyWebSocket) => {
    console.log(`New connection opened ...`);

    const pullHintMsg = JSON.stringify({
        type: "pull-hint",
        data: null
    });

    ws.send(pullHintMsg);
}

const clientDisconnected = (ws: MyWebSocket) => {
    console.log(`Client disconnected ${ws.clientId} ...`);
    connectedClients.delete(ws.clientId);
}

const handleMessage = (ws: MyWebSocket, m: MessageEvent) => {
    const msg = JSON.parse(m.data);

    switch (msg.type) {
        case "push-changes": handlePushChanges(ws, msg.data); break;
        case "pull-changes": handlePullChanges(ws, msg.data); break;
        default: {
            console.error(`Received unknown message '${msg.type}'`);
        }
    }
}

const handlePullChanges = async (ws: MyWebSocket, data: any) => {
    const clientId = ws.clientId;
    const lastPulledAt = data.lastPulledAt;

    const { data: changes, error } = await db.selectWithError<Change[]>(`SELECT * FROM "crr_changes" WHERE site_id != ? AND applied_at > ?`, [clientId, lastPulledAt]);
    
    if (error) {
        const msg = JSON.stringify({
            type: "pull-changes-fail",
            data: error.message
        });

        ws.send(msg);
    } else {
        const now = new Date().getTime();
        const msg = JSON.stringify({
            type: "pull-changes-ok",
            data: {
                changes,
                pulledAt: now
            } 
        })

        ws.send(msg);
    }
}

const handlePushChanges = async (ws: MyWebSocket, changes: Change[]) => {
    try {
        await applyChanges(db, changes);

        const msg = JSON.stringify({
            type: "push-changes-ok",
            data: null
        });

        ws.send(msg);

        // Broadcast to everyone that a new change has occured
        const pullHintMsg = JSON.stringify({
            type: "pull-hint",
            data: null
        });
        for (const client of connectedClients.values()) {
            if (client.clientId === ws.clientId) continue;

            client.send(pullHintMsg);
        }

    } catch (error) {
        console.error(error);

        const msg = JSON.stringify({
            type: "push-changes-fail",
            data: error.message
        });

        ws.send(msg);
    }
}