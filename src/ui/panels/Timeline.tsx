// @deno-types="npm:@types/react@19"
import { useEffect, useState } from "react";
import { Context, useCtx } from "@core/context.ts";
import { Region, RF } from "@core/track.ts";

type Canvas2D = CanvasRenderingContext2D;

const DrawLine = (ctx: Canvas2D, x0: number, y0: number, x1: number, y1: number, style = "#000000", thicccness = 1) => {
  ctx.lineWidth = thicccness;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = style;
  ctx.stroke();
}

const DrawRectangle = (ctx: Canvas2D, x: number, y: number, width: number, height: number, style = "#000000", alpha = 1.0) => {
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = style;
  ctx.fillRect(x, y, width, height);
  ctx.globalAlpha = prevAlpha;
}

const DrawStrokedRectangle = (ctx: Canvas2D, x: number, y: number, width: number, height: number, strokeStyle = "#000000", fillStyle = "#000000", thickness = 1.0, alpha = 1.0) => {
  x += thickness / 2;
  y += thickness / 2;
  width -= thickness / 2;
  height -= thickness / 2;

  DrawRectangle(ctx, x, y, width, height, fillStyle, alpha);

  const prevAlpha = ctx.globalAlpha;

  ctx.globalAlpha = alpha;
  ctx.lineWidth = thickness;
  ctx.strokeStyle = strokeStyle;
  ctx.strokeRect(x, y, width, height);

  ctx.globalAlpha = prevAlpha;
}

const regionColorPresets = [
  "#ffca69",
  "#69aaff",
  "#4fd663",
  "#e3e332",
  "#f55f5f",
  "#d45ff5",
];

let zoomScale = 0;

const MAX_BAR_WIDTH = 1000;
const MIN_BAR_WIDTH = 100;

const drawOneFrame = (canvas: HTMLCanvasElement, ctx: Canvas2D, zoom: number, state: Context) => {
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const TOP_BAR_HEIGHT = 80;
  const PLAYHEAD_Y = TOP_BAR_HEIGHT / 2;
  const TRACK_START = TOP_BAR_HEIGHT;

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Background
  ctx.fillStyle = "#AAAAAA";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Top-bar
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, WIDTH, TOP_BAR_HEIGHT);

  // Bar and beat divider
  DrawLine(ctx, 0, PLAYHEAD_Y, WIDTH, PLAYHEAD_Y, "#505050");

  const barWidth = zoom;

  // Bars
  {
    let i = 0;
    let x = 0;
    while (x < WIDTH) {
      // Bar number
      ctx.font = "30px serif";
      ctx.fillStyle = "white";
      ctx.fillText("" + (i + 1), x + 12, 30, barWidth);

      // Vertical line
      if (i > 0) {

        // Top bar line
        DrawLine(ctx, x, 0, x, TOP_BAR_HEIGHT, "#DDDDDD");
        // Rest
        DrawLine(ctx, x, TOP_BAR_HEIGHT, x, HEIGHT, "#505050");
      }

      x += barWidth;
      i += 1;
    }
  }

  canvas.style.cursor = "default";

  //
  // Track regions
  //
  {
    const trackHeight = 192;
    for (let i = 0; i < state.trackList.tracks.length; i++) {
      const track = state.trackList.tracks[i];

      for (const region of track.regions) {
        if (region.deleted) continue;

        const secondsPerBar = 240.0 / state.player.tempo;

        const x = region.start / secondsPerBar * barWidth;
        const y = i * trackHeight + TRACK_START;
        const width = region.duration / secondsPerBar * barWidth;
        const height = trackHeight;

        const bgColor = regionColorPresets[i];
        let outline = "#303030";
        if (region.flags & RF.selected) {
          outline = "#FFFFFF";
        }

        DrawStrokedRectangle(ctx, x, y, width, height, outline, bgColor, 2);

        const fontSize = 28;
        ctx.font = fontSize + "px serif";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(track.file.name, x + 4, y + 2 + fontSize);

        // @Note - We save the calculated boundaries of the region so that we don't have to calculate 
        // them again in input handling where we need to know the boundaries of the region to do click events and such.
        region.x = x;
        region.y = y;
        region.width = width;
        region.height = trackHeight;

        // Frequency visualization
        const frequencyData = track.frequencyData;

        ctx.fillStyle = "#FFFFFF";

        const regionWidthBeforeCutting = region.totalDuration / secondsPerBar * barWidth;
        const cuttedX = region.offsetStart / secondsPerBar * barWidth;
        const lineWidth = regionWidthBeforeCutting / frequencyData.length;
        for (let i = 0; i < frequencyData.length; i++) {
          const lineHeight = Math.abs(frequencyData[i] * region.height*0.90);
          const x = (region.x - cuttedX) + i * lineWidth;

          if (x < region.x || x > region.x + region.width) continue;

          const y = region.y + region.height/2 - lineHeight/2;
          ctx.fillRect(x, y, lineWidth, lineHeight);
        }

        // Cursor style
        if (region.Is(RF.hovered)) {
          canvas.style.cursor = "move";
        }
        if (region.Is(RF.hoveredEnds)) {
          canvas.style.cursor = "col-resize";
        }
      }
    }
  }

  // Playhead
  {
    const t = state.player.GetCurrentTime();

    const thickness = 3;
    const tempo = state.player.tempo;
    const secondsPerBar = 240.0 / tempo;


    const x = (t / secondsPerBar) * barWidth + thickness * 0.5;
    const y = PLAYHEAD_Y;
    DrawLine(ctx, x, y, x, HEIGHT, "white", thickness);

  }
}

