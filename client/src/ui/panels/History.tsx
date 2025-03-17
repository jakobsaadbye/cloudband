// @deno-types="npm:@types/react@19"
import { useEffect, useState, useRef } from "react";

import { useCtx } from "@core/context.ts";
import { twMerge } from "tailwind-merge";

export const History = () => {
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
    
    return (
        <div className="p-2">
            <p className="pb-2 font-semibold">History</p>
            <div ref={listElement} className="flex flex-col mb-16 h-64 bg-white select-none overflow-scroll rounded-sm">
                {input.undoBuffer.map((action, i) => {
                    const undos = input.undos;
                    const headIndex = input.undoBuffer.length - undos - 1;
                    const undone = i > headIndex;
                    const head = i === headIndex;
                    return (
                        <div ref={head ? currentHead : null} tabIndex={0} className={twMerge("p-1", head && "bg-blue-500")} key={i}>
                            <p className={twMerge("text-sm", undone && "text-gray-400", head && "text-white")}>{action.kind}</p>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
