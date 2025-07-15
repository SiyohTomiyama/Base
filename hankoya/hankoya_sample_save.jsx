var PRINT_LAYER = app.activeDocument.layers["印面"];

function resaveFile(doc, savePath) {
    var option = new IllustratorSaveOptions();
    option.pdfCompatible = true;
    option.embedICCProfile = false;

    doc.saveAs(File(savePath), option);

    return savePath;
}

function saveTiff(doc) {
    var cutLayer;
    for (var i = 0; i < doc.layers.length; i++) {
        if (doc.layers[i].name.indexOf("ｶｯﾄﾗｲﾝ-") != -1) {
            cutLayer = doc.layers[i];
            break;
        }
    }
    var cutLine = cutLayer.pathItems[0];
    var strokeColor = new RGBColor();
    strokeColor.red = 0;
    strokeColor.green = 255;
    strokeColor.blue = 255;

    cutLine.strokeColor = strokeColor;

    var tFrame = PRINT_LAYER.textFrames[0];
    // 文字の塗り色を設定
    var fillColor = new RGBColor();
    fillColor.red = 255;
    fillColor.green = 255;
    fillColor.blue = 255;

    tFrame.textRange.fillColor = fillColor;
    tFrame.move(cutLayer, ElementPlacement.PLACEATBEGINNING);

    for (var i = doc.layers.length - 1; i >= 0; i--) {
        if (doc.layers[i] != cutLayer) {
            var theLayer = doc.layers[i];
            theLayer.locked = false;
            theLayer.visible = true;
            theLayer.remove();
        }
    }

    var tempBounds = cutLine.controlBounds;
    var minX = tempBounds[0];
    var maxY = tempBounds[1];
    var maxX = tempBounds[2];
    var minY = tempBounds[3];

    var margin = 1;
    doc.artboards[0].artboardRect = [minX - margin, maxY + margin, maxX + margin, minY - margin];

    // アートボードの座標を取得 (left, top, right, bottom)
    var artboardRect = doc.artboards[0].artboardRect;
    var artboardLeft = artboardRect[0];
    var artboardTop = artboardRect[1];
    var artboardRight = artboardRect[2];
    var artboardBottom = artboardRect[3];

    // アートボードの幅と高さを計算
    var artboardWidth = artboardRight - artboardLeft;
    var artboardHeight = artboardTop - artboardBottom;

    // 新しい長方形を作成
    // doc.pathItems.rectangle(top, left, width, height) の順で指定
    var rect = doc.pathItems.rectangle(artboardTop, artboardLeft, artboardWidth, artboardHeight);

    // 塗りの色をRGB(0, 0, 0) (黒) に設定
    var fillColor = new RGBColor();
    fillColor.red = 0;
    fillColor.green = 0;
    fillColor.blue = 0;

    rect.fillColor = fillColor; // 塗り色を設定
    rect.filled = true;          // 塗りを有効にする
    rect.stroked = false;        // 線を無効にする (塗りだけにするため)

    // 作成した長方形を最背面へ移動
    rect.zOrder(ZOrderMethod.SENDTOBACK);

    var option = new PDFSaveOptions(); //X-4
    option.preserveEditability = false;

    // ファイル名を生成
    // 現在のドキュメント名を使用し、拡張子を.tiffにする
    var destFolder = "~/Downloads/hankoyaData/";
    var fileName = doc.name.split('.')[0] + ".pdf";
    var destFile = new File(destFolder + "/" + fileName);
    doc.saveAs(destFile, option);
}

function main() {
    var doc = app.activeDocument;
    resaveFile(doc, doc.fullName)
    saveTiff(doc);
    doc.close(SaveOptions.DONOTSAVECHANGES);
    alert("IllustratorとPDFファイルを保存しました");
}

main();
