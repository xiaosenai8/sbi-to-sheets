import { google } from 'googleapis';
import * as fs from 'fs';
import * as iconv from 'iconv-lite';

export async function uploadToSheets(csvPath: string): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID ?? '';
  const sheetNameEnv = process.env.GOOGLE_SHEET_NAME ?? '';
  const keyPath = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ?? './credentials.json')
    .replace(/^~/, require('os').homedir());

  if (!sheetNameEnv) {
    throw new Error('環境変数 GOOGLE_SHEET_NAME が設定されていません');
  }

  // Google Service Account 認証
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // シート名の存在確認
  console.log('[Sheets] 情報取得');
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === sheetNameEnv,
  );
  if (!sheet?.properties?.title) {
    const available = spreadsheet.data.sheets?.map(s => s.properties?.title).join(', ');
    throw new Error(`シート "${sheetNameEnv}" が見つかりませんでした。利用可能: ${available}`);
  }
  const sheetName = sheet.properties.title;
  const spreadsheetTitle = spreadsheet.data.properties?.title ?? spreadsheetId;
  console.log(`[Sheets] 書込先: "${spreadsheetTitle}" / "${sheetName}"`);

  // CSVを読み込み（Shift-JIS → UTF-8）
  console.log('[Sheets] CSV読込');
  const rawBuffer = fs.readFileSync(csvPath);
  const csvText = iconv.decode(rawBuffer, 'Shift_JIS');

  // CSVをパースして2次元配列に変換
  const rows = csvText
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))  // 改行コード正規化
    .filter((line) => line.length > 0)        // 空行除去
    .map((line) => parseCsvLine(line));

  // A2以降をクリア（A1の説明テキストは保持）
  const clearRange = `${sheetName}!A2:Z2000`;
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: clearRange,
  });
  console.log('[Sheets] 既存データ削除完了');

  // A2からデータを書き込み
  const writeRange = `${sheetName}!A2`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: writeRange,
    valueInputOption: 'USER_ENTERED',  // 数値・日付を自動認識
    requestBody: { values: rows },
  });

  console.log(`[Sheets] 書込完了: ${rows.length}行`);
}

// CSVの1行をパース（ダブルクォートで囲まれたカンマを考慮）
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuote && line[i + 1] === '"') {
        // エスケープされたダブルクォート
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (char === ',' && !inQuote) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
