// テキストフレーム作成関数
function createTextFrame(doc, content, x, y) {
    // フォントとサイズの設定
    var textFont = "KozGoPro-Regular";
    var textSize = 8; // ポイント

    var textArt = doc.textFrames.add();
    textArt.contents = content;
    textArt.textRange.characterAttributes.textFont = app.textFonts.getByName(textFont);
    textArt.textRange.characterAttributes.size = textSize;
    textArt.top = y; // Y座標
    textArt.left = x; // X座標
    return textArt;
}

// 配置アイテム（画像）作成関数
function placeItem(doc, filePath, x, y) {
    var fileRef = new File(filePath);
    if (fileRef.exists) {
        var placedArt = doc.placedItems.add();
        placedArt.file = fileRef;
        placedArt.top = y; // Y座標
        placedArt.left = x; // X座標
        // 配置した画像のサイズ調整が必要な場合はここに追加
        // 例: placedArt.width = 50; placedArt.height = 50;
        return placedArt;
    } else {
        alert("ファイルが見つかりません: " + filePath);
        return null;
    }
}

function main() {
    var originalCoordinateSystem = app.coordinateSystem;
    app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;

    var doc = app.activeDocument;
    var targetLayer = doc.layers["彫刻内容"];
    doc.layers[0].locked = false; //placeItemをaddするとき、必ず最初のレイヤーに現れるから

    var dataFolder = Folder.selectDialog("フォルダーを選んで");
    if (dataFolder == null) {
        return alert('failed');
    }
    var aiFileArray = Folder(String(dataFolder) + "/").getFiles("*.ai");

    // 初期配置位置
    var currentX = 30;
    var currentY = -80; // IllustratorのY座標は上に行くほど増加、下に行くほど減少します。

    var itemMargin = 3; // ポイント
    var docHeight = doc.height;
    var yThreshold = -docHeight + 80;

    for (var i = 0; i < aiFileArray.length; i++) {
        var placedObject = null;
        var aiText = decodeURI(aiFileArray[i].name);
        placedObject = createTextFrame(doc, aiText, currentX, currentY);
        placedObject.move(targetLayer, ElementPlacement.PLACEATBEGINNING);

        var itemBottom = placedObject.geometricBounds[3]; // Bottom Y coordinate
        currentY = itemBottom - itemMargin;

        aiName = aiFileArray[i].fullName;
        pdfPath = aiName.split('.')[0] + ".pdf";
        placedObject = placeItem(doc, pdfPath, currentX + 30, currentY);
        placedObject.move(targetLayer, ElementPlacement.PLACEATBEGINNING);

        itemBottom = placedObject.geometricBounds[3]; // Bottom Y coordinate
        currentY = itemBottom - itemMargin;

        // Y座標が閾値を超えたら、新しい列に移動
        // currentYがyThresholdよりも小さくなったら、
        // X座標を200増やしてY座標を初期位置に戻す
        if (currentY <= yThreshold) { // Y座標が負の値で下に伸びているため絶対値で判定
            currentX += 350;
            currentY = -80; // 新しい列の初期Y座標
        }
    }
    app.coordinateSystem = originalCoordinateSystem;
}

main();
