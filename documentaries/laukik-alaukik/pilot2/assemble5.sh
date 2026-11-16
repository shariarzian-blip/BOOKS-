#!/bin/sh
# भाग 1 की शुरुआत, संस्करण 5 (73.5 सेकंड):
# अंतरिक्ष से अंबासण गाँव तक ज़ूम → काँटा → नन्हे पाँव → बालक चारों ओर देखता है →
# अमीरी/प्रकृति की खुशहाली बनाम भूख, प्यास, घुटती साँस, आँसू, दर्द → आँसू भरा चेहरा → सवाल → आकाश → ब्रह्मांड → असली तस्वीर → शीर्षक।
# कथन सबसे आगे: संगीत और ध्वनियाँ कथन के नीचे अपने-आप दबती हैं (sidechain)।
set -e; cd "$(dirname "$0")"
D=73.5
V="scale=1920:1080:flags=lanczos,fps=24,format=yuv420p,setsar=1"
RICH="eq=saturation=1.16:contrast=1.03"
POOR="eq=saturation=0.80:contrast=1.05"
L="-loop 1 -framerate 24 -t $D"
ffmpeg -y -loglevel error \
 -i clips/earth-zoom.mp4 -i clips/aerial.mp4 -i clips/v1-thorn.mp4 -i clips/v2-feet.mp4 -i clips/n-wide.mp4 \
 -i clips/a1-feast.mp4 -i clips/m1-hunger.mp4 -i clips/a2-water.mp4 -i clips/m2-thirst.mp4 -i clips/a3-nature.mp4 -i clips/m3-air.mp4 \
 -i clips/m4-grief.mp4 -i clips/m5-pain.mp4 -i clips/v4-face.mp4 -i clips/n-tear.mp4 -i clips/v5-sky.mp4 -i clips/v6-space.mp4 \
 -loop 1 -framerate 24 -t 6 -i bapuji-frame.jpg \
 $L -i t-scrim.png $L -i t-loc.png $L -i t-scrim2.png $L -i t-name.png $L -i t-title.png $L -i t-part.png $L -i t-tag.png \
 -filter_complex "
 [0:v]$V,trim=0:10.5,setpts=PTS-STARTPTS,fade=t=in:st=0:d=1.0,fade=t=out:st=10.2:d=0.3:color=white[s0];
 [1:v]trim=0.15:2.65,setpts=PTS-STARTPTS,$V,fade=t=in:st=0:d=0.4:color=white[s1];
 [2:v]trim=0.5:3.1,setpts=PTS-STARTPTS,$V[s2];
 [3:v]trim=0.3:3.3,setpts=PTS-STARTPTS,$V[s3];
 [4:v]trim=0.4:3.35,setpts=PTS-STARTPTS,$V[s4];
 [5:v]trim=0.3:3.15,setpts=PTS-STARTPTS,$V,$RICH[s5];
 [6:v]trim=0.6:3.1,setpts=PTS-STARTPTS,$V,$POOR[s6];
 [7:v]trim=0.2:2.5,setpts=PTS-STARTPTS,$V,$RICH[s7];
 [8:v]trim=0.8:3.7,setpts=PTS-STARTPTS,$V,$POOR[s8];
 [9:v]trim=0.5:2.5,setpts=PTS-STARTPTS,$V,$RICH[s9];
 [10:v]trim=0.6:3.5,setpts=PTS-STARTPTS,$V,$POOR[s10];
 [11:v]trim=1.2:3.6,setpts=PTS-STARTPTS,$V,$POOR[s11];
 [12:v]trim=0.8:3.7,setpts=PTS-STARTPTS,$V,$POOR[s12];
 [13:v]trim=0.3:4.0,setpts=PTS-STARTPTS,$V[s13];
 [14:v]trim=0:5.0,setpts=1.08*(PTS-STARTPTS),$V,trim=0:5.4,setpts=PTS-STARTPTS[s14];
 [15:v]trim=0.6:4.8,setpts=PTS-STARTPTS,$V[s15];
 [16:v]trim=0.1:4.9,setpts=PTS-STARTPTS,$V[s16];
 [17:v]scale=7680:4320:flags=lanczos,zoompan=z='1+0.07*on/144':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=24,format=yuv420p,setsar=1,fade=t=in:st=0:d=0.8:color=white[s17];
 color=black:s=1920x1080:r=24:d=7.1,format=yuv420p,setsar=1[s18];
 [s0][s1][s2][s3][s4][s5][s6][s7][s8][s9][s10][s11][s12][s13][s14][s15][s16][s17][s18]concat=n=19:v=1:a=0,eq=contrast=1.04:saturation=1.03[base];
 [18:v]format=rgba,fade=t=in:st=11.0:d=0.4:alpha=1,fade=t=out:st=13.6:d=0.4:alpha=1[oa];
 [19:v]format=rgba,fade=t=in:st=11.1:d=0.4:alpha=1,fade=t=out:st=13.6:d=0.4:alpha=1[ob];
 [20:v]format=rgba,fade=t=in:st=61.0:d=0.5:alpha=1,fade=t=out:st=65.6:d=0.5:alpha=1[oc];
 [21:v]format=rgba,fade=t=in:st=61.2:d=0.5:alpha=1,fade=t=out:st=65.6:d=0.5:alpha=1[od];
 [22:v]format=rgba,fade=t=in:st=66.5:d=0.3:alpha=1,fade=t=out:st=72.0:d=1.0:alpha=1[oe];
 [23:v]format=rgba,fade=t=in:st=67.3:d=0.5:alpha=1,fade=t=out:st=72.0:d=1.0:alpha=1[of];
 [24:v]format=rgba,fade=t=in:st=68.2:d=0.6:alpha=1,fade=t=out:st=72.0:d=1.0:alpha=1[og];
 [base][oa]overlay=enable='between(t,10.9,14.1)'[b1];[b1][ob]overlay=enable='between(t,10.9,14.1)'[b2];
 [b2][oc]overlay=enable='between(t,60.9,66.2)'[b3];[b3][od]overlay=enable='between(t,60.9,66.2)'[b4];
 [b4][oe]overlay=enable='gte(t,66.4)'[b5];[b5][of]overlay=enable='gte(t,66.4)'[b6];[b6][og]overlay=enable='gte(t,66.4)',noise=alls=3:allf=t+u,trim=0:$D[v]" \
 -map "[v]" -c:v libx264 -preset medium -crf 21 -pix_fmt yuv420p -r 24 picture5.mp4

