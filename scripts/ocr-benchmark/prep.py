import json, os, numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import uniform_filter, median_filter
gt=json.load(open("gt.json"))
def gray(im):
    a=np.asarray(im.convert("RGB")).astype(np.float32)
    return 0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2]
def upscale(im, target=1800, maxs=3.0):
    s=min(maxs, max(1.0, target/max(im.size)))
    return im.resize((round(im.width*s),round(im.height*s)),Image.BICUBIC) if s>1.05 else im
def stretch(g):
    lo,hi=np.percentile(g,1),np.percentile(g,99)
    return np.clip((g-lo)*255/max(1,hi-lo),0,255)
def otsu(g):
    h,_=np.histogram(g,256,(0,256)); p=h/h.sum(); w=np.cumsum(p); m=np.cumsum(p*np.arange(256)); mt=m[-1]
    sb=(mt*w-m)**2/(w*(1-w)+1e-9); return int(np.argmax(sb))
def dark_bg(g):
    t=otsu(g); return (g<t).mean()>0.5
def adaptive(g, frac=1/12, k=0.15):
    win=max(15,int(min(g.shape)*frac)|1)
    mean=uniform_filter(g,win); sq=uniform_filter(g*g,win); std=np.sqrt(np.maximum(sq-mean*mean,0))
    th=mean*(1+k*(std/128-1))  # Sauvola
    return np.where(g>th,255,0)
def unsharp(g,amt=0.6):
    from scipy.ndimage import gaussian_filter
    return np.clip(g+amt*(g-gaussian_filter(g,1.2)),0,255)
def pad(a,p=24): return np.pad(a,p,constant_values=255)
def V(name,im):
    im=upscale(im); g=gray(im)
    if name=="none": return np.asarray(im.convert("L"))
    g=median_filter(g,3) if "med" in name else g
    g=stretch(g)
    if dark_bg(g): g=255-g
    if "sharp" in name: g=unsharp(g)
    if "otsu" in name: g=np.where(g>otsu(g),255,0)
    if "adapt" in name: g=adaptive(g)
    return pad(g)
variants=["none","gray","gray_sharp","gray_otsu","gray_adapt","med_gray_adapt","med_gray"]
for v in variants:
    os.makedirs(f"pre_{v}",exist_ok=True)
    for n in gt:
        Image.fromarray(V(v,Image.open("img/"+n)).astype(np.uint8)).save(f"pre_{v}/{n}")
print("ok")
