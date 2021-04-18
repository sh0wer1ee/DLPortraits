import json
import os
from PIL import Image

ROOT = os.path.dirname(os.path.realpath(__file__))
#--CONFIG--#
INPUT = os.path.join(ROOT, 'portrait_output')
OUTPUT = os.path.join(ROOT, 'combined')
#--CONFIG--#
os.makedirs(INPUT, exist_ok=True)
os.makedirs(OUTPUT, exist_ok=True)

def cutAll(dirs, root):
    for dir in dirs:
        if '_' in dir:
            cut(root, dir)

def cut(root, dir):
    data = json.load(open(f'{root}/{dir}/data.json', 'r', encoding = 'utf8'))
    offset = data['offset']
    baseImg = Image.open(f'{root}/{dir}/{dir}_base.png')
    try:
        icon = baseImg.crop((offset['x'], offset['y'], offset['x'] + offset['size_x'], offset['y'] + offset['size_y']))
    except KeyError:
        print(dir)
        icon = baseImg
    icon.save(os.path.join(OUTPUT, f'{dir}.png'))

if __name__ == '__main__':
    for root, dirs, files in os.walk(INPUT):
        if dirs: cutAll(dirs, root)