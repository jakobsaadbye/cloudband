import './index.css'

// @deno-types="@types/react"
import { StrictMode } from 'react'
// @deno-types="@types/react-dom/client"
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

import { createDb } from "@jakobsaadbye/teilen-sql"
import { SqliteContext, Inspector } from "@jakobsaadbye/teilen-sql/react"


import { tables } from "@common/tables.ts";

const db = await createDb("cloudband.db");
await db.exec(tables, []);

await db.upgradeTableToCrr("projects", {
  replicate: {
    exclude: ["lastAccessed"]
  }
});
await db.upgradeTableToCrr("players", {
  replicate: {
    exclude: ["elapsedTime"]
  }
});
await db.upgradeTableToCrr("tracks", {
  replicate: {
    exclude: ["muted", "mutedBySolo", "soloed"]
  }
});
await db.upgradeTableToCrr("regions", {
  manualConflict: {
    include: ["start", "end"]
  }
});

await db.finalize();

createRoot(document.getElementById('root') as HTMLElement).render(
  // <StrictMode>
  <SqliteContext.Provider value={db}>
    <Inspector>
      <App />
    </Inspector>
  </SqliteContext.Provider>
  // </StrictMode>,
)
