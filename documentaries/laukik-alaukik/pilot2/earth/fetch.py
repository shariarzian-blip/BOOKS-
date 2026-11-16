# धरती की असली तस्वीरें: NASA GIBS (VIIRS NOAA-20, सार्वजनिक) और EOX Sentinel-2 cloudless 2018 (CC BY 4.0)
import subprocess, sys, os
LAT, LON = 23.4799339, 72.3461926   # अंबासण, मेहसाणा
D = sys.argv[1] if len(sys.argv) > 1 else '2026-11-15'
os.makedirs('src', exist_ok=True)
def get(url, out):
    if os.path.exists(out) and os.path.getsize(out) > 20000: return
    subprocess.run(['curl', '-sS', '-m', '240', '--retry', '3', '-o', out, url], check=True)
    print(out, os.path.getsize(out))
G = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&SRS=EPSG:4326&FORMAT=image/jpeg'
E = 'https://tiles.maps.eox.at/wms?service=WMS&version=1.1.1&request=GetMap&srs=EPSG:4326&format=image/jpeg'
get(f'{G}&LAYERS=VIIRS_NOAA20_CorrectedReflectance_TrueColor&TIME={D}&BBOX=-180,-90,180,90&WIDTH=8192&HEIGHT=4096', f'src/viirs-global-{D}.jpg')
get(f'{G}&LAYERS=BlueMarble_NextGeneration&TIME=2004-11-01&BBOX=-180,-90,180,90&WIDTH=8192&HEIGHT=4096', 'src/bluemarble-global.jpg')
get(f'{E}&layers=blackmarble&bbox=-180,-90,180,90&width=4096&height=2048', 'src/blackmarble-global.jpg')
for k in range(10):
    w = 90 / 2**k; b = f'{LON-w/2},{LAT-w/2},{LON+w/2},{LAT+w/2}'
    if k <= 4: get(f'{G}&LAYERS=VIIRS_NOAA20_CorrectedReflectance_TrueColor&TIME={D}&BBOX={b}&WIDTH=4096&HEIGHT=4096', f'src/viirs-{k}-{D}.jpg')
    if k >= 2: get(f'{E}&layers=s2cloudless-2018&bbox={b}&width=4096&height=4096', f'src/s2-{k}.jpg')
