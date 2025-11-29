/**
 * @fileoverview 共通型定義
 * 拡張機能全体で使用する型定義を集約
 */

/**
 * インデックス化タスクの状態
 */
export type TaskStatus = "pending" | "processing" | "completed" | "error";

/**
 * インデックス化タスクの定義
 */
export interface IndexingTask {
  /** タスクの一意識別子 */
  id: string;
  /** 元ファイル名 */
  fileName: string;
  /** 現在のタスク状態 */
  status: TaskStatus;
  /** 処理進捗（0-100） */
  progress: number;
  /** 元ファイルサイズ（バイト） */
  originalSize: number;
  /** インデックス化後のファイルサイズ（バイト） */
  indexedSize?: number;
  /** エラーメッセージ */
  error?: string;
  /** 元ファイルオブジェクト */
  originalFile?: File;
  /** インデックス化済みデータ */
  indexedData?: ArrayBuffer;
}

/**
 * 進捗更新コールバック
 */
export type ProgressCallback = (progress: number) => void;

/**
 * タスク更新コールバック
 */
export type TaskUpdateCallback = (taskId: string, updates: Partial<IndexingTask>) => void;

/**
 * ファイル選択ハンドラー
 */
export type FileSelectHandler = (files: File[]) => void;

/**
 * MCAP処理オプション
 */
export interface McapProcessingOptions {
  /** 圧縮形式 */
  compression?: "none" | "lz4" | "zstd";
  /** チャンクサイズ */
  chunkSize?: number;
  /** ライブラリ識別子 */
  library?: string;
}

/**
 * イベント型定義
 */
export interface McapIndexingEvents {
  taskAdded: IndexingTask;
  taskUpdated: { taskId: string; updates: Partial<IndexingTask> };
  taskCompleted: IndexingTask;
  taskFailed: { taskId: string; error: string };
  allTasksCompleted: IndexingTask[];
}
