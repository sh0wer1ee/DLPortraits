'''
    Dump the portrait base and parts from portrait assets.
    You need to download them with manifest_diff_download.py from DLScripts.
'''

import os
import tqdm
import json
import UnityPy
from PIL import Image

ROOT = os.path.dirname(os.path.realpath(__file__))
#--CONFIG--#
playerName = '尤蒂尔'
inputFolder = 'portrait_asset'
outputFolder = 'portrait_output'
jsonFolder = 'json'
specialAlphaID = {
    '100001_03':[5, 6],
    '100018_02':[2],
    '100034_01':[1, 3, 4, 5, 6],
    '110030_01':[1, 6, 7, 8, 17],
    '110035_01':[1, 7],
    '110039_01':[1, 2, 8, 9, 10, 11, 12, 13, 14, 23, 24],
    '110281_01':[2],
    '110311_01':[2, 3],
    '110358_02':[2],
    '120014_01':[5, 6, 13, 14],
    '120017_01':[7, 8],
    '120021_01':[2, 3],
    '120028_01':[2],
    '120032_01':[2, 3],
    '120033_01':[9],
    '120091_01':[5],
    '120110_01':[7, 8],
    '200013_01':[1, 4],
    '210040_01':[1, 2]
}
multiPartsAlphaID = {
    '110040_01':{
        'face':[16],
        'mouth':[17, 18, 19, 20, 21, 22, 23, 24, 25]
    }
}
#--CONFIG--#
INPUT = os.path.join(ROOT, inputFolder)
OUTPUT = os.path.join(ROOT, outputFolder)
JSON = os.path.join(ROOT, jsonFolder)
os.makedirs(INPUT, exist_ok=True)
os.makedirs(OUTPUT, exist_ok=True)

def processAsset(filePath):
    offset = {}
    indexTable = {}
    imageData = {}
    dataJson = {}

    baseName = os.path.basename(filePath)
    am = UnityPy.AssetsManager(filePath)
    for asset in am.assets.values():
        for o in asset.objects.values():
            data = o.read()
            if str(data.type) == 'MonoBehaviour':
                tree = data.read_type_tree()
                offset, indexTable = parseMono(tree)
            if str(data.type) == 'Texture2D':
                imageData[data.name] = data.image

    
    partsData = classifyFaceMouth(indexTable, baseName)
    
    dataJson['offset'] = offset
    dataJson['partsData'] = partsData

    os.makedirs(os.path.join(OUTPUT, baseName), exist_ok=True)

    with open(('%s\\%s\\data.json') % (OUTPUT, baseName), 'w', encoding='utf8') as f:
        json.dump(dataJson, f, indent=2, ensure_ascii=False)

    if baseName == '100007_01':  
        imageData = loadNhaam(imageData)
    
    combineYCbCrA(imageData, baseName)
    for index in indexTable:
        combineYCbCrA(imageData, baseName, index, indexTable[index]) 
    
def parseMono(mono):
    partsDataTable = {}
    partsTextureIndexTable = {}
    for table in mono['partsDataTable']:
        index = mono['partsDataTable'].index(table)
        indexStr = '' if index == 0 else str(index)
        offsetX = int(table['position']['x'] - table['size']['x'] / 2)
        offsetY = int(table['position']['y'] - table['size']['y'] / 2)
        partsDataTable['x%s' % indexStr] = offsetX
        partsDataTable['y%s' % indexStr] = offsetY
        
    
    for index in mono['partsTextureIndexTable']:
        partsTextureIndexTable[index['colorIndex']] = index['alphaIndex']
    return partsDataTable, partsTextureIndexTable

def combineYCbCrA(imageData, baseName, cidx = -9, aidx = -9):
    if cidx == -1 and aidx == -1: # 210038_01
        return
    imageBase = ''
    if cidx == -9:
        imageBase = ('%s_base') % baseName
    else:
        imageBase = ('%s_parts_c%s') % (baseName, str(cidx).zfill(3))
    
    try:
        alpha = imageData['%s_alpha' % imageBase].convert('L') if aidx == -9 else imageData[('%s_parts_a%s_alpha') % (baseName, str(aidx).zfill(3))].convert('L')
    except KeyError:
        pass # ¯\_(ツ)_/¯

    Y = imageData['%s_Y' % imageBase].convert('RGBA').split()[-1]
    mergedImg = Image.merge('YCbCr',
    (
        Y,
        imageData['%s_Cb' % imageBase].convert('L').resize(Y.size, Image.ANTIALIAS),
        imageData['%s_Cr' % imageBase].convert('L').resize(Y.size, Image.ANTIALIAS)
    )).convert('RGBA')
    if aidx >= 0 or aidx == -9:
        mergedImg.putalpha(alpha) 
    mergedImg.save(('%s\\%s\\%s.png') % (OUTPUT, baseName, imageBase))

