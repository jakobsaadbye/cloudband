// @deno-types="npm:@types/react@19"
import { useState, useEffect } from "react";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { VersionControlSidebar } from "./Sidebars/VersionControlSidebar.tsx";
import { useDB, useQuery } from "@jakobsaadbye/teilen-sql/react";

type Sidebar = "version-control";

type UiState = {
    active_side_panel: Sidebar | null
}

export const PrimarySidebar = () => {
    const db = useDB();

    const uiState = useQuery<UiState>(`SELECT * FROM "ui_state"`, [], { first: true }).data;

    const activeSidebar = uiState?.active_side_panel ?? null;
    

    const openSidebar = (sidebar: Sidebar) => {
        if (activeSidebar === sidebar) {
            db.exec(`INSERT INTO "ui_state" (lotr, active_side_panel) VALUES (1, ?) ON CONFLICT DO UPDATE SET active_side_panel = EXCLUDED.active_side_panel`, [null]);
        } else {
            db.exec(`INSERT INTO "ui_state" (lotr, active_side_panel) VALUES (1, ?) ON CONFLICT DO UPDATE SET active_side_panel = EXCLUDED.active_side_panel`, [sidebar]);
        }
    }

    const { IconVersion } = useIcons();

    return (
        <div className="flex bg-gray-200 border-t-1 border-gray-400">
            <div className="flex flex-col items-center h-full w-16">
                <div className="relative py-4" title="Version control" onClick={() => openSidebar("version-control")}>
                    {activeSidebar === "version-control" && (<div className="absolute w-1 h-14 -left-4 top-0 bg-gray-500" />)}
                    <IconVersion className="w-8 h-8 rotate-180 rotate-y-180 fill-gray-500 hover:fill-gray-600" />
                </div>
            </div>

            {activeSidebar === "version-control" && <VersionControlSidebar />}
        </div>
    )
}