A="aformat=sample_rates=48000:channel_layouts=stereo"
S=audio
ffmpeg -y -loglevel error -i picture5.mp4 \
 -i $S/v5/n0.wav -i $S/v4/n1.wav -i $S/v4/n2.wav -i $S/v5/n3.wav -i $S/v5/n4.wav -i $S/v5/child-raw.wav -i $S/v5/n5.wav \
 -i $S/music-interstellar-ambient.mp3 -i $S/music-bansuri.mp3 -i $S/music.mp3 -i $S/music.mp3 \
 -i $S/sub-drop.mp3 -i $S/time-warp-whoosh.mp3 -i $S/approaching-riser.mp3 -i $S/deep-boom.mp3 -i $S/low-fast-whoosh.mp3 \
 -i $S/deep-whoosh.mp3 -i $S/reverse-whoosh-hit.mp3 -i $S/tonal-boom.mp3 -i $S/tension-riser-reveal.mp3 -i $S/deep-braam.mp3 \
 -i $S/impact-hit.mp3 -i $S/title-braam.mp3 -i $S/shankh.mp3 -i $S/sub-boom.mp3 \
 -filter_complex "
 [1:a]$A,adelay=1300:all=1[n0];
 [2:a]$A,atempo=1.05,adelay=7400:all=1[n1];
 [3:a]$A,atempo=1.05,adelay=14000:all=1[n2];
 [4:a]$A,adelay=19900:all=1[n3];
 [5:a]$A,adelay=42000:all=1[n4];
 [6:a]$A,atrim=0:2.65,afade=t=out:st=2.5:d=0.15,aecho=0.9:0.6:70:0.18,volume=1.0,adelay=48800:all=1[ch];
 [7:a]$A,adelay=56100:all=1[n5];
 [n0][n1][n2][n3][n4][ch][n5]amix=inputs=7:normalize=0:duration=longest,apad=whole_dur=$D,deesser=i=0.35,volume=1.4,asplit=3[vo][k1][k2];
 [8:a]$A,atrim=0:21.5,volume=0.42,afade=t=in:st=0:d=1.5,afade=t=out:st=18.3:d=3.2[m1];
 [9:a]$A,volume=1.3,afade=t=out:st=33.8:d=2.6,adelay=12500:all=1[m2];
 [10:a]$A,atrim=8.8:23.9,asetpts=PTS-STARTPTS,volume=0.28,afade=t=in:st=0:d=0.5,afade=t=out:st=14.8:d=0.3,adelay=51400:all=1[m3];
 [11:a]$A,atrim=143.2:149,asetpts=PTS-STARTPTS,volume=0.32,afade=t=in:st=0:d=0.2,adelay=66200:all=1[m4];
 [m1][m2][m3][m4]amix=inputs=4:normalize=0:duration=longest,apad=whole_dur=$D[mu0];
 [mu0][k1]sidechaincompress=threshold=0.06:ratio=4:attack=20:release=450[mu];
 [12:a]$A,volume=0.5[f1];
 [13:a]$A,afade=t=out:st=7.6:d=1.2,volume=0.6,adelay=2600:all=1[f2];
 [14:a]$A,volume=0.4,adelay=4700:all=1[f3];
 [15:a]$A,asplit=3[db1][db2][db3];
 [db1]volume=0.5,adelay=10400:all=1[f4];
 [db2]volume=0.28,adelay=36900:all=1[f5];
 [db3]volume=0.28,adelay=39300:all=1[f6];
 [16:a]$A,volume=0.4,adelay=12600:all=1[f7];
 [17:a]$A,asplit=4[dw1][dw2][dw3][dw4];
 [dw1]volume=0.3,adelay=15150:all=1[f8];
 [dw2]volume=0.3,adelay=26450:all=1[f9];
 [dw3]volume=0.3,adelay=31650:all=1[f10];
 [dw4]volume=0.4,adelay=59950:all=1[f11];
 [18:a]$A,volume=0.4,adelay=20750:all=1[f12];
 [19:a]$A,asplit=3[tb1][tb2][tb3];
 [tb1]volume=0.5,adelay=24000:all=1[f13];
 [tb2]volume=0.5,adelay=28800:all=1[f14];
 [tb3]volume=0.5,adelay=33700:all=1[f15];
 [20:a]$A,volume=0.45,adelay=48800:all=1[f16];
 [21:a]$A,volume=0.65,adelay=55300:all=1[f17];
 [22:a]$A,atrim=0:6.5,afade=t=out:st=5:d=1.5,volume=0.5,adelay=57800:all=1[f18];
 [23:a]$A,volume=0.75,adelay=64400:all=1[f19];
 [24:a]$A,volume=0.8,adelay=66600:all=1[f20];
 [25:a]$A,atrim=0:6,afade=t=out:st=4:d=2,volume=0.5,adelay=66400:all=1[f21];
 [f1][f2][f3][f4][f5][f6][f7][f8][f9][f10][f11][f12][f13][f14][f15][f16][f17][f18][f19][f20][f21]amix=inputs=21:normalize=0:duration=longest,apad=whole_dur=$D[fx0];
 [fx0][k2]sidechaincompress=threshold=0.06:ratio=3:attack=20:release=400[fx];
 [vo][mu][fx]amix=inputs=3:normalize=0:duration=longest,atrim=0:$D,afade=t=out:st=72.3:d=1.2,loudnorm=I=-16:TP=-2.0:LRA=11,alimiter=limit=0.68:attack=1:release=80:level=disabled[out]" \
 -map 0:v -map "[out]" -c:v copy -c:a aac -b:a 256k -shortest aisi-duniya-kyon-shuruaat-v5.mp4
ffprobe -v error -show_entries format=duration,size -of csv=p=0 aisi-duniya-kyon-shuruaat-v5.mp4