const CollisionPointRect = (px: number, py: number, x: number, y: number, width: number, height: number) => {
  if (px >= x && px <= x + width) {
    if (py >= y && py <= y + height) {
      return true;
    }
  }

  return false;
}

const handleInput = (e: MouseEvent, state: Context, zoom: number) => {

  const input = state.player.input;

  //
  // Keyboard input
  //
  if (e.type === "keypress" || e.type === "keydown") {
    const ev = e as KeyboardEvent;
    let handled = false;
    const key = ev.key;
    
    
    if (ev.ctrlKey && key === "c") {
      handled = true;
      input.CopyRegion(state);
    }

    if (ev.ctrlKey && key === "v") {
      handled = true;
      input.PasteRegion(state);
    }

    if (key === "Backspace") {
      handled = true;
      input.DeleteRegion(state);
    }

    if (handled) {
      e.preventDefault();
    }
  }

  //
  // Mouse input related controls
  //
  const dpi = window.devicePixelRatio;
  const mouseX = e.offsetX * dpi;
  const mouseY = e.offsetY * dpi;

  const barWidth = zoom;
  const cropWidth = 20;

  //
  // Region controls
  //
  const tracks = state.trackList.tracks;
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];

    for (const region of track.regions) {
      if (region.deleted) continue;

      if (CollisionPointRect(mouseX, mouseY, region.x, region.y, region.width, region.height)) {
        region.flags |= RF.hovered;

        if (mouseX < region.x + cropWidth || mouseX > (region.x + region.width) - cropWidth) {
          region.flags |= RF.hoveredEnds;
        } else {
          region.Unset(RF.hoveredEnds);
        }

        if (e.type === "mousedown") {
          region.flags |= RF.selected;
          input.selectedTrack = track;
          input.selectedRegion = region;

          // Are we cropping or shifting the region?
          if (mouseX < region.x + cropWidth) {
            region.flags |= RF.croppingLeft;
          } else if (mouseX > (region.x + region.width) - cropWidth) {
            region.flags |= RF.croppingRight;
          } else {
            region.flags |= RF.shifting;
          }

          region.dragX = mouseX;
          region.dragY = mouseY;
          region.originalOffsetStart = region.offsetStart;
          region.originalStart = region.start;
          region.originalEnd = region.end;
        }
      } else {
        region.Unset(RF.hovered);
        region.Unset(RF.hoveredEnds);
        if (e.type === "mousedown") {
          region.flags = 0;
          input.ResetSelection(state);
        }
      }

      if (e.type === "mouseup") {
        if (region.Is(RF.held)) {
          region.flags = RF.selected;
        }
      }

      if (e.type === "mousemove") {
        if (region.Is(RF.held)) {

          const dragOffsetX = mouseX - region.dragX;

          const barsDragged = dragOffsetX / barWidth;
          const secondsPerBar = 240.0 / state.player.tempo;

          const durationDragged = barsDragged * secondsPerBar;

          if (region.Is(RF.croppingLeft)) {
            const prevStart = region.start;
            const prevOffsetStart = region.offsetStart;

            region.offsetStart = region.originalOffsetStart + durationDragged;
            region.start       = region.originalStart + durationDragged;

            if (region.start < 0) {
              region.start = 0
            }
            if (region.offsetStart < 0) {
              region.offsetStart = 0;
            }

            let illegal = false;
            if (region.duration > region.totalDuration) illegal = true;
            else if (region.duration < 0.001) illegal = true;
            if (illegal) {
              region.start = prevStart;
              region.offsetStart = prevOffsetStart;
            }

          } else if (region.Is(RF.croppingRight)) {
            const prevEnd = region.end;
            region.end = region.originalEnd + durationDragged;

            let illegal = false;
            if (region.duration > region.totalDuration) illegal = true;
            if (region.duration < 0.001) illegal = true;

            if (illegal) {
              region.end = prevEnd;
            }

          } else if (region.Is(RF.shifting)) {
            const prevEnd = region.end;

            region.start = region.originalStart + durationDragged;
            region.end = region.originalEnd + durationDragged;

            if (region.start < 0) {
              region.start = 0;
              region.end = prevEnd;
            }
          }
        }
      }
    }
  }
}

