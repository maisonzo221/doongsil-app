#!/usr/bin/env python3
"""캐릭터 스튜디오(ChatGPT) 결과물 → 앱용 둥실곰 레이어(assets/bear, assets/items) 만들기.

  python3 scripts/build-bear-layers.py            # design-drops/ 의 PNG로 만들기
  python3 scripts/build-bear-layers.py --accept   # 아이템 크기·위치가 바뀐 것을 알고도 새 기준으로 받아들이기
  python3 scripts/build-bear-layers.py --icons    # (선택) 입은 모양에서 오려낸 아이콘도 새로 만들기 — 기본은 기존 아이콘 유지

필요: python3, opencv-python, numpy  (pip install opencv-python numpy)

입력(design-drops/): char_bear__front__base__v1.png (연두 배경 기준 곰)와, 아이템을 하나씩 입힌 같은 규격의 그림
  item_cap_01 / item_goggles_01 / item_suit_01(원피스) / item_suit_02(숏사각) / item_medal_01_gold … item_medal_04_gold
방식: 기준 곰과 아이템 착용본의 차이만 오려서 투명 배경 레이어로 만든다. 곰은 한 장이라 아이템을 바꿔도 몸이 변하지 않는다.

크기·위치 고정 규칙: 수모·수경·원피스·숏사각·메달의 크기와 위치는 design-drops/front-layout.json 에 기록된 값으로 고정이다.
디테일 디자인만 바뀌는 새 그림은 이 값에서 벗어나면(허용 오차 초과) 이 스크립트가 멈추고 알려준다.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DROPS = ROOT / 'design-drops'
BEAR_OUT = ROOT / 'assets' / 'bear'
ICON_OUT = ROOT / 'assets' / 'items'
LAYOUT = DROPS / 'front-layout.json'

# 1024x1536 원본에서 곰이 있는 부분만 잘라 절반으로 줄여 앱에 넣는다. (모든 레이어가 같은 자름·같은 배율)
CROP = dict(x=80, y=40, w=864, h=1448)
SCALE = 0.5
TOLERANCE_PX = 8  # 원본 기준. 아이템 위치·크기가 이보다 많이 달라지면 알려준다.

FILES = {
    'cap': 'item_cap_01',
    'goggles': 'item_goggles_01',
    'onepiece': 'item_suit_01',
    'trunks': 'item_suit_02',
    'medal1': 'item_medal_01_gold',
    'medal2': 'item_medal_02_silver',
    'medal3': 'item_medal_03_bronze',
    'medal4': 'item_medal_04_gold',
}
# 차이를 찾을 영역(원본 좌표 y0,y1,x0,x1)과 임계값
REGION = {
    'cap': (30, 330, 250, 760), 'goggles': (120, 300, 250, 760),
    'onepiece': (380, 1200, 150, 860), 'trunks': (850, 1200, 150, 860),
    'medal1': (340, 800, 250, 760), 'medal2': (340, 800, 250, 760),
    'medal3': (340, 800, 250, 760), 'medal4': (340, 800, 250, 760),
}
THRESH = {'onepiece': 40}


def load(name):
    p = DROPS / f'char_bear__front__{name}__v1.png'
    im = cv2.imread(str(p))
    if im is None:
        sys.exit(f'파일이 없어요: {p}')
    return im


def fill_holes(m):
    h, w = m.shape
    ff = m.copy().astype(np.uint8) * 255
    cv2.floodFill(ff, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 128)
    return (ff != 128).astype(np.uint8)


def extract(key, base, im):
    a = cv2.GaussianBlur(base, (0, 0), 1.2).astype(float)
    b = cv2.GaussianBlur(im, (0, 0), 1.2).astype(float)
    m = (np.abs(a - b).max(2) > THRESH.get(key, 30)).astype(np.uint8)
    y0, y1, x0, x1 = REGION[key]
    box = np.zeros_like(m)
    box[y0:y1, x0:x1] = 1
    m &= box
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    m = fill_holes(m)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] >= 400:
            keep[lab == i] = 1
    f = im.astype(float)
    bb, gg, rr = f[..., 0], f[..., 1], f[..., 2]
    green = gg - np.maximum(rr, bb)
    bg_mix = np.clip(1 - (green - 110) / 60, 0, 1)  # 배경 연두가 섞인 가장자리는 투명하게(초록 리본은 안전)
    keep = cv2.erode(keep, np.ones((3, 3), np.uint8)).astype(np.float32)
    alpha = cv2.GaussianBlur(keep, (0, 0), 0.9) * bg_mix
    if key != 'medal1':  # 초록 리본 말고는 남은 연두 번짐을 지운다
        alpha = cv2.erode(alpha, np.ones((3, 3), np.uint8))
        f[..., 1] = np.minimum(f[..., 1], np.maximum(rr, bb) + 8)
    return np.dstack([np.clip(f, 0, 255).astype(np.uint8), (np.clip(alpha, 0, 1) * 255).astype(np.uint8)])


def base_cutout(base):
    b, g, r = [base[..., i].astype(float) for i in range(3)]
    alpha = np.clip(1 - (g - np.maximum(r, b) - 40) / 90, 0, 1)
    f = base.astype(float)
    f[..., 1] = np.minimum(f[..., 1], np.maximum(r, b) + 8)
    return np.dstack([f.astype(np.uint8), (alpha * 255).astype(np.uint8)])


def bbox(layer):
    ys, xs = np.where(layer[..., 3] > 40)
    return [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]


def shrink(layer, crop=True, size=None):
    """투명도를 곱한 상태로 줄여서(가장자리 허연 테두리 방지) 다시 편다."""
    if crop:
        c = CROP
        layer = layer[c['y']:c['y'] + c['h'], c['x']:c['x'] + c['w']]
    f = layer.astype(np.float32)
    a = f[..., 3:4] / 255
    pm = np.dstack([f[..., :3] * a, f[..., 3:4]])
    h, w = layer.shape[:2]
    out_w, out_h = size if size else (round(w * SCALE), round(h * SCALE))
    pm = cv2.resize(pm, (out_w, out_h), interpolation=cv2.INTER_AREA)
    a2 = pm[..., 3:4] / 255
    rgb = np.where(a2 > 1e-3, pm[..., :3] / np.maximum(a2, 1e-3), 0)
    return np.dstack([np.clip(rgb, 0, 255), pm[..., 3:4]]).astype(np.uint8)


def icon(layer, size=192):
    x0, y0, x1, y1 = bbox(layer)
    pad = int(0.08 * max(x1 - x0, y1 - y0))
    H, W = layer.shape[:2]
    crop = layer[max(0, y0 - pad):min(H, y1 + pad + 1), max(0, x0 - pad):min(W, x1 + pad + 1)]
    h, w = crop.shape[:2]
    s = size / max(h, w)
    small = shrink(crop, crop=False, size=(max(1, round(w * s)), max(1, round(h * s))))
    out = np.zeros((size, size, 4), np.uint8)
    oy, ox = (size - small.shape[0]) // 2, (size - small.shape[1]) // 2
    out[oy:oy + small.shape[0], ox:ox + small.shape[1]] = small
    return out


def main():
    accept = '--accept' in sys.argv
    base = load('base')
    layers = {k: extract(k, base, load(v)) for k, v in FILES.items()}
    boxes = {k: bbox(v) for k, v in layers.items()}

    c = CROP
    for k, (x0, y0, x1, y1) in boxes.items():
        if x0 < c['x'] or y0 < c['y'] or x1 >= c['x'] + c['w'] or y1 >= c['y'] + c['h']:
            sys.exit(f'{k} 가 자른 영역 밖으로 나가요: {boxes[k]}')

    if LAYOUT.exists() and not accept:
        locked = json.loads(LAYOUT.read_text())
        bad = []
        for k, now in boxes.items():
            was = locked.get(k)
            if was and max(abs(a - b) for a, b in zip(now, was)) > TOLERANCE_PX:
                bad.append(f'  {k}: 기준 {was} → 새 그림 {now}')
        if bad:
            sys.exit('아이템 크기·위치가 고정 기준에서 벗어났어요. 디자인만 바꾸는 작업이라면 ChatGPT에서 다시 받아야 해요.\n'
                     + '\n'.join(bad) + '\n(알고도 새 기준으로 쓰려면 --accept)')
    LAYOUT.write_text(json.dumps(boxes, indent=1))

    BEAR_OUT.mkdir(parents=True, exist_ok=True)
    ICON_OUT.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(BEAR_OUT / 'front-base.png'), shrink(base_cutout(base)))
    for k, layer in layers.items():
        cv2.imwrite(str(BEAR_OUT / f'front-{k}.png'), shrink(layer))
        if '--icons' in sys.argv:
            cv2.imwrite(str(ICON_OUT / f'{k}.png'), icon(layer))
    out_w, out_h = round(c['w'] * SCALE), round(c['h'] * SCALE)
    print(f'완료: 앞면 레이어 {len(layers) + 1}장 ({out_w}x{out_h})' + (', 아이콘 갱신' if '--icons' in sys.argv else ''))
    print(f'BearSprite.tsx 의 FRONT 크기는 {{ w: {out_w}, h: {out_h} }} 이어야 해요.')


if __name__ == '__main__':
    main()
