/**
 * @fileoverview ファイルダウンロードユーティリティ
 * インデックス化済みファイルのダウンロード処理を担当
 */

import { IndexingTask } from "../types";
import { getTranslationValue } from "../hooks/useTranslation";

/**
 * ファイルダウンロード処理クラス
 *
 * インデックス化済みのMCAPファイルを
 * ブラウザ経由でダウンロードする機能を提供。
 */
export class FileDownloader {
  /**
   * タスクからファイルをダウンロード
   *
   * @param task ダウンロード対象のタスク
   */
  static downloadTask(task: IndexingTask): void {
    if (task.status !== "completed" || !task.indexedData) {
      console.warn(`${getTranslationValue("messages", "taskNotReady")}: ${task.id}`);
      return;
    }

    const blob = new Blob([task.indexedData], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    const filename = this.generateIndexedFilename(task.fileName);

    this.triggerDownload(url, filename);

    // メモリリークを防ぐためURLを解放
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * 複数タスクを一括ダウンロード（将来実装）
   *
   * @param tasks ダウンロード対象のタスク配列
   */
  static downloadMultipleTasks(tasks: IndexingTask[]): void {
    const completedTasks = tasks.filter((task) => task.status === "completed" && task.indexedData);

    if (completedTasks.length === 0) {
      console.warn(getTranslationValue("messages", "noCompletedTasks"));
      return;
    }

    // 個別ダウンロード（将来的にはZIP化も検討）
    completedTasks.forEach((task, index) => {
      setTimeout(() => this.downloadTask(task), index * 500); // 500ms間隔
    });
  }

  /**
   * インデックス化済みファイル名を生成
   *
   * @param originalFilename 元のファイル名
   * @returns インデックス化済みファイル名
   */
  private static generateIndexedFilename(originalFilename: string): string {
    const nameWithoutExt = originalFilename.replace(/\.mcap$/, "");
    return `${nameWithoutExt}_indexed.mcap`;
  }

  /**
   * ブラウザでダウンロードを実行
   *
   * @param url ダウンロードURL
   * @param filename ファイル名
   */
  private static triggerDownload(url: string, filename: string): void {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    // リンクをDOMに追加してクリック
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * ファイルサイズを人間が読みやすい形式で取得
   *
   * @param bytes バイト数
   * @returns フォーマットされたサイズ文字列
   */
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  /**
   * 圧縮率を計算
   *
   * @param originalSize 元のファイルサイズ
   * @param indexedSize インデックス化後のファイルサイズ
   * @returns 圧縮率（パーセント）
   */
  static calculateCompressionRatio(originalSize: number, indexedSize: number): number {
    if (originalSize === 0) return 0;
    return Math.round(((originalSize - indexedSize) / originalSize) * 100);
  }

  /**
   * ダウンロード統計情報を生成（将来実装）
   *
   * @param tasks 対象タスク配列
   * @returns 統計情報
   */
  static generateDownloadStats(tasks: IndexingTask[]): {
    totalFiles: number;
    totalOriginalSize: number;
    totalIndexedSize: number;
    averageCompressionRatio: number;
  } {
    const completedTasks = tasks.filter((task) => task.status === "completed" && task.indexedSize);

    if (completedTasks.length === 0) {
      return {
        totalFiles: 0,
        totalOriginalSize: 0,
        totalIndexedSize: 0,
        averageCompressionRatio: 0,
      };
    }

    const totalOriginalSize = completedTasks.reduce((sum, task) => sum + task.originalSize, 0);
    const totalIndexedSize = completedTasks.reduce((sum, task) => sum + (task.indexedSize || 0), 0);

    const averageCompressionRatio =
      totalOriginalSize > 0
        ? Math.round(((totalOriginalSize - totalIndexedSize) / totalOriginalSize) * 100)
        : 0;

    return {
      totalFiles: completedTasks.length,
      totalOriginalSize,
      totalIndexedSize,
      averageCompressionRatio,
    };
  }
}
