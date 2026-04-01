/**
 * UAAM Spreadsheet Integration - Base Script
 * ＝スプレッドシート用 GAS（Google Apps Script）雛形＝
 *
 * 【使い方】
 * 1. スプレッドシートのメニューから「拡張機能」>「Apps Script」を選択
 * 2. 以下のコードを貼り付けます。
 * 3. シート1行目にヘッダー（id, title, status, description, target）を作成！
 *    ※ status は「Todo」「In Progress」「Done」のいずれかにしてください。
 * 4. 右上の「デプロイ」>「新しいデプロイ」を選択。
 * 5. 種類の選択で「ウェブアプリ」を選ぶ。
 * 6. 【重要】「アクセスを承認できるユーザー」を「全員」に設定してデプロイ！
 * 7. 発行されたURLをUAAMに登録してください。
 */

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  
  // 1行目はヘッダーと見なす
  var headers = data[0]; 
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  
  // JSON として返却
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
