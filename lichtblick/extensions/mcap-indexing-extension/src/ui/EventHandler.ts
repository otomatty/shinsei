/**
 * @fileoverview イベントハンドリングシステム
 * DOM イベントの管理と処理を担当
 */

import { FileSelectHandler } from "../types";

/**
 * イベントハンドラークラス
 *
 * DOM要素のイベントリスナー管理と、
 * ファイル選択などのユーザーインタラクションを処理。
 */
export class EventHandler {
  private panelElement: HTMLElement;
  private fileSelectHandler?: FileSelectHandler;
  private clearAllHandler?: () => void;
  private downloadHandler?: (taskId: string) => void;
  private getCurrentTheme?: () => "light" | "dark";
  private tabChangeHandler?: (tab: "usage" | "indexing" | "purpose") => void;

  /**
   * EventHandlerのコンストラクタ
   * @param panelElement パネルのDOM要素
   * @param getCurrentTheme テーマ取得関数（オプション）
   */
  constructor(panelElement: HTMLElement, getCurrentTheme?: () => "light" | "dark") {
    this.panelElement = panelElement;
    this.getCurrentTheme = getCurrentTheme;
  }

  /**
   * ファイル選択ハンドラーを設定
   *
   * @param handler ファイル選択時のコールバック
   */
  setFileSelectHandler(handler: FileSelectHandler): void {
    this.fileSelectHandler = handler;
  }

  /**
   * 全クリアハンドラーを設定
   *
   * @param handler 全クリア時のコールバック
   */
  setClearAllHandler(handler: () => void): void {
    this.clearAllHandler = handler;
  }

  /**
   * ダウンロードハンドラーを設定
   *
   * @param handler ダウンロード時のコールバック
   */
  setDownloadHandler(handler: (taskId: string) => void): void {
    this.downloadHandler = handler;
  }

  /**
   * タブ変更ハンドラーを設定
   *
   * @param handler タブ変更時のコールバック
   */
  setTabChangeHandler(handler: (tab: "usage" | "indexing" | "purpose") => void): void {
    this.tabChangeHandler = handler;
  }

  /**
   * テーマ対応カラーを取得
   */
  private getThemeColors() {
    const theme = this.getCurrentTheme?.() || "dark";

    if (theme === "light") {
      return {
        border: { default: "#d6d6d6", hover: "#1EA7FD" },
        overlay: { hover: "rgba(30, 167, 253, 0.1)" },
        button: {
          primary: "linear-gradient(135deg, #1EA7FD 0%, #1976d2 100%)",
          primaryHover: "linear-gradient(135deg, #0d8ce0 0%, #1565c0 100%)",
          shadow: "rgba(30, 167, 253, 0.3)",
          shadowHover: "rgba(30, 167, 253, 0.4)",
        },
      };
    } else {
      return {
        border: { default: "#555", hover: "#007bff" },
        overlay: { hover: "rgba(0, 123, 255, 0.1)" },
        button: {
          primary: "linear-gradient(135deg, #007bff 0%, #0056b3 100%)",
          primaryHover: "linear-gradient(135deg, #0056b3 0%, #004085 100%)",
          shadow: "rgba(0, 123, 255, 0.3)",
          shadowHover: "rgba(0, 123, 255, 0.4)",
        },
      };
    }
  }

  /**
   * イベントリスナーを設定
   * DOM要素にイベントリスナーを追加し、適切なハンドラーに転送
   */
  setupEventListeners(): void {
    this.setupFileInputListener();
    this.setupClearAllListener();
    this.setupGlobalDownloadHandler();
    this.setupModernDragAndDrop();
    this.setupFileSelectButton();
    this.setupTabSwitching();
  }

  /**
   * ファイル入力のイベントリスナーを設定
   */
  private setupFileInputListener(): void {
    const fileInput = this.panelElement.querySelector("#mcap-file-input") as HTMLInputElement;

    if (fileInput && this.fileSelectHandler) {
      fileInput.addEventListener("change", (event) => {
        const target = event.target as HTMLInputElement;
        const files = Array.from(target.files || []);
        const mcapFiles = files.filter((file) => file.name.endsWith(".mcap"));

        if (mcapFiles.length > 0 && this.fileSelectHandler) {
          this.fileSelectHandler(mcapFiles);
        }

        // 入力をクリア（同じファイルの再選択を可能にする）
        target.value = "";
      });
    }
  }

