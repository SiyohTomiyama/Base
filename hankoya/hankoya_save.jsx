var PRINT_LAYER = app.activeDocument.layers["印面"];
var DEST_FOLDER = "~/Downloads/hankoya/個別データ/";

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
    var tFrame = PRINT_LAYER.textFrames[0];
    tFrame.move(cutLayer, ElementPlacement.PLACEATBEGINNING);

    for (var i = doc.layers.length - 1; i >= 0; i--) {
        if (doc.layers[i] != cutLayer) {
            var theLayer = doc.layers[i];
            theLayer.locked = false;
            theLayer.visible = true;
            theLayer.remove();
        }
    }

    doc.artboards[0].artboardRect = cutLine.visibleBounds;

    var tempName = doc.name.split('.')[0] + "_nega.ai";
    var tempFilePath = new File(DEST_FOLDER + "/" + tempName);
    var option = new IllustratorSaveOptions();
    option.pdfCompatible = true;
    doc.saveAs(File(tempFilePath), option);

    tFrame.selected = true;
    app.executeMenuCommand("outline");

    var option = new PDFSaveOptions(); //X-4
    option.preserveEditability = false;
    var fileName = doc.name.split('_nega.')[0] + ".pdf";
    var destFile = new File(DEST_FOLDER + "/" + fileName);

    doc.saveAs(destFile, option);
    doc.close(SaveOptions.DONOTSAVECHANGES);

    app.open(File(tempFilePath));
    doc = app.activeDocument;

    var cutLine = doc.layers[0].pathItems[0];
    var tFrame = doc.layers[0].textFrames[0];

    var strokeColor = new RGBColor();
    strokeColor.red = 0;
    strokeColor.green = 255;
    strokeColor.blue = 255;

    cutLine.strokeColor = strokeColor;

    // 塗りの色をRGB(0, 0, 0) (黒) に設定
    var fillColor = new RGBColor();
    fillColor.red = 0;
    fillColor.green = 0;
    fillColor.blue = 0;

    cutLine.fillColor = fillColor;

    // 文字の塗り色を設定
    var fillColor = new RGBColor();
    fillColor.red = 255;
    fillColor.green = 255;
    fillColor.blue = 255;

    tFrame.textRange.fillColor = fillColor;

    doc.artboards[0].artboardRect = cutLine.controlBounds;

    tFrame.selected = true;
    app.executeMenuCommand("outline");

    var option = new PDFSaveOptions(); //X-4
    option.preserveEditability = false;

    // ファイル名を生成
    // 現在のドキュメント名を使用し、拡張子を.tiffにする
    var fileName = doc.name.split('.')[0] + ".pdf";
    var destFile = new File(DEST_FOLDER + "/" + fileName);

    doc.saveAs(destFile, option);
    doc.close(SaveOptions.DONOTSAVECHANGES);

    File(tempFilePath).remove();
}

function main() {
    var doc = app.activeDocument;
    resaveFile(doc, doc.fullName)
    saveTiff(doc);
    alert("IllustratorとPDFファイルを保存しました");
}

main();
