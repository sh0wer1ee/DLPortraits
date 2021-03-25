# DLPortraits
dragalia lost portrait viewer (experimental)
# Credits
- [EndenDragon's en localization](https://github.com/EndenDragon/DLPortraits): Since I noticed this repo after code structure changed, I manually merged the localized files. Thanks EndenDragon for all the great work!
- [image-picker](https://github.com/rvera/image-picker)
- [select2](https://github.com/select2/select2)
- [Simple Sidebar](https://startbootstrap.com/templates/simple-sidebar/)
- [Bootstrap](https://getbootstrap.com/)
- [confetti-js](https://github.com/Agezao/confetti-js)
- [bakedCustard](https://github.com/bakedCustard) (A friend of mine who helped the jp ui localization.|好群友奇诺帮忙完成了日文界面的本地化，我日语本当🔨)
- Sitong/FourBuckets/🀜 (A friend of mine who made the website icon. Original idea is from [aiyom](https://nga.178.com/nuke.php?func=ucp&uid=17846713)|好群友四筒帮忙做了网站icon，原设计思路是柚子姐姐做的二群图标)
# Usage
- `portrait_emotion.py`: Process the raw assets in `portrait_asset` folder. The output which contain png files and json files will be saved to `portrait_output`.
- `localize.py`: Append new portraits info to `portrait_output/localizedDirData.json` with basic localization from textlabels.
# Demo
- [github.io](https://sh0wer1ee.github.io/DLPortraits)(ghpage)
- [gitee.io](https://sh0wer1ee.gitee.io/DLPortraits)(gitee page)
- [netlify](https://dlportraits.netlify.app)(backup)
# Note
- Some parts combination may seem odd, and some chara have no parts.
- Friendly with mobile devices now.
- Copyright is owned by Cygames & Nintendo.
- If you find error(s) in face-mouth classification or portrait names, feel free to open an issue.
- If you want to contribute to the localization, feel free to open a pull request. (Currently the localization is made by my own, so typos and errors are inevitable.)
- Planning to remake the site with vue.js if I am free (RUA). Because this site is a really quick & dirty & ugly implementation of original python codes, and is for self-use at first until my friends asked me to make a site.
- 简中介绍请看[nga](https://nga.178.com/read.php?tid=22913469)(偷懒)