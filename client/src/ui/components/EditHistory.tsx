// @deno-types="npm:@types/react@19"
import { useEffect, useState, useRef } from "react";

import { useCtx } from "@core/context.ts";
import { twMerge } from "tailwind-merge";
import { useIcons } from "@ui/hooks/useIcons.tsx";
import { CollapsablePanel } from "@ui/components/CollapsablePanel.tsx";

export const EditHistory = () => {
    const ctx = useCtx();
    const currentHead = useRef<HTMLDivElement | null>(null);
    const listElement = useRef<HTMLDivElement | null>(null);

    const input = ctx.player.input;

    useEffect(() => {
        if (currentHead.current && listElement.current) {
            listElement.current.scrollTo({
                top: currentHead.current.offsetTop - listElement.current.offsetTop,
                behavior: "instant"
            });
        }
    }, [currentHead.current]);

    const { IconHistory, IconEdit } = useIcons();

    return (
        <CollapsablePanel label="Edits" icon={<IconEdit className="fill-gray-500 w-4 h-4" />}>
            <div ref={listElement} className="flex h-64 flex-col overflow-scroll select-none">
                {input.undoBuffer.map((action, i) => {
                    const undos = input.undos;
                    const headIndex = input.undoBuffer.length - undos - 1;
                    const undone = i > headIndex;
                    const head = i === headIndex;
                    return (
                        <div ref={head ? currentHead : null} tabIndex={0} className={twMerge("p-1", head && "bg-gray-200")} key={i}>
                            <p className={twMerge("text-sm", undone && "text-gray-400", head && "text-black")}>{action.kind}</p>
                        </div>
                    )
                })}
            </div>
        </CollapsablePanel>
    )
}
