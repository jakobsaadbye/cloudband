// @deno-types="npm:@types/react@19"
import { useState, useEffect } from "react";

import { Context, StateCtx, stateCtx } from "../core/context.ts";

import { TabBar } from "./panels/TabBar.tsx";
import { PlayControls } from "./panels/PlayControls.tsx";
import { Timeline } from "./panels/Timeline.tsx";
import { History } from "./panels/History.tsx";
import { TrackControls } from "./panels/TrackControls.tsx";
import { TrackList } from "./panels/TrackList.tsx";
import { LoadProject } from "../db/load.ts";
import { useDB } from "@jakobsaadbye/teilen-sql/react";

function App() {

  const [ctx, setCtx] = useState(stateCtx);
  const db = useDB();

  useEffect(() => {
    const initializeProject = async () => {
      const projectName = "unnamed";
      try {
        console.log(`Loading project '${projectName}' ...`);

        const context: Context = { ...ctx, S: setCtx };

        const success = await LoadProject(context, db, projectName);
        if (!success) {
          console.warn(`Failed to load project '${projectName}'`);
          return;
        }
      } catch (e) {
        console.warn(`Failed to load project '${projectName}'`, e);
      }
    }

    initializeProject();
  }, []);

  return (
    <StateCtx.Provider value={{ ...ctx, S: setCtx }}>
      <main className="w-full h-full overflow-hidden">
        <TabBar />
        <PlayControls />

        <div className="flex w-full h-[90vh]">
          <TrackList />

          <div className="flex flex-col w-full">
            <Timeline />
            <div className="h-[300px]">
              <TrackControls />
            </div>
          </div>

          <div className="w-100 h-full bg-gray-300 border-l-1 border-l-black/40">
            <History />
          </div>
        </div>
      </main>
    </StateCtx.Provider>
  )
}

export default App;
