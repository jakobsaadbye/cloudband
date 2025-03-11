// @deno-types="npm:@types/react@19"
import { useEffect, useState, useRef } from "react";
import { Context, useCtx } from "@core/context.ts";
import { Region, RF } from "@core/track.ts";
import { useDB } from "@jakobsaadbye/teilen-sql/react";
import { SqliteDB } from "@jakobsaadbye/teilen-sql";

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

const drawOneFrame = (canvas: HTMLCanvasElement, ctx: Canvas2D, zoom: number, state: Context, scrollX: number, scrollY: number) => {
  const WIDTH = canvas.width + scrollX;
  const HEIGHT = canvas.height + scrollY;

  const TOP_BAR_HEIGHT = 80;
  const PLAYHEAD_Y = TOP_BAR_HEIGHT / 2;
  const TRACK_START = TOP_BAR_HEIGHT;


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
          const lineHeight = Math.abs(frequencyData[i] * region.height * 0.90);
          const x = (region.x - cuttedX) + i * lineWidth;

          if (x < region.x || x > region.x + region.width) continue;

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

const handleKeyboardInput = (e: KeyboardEvent, db: SqliteDB, state: Context, zoom: number) => {
  const input = state.player.input;

  if (e.type === "keypress" || e.type === "keydown") {
    const ev = e as KeyboardEvent;
    let handled = false;
    const key = ev.key;

    if (ev.ctrlKey && key === "s") {
      handled = true;
      input.Save(db, state);
    }

    if (ev.ctrlKey && key === "c") {
      handled = true;
      input.CopyRegion(state);
    }

    if (ev.ctrlKey && key === "v") {
      handled = true;
      input.PasteRegion(state);
    }

    if (ev.ctrlKey && key === "z") {
      handled = true;
      input.Undo(state);
    }

    if (ev.ctrlKey && key === "y") {
      handled = true;
      input.Redo(state);
    }

    if (key === "Backspace") {
      handled = true;
      input.DeleteRegion(state);
    }

    if (handled) {
      e.preventDefault();
    }
  }
}


const handleMouseInput = (e: MouseEvent, db: SqliteDB, state: Context, zoom: number, scrollX: number, scrollY: number) => {
  const input = state.player.input;

  const dpi = window.devicePixelRatio;
  const mouseX = (e.offsetX * dpi) + scrollX;
  const mouseY = (e.offsetY * dpi) + scrollY;

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
          console.log(`Selected region`, region);
          

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
              // region.end = prevEnd;
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

  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const canvas: HTMLCanvasElement = document.getElementById("track-canvas");

    // Upscale the canvas to the screen resolution. Otherwise things look blurry
    const dpi = window.devicePixelRatio;
    canvas.setAttribute("height", `${canvas.clientHeight * dpi}`);
    canvas.setAttribute("width", `${canvas.clientWidth * dpi}`);

    const canvasCtx: Canvas2D | null = canvas.getContext("2d", { alpha: false });
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

    const targetFps = 60;

    let frameId = 0;
    let lastFrameTime = 0;
    const fpsInterval = 1000 / targetFps;

    const renderLoop = (timestamp) => {
      if (timestamp - lastFrameTime >= fpsInterval) {
        lastFrameTime = timestamp;

        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        canvasCtx.save();
        canvasCtx.setTransform(1, 0, 0, 1, -scrollX, -scrollY);
        drawOneFrame(canvas, canvasCtx, zoom, state, scrollX, scrollY);
        canvasCtx.restore();
      }

      frameId = requestAnimationFrame(renderLoop)
    }
    frameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(frameId);
    }
  }, [canvasCtx, zoom, state, viewport, scrollX, scrollY]);

  useEffect(() => {
    if (!canvasRef.current || !canvasCtx) return;

    const canvas = canvasRef.current;

    const handleScroll = (e: WheelEvent) => {
      e.preventDefault();

      let newScrollX = scrollX + e.deltaX;
      if (newScrollX < 0) newScrollX = 0;

      let newScrollY = scrollY + e.deltaY;
      if (newScrollY < 0) newScrollY = 0;

      setScrollX(newScrollX);
      setScrollY(newScrollY);
    }

    canvas.addEventListener("wheel", handleScroll);

    return () => {
      canvas.removeEventListener("wheel", handleScroll);
    }
  }, [canvasCtx, scrollX, scrollY]);

  useEffect(() => {
    const handleMouseInputCallback = (e: MouseEvent) => handleMouseInput(e, db, state, zoom, scrollX, scrollY);
    const handleKeyboardInputCallback = (e: KeyboardEvent) => handleKeyboardInput(e, db, state, zoom);

    document.addEventListener("keydown", handleKeyboardInputCallback);
    document.addEventListener("keypress", handleKeyboardInputCallback);
    document.addEventListener("mousemove", handleMouseInputCallback);
    document.addEventListener("mousedown", handleMouseInputCallback);
    document.addEventListener("mouseup", handleMouseInputCallback);

    return () => {
      document.removeEventListener("keydown", handleKeyboardInputCallback);
      document.removeEventListener("keypress", handleKeyboardInputCallback);
      document.removeEventListener("mousemove", handleMouseInputCallback);
      document.removeEventListener("mousedown", handleMouseInputCallback);
      document.removeEventListener("mouseup", handleMouseInputCallback);
    };
  }, [zoom, state, scrollX, scrollY]);


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
    container.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    updateViewport(); // Initial update

    return () => {
      container.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [canvasRef.current]);

  return (
    <div id="pinch-target" className="w-auto h-full overflow-auto touch-none">
      <canvas ref={canvasRef} tabIndex={0} id="track-canvas" className="w-full h-full outline-none" />
    </div>
  )
}
