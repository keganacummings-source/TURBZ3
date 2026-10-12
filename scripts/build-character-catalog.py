import json, re
from pathlib import Path
root = Path("public/CharacterPack")

def classify_weapon(name):
    n = name.lower()
    if any(k in n for k in ("bow", "crossbow", "sling", "javelin")):
        return "ranged", "bow" if "bow" in n else "ranged"
    if "shield" in n:
        return "shield", "shield"
    if any(k in n for k in ("staff", "quarterstaff")):
        return "weapon", "staff"
    if any(k in n for k in ("spear", "trident", "halberd", "glaive", "bardiche", "scythe")):
        return "weapon", "polearm"
    if "axe" in n:
        return "weapon", "axe"
    if any(k in n for k in ("mace", "hammer", "flail", "morningstar", "club", "whip")):
        return "weapon", "blunt"
    if any(k in n for k in ("dagger", "knife", "rapier", "sword", "blade", "katana")):
        return "weapon", "blade"
    return "weapon", "blade"

def slot_from_path(rel):
    r = rel.replace("\\", "/")
    if "/shields/" in r:
        return "shield", "shield"
    if "/headgear/" in r:
        return "head", "helm"
    if "/torso/" in r:
        return "chest", "armor"
    if "/hands/" in r:
        return "hands", "gloves"
    if "/feet/" in r:
        return "feet", "boots"
    if "/back/" in r:
        return "back", "cloak"
    if "/weapon/" in r or r.startswith("03_"):
        return classify_weapon(Path(r).name)
    if "/ring/" in r:
        return "ring", "ring"
    if "/amulet/" in r:
        return "relic", "amulet"
    if "/staff/" in r:
        return "weapon", "staff"
    if "/potion/" in r:
        return "consumable", "potion"
    if "/scroll/" in r:
        return "consumable", "scroll"
    if "/food/" in r:
        return "consumable", "food"
    if "/wand/" in r or "/rod/" in r:
        return "consumable", "wand"
    if "/hair/" in r:
        return "visual", "hair"
    if "/legs/" in r:
        return "visual", "legs"
    if "/body/" in r:
        return "visual", "body"
    return "misc", "misc"

def pretty(name):
    n = re.sub(r"\.(png|gif)$", "", name, flags=re.I)
    n = re.sub(r"_(new|old|\d+)$", "", n).replace("_", " ")
    return " ".join(w.capitalize() for w in n.split())

items, visuals = [], []
for png in sorted(root.rglob("*.png")):
    rel = str(png.relative_to(root)).replace("\\", "/")
    if rel.startswith("01_Character_Base/"):
        continue
    slot, kind = slot_from_path(rel)
    entry = {
        "id": rel.replace("/", "__").replace(".png", ""),
        "file": png.name,
        "path": f"/CharacterPack/{rel}",
        "slot": slot,
        "kind": kind,
        "name": pretty(png.name),
        "folder": str(Path(rel).parent).replace("\\", "/"),
    }
    (visuals if slot == "visual" else items).append(entry)

catalog = {
    "version": 1,
    "root": "/CharacterPack",
    "base": {
        "body": "/CharacterPack/01_Character_Base/human_female.png",
        "statue": "/CharacterPack/01_Character_Base/statue_form_humanoid.png",
    },
    "grip": {
        "blade": {"hx": 10, "hy": -2, "restAngle": -0.85, "swing": 1.4, "scale": 1.0},
        "axe": {"hx": 10, "hy": -2, "restAngle": -0.95, "swing": 1.55, "scale": 1.05},
        "blunt": {"hx": 10, "hy": -1, "restAngle": -0.9, "swing": 1.35, "scale": 1.0},
        "polearm": {"hx": 8, "hy": -4, "restAngle": -1.15, "swing": 0.9, "scale": 1.1},
        "staff": {"hx": 8, "hy": -4, "restAngle": -1.1, "swing": 0.85, "scale": 1.05},
        "bow": {"hx": 4, "hy": -2, "restAngle": -0.15, "swing": 0.25, "scale": 1.0},
        "ranged": {"hx": 6, "hy": -2, "restAngle": -0.4, "swing": 0.5, "scale": 1.0},
        "shield": {"hx": -10, "hy": 0, "restAngle": 0.15, "swing": 0.2, "scale": 0.95},
    },
    "items": items,
    "visuals": visuals,
    "counts": {"items": len(items), "visuals": len(visuals)},
}
(root / "catalog.json").write_text(json.dumps(catalog))
print("[character-pack] catalog", len(items), "items,", len(visuals), "visuals")
