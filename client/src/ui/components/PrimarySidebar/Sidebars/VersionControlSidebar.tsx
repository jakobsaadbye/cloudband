// @deno-types="npm:@types/react@19"
import { useState, useEffect, useRef } from "react";
import { CollapsablePanel } from "@ui/components/CollapsablePanel.tsx";
import { useDB, useQuery, useSyncer } from "@jakobsaadbye/teilen-sql/react";
import { useCtx } from "@core/context.ts";
import { twMerge } from "tailwind-merge";
import { Commit } from "@jakobsaadbye/teilen-sql";
import { ReloadProject } from "@/db/load.ts";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { DropdownItem, DropdownList } from "@ui/components/DropdownList.tsx";
import { handlePull, handlePush } from "@core/sync.ts";

export const VersionControlSidebar = () => {
    const ctx = useCtx();

    const pushCount = useQuery((db, projectId) => db.getPushCount(projectId), [ctx.project.id], { tableDependencies: ["crr_commits", "crr_documents"] }).data ?? 0;

    const [isSyncing, setIsSyncing] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const { Sync, TripleDots } = useIcons();

    return (
        <div className="w-64 h-full bg-gray-100 border-l-1 border-gray-400">
            <header className="flex pl-2 pr-1 py-1 justify-between items-center select-none">
                <p className="text-sm text-gray-600">Version Control</p>
                <div className="flex gap-x-1 items-center">
                    {isSyncing && <Sync className="ml-4 fill-gray-600 w-4 h-4 animate-spin-reverse" />}
                    <div className="" tabIndex={0} onBlur={() => setMenuOpen(false)}>
                        <TripleDots className="w-6 h-6 fill-gray-400 hover:fill-gray-700" onMouseDown={() => setMenuOpen(!menuOpen)} />
                        <ActionMenu opened={menuOpen} close={() => setMenuOpen(false)} setIsSyncing={setIsSyncing} pushCount={pushCount} />
                    </div>
                </div>
            </header>
            <CommitPanel pushCount={pushCount} />
            <HistoryPanel />
        </div>
    )
}

type ActionMenuProps = {
    opened: boolean
    close: () => void
    setIsSyncing: (value: boolean) => void
    pushCount: number
}

const ActionMenu = ({ opened, close, setIsSyncing, pushCount }: ActionMenuProps) => {
    const ctx = useCtx();
    const syncer = useSyncer();

    const preventShenanigans = (e: Event) => {
        // Prevents the menu from closing when clicking on one of the items as there is an onBlur close on the parent
        // menu that will trigger if the event propagates ...
        e.preventDefault();
        e.stopPropagation();
    }

    const pushChanges = async (e: Event) => {
        preventShenanigans(e);
        setIsSyncing(true);
        await handlePush(ctx, syncer);
        setTimeout(() => {
            setIsSyncing(false);
        }, 500);
        close();
    }

    const pullChanges = async (e: Event) => {
        preventShenanigans(e);
        setIsSyncing(true);
        await handlePull(ctx, syncer);
        setTimeout(() => {
            setIsSyncing(false);
        }, 500);
        close();
    }

    const items = [
        { label: "Pull commits", onClick: pullChanges },
        { label: `Push commits (${pushCount})`, onClick: pushChanges },
    ] as DropdownItem[];

    if (!opened) return;
    return (
        <DropdownList items={items} />
    )
}

type CommitPanelProps = {
    pushCount: number
}


const CommitPanel = ({ pushCount }: CommitPanelProps) => {
    const db = useDB();
    const ctx = useCtx();
    const syncer = useSyncer();
    
    const rawUncommittedChanges = useQuery((db, projectId: string) => db.getUncommittedChanges(projectId), [ctx.project.id], { tableDependencies: ["crr_changes"] }).data;

    const commitInput = useRef(null);
    const [commitMessage, setCommitMessage] = useState("");
    const [commitInputFocused, setCommitInputFocused] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const textboxRows = commitMessage.split('\n').length;
    const uncommittedChanges = rawUncommittedChanges?.filter(change => change.tbl_name !== "undo_stack") ?? [];
    const changeCount = uncommittedChanges?.length ?? 0;

    useEffect(() => {
        const handleKeyboardInput = (e: KeyboardEvent) => {
            let handled = false;
            if (e.metaKey && e.key === "Enter") {
                if ((document.activeElement === commitInput.current) || commitInputFocused) {
                    createCommit();
                    handled = true;
                }
            }
            if (handled) {
                e.preventDefault();
            }
        }
        document.addEventListener("keydown", handleKeyboardInput);
        return () => {
            document.removeEventListener("keydown", handleKeyboardInput);
        }
    }, [commitInput, commitInputFocused]);

    const pushChanges = async (e: Event) => {
        e.preventDefault();
        setIsSyncing(true);
        await handlePush(ctx, syncer);
        setTimeout(() => {
            setIsSyncing(false);
        }, 300);
    }

    const focusCommitInput = () => setCommitInputFocused(true);
    const blurCommitInput = () => setCommitInputFocused(false);

    const createCommit = async () => {
        if (commitMessage === "") return;

        await db.commit(commitMessage, ctx.project.id);
        setCommitMessage("");
    }

    const { Sync, TripleDots } = useIcons();

    return (
        <CollapsablePanel label="Changes" className="pt-2">
            <section className="flex flex-col gap-y-2 p-2">
                <textarea
                    className="resize-none w-full px-2 text-gray-600 border-1 border-gray-400 focus:border-gray-600 focus:outline-none rounded-sm"
                    placeholder="Message (⌘+Enter)"
                    onChange={(e) => setCommitMessage(e.target.value)}
                    onFocus={focusCommitInput}
                    onBlur={blurCommitInput}
                    value={commitMessage}
                    rows={textboxRows}
                    ref={commitInput}
                />
                {(pushCount > 0 && changeCount === 0 || isSyncing) ? (
                    <div className="flex gap-x-2 justify-center items-center bg-yellow-100 hover:bg-yellow-50 rounded-sm" onClick={pushChanges}>
                        <Sync className={twMerge("w-5 h-5 fill-amber-900", isSyncing && "animate-spin-reverse")} />
                        <p className="py-1 text-amber-900">Push changes ({pushCount})</p>
                    </div>
                ) : (
                    <div className="bg-yellow-100 hover:bg-yellow-50 rounded-sm text-center" onClick={createCommit}>
                        <p className="py-1 text-amber-900">Commit</p>
                    </div>
                )
                }
            </section>
            <CollapsablePanel label={`Changes (${changeCount})`} className="px-2 pb-2" headerClassName="bg-gray-200">
                <div className="flex flex-col max-w-64">
                    {uncommittedChanges && uncommittedChanges.map((change, i) => {
                        return (
                            <div key={i} className="">
                                <p className="px-2 text-sm text-gray-600">{change.tbl_name}.{change.col_id}</p>
                            </div>
                        )
                    })}
                </div>
            </CollapsablePanel>
        </CollapsablePanel>
    )
}

const HistoryPanel = () => {
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
        <CollapsablePanel label="History">
            <div className="py-2">
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
