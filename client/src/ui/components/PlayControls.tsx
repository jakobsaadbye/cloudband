// @deno-types="npm:@types/react@19"
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

import { useIcons } from "../hooks/useIcons.tsx";
import { useCtx, Context } from "../../core/context.ts";
import { globalKeyboardInputIsDisabled } from "@core/input.ts";

export const PlayControls = () => {

  const ctx = useCtx();

  const player = ctx.player;

  //
  // Keymap for the player controls
  ////
  useEffect(() => {
    const handleKeyboardInput = (e: KeyboardEvent) => {
      if (globalKeyboardInputIsDisabled(e)) {
        return;
      }

      let handled = false;

      const key = e.key;

      if (key === " ") {
        handled = true;
        if (!player.isPlaying) {
          player.BeginPlay(ctx);
        } else {
          player.PausePlay(ctx);
        }
      }

      if (key === "Enter") {
        handled = true;
        player.ResetPlay(ctx);
      }

      if (key === ".") {
        handled = true;
        player.ForwardOne(ctx);
      }

      if (key === ",") {
        handled = true;
        player.RewindOne(ctx);
      }

      if (handled) {
        e.preventDefault();
      }
    }

    document.addEventListener("keydown", handleKeyboardInput);

    return () => {
      document.removeEventListener("keydown", handleKeyboardInput);
    }
  }, [ctx]);



  const icon = useIcons();
  const iconStyle = "w-10 h-8 fill-gray-700"

  return (
    <div className="flex justify-center items-center gap-2">
      <div className="hidden lg:flex justify-center items-center gap-2">
        <div tabIndex={1} title="Rewind ,">
          <icon.Rewind className={twMerge(iconStyle)} />
        </div>
        <div tabIndex={2} title="Forward .">
          <icon.Forward className={twMerge(iconStyle)} />
        </div>
        <div tabIndex={3} title="Reset ↩" onClick={() => player.ResetPlay(ctx)}>
          <icon.Stop className={twMerge(iconStyle)} />
        </div>
        <div tabIndex={4} title="Play space" onClick={() => player.isPlaying ? player.PausePlay(ctx) : player.BeginPlay(ctx)}>
          <icon.Play className={twMerge(iconStyle, player.isPlaying ? "bg-green-700 fill-gray-50 rounded-md" : "")} />
        </div>
        <div tabIndex={5} title="Record r">
          <icon.Record className={twMerge(iconStyle, "fill-red-700")} />
        </div>
      </div>

      {/* Beating controller */}
      <section className="mx-8 flex gap-x-4 py-1 px-4 bg-gray-800 rounded-xl select-none">
        <div>
          <input disabled className="text-gray-200" type="number" min={1} max={300} step={1} value={player.bar} />
          <p className="text-xs text-gray-400">BAR</p>
        </div>
        <div>
          <input disabled className="text-gray-200" type="number" min={1} max={300} step={1} value={player.beat} />
          <p className="text-xs text-gray-400">BEAT</p>
        </div>
        <div>
          <input className="text-gray-200" type="number" min={1} max={300} step={1} value={player.tempo} onChange={e => player.SetTempo(ctx, +e.target.value)} />
          <p className="text-xs text-gray-400">TEMPO</p>
        </div>
      </section>

      {/* Master audio */}
      <div className="flex gap-x-8 w-1/3 justify-end">
        <div className="flex">
          <icon.VolumeUp className={twMerge(iconStyle)} />
          <input className="w-28" title="Master volume" type="range" min={0} max={2} value={player.volume} step={0.01} onChange={(e) => player.SetVolume(ctx, +e.target.value)} />
        </div>
      </div>
    </div>
  )
}
