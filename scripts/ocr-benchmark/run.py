import json, subprocess, sys, unicodedata, os, re
from concurrent.futures import ThreadPoolExecutor
T="/nix/store/mxh2gc65j9djx8y93ksnzyi3bk8dnfd9-tesseract-5.5.4/bin/tesseract"
gt=json.load(open("gt.json"))
def norm(s): s=unicodedata.normalize("NFC",s); return re.sub(r"\s+"," ",s).strip()
def lev(a,b):
    prev=list(range(len(b)+1))
    for i,x in enumerate(a,1):
        cur=[i]
        for j,y in enumerate(b,1): cur.append(min(prev[j]+1,cur[j-1]+1,prev[j-1]+(x!=y)))
        prev=cur
    return prev[-1]
def score(ref,hyp):
    r,h=norm(ref),norm(hyp)
    return lev(r,h)/max(1,len(r)), lev(r.split(),h.split())/max(1,len(r.split()))
def ocr(args):
    model,imgdir,name,psm,oem,lang=args
    out=subprocess.run([T,os.path.join(imgdir,name),"-","--tessdata-dir",f"/tmp/ocr/models/{model}","-l",lang,"--psm",str(psm),"--oem",str(oem)],capture_output=True,text=True)
    return name,out.stdout
if __name__=="__main__":
    model,imgdir,psm,oem=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4]); lang=sys.argv[5] if len(sys.argv)>5 else "kan"
    with ThreadPoolExecutor(16) as ex: res=list(ex.map(ocr,[(model,imgdir,n,psm,oem,lang) for n in gt]))
    rows=[]; 
    for n,h in res:
        c,w=score(gt[n],h); rows.append((n,c,w,norm(h)))
    tag=f"{model}|{os.path.basename(imgdir)}|psm{psm}|oem{oem}|{lang}"
    json.dump(rows,open(f"res_{tag.replace('|','_')}.json","w"),ensure_ascii=False)
    import statistics as s
    print(f"{tag:45s} meanCER={s.mean(r[1] for r in rows):.3f} meanWER={s.mean(r[2] for r in rows):.3f}")
