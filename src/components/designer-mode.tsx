import { useState } from "react";
import { MapBuilder } from "./map-builder";
import { EntityDesigner } from "./entity-designer";

export function DesignerMode({ onBack }: { onBack: () => void }) {
  const [tool, setTool] = useState<"map" | "entity" | null>(null);
  if (tool === "map") return <MapBuilder onBack={() => setTool(null)} />;
  if (tool === "entity") return <EntityDesigner onBack={() => setTool(null)} />;
  return (
    <div className="designer-screen">
      <header className="designer-header">
        <div>
          <p className="font-display text-xs text-blood">DESIGNER MODE</p>
          <h1 className="font-display text-lg">Builder Tools</h1>
        </div>
        <button className="px-btn" onClick={onBack}>
          Back to main menu
        </button>
      </header>
      <div className="designer-tool-list">
        <button className="px-panel designer-tool" onClick={() => setTool("map")}>
          <span className="font-display text-kyo">Map Builder</span>
          <p>Build Bossrooms, Dungeons, and full Worlds with the supplied tile collection.</p>
          <p className="text-dim">Paint terrain · collision · spawns · save · import / export</p>
        </button>
        <button className="px-panel designer-tool" onClick={() => setTool("entity")}>
          <span className="font-display text-kyo">Entity & Object Designer</span>
          <p>
            Create enemies (with ghost variants), player models, NPCs, campfires, trees, fishing
            spots, mining spots, boards, weapons, and custom interactables.
          </p>
          <p className="text-dim">
            Pixel sprites · combat stats · actions (Chop log, Take fish, Make Food…) · designer notes
            · import / export
          </p>
        </button>
      </div>
      <p className="designer-status">
        Designs are saved on this device. Export JSON files for future game updates or Map Builder
        placement.
      </p>
    </div>
  );
}
