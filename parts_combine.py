'''
    combine images
'''
import json
import random
import os
from PIL import Image

ROOT = os.path.dirname(os.path.realpath(__file__))
#--CONFIG--#
INPUT = os.path.join(ROOT, 'portrait_output')
OUTPUT = os.path.join(ROOT, 'combined')
#--CONFIG--#
os.makedirs(INPUT, exist_ok=True)
os.makedirs(OUTPUT, exist_ok=True)

def combineImage(firstLayerID, secondLayerID, baseID):
    firstLayerID = str(firstLayerID).zfill(3)
    secondLayerID = str(secondLayerID).zfill(3)
    data = json.load(open(('%s\\%s\\data.json') % (INPUT, baseID), 'r', encoding = 'utf8'))
    firstLayer = Image.open(('%s\\%s\\%s_parts_c%s.png') % (INPUT, baseID, baseID, firstLayerID))
    secondLayer = Image.open(('%s\\%s\\%s_parts_c%s.png') % (INPUT, baseID, baseID, secondLayerID))
    baseLayer = Image.open(('%s\\%s\\%s_base.png') % (INPUT, baseID, baseID))
    # secondLayer.paste(firstLayer, (0,0), firstLayer)
    secondLayer = Image.alpha_composite(secondLayer, firstLayer)
    baseLayer.paste(secondLayer,(data['offset']['x'], data['offset']['y']), secondLayer)
    baseLayer.save(('%s\\%s_c%s_c%s.png') % (OUTPUT, baseID, firstLayerID, secondLayerID))

def randomCombineChara(portraitList):
    chosen = random.choice(portraitList)
    while chosen[0] != '1':
        chosen = random.choice(portraitList)
    data = json.load(open(('%s\\%s\\data.json') % (INPUT, chosen), 'r', encoding = 'utf8'))
    print(chosen)
    chosenFirstLayer = random.choice(data['partsData']['mouthParts']).replace('./', '')
    chosenSecondLayer = random.choice(data['partsData']['faceParts']).replace('./', '')
    firstLayer = Image.open(chosenFirstLayer)
    secondLayer = Image.open(chosenSecondLayer)
    baseLayer = Image.open(('%s\\%s\\%s_base.png') % (INPUT, chosen, chosen))

    secondLayer = Image.alpha_composite(secondLayer, firstLayer)
    baseLayer.paste(secondLayer,(data['offset']['x'], data['offset']['y']), secondLayer)
    secondLayer.save(('%s\\%s.png') % (OUTPUT, 'random'))
    
if __name__ == '__main__':
    #combineImage('31', '22', '100009_05')
    for root, dirs, files in os.walk(INPUT):
        if dirs: randomCombineChara(dirs)
    

