// @deno-types="npm:@types/react@19"
import { useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";

import { useIcons } from "../hooks/useIcons.tsx";
import { useCtx } from "../../core/context.ts";

export const PlayControls = () => {

  const ctx = useCtx();
  
  const player = ctx.player;

  useEffect(() => {
    const handleKeyboardInput = (e: KeyboardEvent) => {

      let handled = false;
      const key = e.key;
      if (key == " ") {
        handled = true;
        if (!player.isPlaying) {
          console.log("Play");
          player.BeginPlay(ctx);
        } else {
          console.log("Stop");
          player.StopPlay(ctx);
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
  }, []);

  const icon = useIcons();
  const iconStyle = "w-10 h-8 fill-gray-700"

  return (
    <section className="flex justify-center items-center w-full gap-x-4 h-18 bg-gray-200">
      <div className="w-1/3"></div>
      <div className="flex justify-center items-center gap-2 w-1/3">
        <div tabIndex={1} title="Rewind ,">
          <icon.Rewind className={twMerge(iconStyle)} />
        </div>
        <div tabIndex={2} title="Forward .">
          <icon.Forward className={twMerge(iconStyle)} />
        </div>
        <div tabIndex={3} title="Reset ↩">
          <icon.Stop className={twMerge(iconStyle)} />
        </div>
        <div tabIndex={4} title="Play space" onClick={() => player.isPlaying ? player.StopPlay(ctx) : player.BeginPlay(ctx)}>
          <icon.Play className={twMerge(iconStyle, player.isPlaying ? "bg-green-700 fill-gray-50 rounded-md" : "")} />
        </div>
        <div tabIndex={5} title="Record r">
          <icon.Record className={twMerge(iconStyle, "fill-red-700")} />
        </div>
        {/* Tempo controller */}
        <section className="flex gap-x-4 py-1 px-3 w-full bg-gray-800 rounded-xl select-none">
          <div>
            <input disabled className="text-gray-200" type="number" min={1} max={300} step={1} value={player.beat} />
            <p className="text-xs text-gray-400">BEAT</p>
          </div>
          <div>
            <input className="text-gray-200" type="number" min={1} max={300} step={1} value={player.tempo} onChange={e => player.SetTempo(ctx, +e.target.value)} />
            <p className="text-xs text-gray-400">TEMPO</p>
          </div>
        </section>
      </div>

      <div className="flex gap-x-8 w-1/3">
        <div className="flex">
          <icon.VolumeUp className={twMerge(iconStyle)} />
          <input type="range" min={0} max={2} value={player.volume} step={0.01} onChange={(e) => player.SetVolume(ctx, +e.target.value)} />
        </div>
        <div className="flex items-center gap-x-2">
          <p>LR Pan:</p>
          <input type="range" min={-1} max={+1} value={player.pan} step={0.01} onChange={(e) => player.SetPan(ctx, +e.target.value)} />
        </div>
      </div>
    </section>
  )
}
