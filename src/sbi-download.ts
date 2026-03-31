import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getBrowserAppName } from './browser-config';

const DOWNLOAD_DIR = path.join(__dirname, '..', 'downloads');
const USER_DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads');
const CSV_DOWNLOAD_URL = 'https://site2.sbisec.co.jp/ETGate/?_ControlID=WPLETacR002Control&_PageID=WPLETacR002Rlst10&_DataStoreID=DSWPLETacR002Control&getFlg=on&_ActionID=csv&account_get_kbn=2';
const DOWNLOAD_WAIT_TIMEOUT_MS = 300_000;
const DOWNLOAD_POLL_INTERVAL_MS = 1_000;
const DOWNLOAD_STABLE_POLLS = 2;

type CsvCandidate = {
  mtimeMs: number;
  path: string;
  size: number;
};

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

async function openChromeForCsvDownload(): Promise<void> {
  const browserAppName = getBrowserAppName();
  if (browserAppName) {
    await execFileAsync('open', ['-a', browserAppName, CSV_DOWNLOAD_URL]);
    return;
  }

  await execFileAsync('open', [CSV_DOWNLOAD_URL]);
}

function getLatestCsvCandidate(minMtimeMs: number): CsvCandidate | null {
  if (!fs.existsSync(USER_DOWNLOADS_DIR)) {
    throw new Error(`ダウンロードフォルダが見つかりません: ${USER_DOWNLOADS_DIR}`);
  }

  const candidates = fs.readdirSync(USER_DOWNLOADS_DIR)
    .filter((name) => name.toLowerCase().endsWith('.csv'))
    .map((name) => {
      const filePath = path.join(USER_DOWNLOADS_DIR, name);
      const stat = fs.statSync(filePath);
      return {
        path: filePath,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
      };
    })
    .filter((file) => file.mtimeMs >= minMtimeMs)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0] ?? null;
}

async function waitForDownloadedCsv(minMtimeMs: number): Promise<string> {
  const startedAt = Date.now();
  let previousCandidate: CsvCandidate | null = null;
  let stableCount = 0;

  while (Date.now() - startedAt < DOWNLOAD_WAIT_TIMEOUT_MS) {
    const candidate = getLatestCsvCandidate(minMtimeMs);

    if (candidate) {
      const currentDownloadPath = `${candidate.path}.crdownload`;
      const isStillDownloading = fs.existsSync(currentDownloadPath);

      if (!isStillDownloading) {
        if (
          previousCandidate &&
          previousCandidate.path === candidate.path &&
          previousCandidate.size === candidate.size
        ) {
          stableCount += 1;
        } else {
          stableCount = 1;
        }

        previousCandidate = candidate;

        if (stableCount >= DOWNLOAD_STABLE_POLLS) {
          return candidate.path;
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_POLL_INTERVAL_MS));
  }

  throw new Error('CSVダウンロードを確認できませんでした。Google Chrome 側でダウンロードが完了しているか確認してください。');
}

export async function downloadSbiCsv(): Promise<string> {
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  const startedAt = Date.now();

  console.log('[SBI] ブラウザ起動');
  await openChromeForCsvDownload();

  console.log('[SBI] SBIログイン（5分待機）');
  const downloadedCsvPath = await waitForDownloadedCsv(startedAt);

  const savePath = path.join(DOWNLOAD_DIR, `holdings_${Date.now()}.csv`);
  fs.copyFileSync(downloadedCsvPath, savePath);
  fs.unlinkSync(downloadedCsvPath);
  console.log(`[SBI] CSV保存: ${path.basename(savePath)}`);

  return savePath;
}
