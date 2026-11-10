"""Rebuild the homepage icons after adding a Font Awesome class.

Unpack @fortawesome/fontawesome-free@6.5.1 (npm pack), install fonttools==4.68.0
and brotli==1.2.0, then pass the unpacked package directory to this script.
If a font filename changes, update the precache list in sw.js and rebuild HTML.
Normal site builds use the checked-in subsets and do not require Python.
"""
import hashlib
import re
import shutil
import sys
from io import BytesIO
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
package = Path(sys.argv[1])
fonts = root / "assets/fonts"
sources = ("index.src.html", "forms.partial.html", "js/script.js")
used = set()
for source in sources:
    used.update(re.findall(r"\bfa-[a-z0-9-]+", (root / source).read_text("utf8")))

styles = {"fa-solid": ("Font Awesome 6 Free", "solid-900", 900),
          "fa-regular": ("Font Awesome 6 Free", "regular-400", 400),
          "fa-brands": ("Font Awesome 6 Brands", "brands-400", 400)}
names = used - styles.keys()
mapping = dict(re.findall(r'\.(fa-[\w-]+):{1,2}before\s*\{\s*content: "\\([a-f0-9]+)"',
                          (package / "css/all.css").read_text("utf8")))
if names - mapping.keys():
    sys.exit(f"Unknown Font Awesome icons: {sorted(names - mapping.keys())}")

css = ["/* Font Awesome Free 6.5.1, Fonticons, Inc. See assets/fonts/LICENSE-fontawesome.txt. */",
       ".fa-solid,.fa-regular,.fa-brands{display:inline-block;font-style:normal;"
       "font-variant:normal;line-height:1;text-rendering:auto;-webkit-font-smoothing:antialiased}"]
# Also keep codepoints used directly by CSS pseudo-elements (e.g. project checkmarks).
codepoints = {int(mapping[name], 16) for name in names}
for sheet in ("style", "projects", "services"):
    codepoints.update(int(code, 16) for code in re.findall(
        r"""content:\s*['"]\\([a-fA-F0-9]+)['"]""", (root / f"css/{sheet}.css").read_text("utf8")))
for style, (family, source, weight) in styles.items():
    font = TTFont(package / f"webfonts/fa-{source}.woff2", recalcTimestamp=False)
    small = subset.Subsetter()
    small.populate(unicodes=codepoints & font.getBestCmap().keys())
    small.subset(font)
    output = BytesIO()
    font.save(output)
    data = output.getvalue()
    name = f"home-{source}-{hashlib.sha256(data).hexdigest()[:8]}.woff2"
    (fonts / name).write_bytes(data)
    css.append(f"@font-face{{font-family:'{family}';font-weight:{weight};font-display:block;"
               f"src:url('../assets/fonts/{name}') format('woff2')}}")
    css.append(f".{style}{{font-family:'{family}';font-weight:{weight}}}")
for name in sorted(names):
    css.append(f'.{name}::before{{content:"\\{mapping[name]}"}}')
(root / "css/home-icons.css").write_text("\n".join(css) + "\n", encoding="utf8", newline="\n")
shutil.copyfile(package / "LICENSE.txt", fonts / "LICENSE-fontawesome.txt")
