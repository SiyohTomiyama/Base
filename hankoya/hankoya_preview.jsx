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

    var textFont = "KozGoPro-Regular";
    var position = [30, -30];
    var pItem, aiText, aiName, pdfPath, newTextFrame;

    for (var i = 0; i < aiFileArray.length; i++) {
        aiText = decodeURI(aiFileArray[i].name);
        newTextFrame = targetLayer.textFrames.add();
        position = [position[0], position[1] - 50];
        newTextFrame.position = position;
        newTextFrame.contents = aiText;
        var charAttributes = newTextFrame.textRange.characterAttributes;
        charAttributes.textFont = app.textFonts.getByName(textFont);

        // フォントサイズの設定
        charAttributes.size = 8;

        aiName = aiFileArray[i].fullName;
        pdfPath = aiName.split('.')[0] + ".pdf";
        pItem = doc.placedItems.add();
        pItem.file = File(pdfPath);
        pItem.move(targetLayer, ElementPlacement.PLACEATBEGINNING);
    }

    app.coordinateSystem = originalCoordinateSystem;
}

main();
