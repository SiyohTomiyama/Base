const functions = require('@google-cloud/functions-framework');
const { google } = require("googleapis");
// 書き込みたいスプレッドシートのID
const SHEET_ID = "1MSuvDaP2XGXwEIDRfA6iXYn_BES8lVycyeOZ9xT-sqI";

functions.http('appendSpreadSheetRow', (req, res) => {
    var jwt = getJwt();
    var id = req.body.id;
    var name = req.body.name;
    appendSheetRow(jwt, SHEET_ID, "A1", [id, name]);
    res.send(`OK`);
});

function getJwt() {
    console.log("===getJet start===")
    var credentials = require("./credentials.json");
    return new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
    );
}

function appendSheetRow(jwt, spreadsheetId, range, row) {
    const sheets = google.sheets({ version: 'v4' });
    sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: range,
        auth: jwt,
        valueInputOption: 'RAW',
        resource: { values: [row] }
    }, function (err, result) {
        if (err) {
            console.log(err);
            throw err;
        }
        else {
            console.log('Updated sheet: ' + result.data.updates.updatedRange);
        }
    });
}