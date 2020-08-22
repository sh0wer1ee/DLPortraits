$("select").imagepicker();
$('select.lang-select').on('select2:select', function(e) {
    let langSelect = document.getElementById("lang-select");
    language = langSelect.options[langSelect.selectedIndex].value
    changeLang();
});

var canvas = document.getElementById("canvas");
var logText = document.getElementById("log-text");
var faceOptions = document.getElementById("face-select");
var mouthOptions = document.getElementById("mouth-select");
var downloadBtn = document.getElementById("download-btn");
var ctx = canvas.getContext("2d");

var githubPrefix = "/DLPortraits";
//var githubPrefix = ""; // Debug use
var portraitPath = "/portrait_output/";
var imgID = "";
var imgGroup = new Array();
var baseImg = new Image();
var faceImg = new Image();
var faceID = "0";
var mouthImg = new Image();
var mouthID = "0";
var loaded = false;
var partsData = [];
var offset = [];
var language = "en_us";
var localizationData = {
    'search-placeholder': {
        zh_cn: '输入关键字以查询',
        zh_tw: '關鍵詞檢索',
        en_us: 'Enter keywords to query',
        jp: 'キーワード検索'
    },
    'chara-select': {
        zh_cn: '立绘ID',
        zh_tw: '立繪ID',
        en_us: 'Portrait ID',
        jp: '立ち絵ID'
    },
    'load-btn': {
        zh_cn: '载入立绘数据',
        zh_tw: '載入立繪數據',
        en_us: 'Load Portrait',
        jp: '読み込む'
    },
    'face-select': {
        zh_cn: '请选择面部差分：',
        zh_tw: '請選擇面部差分：',
        en_us: 'Select facial expression：',
        jp: '目の差分を選ぶ'
    },
    'mouth-select': {
        zh_cn: '请选择嘴部差分：',
        zh_tw: '請選擇嘴部差分：',
        en_us: 'Select mouth expression：',
        jp: '口の差分を選ぶ'
    },
    'reset-btn': {
        zh_cn: '恢复默认表情',
        zh_tw: '恢復默認表情',
        en_us: 'Reset to Default',
        jp: 'リセット'
    },
    'download-btn': {
        zh_cn: '下载图像',
        zh_tw: '下載圖像',
        en_us: 'Download Image',
        jp: 'ダウンロード'
    },
    'note-text': {
        zh_cn: '提示：拖拽画布以移动立绘。 ',
        zh_tw: '提示：拖拽畫布以移動立繪。',
        en_us: 'Tip: You can move the drawing by dragging.',
        jp: 'ヒント: ドラッグでキャンバスを移動する'
    },
    'title': {
        zh_cn: '龙约立绘查看/拼豆',
        zh_tw: '龍絆立繪查看/編輯',
        en_us: 'Dragalia Lost Portraits Viewer',
        jp: 'ドラガリ立ち絵ビューアー'
    },
    'filelist-load-error-log': {
        zh_cn: '载入立绘文件表失败，请查看控制台。刷新网页以重新载入。',
        zh_tw: '載入立繪文件表失敗，請查看控制台。刷新頁面以重新載入。',
        en_us: 'Error loading filelist.json, please check the console or refresh the page.',
        jp: 'ロードに失敗しました、コンソールを確認してください。このページを再読込します。'
    },
    'p-image-load-error-log': {
        zh_cn: '载入立绘图像数据失败，请查看控制台。',
        zh_tw: '載入立繪圖像數據失敗，請查看控制台。',
        en_us: 'Error loading image data, please check the console.',
        jp: 'ロードに失敗しました、コンソールを確認してください。'
    },
    'p-json-load-error-log': {
        zh_cn: '载入立绘数据表失败，请查看控制台。',
        zh_tw: '載入立繪數據表失敗，請查看控制台。',
        en_us: 'Error loading json data, please check the console.',
        jp: 'ロードに失敗しました、コンソールを確認してください。'
    },
    'load-success-log': {
        zh_cn: '已成功载入。',
        zh_tw: '已成功載入。',
        en_us: 'Successfully loaded.',
        jp: 'ロードに成功しました。'
    }

}

