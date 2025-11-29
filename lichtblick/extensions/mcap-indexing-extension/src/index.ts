/**
 * @fileoverview MCAP Indexing Tool - メインエントリーポイント
 *
 * Lichtblick拡張機能のメインエントリーポイント。
 * 各コンポーネントを統合し、パネルの初期化とライフサイクル管理を担当。
 *
 * @author Lichtblick Tools
 * @version 1.0.0
 */

import { ExtensionContext } from "@lichtblick/suite";
import { McapProcessor } from "./core/McapProcessor";
import { TaskManager } from "./core/TaskManager";
import { PanelRenderer } from "./ui/PanelRenderer";
import { EventHandler } from "./ui/EventHandler";
import { FileDownloader } from "./utils/FileDownloader";
import { IndexingTask } from "./types";
import { getTranslationValue } from "./hooks/useTranslation";

/**
 * MCAP Indexing Panel Controller
 *
 * パネルの状態管理と各コンポーネント間の調整を担当するメインコントローラー。
 * MVCパターンのControllerに相当し、UIとビジネスロジックを分離。
 */
class McapIndexingPanelController {
  private taskManager: TaskManager;
  private renderer: PanelRenderer;
  private eventHandler: EventHandler;

  /**
   * コントローラーのコンストラクタ
   *
   * @param panelElement パネルのDOM要素
   */
  constructor(panelElement: HTMLElement) {
    // コンポーネントの初期化
    const processor = new McapProcessor();
    this.taskManager = new TaskManager(processor);
    this.renderer = new PanelRenderer(panelElement);
    this.eventHandler = new EventHandler(panelElement, () => (this.renderer as any).currentTheme);

    this.setupEventHandlers();
    this.setupTaskManagerEvents();
    this.initialRender();
  }

  /**
   * イベントハンドラーの設定
   * UIイベントとビジネスロジックを接続
   */
  private setupEventHandlers(): void {
    // ファイル選択イベント
    this.eventHandler.setFileSelectHandler((files: File[]) => {
      this.taskManager.addTasks(files);
    });

    // 全クリアイベント
    this.eventHandler.setClearAllHandler(() => {
      this.taskManager.clearAllTasks();
      this.render();
    });

    // ダウンロードイベント
    this.eventHandler.setDownloadHandler((taskId: string) => {
      const task = this.taskManager.getTask(taskId);
      if (task) {
        FileDownloader.downloadTask(task);
      }
    });

    // タブ切り替えイベント
    this.eventHandler.setTabChangeHandler((tab: "usage" | "indexing" | "purpose") => {
      this.renderer.setActiveTab(tab);
      this.render();
    });
  }

  /**
   * タスクマネージャーのイベント設定
   * タスクの状態変更をUIに反映
   */
  private setupTaskManagerEvents(): void {
    // タスク追加時
    this.taskManager.on("taskAdded", (task: IndexingTask) => {
      console.log(`${getTranslationValue("messages", "taskAdded")}: ${task.fileName}`);
      this.render();
    });

    // タスク更新時
    this.taskManager.on("taskUpdated", ({ taskId, updates }) => {
      console.log(`${getTranslationValue("messages", "taskUpdated")}: ${taskId}`, updates);
      this.render();
    });

    // タスク完了時
    this.taskManager.on("taskCompleted", (task: IndexingTask) => {
      console.log(`${task.fileName} ${getTranslationValue("messages", "taskCompleted")}`);
      this.showCompletionNotification(task);
      this.render();
    });

    // タスク失敗時
    this.taskManager.on("taskFailed", ({ taskId, error }) => {
      console.error(`${getTranslationValue("messages", "taskFailed")}: ${taskId}`, error);
      this.render();
    });

    // 全タスク完了時
    this.taskManager.on("allTasksCompleted", (tasks: IndexingTask[]) => {
      const completedTasks = tasks.filter((t) => t.status === "completed");
      if (completedTasks.length > 0) {
        console.log(
          `${getTranslationValue("messages", "allTasksCompleted")} ${completedTasks.length} files.`,
        );
        this.showBatchCompletionNotification(completedTasks);
      }
    });
  }

  /**
   * 初期レンダリング
   */
  private initialRender(): void {
    this.render();
    this.eventHandler.setupEventListeners();
  }

  /**
   * UIを再描画
   */
  private render(): void {
    const tasks = this.taskManager.getAllTasks();
    this.renderer.render(tasks);

    // イベントリスナーを再設定（DOM要素が再作成されるため）
    this.eventHandler.setupEventListeners();
  }

  /**
   * 個別タスク完了通知（将来実装）
   *
   * @param task 完了したタスク
   */
  private showCompletionNotification(task: IndexingTask): void {
    // 将来的にはトーストやバナー表示を実装
    console.log(`✅ ${task.fileName} ${getTranslationValue("messages", "taskCompleted")}`);
  }

  /**
   * バッチ完了通知（将来実装）
   *
   * @param completedTasks 完了したタスク配列
   */
  private showBatchCompletionNotification(completedTasks: IndexingTask[]): void {
    // 将来的には統計情報表示を実装
    const stats = FileDownloader.generateDownloadStats(completedTasks);
    console.log(`🎉 ${getTranslationValue("messages", "batchCompleted")}`, stats);
  }

  /**
   * コントローラーの破棄処理
   */
  destroy(): void {
    this.eventHandler.cleanup();
    this.renderer.destroy();
    // その他のクリーンアップ処理があれば追加
  }
}

/**
 * Lichtblick拡張機能のアクティベーション関数
 *
 * Lichtblickによって呼び出される拡張機能のエントリーポイント。
 * パネルを登録し、初期化処理を実行する。
 *
 * @param extensionContext Lichtblick拡張機能コンテキスト
 */
export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "mcap-indexing",
    initPanel: (context) => {
      // パネルコントローラーを初期化
      const controller = new McapIndexingPanelController(context.panelElement);

      // クリーンアップ関数を返す
      return () => {
        controller.destroy();
      };
    },
  });
}
