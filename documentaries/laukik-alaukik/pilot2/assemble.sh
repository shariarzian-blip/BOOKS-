#!/bin/sh
# भाग 1 की शुरुआत (नया अंदाज़): छह चलते शॉट, असली तस्वीर, शीर्षक; ध्वनि आपकी Envato लाइब्रेरी से।
set -e; cd "$(dirname "$0")"
V="scale=1920:1080:flags=lanczos,fps=24,format=yuv420p,setsar=1"
ffmpeg -y -loglevel error \
 -i clips/v1-thorn.mp4 -i clips/v2-feet.mp4 -i clips/v3-wide.mp4 -i clips/v4-face.mp4 -i clips/v5-sky.mp4 -i clips/v6-space.mp4 \
 -loop 1 -framerate 24 -t 5 -i bapuji-frame.jpg \
 -loop 1 -framerate 24 -t 38 -i t-intro.png -loop 1 -framerate 24 -t 38 -i t-scrim.png -loop 1 -framerate 24 -t 38 -i t-loc.png \
 -loop 1 -framerate 24 -t 38 -i t-name.png -loop 1 -framerate 24 -t 38 -i t-title.png -loop 1 -framerate 24 -t 38 -i t-part.png -loop 1 -framerate 24 -t 38 -i t-tag.png -loop 1 -framerate 24 -t 38 -i t-scrim2.png \
 -filter_complex "
 color=black:s=1920x1080:r=24:d=1.7,format=yuv420p[s0];
 [0:v]trim=0.5:3.4,setpts=PTS-STARTPTS,$V[s1];
 [1:v]trim=0.3:3.5,setpts=PTS-STARTPTS,$V[s2];
 [2:v]trim=0.4:4.2,setpts=PTS-STARTPTS,$V[s3];
 [3:v]trim=0.3:4.7,setpts=PTS-STARTPTS,$V[s4];
 [4:v]trim=0:5.0,setpts=1.04*(PTS-STARTPTS),$V,trim=0:5.2[s5];
 [5:v]trim=0.1:4.9,setpts=PTS-STARTPTS,$V[s6];
 [6:v]scale=7680:4320:flags=lanczos,zoompan=z='1+0.07*on/120':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=24,format=yuv420p,setsar=1,fade=t=in:st=0:d=0.8:color=white[s7];
 color=black:s=1920x1080:r=24:d=7,format=yuv420p[s8];
 [s0][s1][s2][s3][s4][s5][s6][s7][s8]concat=n=9:v=1:a=0,eq=contrast=1.04:saturation=1.03[base];
 [7:v]format=rgba,fade=t=in:st=0.3:d=0.4:alpha=1,fade=t=out:st=1.25:d=0.35:alpha=1[o0];
 [8:v]format=rgba[sc1];[14:v]format=rgba[sc2];
 [sc1]fade=t=in:st=2.1:d=0.4:alpha=1,fade=t=out:st=4.2:d=0.35:alpha=1[oa];
 [9:v]format=rgba,fade=t=in:st=2.2:d=0.4:alpha=1,fade=t=out:st=4.2:d=0.35:alpha=1[ob];
 [sc2]fade=t=in:st=27.0:d=0.5:alpha=1,fade=t=out:st=30.4:d=0.5:alpha=1[oc];
 [10:v]format=rgba,fade=t=in:st=27.2:d=0.5:alpha=1,fade=t=out:st=30.4:d=0.5:alpha=1[od];
 [11:v]format=rgba,fade=t=in:st=31.0:d=0.25:alpha=1,fade=t=out:st=36.8:d=1.0:alpha=1[oe];
 [12:v]format=rgba,fade=t=in:st=31.7:d=0.5:alpha=1,fade=t=out:st=36.8:d=1.0:alpha=1[of];
 [13:v]format=rgba,fade=t=in:st=32.6:d=0.6:alpha=1,fade=t=out:st=36.8:d=1.0:alpha=1[og];
 [base][o0]overlay=enable='between(t,0,1.7)'[b0];
 [b0][oa]overlay=enable='between(t,2.0,4.6)'[b1];[b1][ob]overlay=enable='between(t,2.0,4.6)'[b2];
 [b2][oc]overlay=enable='between(t,26.9,31)'[b3];[b3][od]overlay=enable='between(t,26.9,31)'[b4];
 [b4][oe]overlay=enable='gte(t,31)'[b5];[b5][of]overlay=enable='gte(t,31)'[b6];[b6][og]overlay=enable='gte(t,31)',noise=alls=3:allf=t+u,trim=0:38[v]" \
 -map "[v]" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 24 picture.mp4

