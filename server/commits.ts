import { Context } from "@oak/oak";
import { PullRequest, PushRequest, SqliteDB } from "@jakobsaadbye/teilen-sql";

export const handlePullCommits = async (ctx: Context, db: SqliteDB) => {
	const pull = await ctx.request.body.json() as PullRequest;
	
	try {
		const result = await db.receivePullCommits(pull);
		ctx.response.status = result.code;
		ctx.response.body = result;
	} catch (error) {
		console.error(error);
		ctx.response.status = 500;
        ctx.response.body = { error: error.message };
	}
}


export const handlePushCommits = async (ctx: Context, db: SqliteDB) => {
    const push = await ctx.request.body.json() as PushRequest;

	try {
		const result = await db.receivePushCommits(push);
		ctx.response.status = result.code;
		ctx.response.body = result;
	} catch (error) {
		console.error(error);
		ctx.response.status = 500;
        ctx.response.body = { error: error.message };
	}
}