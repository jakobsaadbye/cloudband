// @deno-types="npm:@types/react@19"
import { useEffect, useState, useRef } from "react";
import { Context, useCtx } from "@core/context.ts";
import { RF } from "@core/track.ts";
import { useDB } from "@jakobsaadbye/teilen-sql/react";
import { SqliteDB } from "@jakobsaadbye/teilen-sql";
import { SaveEntities } from "@/db/save.ts";
import { Player } from "@core/player.ts";
import { globalKeyboardInputIsDisabled } from "@core/input.ts";

type Canvas2D = CanvasRenderingContext2D;

const DrawLine = (ctx: Canvas2D, x0: number, y0: number, x1: number, y1: number, style = "#000000", thicccness = 1) => {
  ctx.lineWidth = thicccness;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = style;
  ctx.stroke();
}

const DrawRectangle = (ctx: Canvas2D, x: number, y: number, width: number, height: number, style = "#000000", roundness = [0, 0, 0, 0]) => {
  ctx.fillStyle = style;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, roundness);
  ctx.fill();
}

const DrawStrokedRectangle = (ctx: Canvas2D, x: number, y: number, width: number, height: number, strokeStyle = "#000000", fillStyle = "#000000", thickness = 1.0, roundness = [0, 0, 0, 0]) => {
  x += thickness / 2;
  y += thickness / 2;
  width -= thickness / 2;
  height -= thickness / 2;

  DrawRectangle(ctx, x, y, width, height, fillStyle, roundness);

  ctx.lineWidth = thickness;
  ctx.strokeStyle = strokeStyle;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, roundness);
  ctx.stroke();
}

const REGION_COLORS = [
  "#ffca69",
  "#69aaff",
  "#4fd663",
  "#e3e332",
  "#f55f5f",
  "#d45ff5",
];

const REGION_COLOR_BG_MUTED = "#c0c0c0";
const REGION_COLOR_FREQ_MUTED = "#c0c0c0";

let zoomScale = 0;

const MAX_BAR_WIDTH = 1000;
const MIN_BAR_WIDTH = 100;

const TOP_BAR_HEIGHT = 80;
const PLAYHEAD_Y = TOP_BAR_HEIGHT / 2;
const TRACK_START = TOP_BAR_HEIGHT;

