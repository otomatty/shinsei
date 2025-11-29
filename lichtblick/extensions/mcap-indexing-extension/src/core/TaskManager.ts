/**
 * @fileoverview タスク管理システム
 * インデックス化タスクの管理とライフサイクル制御を担当
 */

import { IndexingTask, McapIndexingEvents } from "../types";
import { McapProcessor } from "./McapProcessor";

/**
 * タスク管理クラス
 *
 * インデックス化タスクの作成、実行、状態管理を担当する。
 * イベント駆動でUIとの疎結合を実現。
 */
export class TaskManager {
  private tasks: Map<string, IndexingTask> = new Map();
  private processor: McapProcessor;
  private eventListeners: Map<keyof McapIndexingEvents, Array<(data: any) => void>> = new Map();
  private isProcessing: boolean = false;
  private processingQueue: string[] = [];

  /**
   * TaskManagerのコンストラクタ
   * @param processor MCAP処理エンジン
   */
  constructor(processor: McapProcessor) {
    this.processor = processor;
  }

  /**
   * イベントリスナーを登録
   *
   * @param event イベント名
   * @param listener イベントハンドラー
   */
  on<K extends keyof McapIndexingEvents>(
    event: K,
    listener: (data: McapIndexingEvents[K]) => void,
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * イベントを発火
   *
   * @param event イベント名
   * @param data イベントデータ
   */
  private emit<K extends keyof McapIndexingEvents>(event: K, data: McapIndexingEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(data));
    }
  }

  /**
   * 新しいタスクを追加
   *
   * @param files 処理対象のファイル配列
   * @returns 作成されたタスクのID配列
   */
  addTasks(files: File[]): string[] {
    const taskIds: string[] = [];

    for (const file of files) {
      if (!file.name.endsWith(".mcap")) {
        continue; // MCAPファイル以外はスキップ
      }

      const task: IndexingTask = {
        id: this.generateId(),
        fileName: file.name,
        status: "pending",
        progress: 0,
        originalSize: file.size,
        originalFile: file,
      };

      this.tasks.set(task.id, task);
      taskIds.push(task.id);
      this.emit("taskAdded", task);
    }

    // 処理キューに追加
    this.processingQueue.push(...taskIds);

    // 処理開始（既に処理中でなければ）
    if (!this.isProcessing) {
      this.processNextTask();
    }

    return taskIds;
  }

  /**
   * タスクを更新
   *
   * @param taskId タスクID
   * @param updates 更新内容
   */
  updateTask(taskId: string, updates: Partial<IndexingTask>): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    Object.assign(task, updates);
    this.tasks.set(taskId, task);
    this.emit("taskUpdated", { taskId, updates });
  }

  /**
   * タスクを取得
   *
   * @param taskId タスクID
   * @returns タスクオブジェクト
   */
  getTask(taskId: string): IndexingTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 全タスクを取得
   *
   * @returns 全タスクの配列
   */
  getAllTasks(): IndexingTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * タスクを削除
   *
   * @param taskId タスクID
   */
  removeTask(taskId: string): void {
    this.tasks.delete(taskId);
    // キューからも削除
    const queueIndex = this.processingQueue.indexOf(taskId);
    if (queueIndex > -1) {
      this.processingQueue.splice(queueIndex, 1);
    }
  }

  /**
   * 全タスクをクリア
   */
  clearAllTasks(): void {
    this.tasks.clear();
    this.processingQueue = [];
  }

  /**
   * 完了済みタスクをクリア
   */
  clearCompletedTasks(): void {
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === "completed") {
        this.tasks.delete(taskId);
      }
    }
  }

  /**
   * 次のタスクを処理
   */
  private async processNextTask(): Promise<void> {
    if (this.processingQueue.length === 0) {
      this.isProcessing = false;
      this.emit("allTasksCompleted", this.getAllTasks());
      return;
    }

    this.isProcessing = true;
    const taskId = this.processingQueue.shift()!;
    const task = this.tasks.get(taskId);

    if (!task || !task.originalFile) {
      this.processNextTask(); // 次のタスクへ
      return;
    }

    try {
      // タスク状態を処理中に更新
      this.updateTask(taskId, { status: "processing", progress: 0 });

      // MCAP処理を実行
      const indexedData = await this.processor.indexFile(task.originalFile, (progress) => {
        this.updateTask(taskId, { progress: Math.round(progress * 100) });
      });

      // 処理完了
      this.updateTask(taskId, {
        status: "completed",
        progress: 100,
        indexedSize: indexedData.byteLength,
        indexedData,
      });

      this.emit("taskCompleted", this.getTask(taskId)!);
    } catch (error) {
      // エラー処理
      const errorMessage = (error as Error).message;
      this.updateTask(taskId, {
        status: "error",
        error: errorMessage,
      });

      this.emit("taskFailed", { taskId, error: errorMessage });
    }

    // 次のタスクを処理
    setTimeout(() => this.processNextTask(), 100); // 少し間隔を空ける
  }

  /**
   * 処理の一時停止/再開（将来実装）
   */
  pauseProcessing(): void {
    // 実装予定
  }

  resumeProcessing(): void {
    // 実装予定
  }

  /**
   * ユニークIDを生成
   *
   * @returns ランダムな文字列ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