A="aformat=sample_rates=48000:channel_layouts=stereo"
ffmpeg -y -loglevel error -i picture.mp4 \
 -i audio/music.mp3 -i audio/n1.wav -i audio/n2.wav -i audio/n3.wav -i audio/child-full.wav -i audio/n4.wav \
 -i audio/sub-drop.mp3 -i audio/whoosh.mp3 -i audio/slow-cosmic-whoosh.mp3 -i audio/deep-boom.mp3 -i audio/low-fast-whoosh.mp3 \
 -i audio/approaching-riser.mp3 -i audio/reverse-whoosh-hit.mp3 -i audio/deep-braam.mp3 -i audio/deep-whoosh.mp3 -i audio/impact-hit.mp3 \
 -i audio/approaching-riser.mp3 -i audio/title-braam.mp3 -i audio/sub-boom.mp3 \
 -filter_complex "
 [1:a]$A,atrim=0:38,volume='0.55-0.30*clip((t-30.2)/0.8,0,1)+0.15*clip((t-32.5)/1.5,0,1)':eval=frame,afade=t=in:st=0:d=0.6,afade=t=out:st=35.5:d=2.5[mu];
 [2:a]$A,atempo=1.07,volume=1.5,adelay=2000:all=1[a1];
 [3:a]$A,atempo=1.07,volume=1.5,adelay=7900:all=1[a2];
 [4:a]$A,atempo=1.07,volume=1.5,adelay=14000:all=1[a3];
 [5:a]$A,atrim=0:2.3,volume=1.2,adelay=21700:all=1[a4];
 [6:a]$A,atempo=1.05,volume=1.5,adelay=26400:all=1[a5];
 [7:a]$A,volume=0.9,adelay=1700:all=1[f1];
 [8:a]$A,atrim=0:2.6,afade=t=out:st=2.0:d=0.6,volume=0.7,adelay=4500:all=1[f2];
 [9:a]$A,volume=0.75,adelay=7700:all=1[f3];
 [10:a]$A,volume=0.8,adelay=11600:all=1[f4];
 [11:a]$A,volume=0.7,adelay=15900:all=1[f5];
 [12:a]$A,volume=0.6,adelay=14500:all=1[f6];
 [13:a]$A,volume=0.8,adelay=19850:all=1[f7];
 [14:a]$A,volume=0.95,adelay=21200:all=1[f8];
 [15:a]$A,volume=0.7,adelay=25400:all=1[f9];
 [16:a]$A,atrim=0:5,afade=t=out:st=3.5:d=1.5,volume=0.8,adelay=26000:all=1[f10];
 [17:a]$A,volume=0.6,adelay=24300:all=1[f11];
 [18:a]$A,volume=1.0,adelay=31000:all=1[f12];
 [19:a]$A,atrim=0:6,afade=t=out:st=4:d=2,volume=0.8,adelay=31000:all=1[f13];
 [mu][a1][a2][a3][a4][a5][f1][f2][f3][f4][f5][f6][f7][f8][f9][f10][f11][f12][f13]amix=inputs=19:normalize=0:duration=longest,atrim=0:38,loudnorm=I=-14:TP=-1.0:LRA=11[out]" \
 -map 0:v -map "[out]" -c:v copy -c:a aac -b:a 256k -shortest nange-paon-shuruaat-v2.mp4
ffprobe -v error -show_entries format=duration,size -of csv=p=0 nange-paon-shuruaat-v2.mp4
