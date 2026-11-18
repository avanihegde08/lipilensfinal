import random, json, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
random.seed(7)
F="/usr/share/fonts/noto/"
fonts={"sans":(F+"NotoSansKannada.ttf",None),"serif":(F+"NotoSerifKannada.ttf",None),"ui":(F+"NotoSansKannada-UI-VF.ttf",None)}
texts={
 "t1_bus":"ಬಸ್ ನಿಲ್ದಾಣ\nತುಮಕೂರು 25 ಕಿ.ಮೀ",
 "t2_travels":"ಶ್ರೀ ಸೈ ಟ್ರಾವೆಲ್ಸ್\nಬೆಂಗಳೂರು - ಮೈಸೂರು",
 "t3_ksrtc":"ಕರ್ನಾಟಕ ರಾಜ್ಯ ರಸ್ತೆ ಸಾರಿಗೆ ನಿಗಮ",
 "t4_library":"ಸಾರ್ವಜನಿಕ ಗ್ರಂಥಾಲಯ\nಬೆಳಿಗ್ಗೆ 9 ರಿಂದ ಸಂಜೆ 6 ರವರೆಗೆ",
 "t5_parking":"ದಯವಿಟ್ಟು ಇಲ್ಲಿ ವಾಹನ ನಿಲ್ಲಿಸಬೇಡಿ\nಉಲ್ಲಂಘಿಸಿದರೆ ದಂಡ ವಿಧಿಸಲಾಗುವುದು",
}
def render(text,font,size,fg,bg,weight=None):
    f=ImageFont.truetype(font,size,layout_engine=ImageFont.Layout.RAQM)
    if weight:
        try: f.set_variation_by_axes([weight])
        except Exception: pass
    d=ImageDraw.Draw(Image.new("RGB",(10,10)))
    box=d.multiline_textbbox((0,0),text,font=f,spacing=size//3)
    w,h=box[2]-box[0],box[3]-box[1]; pad=size
    im=Image.new("RGB",(w+2*pad,h+2*pad),bg)
    ImageDraw.Draw(im).multiline_text((pad-box[0],pad-box[1]),text,font=f,fill=fg,spacing=size//3)
    return im
def photo(im,strength):
    # uneven lighting, slight rotation, blur, noise, jpeg
    w,h=im.size
    grad=Image.linear_gradient("L").resize((w,h)).point(lambda v:int(150+v*0.4))
    im=Image.composite(im,Image.new("RGB",(w,h),(40,40,40)),grad)
    im=im.rotate(random.uniform(-4,4)*strength,expand=True,fillcolor=(120,120,110),resample=Image.BICUBIC)
    im=im.filter(ImageFilter.GaussianBlur(0.8*strength))
    px=im.load()
    for _ in range(int(im.size[0]*im.size[1]*0.02*strength)):
        x,y=random.randrange(im.size[0]),random.randrange(im.size[1])
        r,g,b=px[x,y]; n=random.randint(-60,60); px[x,y]=(max(0,min(255,r+n)),)*3 if r==g==b else (max(0,min(255,r+n)),max(0,min(255,g+n)),max(0,min(255,b+n)))
    return im
os.makedirs("img",exist_ok=True); gt={}
conds=[("sans_clean_48","sans",48,(20,20,20),(255,255,255),0,None),
       ("serif_clean_48","serif",48,(20,20,20),(250,248,240),0,None),
       ("uibold_sign_48","ui",48,(255,255,255),(20,90,50),0,700),
       ("sans_lowres_18","sans",18,(20,20,20),(255,255,255),0,None),
       ("sans_photo_40","sans",40,(30,30,30),(235,225,200),1,None),
       ("serif_photo_hard_32","serif",32,(250,220,40),(150,30,30),1.6,None)]
for tk,t in texts.items():
    for cn,fk,size,fg,bg,ph,wt in conds:
        im=render(t,fonts[fk][0],size,fg,bg,wt)
        if ph: im=photo(im,ph)
        name=f"{tk}__{cn}.jpg"; im.save("img/"+name,quality=80 if ph else 92); gt[name]=t
json.dump(gt,open("gt.json","w"),ensure_ascii=False,indent=1)
print(len(gt))
