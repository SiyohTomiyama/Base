const functions = require('@google-cloud/functions-framework');
const { google } = require("googleapis");

// 書き込みたいスプレッドシートのID
const SHEET_ID = "1eBE0a95f8GLgClXueZEbLILKmSqPR-37PGODoBfK7cg"; //本番
const TARGET_SHEET_NAME = "進捗管理表"; // 操作したいシート名
const KEYS = ["order_date", "submission_count", "check_due_at", "order_number", "first_order_number", "price", "product_category2_name", "product_name", "arrange_group_name", "arrange_group_name2", "template_number", "note"];

functions.http('appendSpreadSheetRow', async (req, res) => {
    try {
        // 1. リクエストボディのバリデーション
        if (!req.rawBody) {
            console.error("Error: リクエストボディが空です。");
            return res.status(400).send('Bad Request: リクエストボディが空です。');
        }

        let parsedBody;
        try {
            parsedBody = JSON.parse(req.rawBody.toString('utf8'));
        } catch (jsonError) {
            console.error("Error: リクエストボディのJSONパースに失敗しました。", jsonError);
            return res.status(400).send(`Bad Request: リクエストボディが不正です。詳細: ${jsonError.message}`);
        }

        if (typeof parsedBody !== 'object' || parsedBody === null) {
            console.error("Error: パースされたリクエストボディはJSONオブジェクトでなければなりません。");
            return res.status(400).send('Bad Request: リクエストボディが不正です。');
        }

        const today = new Date();
        const jstDate = today.toLocaleString('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // JWTクライアントの取得
        const jwt = getJwt();
        if (!jwt) {
            // getJwt内でエラーが発生した場合、すでにコンソールにエラーが出力されているはず
            return res.status(401).send('Internal Server Error: 認証クライアントの初期化に失敗しました。');
        }

        // req.body のキーとキー行を比較し、書き込むデータと未発見キーを準備
        const dataToWrite = new Array(KEYS.length).fill(''); // 書き込む行の初期化（空文字で埋める）
        const bodyKeys = Object.keys(parsedBody);

        for (const key of bodyKeys) {
            const keyIndex = KEYS.indexOf(key); // KEYSにキーが存在するか検索
            if (keyIndex !== -1) {
                // 一致するキーが見つかった場合、対応するインデックスに値を設定
                dataToWrite[keyIndex] = parsedBody[key];
            }
            // それ以外のキーは無視する
        }

        // 最初のセルは日付で埋める
        dataToWrite[0] = jstDate;

        // データが存在する最初の空白行を見つける (appendメソッドが自動で処理)
        const appendRange = `${TARGET_SHEET_NAME}!A1`;

        // データをスプレッドシートに書き込む
        const appendResult = await appendSheetRowAsync(jwt, SHEET_ID, appendRange, dataToWrite);

        // スプレッドシートAPIからの成功レスポンスを検証
        if (appendResult && appendResult.data && appendResult.data.updates && appendResult.data.updates.updatedRange) {
            console.log(`スプレッドシートに正常に書き込みました。更新範囲: ${appendResult.data.updates.updatedRange}`);
            return res.status(200).send(`OK`);
        } else {
            // APIからのレスポンスが期待通りでない場合
            console.error("Error: スプレッドシートAPIからのレスポンスが不完全または予期しない形式でした。", appendResult);
            return res.status(500).send("Internal Server Error: スプレッドシートへの書き込みは成功しましたが、APIレスポンスの検証に失敗しました。");
        }

    } catch (error) {
        console.error("Error in appendSpreadSheetRow (main function):", error);
        // エラーの種類に応じて適切なステータスコードを返す
        if (error.code === 401) { // 認証エラー
            return res.status(401).send(`Unauthorized: 認証エラーが発生しました。詳細: ${error.message}`);
        } else if (error.code === 403) { // 権限エラー (スプレッドシートへのアクセス権限がない、または保護されたセルへの書き込み)
            return res.status(403).send(`Forbidden: スプレッドシートへのアクセス権限がありません。詳細: ${error.message}`);
        } else if (error.message && error.message.includes('You are trying to edit a protected cell or object')) {
            return res.status(403).send(`Forbidden: 保護されたセルへの書き込み権限がありません。詳細: ${error.message}`);
        } else if (error.message && error.message.includes('Unable to parse range') && error.message.includes(TARGET_SHEET_NAME)) {
            return res.status(404).send(`Not Found: 指定されたシート名 '${TARGET_SHEET_NAME}' が見つかりません。詳細: ${error.message}`);
        } else if (error.message && error.message.includes('Requested entity was not found')) {
            return res.status(404).send(`Not Found: 指定されたスプレッドシート (ID: ${SHEET_ID}) が見つかりません。詳細: ${error.message}`);
        } else {
            return res.status(500).send(`Internal Server Error: 予期せぬエラーが発生しました。詳細: ${error.message || error.toString()}`);
        }
    }
}, { rawBody: true });

// JWTクライアントを取得する関数
function getJwt() {
    console.log("===getJwt start===");
    try {
        const credentials = require("./credentials.json");
        return new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ['https://www.googleapis.com/auth/spreadsheets']
        );
    } catch (error) {
        console.error("Error: JWTクライアントの取得中にエラーが発生しました。credentials.jsonが正しいか確認してください。", error);
        return null; // エラーが発生した場合はnullを返す
    }
}

