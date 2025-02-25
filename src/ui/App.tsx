import { TabBar } from "./TabBar/TabBar.tsx";
import { ControlBar } from "./ControlBar/ControlBar.tsx";
import { TrackPlayer } from "./TrackPlayer/TrackPlayer.tsx";
import { TrackList } from "./TrackList/TrackList.tsx";

function App() {
  return (
    <main className="w-full h-[90vh]">
      <TabBar />
      <ControlBar />

      <div className="flex w-full h-full">
        <TrackList />

        <TrackPlayer />
      </div>
    </main>
  )
}

export default App;