def loadNhaam(imageData):
    # missing Nhaam's base Y file
    am = UnityPy.AssetsManager(INPUT + '\\assets._gluonresources.images.emotion.story.chara.100007_01.parts\\100007_01_base_y')
    for asset in am.assets.values():
        for o in asset.objects.values():
            data = o.read()
            if str(data.type) == 'Texture2D':
                imageData[data.name] = data.image
    return imageData

def classifyFaceMouth(indexTable, baseName):
    partsData = {
        'faceParts':[],
        'mouthParts':[]
    }
    if baseName in multiPartsAlphaID:
        partsData['face2Parts'] = []
        partsData['mouth2Parts'] = []
    sortedList = sorted(indexTable.items(), key = lambda kv:(kv[1], kv[0]))
    try: # some indexTables are empty
        minID = sortedList[0][1] if (sortedList[0][1] >= 0 or sortedList[0][1] == -2) else 0
    except IndexError:
        return partsData
    for cidx, aidx in sortedList:
        if cidx < 0: # 210038_01
            continue
        filePath = ('./%s/%s/%s_parts_c%s.png')%(outputFolder, baseName, baseName, str(cidx).zfill(3)) 
        if aidx == minID:
            partsData['faceParts'].append(filePath)
        elif baseName in specialAlphaID and aidx in specialAlphaID[baseName]:
            partsData['faceParts'].append(filePath)
        elif baseName in multiPartsAlphaID:
            if aidx in multiPartsAlphaID[baseName]['face']:
                partsData['face2Parts'].append(filePath)
            elif aidx in multiPartsAlphaID[baseName]['mouth']:
                partsData['mouth2Parts'].append(filePath)
            else:
                partsData['mouthParts'].append(filePath)
        else:
            partsData['mouthParts'].append(filePath)
    return partsData

def getCharaName(fileList, fileListDic):
    fileDic = fileListDic
    textlabel = {}
    textlabelJson = json.load(open('../DLScripts/json/TextLabel.json', encoding='utf8'))
    for tid in textlabelJson:
        textlabel[textlabelJson[tid]['_Id']] = textlabelJson[tid]['_Text']
    # STORY_UNIT_GROUP_{cid}00
    for cid in fileList:
        try:
            if cid.split('_')[0] == '100001':
                fileDic[cid] = ('%s %s') % (cid, playerName)
            else:
                fileDic[cid] = ('%s %s') % (cid, textlabel[('STORY_UNIT_GROUP_%s00') % (cid.split('_')[0])])
        except KeyError:
            fileDic[cid] = '%s ' % cid
        
    return fileDic

def getDragonName(fileList, fileListDic):
    fileDic = fileListDic
    textlabel = {}
    textlabelJson = json.load(open('../DLScripts/json/TextLabel.json', encoding='utf8'))
    for tid in textlabelJson:
        textlabel[textlabelJson[tid]['_Id']] = textlabelJson[tid]['_Text']
    # STORY_UNIT_GROUP_{cid}01
    for did in fileList:
        try:
            fileDic[did] = ('%s %s') % (did, textlabel[('STORY_UNIT_GROUP_%s01') % (did.split('_')[0])])
        except KeyError:
            fileDic[did] = '%s ' % did
        
    return fileDic

def main():
    dirData = {'fileList' : {}}
    for root, dirs, files in os.walk(INPUT, topdown=False):
        if files:
            if 'emotion.story.chara' in root:
                dirData['fileList'] = getCharaName(files, dirData['fileList'])
            elif 'emotion.story.dragon' in root:
                dirData['fileList'] = getDragonName(files, dirData['fileList'])
                
            if files == ['100007_01_base_y']:
                continue
            pbar = tqdm.tqdm(files)
            for f in pbar:
                pbar.set_description('processing %s...' % f)
                src = os.path.realpath(os.path.join(root, f))
                processAsset(src)

    # with open(('%s\\dirData.json') % OUTPUT, 'w', encoding='utf8') as f:
    #     json.dump(dirData, f, indent=2, ensure_ascii=False)
    

    

if __name__ == '__main__':
    main()



