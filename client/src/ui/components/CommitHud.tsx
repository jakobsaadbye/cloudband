// @deno-types="npm:@types/react@19"
import { useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { useCtx } from "@core/context.ts";

import { Hud } from "@ui/components/Hud.tsx";
import { useDB, useQuery } from "@jakobsaadbye/teilen-sql/react";
import { SqliteDB } from "@jakobsaadbye/teilen-sql";

type Props = {
    isOpen: boolean
    close: () => void
}

export const CommitHud = ({ isOpen, close }: Props) => {
    const db = useDB();

    const ctx = useCtx();

    const [name, setName] = useState("");
    const textboxRows = name.split('\n').length

    const changeCount = useQuery((db, projectId: string) => db.getUncommittedChangeCount(projectId), [ctx.project.id], { tableDependencies: ["crr_changes"] }).data ?? 0;

    useEffect(() => {
        if (!isOpen) return;

        const textbox = document.getElementById("version-create-text-box");
        setTimeout(() => {
            textbox?.focus();
        }, 17);
    }, [isOpen]);

    const createCommit = async () => {
        if (name === "") return;

        await db.commit(name, ctx.project.id);
        setName("");
        close();
    }

    if (!isOpen) return;

    return (
        <Hud title="Versions" isOpen={isOpen}>
            <div className="flex flex-col justify-center items-center gap-y-2 h-fit">
                <textarea className="w-100 px-2 border-1 border-gray-300 rounded-sm text-base text-gray-600 bg-white resize-none" id="version-create-text-box" required rows={textboxRows} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Commit message ..." />
                <button disabled={changeCount === 0} type="submit" className="flex justify-center items-center w-full h-8 rounded-sm text-white font-semibold bg-blue-500 hover:bg-blue-600" onClick={createCommit} tabIndex={0}>
                    <p className="text-base">Commit {changeCount} {changeCount === 1 ? "change" : "changes"}</p>
                </button>
            </div>
        </Hud>
    )
}
