import json

dirDataJson = json.load(open('DLPortraits/portrait_output/dirData.json', encoding='utf8'))
#enDirDataJson = json.load(open('dirDataEN.json', encoding='utf8'))

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


localizedDirDataJson = {"fileList": {}}
for key in dirDataJson['fileList']:
    localDic = {}
    localDic['zh_cn'] = dirDataJson['fileList'][key]
    localDic['zh_tw'] = '%s %s' % (key, getName(key, 'zh_tw'))
    localDic['en_us'] = '%s %s' % (key, getName(key, 'en_us')) # enDirDataJson['fileList'][key]
    localDic['jp'] = '%s %s' % (key, getName(key, 'jp'))
    localizedDirDataJson['fileList'][key] = localDic

with open('localizedDirData.json', 'w', encoding='utf8') as f:
    json.dump(localizedDirDataJson, f, indent=2, ensure_ascii=False)



