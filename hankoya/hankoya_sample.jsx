#include "position.jsxinc"

function buildDialog() {
    var dialog = createDialog();
    dialog.btnOK.onClick = okButtonOnClick;
    dialog.edittext1.active = true;
    return dialog;
}

// ダイアログを作成
function createDialog() {
    // DIALOG
    // ======
    var dialog = new Window("dialog");
    dialog.text = "ハンコヤサポート";
    dialog.preferredSize.width = 300;
    dialog.preferredSize.height = 350;
    dialog.orientation = "column";
    dialog.alignChildren = ["center", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;

    // TPANEL1
    // =======
    var statictext1 = dialog.add("statictext", undefined, undefined, { name: "statictext1" });
    statictext1.text = "商品詳細をペーストしてください"

    var edittext1 = dialog.add('edittext {properties: {name: "edittext1", multiline: true, scrollable: false }}');
    edittext1.preferredSize.width = 200;
    edittext1.preferredSize.height = 200;
    //デバッグ用
    //edittext1.text = "受注番号: 10035393\n製品番号: 1\n出品名: 定型ｺﾞﾑ印ﾌﾘｰﾃｷｽﾄ5×51mm\n書体: 角ゴシック体\n大木の向き: ヨコ型\n印面内容: ＴＥＬ：06 - 6225 - 2110　ＦＡＸ：06 - 6225 - 2113"

    var button2 = dialog.add("button", undefined, undefined, { name: "button2" });
    button2.text = "Cancel";
    button2.preferredSize.width = 100;

    var btnOK = dialog.add("button", undefined, undefined, { name: "btnOK" });
    btnOK.text = "OK";
    btnOK.preferredSize.width = 100;

    dialog.edittext1.active = true;
    return dialog;
}

function okButtonOnClick() {
    var dialog = this.parent;
    var values = splitJsxValue(dialog.edittext1.text);
    dialog.params = values;
    dialog.close();
}

// jsxの値を分割する
function splitJsxValue(value) {
    var lines = value.split(/\r\n|\n/);
    var values = {};
    for (var i = 0; i < lines.length; i++) {
        var line = trim(lines[i])
        if (line.length == 0) {
            continue; // 空行はスキップ
        }
        var parts = line.split(":");
        var key = trim(parts[0]);
        var val = trim(parts[1]);
        values[key] = val;
    }
    return values;
}

// 前後の空白を削除する
function trim(str) {
    return str.replace(/^\s+/, '').replace(/\s+$/, '');
}

function getTemplate(str) {
    // 正規表現を使って数値部分を抽出
    // \d+ は1桁以上の数字にマッチ
    // g は文字列中の全てのマッチを検索
    const matches = str.match(/\d+/g);

    var outputString = '';

    if (matches && matches.length >= 2) {
        // 最初の数値（例: 5）
        const num1 = matches[0];
        // 2番目の数値（例: 51）
        const num2 = matches[1];

        // 1桁の場合に前に0を追加
        const formattedNum1 = ('0' + num1).slice(-2);
        const formattedNum2 = ('0' + num2).slice(-2);

        // 最終的な文字列を結合
        outputString = formattedNum1 + formattedNum2 + ".ai";
        var aiPath = "~/Downloads/hankoTplt/" + outputString;
        aiFile = new File(aiPath);
    } else {
        aiFile = null;
    }
    return aiFile;
}

function saveAiFile(name, product, subNo) {
    var doc = app.activeDocument;
    var saveFolder = getSaveFolder();
    var orderFile = saveFolder + "/" + name + "_" + product + "_" + subNo + ".ai";

    var option = new IllustratorSaveOptions();
    option.pdfCompatible = true;
    option.embedICCProfile = false;
    doc.saveAs(File(orderFile), option);
    doc.close(SaveOptions.DONOTSAVECHANGES);
    app.open(File(orderFile));

    return app.activeDocument;
}

// 保存先を取得
function getSaveFolder() {
    var saveFolderPath = "~/Downloads/hankoyaData/";

    var folderObj = new Folder(saveFolderPath);
    if (!folderObj.exists) {
        folderObj.create();
    }

    return folderObj;
}

function cutLayer(doc, vh) {
    if (vh == "ヨコ型") {
        doc.layers["ｶｯﾄﾗｲﾝ-縦"].locked = false;
        doc.layers["ｶｯﾄﾗｲﾝ-縦"].remove();
        return doc.layers["ｶｯﾄﾗｲﾝ-横"];
    } else {
        doc.layers["ｶｯﾄﾗｲﾝ-横"].locked = false;
        doc.layers["ｶｯﾄﾗｲﾝ-横"].remove();
        return doc.layers["ｶｯﾄﾗｲﾝ-縦"];
    }
}

function processPrintString(doc, paramsFont, paramsPrint) {
    var targetLayer = doc.layers["印面"];
    var textFont;

    var newTextFrame = targetLayer.textFrames.add();
    newTextFrame.position = [300, doc.height - 180];

    // テキストフレームのコンテンツを設定
    newTextFrame.contents = paramsPrint;
    convertTextFrameContent(newTextFrame);

    // テキストの書式設定
    switch (paramsFont) {
        case "角ゴシック体":
            textFont = "KozGoPro-Regular"
            break;
        case "明朝体":
            textFont = "KozMinPro-Regular";
            break;
        default:
            textFont = "Meiryo"
            break;
    }
    var charAttributes = newTextFrame.textRange.characterAttributes;
    charAttributes.textFont = app.textFonts.getByName(textFont);

    // フォントサイズの設定
    charAttributes.size = 13; // 13pt
}

function convertTextFrameContent(targetTextFrame) {
    var originalContent = targetTextFrame.contents;
    var convertedContent = originalContent;

    // 1. 全角英数字を半角に変換
    // 「！」～「～」までの全角記号、数字、アルファベット、カタカナを対象とする
    // \uff01-\uff5e は全角文字のUnicode範囲
    // \u3000 は全角スペース
    // \u0020 は半角スペース (この後の処理でまとめて対応するためここでは含めない)
    convertedContent = convertedContent.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
    // 全角の「：」を半角の「:」に変換 (上記正規表現には含まれないため個別指定)
    convertedContent = convertedContent.replace(/：/g, ':');

    // 2. 全角空白と半角空白をすべて半角にする
    // ここではまず全角スペースを半角スペースに変換
    convertedContent = convertedContent.replace(/　/g, ' ');

    // 3. 連続する半角空白を1つにまとめる（オプションだが推奨）
    // 例: "a   b" -> "a b"
    convertedContent = convertedContent.replace(/\s+/g, ' ');

    // 変換後の文字列をTextFrameに設定
    targetTextFrame.contents = convertedContent;

    return convertedContent;
}

function joinCutpathAndText(doc, cutLayer) {
    cutLayer.pathItems[0].selected = true;
    doc.layers["印面"].textFrames[0].selected = true;
    mainScript();
    doc.selection = [];
}

function process(params) {
    var aiFile = getTemplate(params["出品名"]);
    if (aiFile != null && aiFile.exists) {
        app.open(aiFile);
    } else {
        alert("aiが見つからん");
        return;
    }
    var doc = saveAiFile(params["受注番号"], params["出品名"], params["製品番号"]);
    var cLayer = cutLayer(doc, params["大木の向き"]);
    processPrintString(doc, params["書体"], params["印面内容"]);
    joinCutpathAndText(doc, cLayer);
}

function main() {
    var dialog = buildDialog();
    dialog.center();
    dialog.show();
    var params = dialog.params;
    process(params);
}

main();
