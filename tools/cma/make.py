"""One-step build: python3 make.py spec.json  ->  הערכת-שווי-<slug>.pptx + .pdf (+ preview grid.jpg) in OUT dir."""
import json, os, sys, glob, hashlib, shutil, subprocess, zipfile, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PPTX_SKILL = sys.argv[3] if len(sys.argv) > 3 else None
spec = os.path.abspath(sys.argv[1])
out_dir = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.getcwd()
S = json.load(open(spec))
name = "הערכת-שווי-" + S.get("slug", S["address"].replace(" ", "-"))
raw = os.path.join(tempfile.mkdtemp(), "raw.pptx")
subprocess.run(["node", os.path.join(HERE, "cma.js"), spec, raw], check=True, cwd=HERE)

# dedupe identical media and repack
u = tempfile.mkdtemp()
zipfile.ZipFile(raw).extractall(u)
h = {}
for m in sorted(glob.glob(u + "/ppt/media/*")):
    h.setdefault(hashlib.md5(open(m, "rb").read()).hexdigest(), []).append(os.path.basename(m))
for v in h.values():
    for a in v[1:]:
        for r in glob.glob(u + "/ppt/slides/_rels/*.rels"):
            t = open(r).read().replace("../media/" + a + '"', "../media/" + v[0] + '"')
            open(r, "w").write(t)
        os.remove(u + "/ppt/media/" + a)
pptx = os.path.join(out_dir, name + ".pptx")
if os.path.exists(pptx): os.remove(pptx)
subprocess.run(["zip", "-X", "-9", "-r", "-q", "-D", pptx, "[Content_Types].xml", "_rels", "docProps", "ppt"], cwd=u, check=True)

# pdf + preview
soffice = os.path.join(PPTX_SKILL, "scripts/office/soffice.py") if PPTX_SKILL else None
cmd = ["python3", soffice] if soffice and os.path.exists(soffice) else ["soffice"]
subprocess.run(cmd + ["--headless", "--convert-to", "pdf", "--outdir", out_dir, pptx], check=True, capture_output=True)
pdf = os.path.join(out_dir, name + ".pdf")
pv = tempfile.mkdtemp()
subprocess.run(["pdftoppm", "-jpeg", "-r", "60", pdf, pv + "/s"], check=True)
from PIL import Image
ims = [Image.open(p) for p in sorted(glob.glob(pv + "/s-*.jpg"))]
w, hh = ims[0].size
g = Image.new("RGB", (w * 3, hh * ((len(ims) + 2) // 3)), "white")
for i, im in enumerate(ims): g.paste(im, ((i % 3) * w, (i // 3) * hh))
g.save(os.path.join(out_dir, "grid.jpg"), quality=80)
print(pptx); print(pdf); print(os.path.join(out_dir, "grid.jpg"))
