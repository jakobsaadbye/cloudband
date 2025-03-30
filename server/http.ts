import { Context } from "@oak/oak";
import { applyChanges, Change, SqliteDB } from "@jakobsaadbye/teilen-sql";

export const handlePullChangesHttp = async (ctx: Context, db: SqliteDB) => {
    const lastPulledAt = ctx.request.url.searchParams.get("lastPulledAt");
    const siteId = ctx.request.url.searchParams.get("siteId");
    
	if (lastPulledAt === undefined || siteId === undefined) {
        ctx.response.status = 400;
        ctx.response.body = `Invalid query parameters. Need 'lastPulledAt' & 'siteId'`
		return;
	}

	try {
		const now = new Date().getTime();
		const rows = await db.select<Change[]>(`SELECT * FROM "crr_changes" WHERE site_id != ? AND applied_at > ? ORDER BY created_at ASC`, [siteId, lastPulledAt]);

		ctx.response.status = 200;
		ctx.response.body = { changes: rows, pulledAt: now };
	} catch (e) {
		console.error(e);
		ctx.response.status = 400;
        ctx.response.body = { error: e.message };
	}
}

export const handlePushChangesHttp = async (ctx: Context, db: SqliteDB) => {
    const { changes } = await ctx.request.body.json();
	try {
		await applyChanges(db, changes);
		ctx.response.status = 200;
	} catch (e) {
		await db.exec(`ROLLBACK`, []);
		console.error(e);
		ctx.response.status = 400;
		ctx.response.body = { error: e.message };
	}
}