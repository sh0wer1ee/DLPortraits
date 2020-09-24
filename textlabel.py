import aiohttp
import asyncio
import os
import re
import shutil
from UnityPy import AssetsManager
import json
import timeit

http_proxy = 'http://127.0.0.1:10809'
assetbundle = {
    'jp':'../DLScripts/prs_manifests/old/assetbundle.manifest',
    'zh_cn':'../DLScripts/prs_manifests/old/assetbundle.zh_cn.manifest',
    'zh_tw':'../DLScripts/prs_manifests/old/assetbundle.zh_tw.manifest',
    'en_us':'../DLScripts/prs_manifests/old/assetbundle.en_us.manifest'}
ROOT = os.path.dirname(os.path.realpath(__file__))
JSON = os.path.join(ROOT, 'json')
MASTER = os.path.join(ROOT, 'master')
os.makedirs(MASTER, exist_ok=True)
os.makedirs(JSON, exist_ok=True)

def loadMastersUrl():
    master = {}
    for lang in assetbundle:
        with open(assetbundle[lang], 'r', encoding='utf-8') as m:
            for l in m:
                sp = l.split(',')
                if sp[0] == 'master':
                    master['%s-master' % lang] = sp[1].strip()
                    continue
            m.close()
    return master

async def download(session, url, filename):
    async with session.get(url, proxy = http_proxy) as resp:
        if resp.status != 200:
            print(filename, ': download failed.')
        else:
            with open(os.path.join(MASTER, filename), 'wb') as f:
                f.write(await resp.read())

async def downloadMasters():
    master = loadMastersUrl()
    async with aiohttp.ClientSession() as session:
            await asyncio.gather(*[
                download(session, master[region], region)
                for region in master               
            ])

def process_json(tree):
    while isinstance(tree, dict):
        if 'dict' in tree:
            tree = tree['dict']
        elif 'list' in tree:
            tree = tree['list']
        elif 'entriesValue' in tree and 'entriesHashCode' in tree:
            return {k: process_json(v) for k, v in zip(tree['entriesHashCode'], tree['entriesValue'])}
        else:
            return tree
    return tree

def dumpTextlabel(filepath, region):
    am = AssetsManager(filepath)
    for asset in am.assets.values():
        for o in asset.objects.values():
            data = o.read()
            if str(data.type) == 'MonoBehaviour' and str(data.name) == 'TextLabel':
                tree = data.read_type_tree()
                with open('%s/%sTextLabel.json' % (JSON, region), 'w', encoding='utf8') as f:
                    json.dump(process_json(tree), f, indent=2, ensure_ascii=False)

def parseMasters():
    for f in os.listdir(MASTER):
        region = f.split('-')[0].replace('_', '').upper()
        dumpTextlabel(os.path.join(MASTER, f), region)
    print('parse complete.')

def main():
    start = timeit.default_timer()

    loop = asyncio.get_event_loop()
    loop.run_until_complete(downloadMasters())
    print("download complete.")

    parseMasters()

    end = timeit.default_timer()
    print('time spent: ' + str(end-start)) # 90 seconds..?

if __name__ == '__main__':
    main()