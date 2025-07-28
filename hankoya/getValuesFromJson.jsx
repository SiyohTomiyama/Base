#include "json2.jsxinc"
// ------------------------------

function processJsonAndCreateTextFrames() {
    // 1. JSONファイルの選択ダイアログを表示
    var jsonFile = File.openDialog("JSONファイルを選択してください", "*.json");

    if (!jsonFile) {
        alert("ファイルが選択されませんでした。");
        return;
    }

    // 2. JSONファイルの読み込み
    jsonFile.encoding = "UTF-8"; // ファイルのエンコーディングを指定
    jsonFile.open("r");
    var jsonString = jsonFile.read();
    jsonFile.close();

    // 3. JSONの解析
    var data;
    try {
        data = JSON.parse(jsonString); //includeしたjson2.jsxincを使用してJSONを解析
    } catch (e) {
        alert("JSONファイルの解析中にエラーが発生しました。\nファイルの内容を確認してください。\nエラー: " + e.message);
        return;
    }

    // 4. Illustratorドキュメントの準備
    if (app.documents.length === 0) {
        alert("Illustratorドキュメントが開かれていません。\n新しいドキュメントを作成するか、既存のドキュメントを開いてからスクリプトを実行してください。");
        return;
    }
    var doc = app.activeDocument;

    // A4縦のアートボード座標を想定（左下が原点）
    // doc.artboards[0].artboardRect は [左下X, 左下Y, 右上X, 右上Y] の配列
    var artboardLeft = doc.artboards[0].artboardRect[0];
    var artboardTop = doc.artboards[0].artboardRect[1]; // アートボードの上端Y座標

    // テキストボックスの初期位置と間隔設定
    var currentY = artboardTop - 50; // アートボード上端から少し下に開始
    var currentX = artboardLeft + 50; // アートボード左端から少し右に開始
    var fontSize = 12; // フォントサイズ

    // 5. データの抽出とテキストボックスへの書き込み
    var productDetailsData = null;

    // JSON構造: record -> 製造明細 (オブジェクト) -> value (配列)
    // パスの存在を安全に確認しながらアクセス
    if (data && data.record && data.record.製造明細 && data.record.製造明細.value) {
        productDetailsData = data.record.製造明細.value;
    } else {
        alert("JSON構造に 'record.製造明細.value' のパスが見つかりませんでした。JSONファイルを確認してください。");
        return;
    }

    // productDetailsDataが配列であることを確認
    if (productDetailsData instanceof Array) { //
        for (var i = 0; i < productDetailsData.length; i++) {
            var item = productDetailsData[i];
            var variationHtml = null;

            // 各アイテム内の深い階層の'variation'の'value'にアクセス
            if (item && item.value && item.value.variation && item.value.variation.value) {
                variationHtml = item.value.variation.value;
            }

            if (variationHtml !== null) {
                // HTMLタグと文字参照の整形処理
                var cleanedText = variationHtml.replace(/<span[^>]*>|<\/span>/g, ""); // <span>タグを削除
                cleanedText = cleanedText.replace(/<br>/g, "\n"); // <br>を改行に
                cleanedText = cleanedText.replace(/&gt;/g, ">"); // &gt;を>に

                var textFrame = doc.textFrames.add();
                textFrame.contents = cleanedText;
                textFrame.top = currentY;
                textFrame.left = currentX;

                // フォントサイズや色などの設定 (任意)
                textFrame.textRange.characterAttributes.size = fontSize;
                textFrame.textRange.characterAttributes.fillColor = app.activeDocument.swatches.getByName("ブラック").color;

                // 次のテキストボックスのためにY座標を更新
                // 複数行テキストに対応するため、テキストフレームの高さに基づいて次の位置を計算
                currentY = textFrame.top - textFrame.height - 10; // テキストフレームの高さ + 少し余白
                if (currentY <= artboardTop - doc.height) { // はみ出しすぎた場合の調整（アートボード下端を大きく超える場合）
                     currentY = artboardTop - 50; // Y座標をリセット
                     currentX += 300; // X座標をずらして次の列へ
                }

            } else {
                alert("製造明細のインデックス " + i + " に、目的の 'variation.value' が見つかりませんでした。");
            }
        }
        alert("JSONデータからテキストボックスへの書き込みが完了しました。");

    } else {
        alert("'record.製造明細.value' が配列ではありません。JSON構造を確認してください。"); //
    }
}

// スクリプトを実行
processJsonAndCreateTextFrames();