const drawOneFrame = (canvas: HTMLCanvasElement, ctx: Canvas2D, zoom: number, state: Context) => {
  const scrollX = state.player.scrollX;
  const scrollY = state.player.scrollY;

  const WIDTH = canvas.width + scrollX;
  const HEIGHT = canvas.height + scrollY;

  // Background
  ctx.fillStyle = "#CCCCCC";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const barWidth = zoom;
  const beatWidth = barWidth / 4.0;

  canvas.style.cursor = "default";

  // Vertical bar lines
  {
    let i = 0;
    let barX = 0;
    while (barX < WIDTH) {
      if (i > 0) {
        DrawLine(ctx, barX, TOP_BAR_HEIGHT + scrollY, barX, HEIGHT, "#505050");
      }
      barX += barWidth;
      i += 1;
    }
  }

  //
  // Track regions
  //
  {
    const input = state.player.input;

    const trackHeight = 192;
    let trackIndex = 0;
    for (let i = 0; i < state.trackManager.tracks.length; i++) {
      const track = state.trackManager.tracks[i];
      if (track.deleted) continue;

      for (const region of track.regions) {
        if (region.deleted) continue;

        const secondsPerBar = 240.0 / state.player.tempo;

        const gapY = 6;

        const x = region.start / secondsPerBar * barWidth;
        let y = trackIndex * trackHeight + TRACK_START;
        const width = region.duration / secondsPerBar * barWidth;
        const height = trackHeight;

        y += gapY * trackIndex;

        let bgColor = REGION_COLORS[i];
        if (track.muted || track.mutedBySolo) {
          bgColor = REGION_COLOR_BG_MUTED;
        }

        let outline = "#303030";
        if (input.selectedRegion === region) {
          outline = "#FFFFFF";
        }

        DrawStrokedRectangle(ctx, x, y, width, height, outline, bgColor, 2, [8]);

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
        if (track.muted || track.mutedBySolo) {
          ctx.fillStyle = "#E0E0E0";
        }

        const regionWidthBeforeCutting = region.totalDuration / secondsPerBar * barWidth;
        const cuttedX = region.offsetStart / secondsPerBar * barWidth;
        const lineWidth = regionWidthBeforeCutting / frequencyData.length;
        for (let i = 0; i < frequencyData.length; i++) {
          const lineHeight = Math.abs(frequencyData[i] * region.height * 0.90);
          const x = (region.x - cuttedX + 1) + i * lineWidth;

          if (x < region.x + 1 || x > region.x + region.width - 4) continue;

          const y = region.y + region.height / 2 - lineHeight / 2;
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

      trackIndex += 1;
    }
  }

  // Top-bar
  {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0 + scrollY, WIDTH, TOP_BAR_HEIGHT);

    let i = 0;
    let barX = 0;
    let beatX = 0;
    while (beatX < WIDTH) {
      // Bar number
      ctx.font = "30px serif";
      ctx.fillStyle = "white";
      ctx.fillText("" + (i + 1), barX + 12, 30 + scrollY, barWidth);

      // Vertical lines
      if (i > 0) {

        // Top bar line
        DrawLine(ctx, barX, 0 + scrollY, barX, TOP_BAR_HEIGHT + scrollY, "#DDDDDD");

        // Top beat line
        if (i % 4 === 0) {
          // skip
        } else {
          DrawLine(ctx, beatX, PLAYHEAD_Y + 10 + scrollY, beatX, TOP_BAR_HEIGHT + scrollY, "#DDDDDD");
        }
      }

      barX += barWidth;
      beatX += beatWidth;
      i += 1;
    }
  }

  // Bar and beat divider
  DrawLine(ctx, 0, PLAYHEAD_Y + scrollY, WIDTH, PLAYHEAD_Y + scrollY, "#505050");


  // Playhead
  {
    const t = state.player.GetCurrentTime();

    const thickness = 3;
    const tempo = state.player.tempo;
    const secondsPerBar = 240.0 / tempo;


    let x = (t / secondsPerBar) * barWidth - thickness * 0.5;
    const y = PLAYHEAD_Y + scrollY;
    DrawRectangle(ctx, x, y, thickness, HEIGHT, "#FFFFFF");

    x += thickness * 0.5
    const w = 16;
    const h = PLAYHEAD_Y / 2;
    ctx.beginPath();
    ctx.strokeStyle = "#707070";
    ctx.lineWidth = 3;
    ctx.fillStyle = "#CCCCCC";
    ctx.moveTo(x, y);
    ctx.lineTo(x - w, y);
    ctx.lineTo(x - w, y + h);
    ctx.lineTo(x, y + h * 2);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x, y);
    ctx.fill();
    ctx.stroke();
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

const handleKeyboardInput = (e: KeyboardEvent, db: SqliteDB, state: Context, zoom: number) => {
  if (globalKeyboardInputIsDisabled(e)) return;

  const input = state.player.input;

  let handled = false;
  const key = e.key;

  if (e.metaKey && key === "s") {
    handled = true;
    input.SaveAll(state, db);
  }

  if (e.metaKey && key === "c") {
    handled = true;
    input.CopyRegion(state);
  }

  if (e.metaKey && key === "v") {
    handled = true;
    input.PasteRegion(state);
  }

  if (e.metaKey && key === "z") {
    handled = true;
    input.Undo(state);
  }

  if (e.metaKey && key === "y") {
    handled = true;
    input.Redo(state);
  }

  if (e.metaKey && key === "i" && input.selectedRegion) {
    handled = true;
    input.SplitRegion(state);
  }

  if (key === "Backspace" && input.selectedRegion) {
    handled = true;
    input.DeleteRegion(state);
  }

  if (key === "Backspace" && input.selectedTrack && !input.selectedRegion) {
    handled = true;
    input.DeleteTrack(state);
  }

  if (handled) {
    e.preventDefault();
  }
}


const handleMouseInput = (canvas: HTMLCanvasElement, e: MouseEvent, db: SqliteDB, state: Context, zoom: number) => {
  const player = state.player;
  const input = state.player.input;

  const scrollX = player.scrollX;
  const scrollY = player.scrollY;

  const WIDTH = canvas.width + scrollX;
  const HEIGHT = canvas.height + scrollY;

  const dpi = window.devicePixelRatio;
  const mouseX = (e.offsetX * dpi) + scrollX;
  const mouseY = (e.offsetY * dpi) + scrollY;

  const barWidth = zoom;
  const cropWidth = 20;

  //
  // Region controls
  //
  let regionSelected = null;

  const tracks = state.trackManager.tracks;
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
          input.SelectRegion(state, region, track);
          regionSelected = region;

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
          region.originalOffsetEnd = region.offsetEnd;
          region.originalStart = region.start;
          region.originalEnd = region.end;
        }
      } else {
        region.Unset(RF.hovered);
        region.Unset(RF.hoveredEnds);
        if (e.type === "mousedown") {

          // region.Unset(RF.selected);
          region.flags = 0;
        }
      }

      if (e.type === "mouseup") {

        let somethingChanged = false;
        if (region.start !== region.originalStart) somethingChanged = true;
        if (region.end !== region.originalEnd) somethingChanged = true;
        if (region.offsetStart !== region.originalOffsetStart) somethingChanged = true;
        if (region.offsetEnd !== region.originalOffsetEnd) somethingChanged = true;

        if (somethingChanged) {
          if (region.Is(RF.croppingLeft)) {
            input.Perfomed(state, "region-crop-start", [region, region.start, region.offsetStart, region.originalStart, region.originalOffsetStart]);
            SaveEntities(db, [region]);
          }
          if (region.Is(RF.croppingRight)) {
            input.Perfomed(state, "region-crop-end", [region, region.end, region.offsetEnd, region.originalEnd, region.originalOffsetEnd]);
            SaveEntities(db, [region]);
          }
          if (region.Is(RF.shifting)) {
            input.Perfomed(state, "region-shift", [region, region.start, region.end, region.originalStart, region.originalEnd]);
            SaveEntities(db, [region]);
          }
        }

        if (region.Is(RF.held)) {
          regionSelected = region;
          input.selectedRegion = region;
          region.Unset(RF.held);
        }
      }

      if (e.type === "mousemove") {
        if (region.Is(RF.held)) {

          const dragOffsetX = mouseX - region.dragX;

          const barsDragged = dragOffsetX / barWidth;
          const secondsPerBar = 240.0 / state.player.tempo;

          const durationDragged = snapToGrid(barsDragged * secondsPerBar, player.tempo);

          if (region.Is(RF.croppingLeft)) {
            const prevStart = region.start;
            const prevOffsetStart = region.offsetStart;

            region.start = region.originalStart + durationDragged;
            region.offsetStart = region.originalOffsetStart + durationDragged;

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
            const prevOffsetEnd = region.offsetEnd;

            region.end = region.originalEnd + durationDragged;
            region.offsetEnd = region.originalOffsetEnd + durationDragged;

            if (region.offsetEnd > 0) {
              region.offsetEnd = 0;
            }

            let illegal = false;
            if (region.duration > region.totalDuration) illegal = true;
            if (region.duration < 0.001) illegal = true;

            if (illegal) {
              region.end = prevEnd;
              region.offsetEnd = prevOffsetEnd;
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

  //
  // Play-head area controls
  //
  {
    const player = state.player;

    if (e.type === "mousedown") {
      if (CollisionPointRect(mouseX, mouseY, 0, PLAYHEAD_Y + scrollY, WIDTH, PLAYHEAD_Y)) {
        player.isPlayheadDragged = true;

        // Clicking on the top-bar while a region is selected should not deselect the currently selected region
        regionSelected = input.selectedRegion;

        const time = pixelToTime(zoom, player.tempo, mouseX);
        const snappedTime = snapToGrid(time, player.tempo);
        player.SetElapsedTime(state, snappedTime);
      }
    }

    if (e.type === "mousemove") {
      if (player.isPlayheadDragged) {
        const time = pixelToTime(zoom, player.tempo, mouseX);
        const snappedTime = snapToGrid(time, player.tempo);
        player.SetElapsedTime(state, snappedTime);
      }
    }

    if (e.type === "mouseup") {
      if (player.isPlayheadDragged) {
        player.isPlayheadDragged = false;
        regionSelected = input.selectedRegion;
      }
      player.isPlayheadDragged = false;
    }
  }

  // Region deselect
  {
    // Clicked outside of every region?
    if (e.type === "mousedown" && !regionSelected) {
      input.selectedRegion = null;
    }

    if (e.type === "mouseup" && !regionSelected) {
      input.selectedRegion = null;
    }
  }
}

const snapToGrid = (time: number, tempo: number) => {
  const secondsPerUnit = 15.0 / tempo;
  const units = Math.round(time / secondsPerUnit);

  return units * secondsPerUnit;
}

const pixelToTime = (zoom: number, tempo: number, x: number) => {
  const barWidth = zoom;
  const secondsPerBar = 240.0 / tempo;
  const bars = (x / barWidth);
  const elapsed = bars * secondsPerBar;
  return elapsed;
}

const timeToPixel = (zoom: number, tempo: number, time: number) => {
  const barWidth = zoom;
  const secondsPerBar = 240.0 / tempo;
  const bars = time / secondsPerBar;
  const x = bars * barWidth;
  return x;
}

export const Timeline = () => {
  const db = useDB();
  const state = useCtx();
  const [zoom, setZoom] = useState(MAX_BAR_WIDTH / 4);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasCtx, setCanvasCtx] = useState<Canvas2D | null>(null);
  const [viewport, setViewport] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const player = state.player;

  useEffect(() => {
    const canvas: HTMLCanvasElement = document.getElementById("track-canvas");

    // Upscale the canvas to the screen resolution. Otherwise things look blurry
    const dpi = window.devicePixelRatio;
    canvas.setAttribute("height", `${canvas.clientHeight * dpi}`);
    canvas.setAttribute("width", `${canvas.clientWidth * dpi}`);

    const canvasCtx: Canvas2D | null = canvas.getContext("2d", { alpha: true });
    if (!canvasCtx) {
      console.error(`Failed to instantiate canvas context`);
      return;
    }

    canvasRef.current = canvas;
    setCanvasCtx(canvasCtx);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !canvasCtx) return;

    const canvas = canvasRef.current;

    const targetFps = 90;

    let frameId = 0;

    const renderLoop = () => {

      // Scroll to center of playhead?
      if (state.player.isPlaying) {
        const x = timeToPixel(zoom, state.player.tempo, state.player.GetCurrentTime());
        player.scrollX = x - canvasRef.current!.width / 2;
        if (player.scrollX < 0) {
          player.scrollX = 0;
        }
      }

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      canvasCtx.save();
      canvasCtx.setTransform(1, 0, 0, 1, -player.scrollX, -player.scrollY);
      drawOneFrame(canvas, canvasCtx, zoom, state);
      canvasCtx.restore();

      frameId = requestAnimationFrame(renderLoop)
    }
    frameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(frameId);
    }
  }, [canvasCtx, zoom, state, viewport]);

  useEffect(() => {
    if (!canvasRef.current || !canvasCtx) return;

    const canvas = canvasRef.current;

    const handleScroll = (e: WheelEvent) => {
      e.preventDefault();

      player.scrollX += e.deltaX;
      player.scrollY += e.deltaY;
      if (player.scrollX < 0) player.scrollX = 0;
      if (player.scrollY < 0) player.scrollY = 0;
    }

    canvas.addEventListener("wheel", handleScroll);

    return () => {
      canvas.removeEventListener("wheel", handleScroll);
    }
  }, [canvasCtx, state]);

  useEffect(() => {
    if (!canvasRef.current || !canvasCtx) return;
    const canvas = canvasRef.current;

    const handleMouseInputCallback = (e: MouseEvent) => handleMouseInput(canvas, e, db, state, zoom);
    const handleKeyboardInputCallback = (e: KeyboardEvent) => handleKeyboardInput(e, db, state, zoom);

    document.addEventListener("keydown", handleKeyboardInputCallback);
    document.addEventListener("keypress", handleKeyboardInputCallback);
    canvas.addEventListener("mousemove", handleMouseInputCallback);
    canvas.addEventListener("mousedown", handleMouseInputCallback);
    document.addEventListener("mouseup", handleMouseInputCallback);

    return () => {
      document.removeEventListener("keydown", handleKeyboardInputCallback);
      document.removeEventListener("keypress", handleKeyboardInputCallback);
      canvas.removeEventListener("mousemove", handleMouseInputCallback);
      canvas.removeEventListener("mousedown", handleMouseInputCallback);
      document.removeEventListener("mouseup", handleMouseInputCallback);
    };
  }, [canvasRef.current, zoom, state]);


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

  useEffect(() => {
    if (!canvasRef.current || !canvasCtx) return;

    const canvas = canvasRef.current;

    const container = document.getElementById("pinch-target");
    if (!container) return;

    const dpi = window.devicePixelRatio;

    const updateViewport = () => {
      setViewport({
        x: container.scrollLeft * dpi,
        y: container.scrollTop * dpi,
        width: container.clientWidth * dpi,
        height: container.clientHeight * dpi,
      });

      canvas.setAttribute("height", `${canvas.clientHeight * dpi}`);
      canvas.setAttribute("width", `${canvas.clientWidth * dpi}`);
    };

    // Update on scroll & resize
    // container.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    updateViewport(); // Initial update

    return () => {
      // container.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [canvasRef.current]);

  return (
    <div id="pinch-target" className="w-auto h-full overflow-auto touch-none">
      <canvas ref={canvasRef} tabIndex={0} id="track-canvas" className="w-full h-full outline-none" />
    </div>
  )
}
