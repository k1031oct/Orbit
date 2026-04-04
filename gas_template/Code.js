/**
 * UAAM Spreadsheet Integration - Production Script
 * ＝スプレッドシート用 GAS（Google Apps Script）完成版＝
 *
 * 【使い方】
 * 1. スプレッドシートのメニューから「拡張機能」>「Apps Script」を選択
 * 2. 以下のコードを貼り付けます。
 * 3. シート1行目にヘッダー（id, title, status, description, target）があることを確認！
 * 4. 右上の「デプロイ」>「新しいデプロイ」を選択。
 * 5. 種類の選択で「ウェブアプリ」を選ぶ。
 * 6. 【重要】「アクセスできるユーザー」を「全員」に設定してデプロイ！
 * 7. 発行されたURLをUAAMのプロジェクト設定に登録してください。
 */

/**
 * データの取得 (GET)
 * UAAM 側から要件リストを取得する際に呼ばれます。
 */
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
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
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * データの更新 (POST)
 * UAAM 側で開発が完了した際、ステータスを自動更新するために呼ばれます。
 */
function doPost(e) {
  var params = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  // 各項目の列番号を特定
  var idIdx = headers.indexOf('id');
  var statusIdx = headers.indexOf('status');
  var descriptionIdx = headers.indexOf('description');

  if (params.action === "updateStatus") {
    for (var i = 1; i < data.length; i++) {
      // ID が一致する行を探す (IDは文字列として比較)
      if (data[i][idIdx].toString() === params.id.toString()) {
        sheet.getRange(i + 1, statusIdx + 1).setValue(params.status);
        
        // メッセージがあれば description に追記または微調整（任意）
        if (params.message) {
          console.log("Status update: " + params.id + " -> " + params.status + " (" + params.message + ")");
        }
        
        return ContentService.createTextOutput(JSON.stringify({ success: true }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: "ID not found" }))
    .setMimeType(ContentService.MimeType.JSON);
}