export const Timeline = () => {

  const state = useCtx();
  const [zoom, setZoom] = useState(MAX_BAR_WIDTH / 4);

  useEffect(() => {
    const canvas: HTMLCanvasElement = document.getElementById("track-canvas");

    // Canvas for some reason does not by default account for the dpi of the device, resulting in blurry everything, sigh ...
    // Thanks to https://medium.com/@mikeeustace_47705/this-fixed-the-blur-problem-for-me-thank-you-986fbfe6b39a for a solution to that
    let dpi = window.devicePixelRatio;
    canvas.setAttribute("height", `${canvas.clientHeight * dpi}`);
    canvas.setAttribute("width", `${canvas.clientWidth * dpi}`);

    const ctx: Canvas2D = canvas.getContext("2d");

    let frameId: number;
    const renderLoop = () => {
      drawOneFrame(canvas, ctx, zoom, state);
      frameId = requestAnimationFrame(renderLoop);
    }
    frameId = requestAnimationFrame(renderLoop);

    canvas.addEventListener("keydown", (e: KeyboardEvent) => handleInput(e, state, zoom));
    canvas.addEventListener("keypress", (e: KeyboardEvent) => handleInput(e, state, zoom));
    canvas.addEventListener("mousemove", (e: MouseEvent) => handleInput(e, state, zoom));
    canvas.addEventListener("mousedown", (e: MouseEvent) => handleInput(e, state, zoom));
    canvas.addEventListener("mouseup", (e: MouseEvent) => handleInput(e, state, zoom));

    return () => {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener("keydown", handleInput);
      canvas.removeEventListener("keypress", handleInput);
      canvas.removeEventListener("mousemove", handleInput);
      canvas.removeEventListener("mousedown", handleInput);
      canvas.removeEventListener("mouseup", handleInput);
    };
  }, [zoom]);

  // Pinch to zoom
  useEffect(() => {
    const el: HTMLCanvasElement = document.getElementById("pinch-target");

    el.onwheel = (event) => {
      if (event.ctrlKey) {
        event.preventDefault();

        const sensitivity = -0.002;
        zoomScale += event.deltaY * sensitivity;
        zoomScale = Math.min(Math.max(0, zoomScale), 2);

        setZoom(MAX_BAR_WIDTH * zoomScale + MIN_BAR_WIDTH);
      }
    }
  }, []);

  return (
    <div id="pinch-target" className="w-auto h-full overflow-auto touch-none">
      <canvas tabIndex={0} id="track-canvas" className="w-[5000px] h-[5000px] outline-none" />
    </div>
  )
}
