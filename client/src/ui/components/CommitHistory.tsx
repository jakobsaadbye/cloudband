// @deno-types="npm:@types/react@19"
import { useEffect, useState, useRef } from "react";

import { useCtx } from "@core/context.ts";
import { twMerge } from "tailwind-merge";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { useDB, useQuery } from "@jakobsaadbye/teilen-sql/react";
import { Commit } from "@jakobsaadbye/teilen-sql";
import { ReloadWorkspace } from "@/db/load.ts";

export const CommitHistory = () => {
    const db = useDB();
    const ctx = useCtx();

    const head = useQuery<Commit>(`SELECT * FROM "crr_commits" WHERE id = (SELECT head FROM "crr_clients")`, [], { first: true }).data;
    const commits = useQuery<Commit[]>(`SELECT * FROM "crr_commits" ORDER BY created_at DESC`, []).data;

    const { IconVersion } = useIcons();

    const checkoutCommit = async (commit: Commit) => {
        await db.checkout(commit.id);
        await ReloadWorkspace(ctx, db, []);
    }

    return (
        <div className="p-2">
            <div className="flex gap-x-1 pb-1">
                <div className="flex justify-center items-center">
                    <IconVersion className="fill-gray-500 w-4 h-4 rotate-180" />
                </div>
                <p className="font-semibold text-gray-600 text-sm">History</p>
            </div>
            <div className="flex flex-col pt-1 m-0 mb-16 h-64 bg-white select-none overflow-scroll rounded-sm shadow-sm">
                {commits && commits.map((commit, i) => {
                    const isHead = commit.id === head?.id;

                    return (
                        <div key={i}>
                            <div className="flex items-center gap-x-1 px-1 text-sm text-gray-600 hover:bg-gray-100" onDoubleClick={() => checkoutCommit(commit)}>
                                <span className={twMerge("w-3 h-3 rounded-full bg-gray-500 hover:scale-110", isHead && "w-3 h-3 bg-blue-500")} />
                                <p>{commit.message}</p>
                            </div>
                            <div className={twMerge("ml-2.25 border-l-2 border-gray-400 h-3", i === commits.length - 1 && "hidden")} />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
