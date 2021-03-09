import json
import os
import textlabel
import timeit

textlabelJsonJP = json.load(open('json/JPTextLabel.json', encoding='utf8'))
textlabelJsonZHCN = json.load(open('json/ZHCNTextLabel.json', encoding='utf8'))
textlabelJsonZHTW = json.load(open('json/ZHTWTextLabel.json', encoding='utf8'))
textlabelJsonENUS = json.load(open('json/ENUSTextLabel.json', encoding='utf8'))
textlabelJP = {}
textlabelZHCN = {}
textlabelZHTW = {}
textlabelENUS = {}
for tid in textlabelJsonJP:
    textlabelJP[textlabelJsonJP[tid]['_Id']] = textlabelJsonJP[tid]['_Text']
for tid in textlabelJsonZHCN:
    textlabelZHCN[textlabelJsonZHCN[tid]['_Id']] = textlabelJsonZHCN[tid]['_Text']
for tid in textlabelJsonZHTW:
    textlabelZHTW[textlabelJsonZHTW[tid]['_Id']] = textlabelJsonZHTW[tid]['_Text']
for tid in textlabelJsonENUS:
    textlabelENUS[textlabelJsonENUS[tid]['_Id']] = textlabelJsonENUS[tid]['_Text']

regions = ['jp', 'zh_cn', 'zh_tw', 'en_us']

def getName(pid, locale):
    textlabel = {}
    playerName = ''
    if locale == 'zh_cn':
        textlabel = textlabelZHCN
        playerName = '尤蒂尔'
    elif locale == 'zh_tw':
        textlabel = textlabelZHTW
        playerName = '尤帝爾'
    elif locale == 'en_us':
        textlabel = textlabelENUS
        playerName = 'Euden'
    elif locale == 'jp':
        textlabel = textlabelJP
        playerName = 'ユーディル'
    else:
        print('locale error!')
        exit(-1)
    
    if pid.split('_')[0] == '100001':
        return playerName
    else:
        try:
            if pid[0] == '1':
                return textlabel[('STORY_UNIT_GROUP_%s00') % (pid.split('_')[0])]
            elif pid[0] == '2':
                return textlabel[('STORY_UNIT_GROUP_%s01') % (pid.split('_')[0])]
            else:
                return ''
        except KeyError:
            return ''

def getNameAllRegion(id):
    for r in regions:
        print('%s: %s' % (r, getName(id, r)))

def generateLocalized():
    dirDataJson = json.load(open('portrait_output/dirData.json', encoding='utf8'))
    #enDirDataJson = json.load(open('dirDataEN.json', encoding='utf8'))
    localizedDirDataJson = {"fileList": {}}
    for key in dirDataJson['fileList']:
        localDic = {}
        localDic['zh_cn'] = dirDataJson['fileList'][key]
        localDic['zh_tw'] = '%s' % (getName(key, 'zh_tw'))
        localDic['en_us'] = '%s' % (getName(key, 'en_us')) # enDirDataJson['fileList'][key]
        localDic['jp'] = '%s' % (getName(key, 'jp'))
        localizedDirDataJson['fileList'][key] = localDic
    with open('localizedDirData.json', 'w', encoding='utf8') as f:
        json.dump(localizedDirDataJson, f, indent=2, ensure_ascii=False)

def appendLocalizedJson():
    # Save my life
    localizedDirDataJson = json.load(open('portrait_output/localizedDirData.json', encoding='utf8'))
    recentlyAdded = []

    for root, dirs, files in os.walk('portrait_asset', topdown=False):
        if files:
            for f in files:
                if f not in localizedDirDataJson:
                    print(f)
                    localDic = {}
                    localDic['zh_cn'] = '%s' % (getName(f, 'zh_cn'))
                    localDic['zh_tw'] = '%s' % (getName(f, 'zh_tw'))
                    localDic['en_us'] = '%s' % (getName(f, 'en_us')) 
                    localDic['jp'] = '%s' % (getName(f, 'jp'))
                    localizedDirDataJson['fileList'][f] = localDic
                    recentlyAdded.append(f)
    localizedDirDataJson['recentlyAdded'] = recentlyAdded
    sortedDic = {}
    sortedDic['fileList'] = dict(sorted(localizedDirDataJson['fileList'].items(), key=lambda x:x[0]))
    sortedDic['recentlyAdded'] = localizedDirDataJson['recentlyAdded']
    
    with open('localizedDirData.json', 'w', encoding='utf8') as f:
        json.dump(sortedDic, f, indent=2, ensure_ascii=False)

def main():
    start = timeit.default_timer()

    textlabel.main('20210309_nRiaUK6w2SegGSPi')
    appendLocalizedJson()

    end = timeit.default_timer()
    print('time spent: ' + str(end-start)) # 90 seconds..?

if __name__ == '__main__':
    main()