  /**
   * 全クリアボタンのイベントリスナーを設定
   */
  private setupClearAllListener(): void {
    const clearAllBtn = this.panelElement.querySelector("#clear-all-btn") as HTMLButtonElement;

    if (clearAllBtn && this.clearAllHandler) {
      clearAllBtn.addEventListener("click", () => {
        if (this.clearAllHandler) {
          this.clearAllHandler();
        }
      });
    }
  }

  /**
   * グローバルダウンロードハンドラーを設定
   * HTMLの onclick 属性から呼び出される関数をグローバルに登録
   */
  private setupGlobalDownloadHandler(): void {
    if (this.downloadHandler) {
      // グローバル関数として登録（HTMLのonclick属性から呼び出し可能にする）
      (window as any).downloadFile = (taskId: string) => {
        if (this.downloadHandler) {
          this.downloadHandler(taskId);
        }
      };
    }
  }

  /**
   * イベントリスナーをクリーンアップ
   * コンポーネントの破棄時に呼び出される
   */
  cleanup(): void {
    // グローバル関数をクリーンアップ
    delete (window as any).downloadFile;

    // モダンドラッグ&ドロップのクリーンアップ
    if ((this as any).modernDragDropCleanup) {
      (this as any).modernDragDropCleanup();
    }

    // 他のクリーンアップ処理があれば追加
  }

