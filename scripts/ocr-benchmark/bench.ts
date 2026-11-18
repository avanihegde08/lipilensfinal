import { createWorker, PSM } from "tesseract.js";
import { readFileSync, writeFileSync } from "fs";
import { pageToScanResult } from "../../src/lib/lipi/ocr.ts";
const dir = process.argv[2]; const rotate = process.argv[3] === "rot";
const gt: Record<string,string> = JSON.parse(readFileSync("gt.json","utf8"));
const norm = (s: string) => s.normalize("NFC").replace(/\s+/g," ").trim();
function lev<T>(a: T[], b: T[]) { let p = Array.from({length:b.length+1},(_,i)=>i); for (let i=1;i<=a.length;i++){ const c=[i]; for(let j=1;j<=b.length;j++) c.push(Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1))); p=c;} return p[b.length]; }
const w = await createWorker(["kan","eng"], 1, { cachePath: "/tmp/ocr/js/cache" });
await w.setParameters({ tessedit_pageseg_mode: (process.argv[4] ?? "6") as PSM });
const rows: any[] = [];
for (const name of Object.keys(gt)) {
  const { data } = await w.recognize(readFileSync(`${dir}/${name}`), { rotateAuto: rotate }, { text: true, blocks: true });
  const res = pageToScanResult(data);
  const hyp = norm(res.blocks.map(b => b.as_written).join(" ")); const ref = norm(gt[name]);
  const cer = lev([...ref],[...hyp])/ref.length; const wer = lev(ref.split(" "),hyp.split(" "))/ref.split(" ").length;
  const raw = norm(data.text); rows.push({ name, cer, wer, hyp, ref, raw, rawcer: lev([...ref],[...raw])/ref.length, lines: data.blocks.flatMap((b:any)=>b.paragraphs.flatMap((p:any)=>p.lines.map((l:any)=>[Math.round(l.confidence), l.text.trim()]))) });
}
await w.terminate();
const mean = (k: string, f=(r:any)=>true) => { const r=rows.filter(f); return (r.reduce((a,x)=>a+x[k],0)/r.length).toFixed(3); };
console.log(`${dir} rotateAuto=${rotate} CER ${mean("cer")} WER ${mean("wer")} rawCER ${mean("rawcer")}`);
for (const c of [...new Set(rows.map(r=>r.name.split("__")[1].replace(".jpg","")))]) console.log(`  ${c.padEnd(22)} CER ${mean("cer",r=>r.name.includes(c))} WER ${mean("wer",r=>r.name.includes(c))}`);
writeFileSync(`/tmp/ocr/js/res_${dir.split("/").pop()}_${rotate}.json`, JSON.stringify(rows,null,1));
