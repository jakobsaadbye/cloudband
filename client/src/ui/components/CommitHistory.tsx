// @deno-types="npm:@types/react@19"
import { useEffect, useState, useRef } from "react";

import { useCtx } from "@core/context.ts";
import { twMerge } from "tailwind-merge";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { useDB, useQuery } from "@jakobsaadbye/teilen-sql/react";
import { Commit } from "@jakobsaadbye/teilen-sql";
import { ReloadProject } from "@/db/load.ts";
import { CollapsablePanel } from "@ui/components/CollapsablePanel.tsx";

export const CommitHistory = () => {
    const db = useDB();
    const ctx = useCtx();

    const head = useQuery<Commit>(`SELECT * FROM "crr_commits" WHERE id = (SELECT head FROM "crr_documents" WHERE id = ?)`, [ctx.project.id], { first: true }).data;
    const commits = useQuery<Commit[]>(`SELECT * FROM "crr_commits" WHERE document = ? ORDER BY created_at DESC`, [ctx.project.id], {}).data;

    const checkoutCommit = async (commit: Commit) => {
        await db.checkout(commit.id);
        await ReloadProject(ctx, db, []);
    }
    
    const { IconVersion } = useIcons();

    return (
        <CollapsablePanel label="History" icon={<IconVersion className="fill-gray-500 w-4 h-4 rotate-180" />}>
            <div className="pt-1">
                {commits && commits.map((commit, i) => {
                    const isHead = commit.id === head?.id;

                    return (
                        <div key={i}>
                            <div className="flex items-center gap-x-1 px-1 text-sm text-gray-600" onDoubleClick={() => checkoutCommit(commit)}>
                                <span className={twMerge("w-3 h-3 rounded-full bg-gray-500 hover:scale-110", isHead && "w-3 h-3 bg-blue-500")} />
                                <p>{commit.message}</p>
                            </div>
                            <div className={twMerge("ml-2.25 border-l-2 border-gray-400 h-3", i === commits.length - 1 && "hidden")} />
                        </div>
                    )
                })}
            </div>
        </CollapsablePanel>
    );
}