$(document).ready(function() {
    var userLang = navigator.language || navigator.userLanguage;
    checkLang(userLang);
    $('select.lang-select').select2();
    $('select.lang-select').val(language).trigger('change');
    changeLang();
});

function checkLang(userLang) {
    switch (userLang) {
        case 'zh-CN':
            language = 'zh_cn';
            break;
        case 'zh-TW':
        case 'zh-HK':
            language = 'zh_tw';
            break;
        case 'ja':
            language = 'jp';
            break;
        case 'en-GB':
        case 'en-US':
            language = 'en_us';
            break;
        default:
            language = 'en_us';
    }
}

function changeLang() {
    buildCharaOptions();
    document.getElementById("log-text").innerText = ''; // Clear log
    document.getElementById("title").innerText = localizationData['title'][language];
    document.getElementById("label-chara-select").innerText = localizationData['chara-select'][language];
    document.getElementById("load-btn").innerText = localizationData['load-btn'][language];
    document.getElementById("label-face-select").innerText = localizationData['face-select'][language];
    document.getElementById("label-mouth-select").innerText = localizationData['mouth-select'][language];
    document.getElementById("reset-btn").innerText = localizationData['reset-btn'][language];
    document.getElementById("download-btn").innerText = localizationData['download-btn'][language];
    document.getElementById("note-text").innerText = localizationData['note-text'][language];
}

function buildCharaOptions() {
    fetch(`${githubPrefix}${portraitPath}localizedDirData.json`)
        .then(function(response) {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            return response;
        })
        .then(response => response.json())
        .then(json => {
            $("select.chara-select").empty()
            $("select.chara-select").prepend("<option></option>");
            for (var key in json['fileList']) {
                var option = document.createElement("option");
                option.value = key;
                option.text = json['fileList'][key][language];
                document.getElementById("chara-select").appendChild(option);
            }
            $('select.chara-select').select2({
                placeholder: localizationData['search-placeholder'][language],
                allowClear: true
            });
        }).catch(function(error) {
            console.log(error);
            document.getElementById("log-text").innerText = localizationData['filelist-load-error-log'][language];
        });
}


document.getElementById("load-btn").addEventListener("click",
    function() {
        let charaSelect = document.getElementById("chara-select");
        imgID = charaSelect.options[charaSelect.selectedIndex].value
        if (imgID)
            loadChara();
    }
);
document.getElementById("reset-btn").addEventListener("click",
    function() {
        if (loaded) {
            resetCanvas();
            faceOptions.selectedIndex = -1;
            mouthOptions.selectedIndex = -1;
            refreshPicker();
            faceID = "-1";
            mouthID = "-1";
            faceImg.src = "";
            mouthImg.src = "";
        }
    }
);
document.getElementById("download-btn").addEventListener("click",
    function() {
        if (loaded) {
            downloadCanvasAsImage(`${imgID}_${faceID}_${mouthID}.png`)
        }
    }
);
/*
document.getElementById("invert-btn").addEventListener("click",
    function() {
        if (loaded) {
            invertColors();
        }
    }
);
*/





function loadChara() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    faceImg.src = "";
    mouthImg.src = "";
    // load image
    baseImg.src = `${githubPrefix}${portraitPath}${imgID}/${imgID}_base.png`;
    baseImg.onload = function() {
        logText.innerText = localizationData['load-success-log'][language];
        ctx.drawImage(baseImg, 0, 0);
        loadJsonData();
    }
    baseImg.onerror = function() {
        logText.innerText = localizationData['p-image-load-error-log'][language];
        loaded = false;
    }
}

