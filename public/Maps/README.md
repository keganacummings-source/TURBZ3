# Maps

Place map JSON files here. The game loads them as live level data.

| File | Role |
|------|------|
| **main.json** | Overworld (must be named `main`) |
| **arena.json** | Circle arena floor |
| `<id>.json` | Custom dungeon / room from **Lets Build** |

## Format

See in-game **Lets Build** or `src/game/map-format.ts`.

- `floor` — surface (0 grass, 1 wall, 2 water, 3 road, …)
- `block` — 1 = solid
- Water is walkable but slows movement
- Walls / lava / block=1 cannot be walked through

## Workflow

1. Hub → **Lets Build**
2. Paint / fill / rect, set spawn
3. **Download map** → saves to your Downloads folder
4. Put the file in this folder (`main.json` for overworld)
5. Commit + push → Cloudflare deploy picks it up
