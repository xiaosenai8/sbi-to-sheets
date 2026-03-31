# sbi-to-sheets

SBI証券の保有証券CSVをダウンロードし、Googleスプレッドシートへ転記するツールです。

## 機能

- デフォルトブラウザで CSV ダウンロードURLを開く
- 必要なら通常利用中のブラウザ上で SBI証券へログインする
- `~/Downloads` に保存されたCSVを取り込む
- CSVをShift-JISからUTF-8に変換
- Googleスプレッドシートの指定シートへ `A2` から書き込み
- 既存データは `A2:Z2000` をクリアしてから上書き

## 実行方法

起動方法は次のどちらかです。

- ターミナルで `./run.sh`
- Finderで `[run.command]` をダブルクリック

ブラウザ指定も可能です。

- `./run.sh --browser "Google Chrome"`
- `./run.sh --browser "Safari"`

`run.command` を初めて開くと macOS の警告が出ることがあります。
その場合は右クリックして「開く」を一度実行してください。

## 最初にやること

### 1. 依存パッケージを入れる

```bash
npm install
```

### 2. Google Sheets API を使えるようにする

1. Google Cloud Console でプロジェクトを作成
2. Google Sheets API を有効化
3. サービスアカウントを作成
4. JSONキーをダウンロードして、このフォルダに `credentials.json` として保存
5. 転記先スプレッドシートを、サービスアカウントのメールアドレスに「編集者」で共有

参考サイト
  - [サービスアカウントで連携する · HonKit](https://docs.biztex.co.jp/cobit-docs/google_spreadsheet_settings/for_serviceaccount.html)　
  - 4の手順が無いので注意

### 3. `.env` を作る

プロジェクト直下に `.env` を置いてください。

```text
GOOGLE_SPREADSHEET_ID=スプレッドシートのID
GOOGLE_SHEET_NAME=書き込み先のシート名
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./credentials.json
```

スプレッドシートIDはURLの `spreadsheets/d/` と `/edit` の間です。

```text
https://docs.google.com/spreadsheets/d/xxxxxxxxxxxxxxxxxxxx/edit
```

## 書き込み仕様

- 書き込み先は `.env` の `GOOGLE_SHEET_NAME`
- `A1` は変更しない
- `A2:Z2000` をクリアしてから書き込む
- 書き込み開始位置は `A2`
- CSVはShift-JISとして読み込む

## ファイル構成

```text
sbi-to-sheets/
├── src/                    # アプリ本体
│   ├── index.ts            # 全体の実行開始。ダウンロードと転記を順に呼ぶ
│   ├── sbi-download.ts     # Google Chrome でCSVをダウンロードし、Downloadsから取り込む
│   ├── sheets-upload.ts    # CSVを読み込み、Googleスプレッドシートへ書き込む
│   └── debug-nav.ts        # SBI画面の遷移やリンク確認用のデバッグスクリプト
├── .env                    # 実際の設定値を入れる環境変数ファイル
├── .env.example            # `.env` 作成用の見本
├── credentials.json        # Google Service Account の認証キー
├── run.sh                  # ターミナル用の起動スクリプト
├── run.command             # Finderからダブルクリック実行するための起動ファイル
├── package.json            # Node.js の依存関係と実行スクリプト定義
└── README.md               # セットアップ方法と使い方の説明
```

## よくある確認ポイント

- `.env` の `GOOGLE_SPREADSHEET_ID` と `GOOGLE_SHEET_NAME` が正しいか
- `credentials.json` が存在するか
- スプレッドシートがサービスアカウントに共有されているか
- デフォルトブラウザで SBI証券にログインできるか
- CSV が `~/Downloads` に保存されているか