  /**
   * モダンドラッグ&ドロップサポートを追加
   */
  private setupModernDragAndDrop(): void {
    const dropZone = this.panelElement.querySelector("#file-drop-zone") as HTMLElement;
    const dropOverlay = this.panelElement.querySelector("#drop-overlay") as HTMLElement;

    if (!dropZone) return;

    // ドラッグ開始（ウィンドウ全体）
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;

      if (e.dataTransfer?.types.includes("Files")) {
        this.showDropOverlay(dropZone, dropOverlay);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;

      if (dragCounter === 0) {
        this.hideDropOverlay(dropZone, dropOverlay);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      this.hideDropOverlay(dropZone, dropOverlay);

      const files = Array.from(e.dataTransfer?.files || []);
      const mcapFiles = files.filter((file) => file.name.endsWith(".mcap"));

      if (mcapFiles.length > 0 && this.fileSelectHandler) {
        this.fileSelectHandler(mcapFiles);
      }
    };

    // ホバー効果（テーマ対応）
    const handleMouseEnter = () => {
      const colors = this.getThemeColors();
      dropZone.style.borderColor = colors.border.hover;
      dropZone.style.boxShadow = `0 0 20px ${colors.button.shadow}`;
    };

    const handleMouseLeave = () => {
      const colors = this.getThemeColors();
      dropZone.style.borderColor = colors.border.default;
      dropZone.style.boxShadow = "none";
    };

    // イベントリスナー追加
    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);

    dropZone.addEventListener("mouseenter", handleMouseEnter);
    dropZone.addEventListener("mouseleave", handleMouseLeave);

    // クリーンアップ用に保存
    (this as any).modernDragDropCleanup = () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
      dropZone.removeEventListener("mouseenter", handleMouseEnter);
      dropZone.removeEventListener("mouseleave", handleMouseLeave);
    };
  }

  /**
   * ファイル選択ボタンのイベントリスナーを設定
   */
  private setupFileSelectButton(): void {
    const fileSelectBtn = this.panelElement.querySelector(".file-select-btn") as HTMLButtonElement;
    const fileInput = this.panelElement.querySelector("#mcap-file-input") as HTMLInputElement;

    if (fileSelectBtn && fileInput) {
      fileSelectBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput.click();
      });

      // ホバー効果（テーマ対応）
      fileSelectBtn.addEventListener("mouseenter", () => {
        const colors = this.getThemeColors();
        fileSelectBtn.style.transform = "translateY(-2px)";
        fileSelectBtn.style.background = colors.button.primaryHover;
        fileSelectBtn.style.boxShadow = `0 6px 20px ${colors.button.shadowHover}`;
      });

      fileSelectBtn.addEventListener("mouseleave", () => {
        const colors = this.getThemeColors();
        fileSelectBtn.style.transform = "translateY(0)";
        fileSelectBtn.style.background = colors.button.primary;
        fileSelectBtn.style.boxShadow = `0 4px 12px ${colors.button.shadow}`;
      });
    }
  }

  /**
   * ドロップオーバーレイを表示（テーマ対応）
   */
  private showDropOverlay(dropZone: HTMLElement, dropOverlay: HTMLElement): void {
    const colors = this.getThemeColors();

    if (dropOverlay) {
      dropOverlay.style.opacity = "1";
      dropOverlay.style.visibility = "visible";

      const overlayContent = dropOverlay.querySelector("div") as HTMLElement;
      if (overlayContent) {
        overlayContent.style.transform = "translateY(0)";
      }
    }

    dropZone.style.borderColor = colors.border.hover;
    dropZone.style.borderWidth = "3px";
    dropZone.style.backgroundColor = colors.overlay.hover;
  }

  /**
   * ドロップオーバーレイを非表示（テーマ対応）
   */
  private hideDropOverlay(dropZone: HTMLElement, dropOverlay: HTMLElement): void {
    const colors = this.getThemeColors();

    if (dropOverlay) {
      dropOverlay.style.opacity = "0";
      dropOverlay.style.visibility = "hidden";

      const overlayContent = dropOverlay.querySelector("div") as HTMLElement;
      if (overlayContent) {
        overlayContent.style.transform = "translateY(20px)";
      }
    }

    dropZone.style.borderColor = colors.border.default;
    dropZone.style.borderWidth = "2px";
    dropZone.style.backgroundColor = "";
  }

  /**
   * 旧ドラッグ&ドロップサポート（後方互換）
   *
   * @param dropZoneSelector ドロップゾーンのセレクター
   */
  setupDragAndDrop(dropZoneSelector: string = "#file-input-container"): void {
    const dropZone = this.panelElement.querySelector(dropZoneSelector) as HTMLElement;

    if (!dropZone) return;

    // ドラッグオーバー処理
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
      dropZone.style.borderColor = "#2196F3";
      dropZone.style.backgroundColor = "#1a1a2e";
    });

    // ドラッグリーブ処理
    dropZone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      dropZone.style.borderColor = "#555";
      dropZone.style.backgroundColor = "#2a2a2a";
    });

    // ドロップ処理
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      dropZone.style.borderColor = "#555";
      dropZone.style.backgroundColor = "#2a2a2a";

      const files = Array.from(e.dataTransfer?.files || []);
      const mcapFiles = files.filter((file) => file.name.endsWith(".mcap"));

      if (mcapFiles.length > 0 && this.fileSelectHandler) {
        this.fileSelectHandler(mcapFiles);
      }
    });
  }

  /**
   * キーボードショートカットサポートを追加（将来実装）
   */
  setupKeyboardShortcuts(): void {
    document.addEventListener("keydown", (e) => {
      // Ctrl+O: ファイル選択
      if (e.ctrlKey && e.key === "o") {
        e.preventDefault();
        const fileInput = this.panelElement.querySelector("#mcap-file-input") as HTMLInputElement;
        fileInput?.click();
      }

      // Space: 処理一時停止/再開（将来実装）
      if (e.key === " ") {
        e.preventDefault();
        // TODO: 一時停止/再開機能を実装
      }

      // Delete: 選択項目削除（将来実装）
      if (e.key === "Delete") {
        e.preventDefault();
        // TODO: 選択項目削除機能を実装
      }
    });
  }

  /**
   * タブ切り替えイベントの設定
   */
  private setupTabSwitching(): void {
    const tabButtons = this.panelElement.querySelectorAll(".doc-tab");

    tabButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        const target = event.target as HTMLButtonElement;
        const tab = target.getAttribute("data-tab") as "usage" | "indexing" | "purpose";

        if (tab && this.tabChangeHandler) {
          this.tabChangeHandler(tab);
        }
      });
    });
  }
}
