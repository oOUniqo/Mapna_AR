"""Package only runtime assets; keep previous deployment packages unchanged."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import hashlib,json,re,shutil,struct,zipfile

project=Path(__file__).resolve().parent.parent
source=project/'dist'
output=project.parent/'WebAR-server-ready-v5'
output.mkdir(exist_ok=True)
files=[
 'web.config','index.html','app.js','styles.css','marker.html','marker.js','marker-persistence.js','model-loader.js','model-gestures.js','camera-geometry.js','favicon.svg','_headers',
 'vendor/aframe-1.6.0.min.js','vendor/aframe-ar-3.4.8.js','vendor/camera_para.dat','vendor/LICENSE-aframe','vendor/LICENSE-arjs',
 'assets/brand/mogs-logo.png','assets/marker/marker-black.svg','assets/marker/mogs-white-background.patt','assets/model/MW35018A.glb'
]
for name in files:
 destination=output/name;destination.parent.mkdir(parents=True,exist_ok=True)
 shutil.copy2(source/name,destination)
readme='''نسخهٔ اصلاح هندسهٔ دوربین، نور و نرمی ردیابی - v5

تمام محتوای ZIP را در مسیر سایت استخراج کنید؛ index.html و web.config در ریشهٔ همان مسیر باشند.
اگر از قبل web.config سفارشی دارید، بخش staticContent این فایل را با آن ادغام کنید و تنظیمات دیگر سرور را نگه دارید.
دو فایل assets/marker/mogs-white-background.patt و vendor/camera_para.dat باید روی سرور قابل دانلود باشند؛ پاسخ درست HTTP 200 است.
این بسته نگاشت MIME پسوندهای .patt و .dat و .glb را برای IIS دارد. این تنظیم مجوز پوشه یا فایلِ آپلودنشده را درست نمی‌کند؛ فایل‌ها باید واقعاً در مسیرهای بسته موجود باشند.
HTTPS معتبر و مجوز دوربین لازم است. نصب npm یا build لازم نیست.
فایل مدل جدید: assets/model/MW35018A.glb . این فایل کامل است و BIN جداگانه لازم ندارد.
تمام فایل‌های نسخهٔ جدید، از جمله index.html، app.js، styles.css و model-gestures.js و camera-geometry.js و marker-persistence.js را جایگزین کنید.
روی تصویر دوربین با یک انگشت بکشید تا مدل بچرخد. دو انگشت برای زوم و چرخش است.
اگر از Git کلون می‌کنید، Physical Path سایت IIS باید پوشهٔ dist داخل مخزن باشد.
فایل‌های قدیمی با پسوند gltf و bin دیگر توسط این نسخه درخواست نمی‌شوند؛ می‌توانید آن‌ها را نگه دارید.
مسیر و بزرگی/کوچکی حروف نام فایل‌ها را حفظ کنید. سرور باید فایل glb را به‌صورت فایل باینری برگرداند، نه صفحهٔ index.html.
نوع MIME پیشنهادی GLB برابر model/gltf-binary است؛ نوع عمومی application/octet-stream هم توسط دانلودکنندهٔ این سایت پذیرفته می‌شود.
فایل VERSION.txt برای بررسی نسخه و SHA256SUMS.txt برای کنترل صحت فایل‌هاست.
فایل _headers فقط توسط میزبان‌های سازگار با این قالب پردازش می‌شود؛ تنظیمات وب‌سرورهای دیگر مستقل است.
برای مارکر مشکی از marker.html استفاده کنید. مهلت نگه‌داشتن آخرین موقعیت: ۰، ۰٫۵، ۱٫۵، ۳، ۵، ۸، ۱۰، ۱۵، ۳۰ و ۶۰ ثانیه؛ پیش‌فرض برای مرورگر بدون تنظیم قبلی ۵ ثانیه است.
گزینهٔ نرمی حرکت مدل پنج حالت دارد؛ حالت متوسط پیش‌فرض است. نرمی بیشتر تأخیر بیشتری در دنبال‌کردن حرکت دارد.
نور محیطی از ۰ تا ۰٫۶۵ قابل تنظیم است؛ پیش‌فرض ۰٫۳۰ است و نورهای جهت‌دار نیز کاهش یافته‌اند.
تنظیم‌ها در همان مرورگر ذخیره می‌شوند. هنگام قطع تشخیص، فقط آخرین موقعیت نسبت به دوربین ثابت می‌ماند؛ این قابلیت ردیابی فضایی مستقل نیست.
اصلاح نسبت تصویر برای ورودی‌های ۴:۳، ۱۶:۹ و عمودی در مرورگر آزمایش شده است. آزمون نهایی با گوشی و مارکر واقعی لازم است.
برای بررسی کش مرورگر، app.js و camera-geometry.js باید با v=tracking-v5 بارگذاری شوند.
'''
(output/'README-DEPLOY.fa.txt').write_text(readme)
(output/'VERSION.txt').write_text('tracking-v5\n')
checksums=''.join(hashlib.sha256((output/n).read_bytes()).hexdigest()+'  '+n+'\n' for n in files)
(output/'SHA256SUMS.txt').write_text(checksums)
class Links(HTMLParser):
 def __init__(self):super().__init__();self.refs=[]
 def handle_starttag(self,tag,attrs):self.refs.extend(v for k,v in attrs if k in ('href','src') and v)
for name in ('index.html','marker.html'):
 parser=Links();parser.feed((output/name).read_text())
 for ref in parser.refs:
  parsed=urlsplit(ref)
  if not parsed.scheme and parsed.path:assert (output/unquote(parsed.path)).exists(),ref
for ref in re.findall(r"loadScript\(['\"]([^'\"]+)",(output/'app.js').read_text()):assert (output/urlsplit(ref).path).is_file(),ref
blob=(output/'assets/model/MW35018A.glb').read_bytes()
assert struct.unpack_from('<III',blob)==(0x46546c67,2,len(blob))
jlen,jtype=struct.unpack_from('<II',blob,12);assert jtype==0x4e4f534a
model=json.loads(blob[20:20+jlen]);assert all('uri' not in b for b in model['buffers'])
assert not model.get('images')
archive=output.with_suffix('.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for name in files+['README-DEPLOY.fa.txt','VERSION.txt','SHA256SUMS.txt']:z.write(output/name,name)
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for name in files:assert z.read(name)==(source/name).read_bytes(),name
print(json.dumps({'folder':str(output),'zip':str(archive),'bytes':archive.stat().st_size,'runtime_files':len(files),'checks':'passed'},indent=2))
