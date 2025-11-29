// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { dialog, shell, BrowserWindow } from "electron";
import { createWriteStream } from "fs";
import { promises as fs } from "fs";
import * as path from "path";

import Logger from "@lichtblick/log";

const log = Logger.getLogger(__filename);

/**
 * GitHubリリース情報の型定義
 */
interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  assets: GitHubAsset[];
  published_at: string;
}

/**
 * GitHubアセット情報の型定義
 */
interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

/**
 * macOS向けカスタムアップデーター
 *
 * コード署名が不要な半自動更新システムを提供します。
 * 以下の機能を含みます：
 * - GitHub Releasesから最新バージョンの確認
 * - 新バージョンの自動ダウンロード
 * - 進行状況表示
 * - インストール手順の案内
 */
export class CustomMacUpdater {
  private readonly updateCheckUrl =
    "https://api.github.com/repos/lichtblickhtblicklichtblickite/lichtblick/releases/latest";
  private readonly currentVersion: string;

  constructor() {
    // package.jsonからバージョンを取得
    this.currentVersion = this.getCurrentVersion();
    log.info(`[CUSTOM_MAC_UPDATER] Initialized with version: ${this.currentVersion}`);
  }

  /**
   * 現在のアプリケーションバージョンを取得
   */
  private getCurrentVersion(): string {
    try {
      // Electronアプリのバージョンを取得
      const { app } = require("electron");
      const version: string = app.getVersion();
      log.debug(`[CUSTOM_MAC_UPDATER] Retrieved version from Electron app: ${version}`);
      return version;
    } catch (error) {
      log.warn(`[CUSTOM_MAC_UPDATER] Failed to get version from Electron, using fallback`);
      return "0.0.0";
    }
  }