// fetch data json
function loadJsonData() {
    fetch(`${githubPrefix}${portraitPath}${imgID}/data.json`)
        .then(function(response) {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            return response;
        })
        .then(response => response.json())
        .then(json => {
            offset = [];
            offset.push(json['offset']['x']);
            offset.push(json['offset']['y']);
            partsData = json['partsData'];
            loadOptions();
        }).catch(function(error) {
            console.log(error);
            logText.innerText = localizationData['p-json-load-error-log'][language];
            loaded = false;
        });
}

// load select options
function loadOptions() {
    $("select.face-select").empty()
    $("select.mouth-select").empty()
    partsData["faceParts"].forEach(function(item, index) {
        var optf = document.createElement('option');
        optf.setAttribute("data-img-src", item);
        optf.setAttribute("id", index)
        optf.setAttribute("value", index)
        faceOptions.appendChild(optf);
    });
    partsData["mouthParts"].forEach(function(item, index) {
        var optm = document.createElement('option');
        optm.setAttribute("data-img-src", item);
        optm.setAttribute("id", index)
        optm.setAttribute("value", index)
        mouthOptions.appendChild(optm);
    });
    faceOptions.selectedIndex = -1;
    mouthOptions.selectedIndex = -1;
    faceID = "0";
    mouthID = "0";
    loaded = true;
    refreshPicker();
}

function refreshPicker() {
    $("select.face-select").imagepicker({
        selected: function(select, option, event) {
            faceID = this.val()
            faceImg.src = option.target.currentSrc;
            mergeImage();
        }
    });
    $("select.mouth-select").imagepicker({
        selected: function(select, option, event) {
            mouthID = this.val()
            mouthImg.src = option.target.currentSrc;
            mergeImage();
        }
    });
}

function mergeImage() {
    resetCanvas();
    if (faceID != "-1") {
        ctx.clearRect(offset[0], offset[1], faceImg.width, faceImg.height);
    }
    ctx.drawImage(faceImg, offset[0], offset[1]);
    ctx.drawImage(mouthImg, offset[0], offset[1]);
}

function resetCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImg, 0, 0);
}

function invertColors() {
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var dataArr = imageData.data;

    for (var i = 0; i < dataArr.length; i += 4) {
        var r = dataArr[i];
        var g = dataArr[i + 1];
        var b = dataArr[i + 2];
        var a = dataArr[i + 3];

        var invertedRed = 255 - r;
        var invertedGreen = 255 - g;
        var invertedBlue = 255 - b;

        dataArr[i] = invertedRed;
        dataArr[i + 1] = invertedGreen;
        dataArr[i + 2] = invertedBlue;
    }

    ctx.putImageData(imageData, 0, 0);
}

function downloadCanvasAsImage(filename) {
    let downloadLink = document.createElement('a');
    downloadLink.setAttribute('download', filename);
    canvas.toBlob(function(blob) {
        let url = URL.createObjectURL(blob);
        downloadLink.setAttribute('href', url);
        downloadLink.click();
    });
}

document.addEventListener('DOMContentLoaded', function() {
    canvasDiv = document.getElementById('canvas-canvas');

    let pos = {
        top: 0,
        left: 0,
        x: 0,
        y: 0
    };

    const mouseDownHandler = function(e) {
        canvasDiv.style.cursor = 'grabbing';
        //canvasDiv.style.userSelect = 'none';

        pos = {
            left: canvasDiv.scrollLeft,
            top: canvasDiv.scrollTop,
            x: e.clientX,
            y: e.clientY,
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    };

    const mouseMoveHandler = function(e) {
        const dx = e.clientX - pos.x;
        const dy = e.clientY - pos.y;
        canvasDiv.scrollTop = pos.top - dy;
        canvasDiv.scrollLeft = pos.left - dx;
    };
    const mouseUpHandler = function() {
        canvasDiv.style.cursor = 'grab';
        //canvasDiv.style.removeProperty('user-select');
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
    };
    canvasDiv.addEventListener('mousedown', mouseDownHandler);
});