/**
 * スプレッドシートに行を追記し、追記された行のA列の書式を設定する非同期関数
 * @param {object} jwt - 認証されたJWTクライアント
 * @param {string} spreadsheetId - スプレッドシートのID
 * @param {string} range - データを追記する範囲（例: "Sheet1!A1"）
 * @param {Array<string>} row - 追記するデータの配列
 * @returns {Promise<object>} APIレスポンスのPromise
 */
async function appendSheetRowAsync(jwt, spreadsheetId, range, row) {
    const sheets = google.sheets({ version: 'v4', auth: jwt });

    // 1. データをスプレッドシートに追記
    const appendResult = await new Promise((resolve, reject) => {
        sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: range,
            auth: jwt,
            valueInputOption: 'USER_ENTERED', // セルの書式設定に従う
            resource: { values: [row] }
        }, function (err, result) {
            if (err) {
                console.error("データを追加する際エラーが出ました:", err);
                reject(err); // Promiseをrejectして上位のtry-catchにエラーを伝える
            } else {
                console.log('Updated sheet: ' + result.data.updates.updatedRange);
                resolve(result);
            }
        });
    });

    // 2. 追記された行のA列の書式を「日付」に設定
    const updatedRange = appendResult.data.updates.updatedRange; // 例: "進捗管理表!A10:L10"
    if (updatedRange) {
        const rowNumMatch = updatedRange.match(/(\d+)/); // 最初の数字の並びを取得
        let startRowNumber;
        if (rowNumMatch && rowNumMatch[0]) {
            startRowNumber = parseInt(rowNumMatch[0]); // match[0]はマッチ全体（例: "10"）
        } else {
            console.warn(`Could not extract row number from updatedRange: ${updatedRange}. Skipping format.`);
            return appendResult;
        }

        // シートIDを取得
        const sheetId = await getSheetId(jwt, spreadsheetId, TARGET_SHEET_NAME);
        const requests = [
            {
                "repeatCell": {
                    "range": {
                        "sheetId": sheetId, // シートIDを使用
                        "startRowIndex": startRowNumber - 1,
                        "endRowIndex": startRowNumber,     // 追記した1行のみを対象にするため、startRowIndex + 1 (0ベース)
                        "startColumnIndex": 0,             // A列は0
                        "endColumnIndex": 1                // A列のみなので1
                    },
                    "cell": {
                        "userEnteredFormat": {
                            "numberFormat": {
                                "type": "DATE",
                                "pattern": "yyyy/mm/dd" // 例: 2024/06/23
                            }
                        }
                    },
                    "fields": "userEnteredFormat.numberFormat"
                }
            }
        ];

        try {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: spreadsheetId,
                auth: jwt,
                resource: { requests: requests }
            });
            console.log(`Successfully formatted column A of row ${startRowNumber} in sheet '${TARGET_SHEET_NAME}' as Date.`);
        } catch (formatError) {
            console.error("A列の書式設定に失敗しました:", formatError);
            // 書式設定のエラーは致命的ではないため、throwせずログに留める
        }
    } else {
        console.warn(`Could not parse updatedRange for formatting: ${updatedRange}`);
    }

    return appendResult; // 追記結果を返す
}

// シートIDを取得するヘルパー関数
async function getSheetId(jwt, spreadsheetId, sheetName) {
    const sheets = google.sheets({ version: 'v4', auth: jwt });
    try {
        const response = await sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId,
            fields: 'sheets.properties' // シートのプロパティのみを取得
        });
        const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
        if (sheet) {
            return sheet.properties.sheetId;
        } else {
            throw new Error(`シート '${sheetName}' が見つかりません。`);
        }
    } catch (err) {
        console.error(`シートIDの取得に失敗しました ('${sheetName}'):`, err);
        throw err;
    }
}