  /**
   * 更新チェックを実行
   * @param showNoUpdateDialog 最新の場合にダイアログを表示するか
   * @returns 更新が利用可能かどうか
   */
  public async checkForUpdates(showNoUpdateDialog = false): Promise<boolean> {
    log.info(
      `[CUSTOM_MAC_UPDATER] Starting update check, showNoUpdateDialog: ${showNoUpdateDialog}`,
    );

    try {
      const release = await this.fetchLatestRelease();
      const latestVersion = this.cleanVersion(release.tag_name);

      log.debug(
        `[CUSTOM_MAC_UPDATER] Current version: ${this.currentVersion}, Latest version: ${latestVersion}`,
      );

      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        log.info(`[CUSTOM_MAC_UPDATER] New version available: ${latestVersion}`);
        return await this.showUpdateDialog(release);
      } else {
        log.info(`[CUSTOM_MAC_UPDATER] Already up to date`);
        if (showNoUpdateDialog) {
          await this.showNoUpdateDialog();
        }
        return false;
      }
    } catch (error) {
      log.error(`[CUSTOM_MAC_UPDATER] Update check failed:`, error);
      await this.showErrorDialog("更新チェックに失敗しました", `エラー: ${error}`);
      return false;
    }
  }

  /**
   * GitHub APIから最新リリース情報を取得
   */
  private async fetchLatestRelease(): Promise<GitHubRelease> {
    log.debug(`[CUSTOM_MAC_UPDATER] Fetching latest release from: ${this.updateCheckUrl}`);

    const response = await fetch(this.updateCheckUrl, {
      headers: {
        "User-Agent": "Lichtblick-Suite-Updater",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    const release = (await response.json()) as GitHubRelease;
    log.debug(`[CUSTOM_MAC_UPDATER] Retrieved release: ${release.tag_name}`);

    return release;
  }

  /**
   * バージョン文字列から'v'プレフィックスを除去
   */
  private cleanVersion(version: string): string {
    return version.replace(/^v/, "");
  }

  /**
   * バージョン比較（セマンティックバージョニング対応）
   */
  private isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.split(".").map((part) => {
      const versionPart = part.split("-")[0];
      const num = parseInt(versionPart ?? "0", 10);
      return isNaN(num) ? 0 : num;
    });

    const currentParts = current.split(".").map((part) => {
      const versionPart = part.split("-")[0];
      const num = parseInt(versionPart ?? "0", 10);
      return isNaN(num) ? 0 : num;
    });

    const maxLength = Math.max(latestParts.length, currentParts.length);

    for (let i = 0; i < maxLength; i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (latestPart > currentPart) {
        return true;
      }
      if (latestPart < currentPart) {
        return false;
      }
    }

    return false;
  }

  /**
   * 更新ダイアログを表示
   */
  private async showUpdateDialog(release: GitHubRelease): Promise<boolean> {
    log.debug(`[CUSTOM_MAC_UPDATER] Showing update dialog for version: ${release.tag_name}`);

    const releaseNotes = this.formatReleaseNotes(release.body);

    const result = await dialog.showMessageBox({
      type: "info",
      title: "新しいバージョンが利用可能です",
      message: `バージョン ${release.tag_name} が利用可能です`,
      detail: `リリース日: ${new Date(release.published_at).toLocaleDateString("ja-JP")}\n\n${releaseNotes}`,
      buttons: ["自動ダウンロード", "GitHubで詳細を見る", "後で"],
      defaultId: 0,
      cancelId: 2,
    });

    switch (result.response) {
      case 0: // 自動ダウンロード
        log.info(`[CUSTOM_MAC_UPDATER] User chose automatic download`);
        return await this.downloadAndInstall(release);
      case 1: // GitHubで詳細を見る
        log.info(`[CUSTOM_MAC_UPDATER] User chose to view on GitHub`);
        shell.openExternal(release.html_url);
        return false;
      default: // 後で
        log.info(`[CUSTOM_MAC_UPDATER] User chose to skip update`);
        return false;
    }
  }

  /**
   * リリースノートを整形
   */
  private formatReleaseNotes(body: string): string {
    if (!body) {
      return "新機能とバグ修正が含まれています。";
    }

    // マークダウンの見出しやリストを簡略化
    return (
      body
        .replace(/#{1,6}\s/g, "• ")
        .replace(/\*\s/g, "  - ")
        .replace(/\r\n/g, "\n")
        .slice(0, 300) + (body.length > 300 ? "..." : "")
    );
  }

  /**
   * 最新版ダイアログを表示
   */
  private async showNoUpdateDialog(): Promise<void> {
    await dialog.showMessageBox({
      type: "info",
      title: "アップデート",
      message: "Lichtblickは最新バージョンです",
      detail: `現在のバージョン: ${this.currentVersion}`,
      buttons: ["OK"],
    });
  }

  /**
   * エラーダイアログを表示
   */
  private async showErrorDialog(title: string, message: string): Promise<void> {
    await dialog.showErrorBox(title, message);
  }

  /**
   * ダウンロードとインストール案内
   */
  private async downloadAndInstall(release: GitHubRelease): Promise<boolean> {
    // macOS用のアセットを検索
    const macAsset = this.findMacAsset(release.assets);

    if (!macAsset) {
      log.error(`[CUSTOM_MAC_UPDATER] No macOS asset found in release`);
      await this.showErrorDialog("エラー", "macOS用のインストールファイルが見つかりません");
      return false;
    }

    log.info(`[CUSTOM_MAC_UPDATER] Found macOS asset: ${macAsset.name}`);

    try {
      // ダウンロード先パスを決定
      const downloadPath = await this.getDownloadPath(macAsset.name);

      // 進行状況ウィンドウを作成
      const progressWindow = this.createProgressWindow();

      // ダウンロード実行
      await this.downloadFile(macAsset, downloadPath, progressWindow);

      // インストール手順を表示
      await this.showInstallInstructions(downloadPath, release.tag_name);

      progressWindow.close();
      return true;
    } catch (error) {
      log.error(`[CUSTOM_MAC_UPDATER] Download failed:`, error);
      await this.showErrorDialog("ダウンロードエラー", `ダウンロードに失敗しました: ${error}`);
      return false;
    }
  }

  /**
   * macOS用のアセットを検索
   */
  private findMacAsset(assets: GitHubAsset[]): GitHubAsset | undefined {
    // 優先順位: darwin > mac > universal
    const macKeywords = ["darwin", "mac", "universal"];

    for (const keyword of macKeywords) {
      const asset = assets.find(
        (asset) =>
          asset.name.toLowerCase().includes(keyword) &&
          (asset.name.endsWith(".dmg") || asset.name.endsWith(".zip")),
      );
      if (asset) {
        log.debug(`[CUSTOM_MAC_UPDATER] Found asset with keyword '${keyword}': ${asset.name}`);
        return asset;
      }
    }

    log.debug(`[CUSTOM_MAC_UPDATER] Available assets: ${assets.map((a) => a.name).join(", ")}`);
    return undefined;
  }

  /**
   * ダウンロード先パスを決定
   */
  private async getDownloadPath(filename: string): Promise<string> {
    const homeDir = process.env.HOME;
    if (!homeDir) {
      throw new Error("HOME environment variable is not set");
    }

    const downloadsDir = path.join(homeDir, "Downloads");

    // ディレクトリが存在することを確認
    try {
      await fs.access(downloadsDir);
    } catch {
      await fs.mkdir(downloadsDir, { recursive: true });
    }

    const downloadPath = path.join(downloadsDir, `lichtblick-update-${filename}`);
    log.debug(`[CUSTOM_MAC_UPDATER] Download path: ${downloadPath}`);

    return downloadPath;
  }

  /**
   * 進行状況ウィンドウを作成
   */
  private createProgressWindow(): BrowserWindow {
    log.debug(`[CUSTOM_MAC_UPDATER] Creating progress window`);

    const progressWindow = new BrowserWindow({
      width: 450,
      height: 200,
      show: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      title: "Lichtblick アップデート",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              padding: 30px;
              margin: 0;
              text-align: center;
              background: #f8f9fa;
            }
            .container {
              background: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h3 {
              margin: 0 0 20px 0;
              color: #333;
              font-weight: 500;
            }
            .progress-info {
              margin: 15px 0;
              color: #666;
              font-size: 14px;
            }
            .progress-container {
              width: 100%;
              height: 8px;
              background: #e9ecef;
              border-radius: 4px;
              overflow: hidden;
              margin: 20px 0;
            }
            .progress-bar {
              height: 100%;
              background: linear-gradient(90deg, #007AFF, #5856D6);
              border-radius: 4px;
              width: 0%;
              transition: width 0.3s ease;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h3>新しいバージョンをダウンロードしています</h3>
            <div class="progress-info">
              <div id="status">準備中...</div>
              <div id="progress-text">0%</div>
            </div>
            <div class="progress-container">
              <div id="progress-bar" class="progress-bar"></div>
            </div>
          </div>
        </body>
      </html>
    `;

    progressWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    progressWindow.show();

    return progressWindow;
  }

  /**
   * ファイルダウンロード
   */
  private async downloadFile(
    asset: GitHubAsset,
    downloadPath: string,
    progressWindow: BrowserWindow,
  ): Promise<void> {
    log.info(`[CUSTOM_MAC_UPDATER] Starting download: ${asset.browser_download_url}`);

    const response = await fetch(asset.browser_download_url);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const totalSize = asset.size || parseInt(response.headers.get("content-length") || "0");
    const fileStream = createWriteStream(downloadPath);

    let downloadedSize = 0;
    let lastUpdateTime = Date.now();

    // ReadableStreamを取得
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response body reader");
    }

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        fileStream.write(value);
        downloadedSize += value.length;

        // 進行状況更新（0.5秒間隔でスロットリング）
        const now = Date.now();
        if (now - lastUpdateTime > 500 || downloadedSize === totalSize) {
          const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0;
          const downloadedMB = (downloadedSize / 1024 / 1024).toFixed(1);
          const totalMB = (totalSize / 1024 / 1024).toFixed(1);

          await progressWindow.webContents
            .executeJavaScript(
              `
            document.getElementById('progress-text').textContent = '${progress}%';
            document.getElementById('progress-bar').style.width = '${progress}%';
            document.getElementById('status').textContent = '${downloadedMB}MB / ${totalMB}MB ダウンロード済み';
          `,
            )
            .catch(() => {
              // ウィンドウが閉じられた場合は無視
            });

          lastUpdateTime = now;
        }
      }

      fileStream.end();
      log.info(`[CUSTOM_MAC_UPDATER] Download completed: ${downloadPath}`);
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * インストール手順を表示
   */
  private async showInstallInstructions(downloadPath: string, version: string): Promise<void> {
    log.debug(`[CUSTOM_MAC_UPDATER] Showing install instructions for: ${downloadPath}`);

    const isZip = downloadPath.endsWith(".zip");
    const isDmg = downloadPath.endsWith(".dmg");

    let instructions = "";
    if (isZip) {
      instructions = `
1. ダウンロードしたZIPファイルをダブルクリックして解凍
2. 現在のLichtblickアプリケーションを終了
3. 解凍されたアプリケーションを「アプリケーション」フォルダにドラッグ&ドロップ
4. 既存のアプリケーションを置き換えるか確認されたら「はい」を選択
5. 新しいバージョンのLichtblickを起動`;
    } else if (isDmg) {
      instructions = `
1. ダウンロードしたDMGファイルをダブルクリックしてマウント
2. 現在のLichtblickアプリケーションを終了
3. Lichtblickアイコンを「アプリケーション」フォルダにドラッグ&ドロップ
4. 既存のアプリケーションを置き換えるか確認されたら「はい」を選択
5. DMGファイルをアンマウント
6. 新しいバージョンのLichtblickを起動`;
    } else {
      instructions = `
1. ダウンロードしたファイルをダブルクリックして開く
2. 画面の指示に従ってインストールを完了
3. 新しいバージョンのLichtblickを起動`;
    }

    const result = await dialog.showMessageBox({
      type: "info",
      title: "ダウンロード完了",
      message: `${version} のダウンロードが完了しました`,
      detail: `ファイル: ${path.basename(downloadPath)}\n保存場所: ${path.dirname(downloadPath)}\n\nインストール手順:${instructions}\n\n今すぐファイルの場所を開きますか？`,
      buttons: ["ファイルを表示", "後で行う"],
      defaultId: 0,
    });

    if (result.response === 0) {
      log.info(`[CUSTOM_MAC_UPDATER] Opening download location`);
      shell.showItemInFolder(downloadPath);
    }
  }
}
