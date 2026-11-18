# कथन की सफ़ाई: Google की आवाज़ वाली हर फ़ाइल के शुरू में कुछ ख़राब नमूने और अंत में ~0.16 सेकंड का तेज़ शोर आता है।
# चलाना: python3 clean_vo.py audio/v5/raw-n0.wav audio/v5/n0.wav
import sys, wave, numpy as np
def rd(p):
    w = wave.open(p); sr = w.getframerate(); ch = w.getnchannels()
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return (a.reshape(-1, ch).mean(1) if ch > 1 else a), sr
def wr(p, a, sr):
    w = wave.open(p, 'w'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
def env(a, sr, win=0.02):
    k = int(sr * win); n = len(a) // k; return np.sqrt((a[:n * k].reshape(n, k) ** 2).mean(1)), k
def clean(a, sr):
    a = a[int(0.02 * sr):].copy()                       # शुरू के 20 ms
    e, k = env(a, sr); cut = len(a)
    for i in range(len(e) - 1, len(e) - int(0.45 / 0.02), -1):   # अंत का पूरे-पैमाने वाला शोर
        if e[i] > 0.35: cut = i * k
    if cut < len(a):
        i = cut // k
        while i > 0 and e[i - 1] > 0.02: i -= 1
        a = a[:max(i * k, 1)]
    e, k = env(a, sr); nz = np.where(e > 0.012)[0]
    a = a[max(nz[0] * k - int(0.03 * sr), 0):min((nz[-1] + 1) * k + int(0.12 * sr), len(a))]
    f = int(0.008 * sr); a[:f] *= np.linspace(0, 1, f); g = int(0.06 * sr); a[-g:] *= np.linspace(1, 0, g)
    return a * (0.85 / np.abs(a).max())
if __name__ == '__main__':
    a, sr = rd(sys.argv[1]); c = clean(a, sr); wr(sys.argv[2], c, sr)
    print(sys.argv[2], round(len(c) / sr, 2), 's')
