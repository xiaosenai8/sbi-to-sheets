import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { getBrowserAppName } from './browser-config';
import { downloadSbiCsv } from './sbi-download';
import { uploadToSheets } from './sheets-upload';

// .env を読み込む
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function logSection(title: string): void {
  console.log(`\n=== ${title} ===`);
}

function logInfo(message: string): void {
  console.log(`[INFO] ${message}`);
}

function logDone(message: string): void {
  console.log(`[OK] ${message}`);
}

function execFileAsync(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(command, args, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function openSpreadsheet(): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID ?? '';
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const browserAppName = getBrowserAppName();
  if (browserAppName) {
    await execFileAsync('open', ['-a', browserAppName, url]);
    return;
  }

  await execFileAsync('open', [url]);
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  logSection('SBI証券 → Google Sheets 同期');

  // 必須環境変数チェック
  const required = ['GOOGLE_SPREADSHEET_ID', 'GOOGLE_SHEET_NAME'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[エラー] 環境変数が設定されていません: ${missing.join(', ')}`);
    console.error('.env.example を参考に .env ファイルを作成してください');
    process.exit(1);
  }

  let csvPath: string | null = null;

  try {
    // Step 1: SBI証券からCSVダウンロード
    logSection('Step 1/2 CSV取得');
    csvPath = await downloadSbiCsv();
    logDone('CSV取得');

    // Step 2: Googleスプレッドシートに書き込み
    logSection('Step 2/2 Sheets反映');
    await uploadToSheets(csvPath);
    logDone('Sheets反映');

    logSection('同期完了');

    await openSpreadsheet().catch(() => {});
    logInfo('Sheets表示');
  } catch (err) {
    console.error('\n[エラー] 処理失敗');
    console.error(err instanceof Error ? err.message : err);

    // ログイン失敗の場合は再実行を促す
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ログイン') || msg.includes('timeout') || msg.includes('Navigation')) {
      console.error('\nSBI証券へのログインが途中で完了していない可能性があります。');
      console.error('もう一度 `./run.sh` または `run.command` を実行してやり直してください。');
    }

    process.exit(1);
  } finally {
    // 一時CSVファイルを削除
    if (csvPath && fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath);
      logInfo('CSV削除');
    }

    const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    logInfo(`処理時間: ${elapsedSeconds}秒`);
    console.log('');
  }
}

main();
