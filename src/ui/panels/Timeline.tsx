// @deno-types="npm:@types/react@19"
import { useEffect, useState } from "react";
import { audioContext, Context, useCtx } from "@core/context.ts";

type Canvas2D = CanvasRenderingContext2D;

const DrawLine = (ctx: Canvas2D, x0: number, y0: number, x1: number, y1: number, style = "#000000", thicccness = 1) => {
  ctx.lineWidth = thicccness;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = style;
  ctx.stroke();
}

let zoomScale = 0;

const MAX_BAR_WIDTH = 1000;
const MIN_BAR_WIDTH = 100;

const drawOneFrame = (canvas: HTMLCanvasElement, ctx: Canvas2D, zoom: number, state: Context) => {


  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const TRACK_HEIGHT = 60;
  const TOP_BAR_HEIGHT = 80;
  const PLAYHEAD_Y = TOP_BAR_HEIGHT / 2;

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Background
  ctx.fillStyle = "#AAAAAA";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Top-bar
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, WIDTH, TOP_BAR_HEIGHT);

  // Bar and beat divider
  DrawLine(ctx, 0, PLAYHEAD_Y, WIDTH, PLAYHEAD_Y, "#505050");

  // Bars
  const barWidth = zoom;
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

  // Playhead
  {
    const t = state.player.GetCurrentTime();

    const thickness = 6;
    const tempo = state.player.tempo;
    const secondsPerBar = 240.0 / tempo;


    const x = (t / secondsPerBar) * barWidth + thickness*0.5;
    const y = PLAYHEAD_Y;
    DrawLine(ctx, x, y, x, HEIGHT, "white", thickness);

  }

  // Track regions
  {

    // for ()
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

    return () => {
      cancelAnimationFrame(frameId);
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
      <canvas id="track-canvas" className="w-[5000px] h-[5000px]" />
    </div>
  )
}
