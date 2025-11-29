/**
 * @fileoverview パネルUI描画システム
 * HTMLベースのUI描画とスタイリングを担当
 */

import { IndexingTask } from "../types";
import { getTranslationValue } from "../hooks/useTranslation";

/**
 * パネルUI描画クラス
 *
 * HTMLベースのUIレンダリングとスタイリングを担当。
 * 将来的にはReactコンポーネントへの移行も検討。
 */
export class PanelRenderer {
  private panelElement: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private currentTheme: "light" | "dark" = "dark"; // デフォルトはダーク
  private activeTab: "usage" | "indexing" | "purpose" = "usage"; // アクティブタブの状態管理

  /**
   * PanelRendererのコンストラクタ
   * @param panelElement パネルのDOM要素
   */
  constructor(panelElement: HTMLElement) {
    this.panelElement = panelElement;
    this.setupResizeObserver();
    this.detectAndSetTheme();
    this.watchThemeChanges();
  }

  /**
   * パネル全体を描画
   *
   * @param tasks 表示するタスク配列
   */
  render(tasks: IndexingTask[]): void {
    this.injectAnimationStyles();
    this.panelElement.innerHTML = this.buildPanelHTML(tasks);
    this.applyResponsiveStyles();
  }

  /**
   * リサイズ監視の設定
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        this.applyResponsiveStyles();
      });
      this.resizeObserver.observe(this.panelElement);
    }
  }

  /**
   * レスポンシブスタイルの適用（アダプティブレイアウト対応）
   */
  private applyResponsiveStyles(): void {
    const height = this.panelElement.clientHeight;
    const width = this.panelElement.clientWidth;
    const usageGuide = this.panelElement.querySelector("#usage-guide") as HTMLElement;
    const fileDropZone = this.panelElement.querySelector("#file-drop-zone") as HTMLElement;
    const mainContent = this.panelElement.querySelector(
      ".content-wrapper > div:first-child",
    ) as HTMLElement;

    // 使い方説明の表示制御
    const shouldShowUsageGuide = height >= 500 && width >= 800;

    if (usageGuide) {
      if (shouldShowUsageGuide) {
        usageGuide.style.display = "block";
      } else {
        usageGuide.style.display = "none";
      }
    }

    // ドラッグ&ドロップゾーンのアダプティブサイズ調整
    if (fileDropZone) {
      const tasksExist = this.panelElement.querySelectorAll(".task-item").length > 0;

      if (!tasksExist && !shouldShowUsageGuide) {
        // タスクなし + 使い方説明非表示 = 拡張表示
        fileDropZone.style.minHeight = "300px";
        fileDropZone.style.padding = "60px 40px";
      } else if (!tasksExist) {
        // タスクなし + 使い方説明表示 = 通常表示
        fileDropZone.style.minHeight = "200px";
        fileDropZone.style.padding = "40px 20px";
      } else {
        // タスクあり = コンパクト表示
        fileDropZone.style.minHeight = "120px";
        fileDropZone.style.padding = "20px";
      }
    }

    // メインコンテンツの幅調整
    if (mainContent) {
      if (shouldShowUsageGuide) {
        mainContent.style.maxWidth = "calc(100% - 374px)"; // 使い方説明分を除く
      } else {
        mainContent.style.maxWidth = "100%"; // 全幅使用
      }
    }

    const contentWrapper = this.panelElement.querySelector(".content-wrapper") as HTMLElement;
    if (contentWrapper) {
      // 十分な高さと幅がある場合は横並び、そうでなければ縦並び
      if (height >= 600 && width >= 900) {
        contentWrapper.style.flexDirection = "row";
        contentWrapper.style.alignItems = "flex-start";

        // 横並び時のスタイル調整
        if (usageGuide) {
          usageGuide.style.marginTop = "0";
          usageGuide.style.marginLeft = "24px";
          usageGuide.style.maxWidth = "350px";
          usageGuide.style.flexShrink = "0";
        }
      } else {
        contentWrapper.style.flexDirection = "column";
        contentWrapper.style.alignItems = "stretch";

        // 縦並び時のスタイル調整
        if (usageGuide) {
          usageGuide.style.marginTop = "16px";
          usageGuide.style.marginLeft = "0";
          usageGuide.style.maxWidth = "100%";
          usageGuide.style.flexShrink = "1";
        }
      }
    }

    // 小画面での特別調整
    if (width < 600) {
      if (fileDropZone) {
        fileDropZone.style.padding = "20px 16px";
        fileDropZone.style.minHeight = "100px";
      }

      // ボタンサイズを小さく
      const fileSelectBtn = this.panelElement.querySelector(".file-select-btn") as HTMLElement;
      if (fileSelectBtn) {
        fileSelectBtn.style.padding = "8px 16px";
        fileSelectBtn.style.fontSize = "12px";
      }
    }
  }

  /**
   * テーマ検出と設定
   * LichtblickのDOM環境からテーマを検出してcurrentThemeを更新
   */
  private detectAndSetTheme(): void {
    try {
      // パネル要素の computed style からテーマを検出
      const computedStyle = window.getComputedStyle(this.panelElement);
      const backgroundColor = computedStyle.backgroundColor;
      const textColor = computedStyle.color;

      // RGB値から明度を計算してテーマを判定
      const bgLuminance = this.calculateLuminance(backgroundColor);
      const textLuminance = this.calculateLuminance(textColor);

      // 背景が暗い、またはテキストが明るい場合はダークテーマ
      this.currentTheme = bgLuminance < 0.5 || textLuminance > 0.5 ? "dark" : "light";

      console.log(
        `🎨 Theme detected: ${this.currentTheme} (bg: ${backgroundColor}, text: ${textColor})`,
      );
    } catch (error) {
      console.warn("⚠️ Theme detection failed, using dark as default:", error);
      this.currentTheme = "dark";
    }
  }

  /**
   * RGB色から相対輝度を計算
   * W3C WCAG 2.0 の計算式を使用
   */
  private calculateLuminance(color: string): number {
    // rgb(r, g, b) または rgba(r, g, b, a) 形式の色文字列をパース
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (!rgbMatch) return 0.5; // パースできない場合は中間値

    const r = parseInt(rgbMatch[1] || "0", 10);
    const g = parseInt(rgbMatch[2] || "0", 10);
    const b = parseInt(rgbMatch[3] || "0", 10);

    // RGB値を0-1に正規化
    const normalizeColor = (c: number) => {
      const normalized = c / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    };

    // 相対輝度を計算
    return 0.2126 * normalizeColor(r) + 0.7152 * normalizeColor(g) + 0.0722 * normalizeColor(b);
  }

  /**
   * テーマ変更の監視を開始
   * MutationObserverでスタイル変更を監視してテーマ変更を検出
   */
  private watchThemeChanges(): void {
    const observer = new MutationObserver(() => {
      const oldTheme = this.currentTheme;
      this.detectAndSetTheme();

      if (oldTheme !== this.currentTheme) {
        console.log(`🔄 Theme changed: ${oldTheme} → ${this.currentTheme}`);
        // テーマが変更された場合は再描画をトリガー
        // 注: 実際の再描画は上位のコントローラーが行う
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
      subtree: true,
    });

    // クリーンアップ用に保存
    (this as any).themeObserver = observer;
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if ((this as any).themeObserver) {
      (this as any).themeObserver.disconnect();
    }
  }

  /**
   * パネルのHTMLを構築
   *
   * @param tasks タスク配列
   * @returns パネルのHTML文字列
   */
  private buildPanelHTML(tasks: IndexingTask[]): string {
    return `
      <div style="${this.getMainContainerStyles()}">
        <div class="content-wrapper" style="${this.getContentWrapperStyles()}">
          <div style="${this.getMainContentStyles()}">
            ${this.buildHeaderHTML()}
            ${this.buildFileInputHTML(tasks)}
            ${this.buildStatsHTML(tasks)}
            ${this.buildTaskListHTML(tasks)}
          </div>
          ${this.buildUsageGuideHTML(tasks)}
        </div>
      </div>
    `;
  }

  /**
   * ヘッダー部分のHTMLを構築
   *
   * @returns ヘッダーHTML
   */
  private buildHeaderHTML(): string {
    return `
      <h3 style="${this.getTitleStyles()}">${getTranslationValue("ui", "title")}</h3>
      <p style="${this.getDescriptionStyles()}">
        ${getTranslationValue("ui", "description")}
      </p>
    `;
  }

  /**
   * ファイル入力部分のHTMLを構築（モダンドラッグ&ドロップゾーン）
   *
   * @param tasks タスク配列（サイズ調整用）
   * @returns ファイル入力HTML
   */
  private buildFileInputHTML(tasks: IndexingTask[] = []): string {
    const isExpanded = tasks.length === 0; // タスクがない時は拡張表示

    return `
      <div class="file-drop-zone" id="file-drop-zone" style="${this.getFileDropZoneStyles(isExpanded)}">
        <input
          type="file"
          multiple
          accept=".mcap"
          id="mcap-file-input"
          style="${this.getHiddenFileInputStyles()}"
        />

        <div class="drop-zone-content" style="${this.getDropZoneContentStyles()}">
          <div class="drop-zone-icon" style="${this.getDropZoneIconStyles()}">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          </div>

          <div class="drop-zone-text" style="${this.getDropZoneTextStyles()}">
            <h4 style="${this.getDropZoneTitleStyles()}">
              ${getTranslationValue("ui", "dropZoneTitle")}
            </h4>
            <p style="${this.getDropZoneDescStyles()}">
              ${getTranslationValue("ui", "dropZoneDescription")}
            </p>
            <button class="file-select-btn" style="${this.getFileSelectButtonStyles()}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              ${getTranslationValue("ui", "selectFiles")}
            </button>
          </div>

          <div class="drop-zone-overlay" id="drop-overlay" style="${this.getDropZoneOverlayStyles()}">
            <div style="${this.getDropZoneOverlayContentStyles()}">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p style="${this.getDropZoneOverlayTextStyles()}">
                ${getTranslationValue("ui", "dropFilesHere")}
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 統計情報部分のHTMLを構築
   *
   * @param tasks タスク配列
   * @returns 統計情報HTML
   */
  private buildStatsHTML(tasks: IndexingTask[]): string {
    if (tasks.length === 0) return "";

    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const processingCount = tasks.filter((t) => t.status === "processing").length;
    const errorCount = tasks.filter((t) => t.status === "error").length;

    return `
      <div style="${this.getStatsContainerStyles()}">
        <div style="${this.getStatsTextStyles()}">
          ${getTranslationValue("ui", "statsTotal")}: ${tasks.length} |
          ${getTranslationValue("ui", "statsCompleted")}: ${completedCount} |
          ${getTranslationValue("ui", "statsProcessing")}: ${processingCount} |
          ${getTranslationValue("ui", "statsErrors")}: ${errorCount}
        </div>
        <button id="clear-all-btn" style="${this.getClearButtonStyles()}">
          ${getTranslationValue("ui", "clearAll")}
        </button>
      </div>
    `;
  }

  /**
   * タスクリスト部分のHTMLを構築
   *
   * @param tasks タスク配列
   * @returns タスクリストHTML
   */
  private buildTaskListHTML(tasks: IndexingTask[]): string {
    if (tasks.length === 0) {
      return `
        <div style="${this.getTaskListContainerStyles()}">
          <div style="${this.getEmptyStateStyles()}">
            ${getTranslationValue("ui", "emptyStateMessage")}
          </div>
        </div>
      `;
    }

    const taskItemsHTML = tasks.map((task) => this.buildTaskItemHTML(task)).join("");

    return `
      <div style="${this.getTaskListContainerStyles()}">
        ${taskItemsHTML}
      </div>
    `;
  }

  /**
   * 個別タスクアイテムのHTMLを構築
   *
   * @param task タスクオブジェクト
   * @returns タスクアイテムHTML
   */
  private buildTaskItemHTML(task: IndexingTask): string {
    return `
      <div class="task-item" style="${this.getTaskItemStyles()}">
        <div style="${this.getTaskHeaderStyles()}">
          <div style="${this.getTaskInfoStyles()}">
            <div style="${this.getTaskNameStyles()}">
              ${task.fileName}
            </div>
            <div style="${this.getTaskMetaStyles()}">
              ${getTranslationValue("ui", "originalSize")}: ${this.formatFileSize(task.originalSize)}
              ${task.indexedSize ? ` → ${getTranslationValue("ui", "indexedSize")}: ${this.formatFileSize(task.indexedSize)}` : ""}
            </div>
          </div>

          <div style="${this.getTaskControlsStyles()}">
            ${this.buildProgressHTML(task)}
            ${this.buildStatusHTML(task)}
            ${this.buildDownloadButtonHTML(task)}
          </div>
        </div>

        ${this.buildProgressBarHTML(task)}
        ${this.buildErrorMessageHTML(task)}
      </div>
    `;
  }

  /**
   * 進捗表示HTMLを構築
   *
   * @param task タスクオブジェクト
   * @returns 進捗表示HTML
   */
  private buildProgressHTML(task: IndexingTask): string {
    if (task.status !== "processing") return "";

    return `
      <div style="${this.getProgressTextStyles()}">
        ${task.progress}%
      </div>
    `;
  }

  /**
   * ステータス表示HTMLを構築
   *
   * @param task タスクオブジェクト
   * @returns ステータス表示HTML
   */
  private buildStatusHTML(task: IndexingTask): string {
    const statusColor = this.getStatusColor(task.status);
    const statusText = this.getStatusText(task.status);

    return `
      <div style="${this.getStatusContainerStyles(statusColor)}">
        <div style="${this.getStatusDotStyles(statusColor)}"></div>
        ${statusText}
      </div>
    `;
  }

  /**
   * ダウンロードボタンHTMLを構築
   *
   * @param task タスクオブジェクト
   * @returns ダウンロードボタンHTML
   */
  private buildDownloadButtonHTML(task: IndexingTask): string {
    if (task.status !== "completed") return "";

    return `
      <button onclick="downloadFile('${task.id}')" style="${this.getDownloadButtonStyles()}">
        ${getTranslationValue("ui", "download")}
      </button>
    `;
  }

  /**
   * プログレスバーHTMLを構築
   *
   * @param task タスクオブジェクト
   * @returns プログレスバーHTML
   */
  private buildProgressBarHTML(task: IndexingTask): string {
    if (task.status !== "processing") return "";

    return `
      <div style="${this.getProgressBarContainerStyles()}">
        <div style="${this.getProgressBarFillStyles(task.progress)}"></div>
      </div>
    `;
  }

  /**
   * エラーメッセージHTMLを構築
   *
   * @param task タスクオブジェクト
   * @returns エラーメッセージHTML
   */
  private buildErrorMessageHTML(task: IndexingTask): string {
    if (task.status !== "error" || !task.error) return "";

    return `
      <div style="${this.getErrorMessageStyles()}">
        <strong>${getTranslationValue("ui", "errorLabel")}:</strong> ${task.error}
      </div>
    `;
  }

  /**
   * ドキュメントセクションHTMLを構築（タブ式）
   *
   * @param tasks タスク配列
   * @returns ドキュメントセクションHTML
   */
  private buildUsageGuideHTML(tasks: IndexingTask[]): string {
    // タスクがある場合や小さい画面では表示しない
    if (tasks.length > 0) return "";

    return `
      <div style="${this.getUsageGuideContainerStyles()}" id="usage-guide">
        <div style="${this.getUsageGuideContentStyles()}">
          ${this.buildTabNavigationHTML()}
          ${this.buildTabContentHTML()}
        </div>
      </div>
    `;
  }

  /**
   * タブナビゲーションHTMLを構築
   */
  private buildTabNavigationHTML(): string {
    return `
      <div style="${this.getTabNavigationStyles()}">
        <button
          class="doc-tab"
          data-tab="usage"
          style="${this.getTabButtonStyles(this.activeTab === "usage")}"
        >
          ${getTranslationValue("usageGuide", "tabUsage")}
        </button>
        <button
          class="doc-tab"
          data-tab="indexing"
          style="${this.getTabButtonStyles(this.activeTab === "indexing")}"
        >
          ${getTranslationValue("usageGuide", "tabIndexing")}
        </button>
        <button
          class="doc-tab"
          data-tab="purpose"
          style="${this.getTabButtonStyles(this.activeTab === "purpose")}"
        >
          ${getTranslationValue("usageGuide", "tabPurpose")}
        </button>
      </div>
    `;
  }

  /**
   * タブコンテンツHTMLを構築
   */
  private buildTabContentHTML(): string {
    switch (this.activeTab) {
      case "usage":
        return this.buildUsageTabContent();
      case "indexing":
        return this.buildIndexingTabContent();
      case "purpose":
        return this.buildPurposeTabContent();
      default:
        return this.buildUsageTabContent();
    }
  }

  /**
   * 使い方タブのコンテンツを構築
   */
  private buildUsageTabContent(): string {
    return `
      <div style="${this.getTabContentStyles()}">
        <h4 style="${this.getUsageGuideTitleStyles()}">${getTranslationValue("usageGuide", "usageTitle")}</h4>

        <div style="${this.getUsageStepStyles()}">
          <div style="${this.getStepHeaderStyles()}">
            <span style="${this.getStepNumberStyles()}">1</span>
            <h5 style="${this.getStepTitleStyles()}">${getTranslationValue("usageGuide", "step1Title")}</h5>
          </div>
          <p style="${this.getStepDescriptionStyles()}">
            ${getTranslationValue("usageGuide", "step1Description")}
          </p>
        </div>

        <div style="${this.getUsageStepStyles()}">
          <div style="${this.getStepHeaderStyles()}">
            <span style="${this.getStepNumberStyles()}">2</span>
            <h5 style="${this.getStepTitleStyles()}">${getTranslationValue("usageGuide", "step2Title")}</h5>
          </div>
          <p style="${this.getStepDescriptionStyles()}">
            ${getTranslationValue("usageGuide", "step2Description")}
          </p>
        </div>

        <div style="${this.getUsageStepStyles()}">
          <div style="${this.getStepHeaderStyles()}">
            <span style="${this.getStepNumberStyles()}">3</span>
            <h5 style="${this.getStepTitleStyles()}">${getTranslationValue("usageGuide", "step3Title")}</h5>
          </div>
          <p style="${this.getStepDescriptionStyles()}">
            ${getTranslationValue("usageGuide", "step3Description")}
          </p>
        </div>

        ${this.buildTechnicalInfoHTML()}
        ${this.buildKeyboardShortcutsHTML()}
      </div>
    `;
  }

  /**
   * インデックス化タブのコンテンツを構築
   */
  private buildIndexingTabContent(): string {
    const indexingContent = getTranslationValue("usageGuide", "indexingContent");
    let parsedContent: any = {};

    try {
      parsedContent =
        typeof indexingContent === "string" ? JSON.parse(indexingContent) : indexingContent;
    } catch {
      // フォールバック用のコンテンツ
      parsedContent = {
        overview: "MCAP indexing creates optimized versions of MCAP files.",
        whatHappens: "What happens during indexing:",
        indexingSteps: ["Analyzes data", "Creates indexes", "Optimizes layout"],
        technicalDetails: "Technical details:",
        technicalPoints: ["Uses MCAP format", "Maintains compatibility"],
      };
    }

    const stepsHTML = (parsedContent.indexingSteps || [])
      .map((step: string) => `<li>${step}</li>`)
      .join("");
    const technicalHTML = (parsedContent.technicalPoints || [])
      .map((point: string) => `<li>${point}</li>`)
      .join("");

    return `
      <div style="${this.getTabContentStyles()}">
        <h4 style="${this.getUsageGuideTitleStyles()}">${getTranslationValue("usageGuide", "indexingTitle")}</h4>

        <div style="${this.getContentSectionStyles()}">
          <p style="${this.getContentOverviewStyles()}">${parsedContent.overview || ""}</p>
        </div>

        <div style="${this.getContentSectionStyles()}">
          <h5 style="${this.getContentSubtitleStyles()}">${parsedContent.whatHappens || ""}</h5>
          <ul style="${this.getContentListStyles()}">
            ${stepsHTML}
          </ul>
        </div>

        <div style="${this.getContentSectionStyles()}">
          <h5 style="${this.getContentSubtitleStyles()}">${parsedContent.technicalDetails || ""}</h5>
          <ul style="${this.getContentListStyles()}">
            ${technicalHTML}
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * 目的タブのコンテンツを構築
   */
  private buildPurposeTabContent(): string {
    const purposeContent = getTranslationValue("usageGuide", "purposeContent");
    let parsedContent: any = {};

    try {
      parsedContent =
        typeof purposeContent === "string" ? JSON.parse(purposeContent) : purposeContent;
    } catch {
      // フォールバック用のコンテンツ
      parsedContent = {
        overview: "Indexing improves performance significantly.",
        benefits: "Benefits:",
        benefitsList: ["Faster seeking", "Better performance"],
        whenToUse: "When to use:",
        useCases: ["Large files", "Complex data"],
        performanceNote: "Significant performance improvements.",
      };
    }

    const benefitsHTML = (parsedContent.benefitsList || [])
      .map((benefit: string) => `<li>${benefit}</li>`)
      .join("");
    const useCasesHTML = (parsedContent.useCases || [])
      .map((useCase: string) => `<li>${useCase}</li>`)
      .join("");

    return `
      <div style="${this.getTabContentStyles()}">
        <h4 style="${this.getUsageGuideTitleStyles()}">${getTranslationValue("usageGuide", "purposeTitle")}</h4>

        <div style="${this.getContentSectionStyles()}">
          <p style="${this.getContentOverviewStyles()}">${parsedContent.overview || ""}</p>
        </div>

        <div style="${this.getContentSectionStyles()}">
          <h5 style="${this.getContentSubtitleStyles()}">${parsedContent.benefits || ""}</h5>
          <ul style="${this.getContentListStyles()}">
            ${benefitsHTML}
          </ul>
        </div>

        <div style="${this.getContentSectionStyles()}">
          <h5 style="${this.getContentSubtitleStyles()}">${parsedContent.whenToUse || ""}</h5>
          <ul style="${this.getContentListStyles()}">
            ${useCasesHTML}
          </ul>
        </div>

        <div style="${this.getPerformanceNoteStyles()}">
          <p><strong>${parsedContent.performanceNote || ""}</strong></p>
        </div>
      </div>
    `;
  }

  /**
   * アクティブタブを変更
   * EventHandlerから呼び出される
   */
  setActiveTab(tab: "usage" | "indexing" | "purpose"): void {
    this.activeTab = tab;
  }

  /**
   * 現在のアクティブタブを取得
   */
  getActiveTab(): "usage" | "indexing" | "purpose" {
    return this.activeTab;
  }

  /**
   * 技術情報HTMLを構築
   *
   * @returns 技術情報HTML
   */
  private buildTechnicalInfoHTML(): string {
    // 翻訳から技術詳細の配列を取得
    const translations = getTranslationValue("usageGuide", "technicalFeatures");
    const features = translations.split("\n");

    const featuresHTML = features.map((feature) => `<li>${feature}</li>`).join("");

    return `
      <div style="${this.getTechnicalInfoStyles()}">
        <h5 style="${this.getTechnicalInfoTitleStyles()}">${getTranslationValue("usageGuide", "technicalTitle")}</h5>
        <ul style="${this.getTechnicalInfoListStyles()}">
          ${featuresHTML}
        </ul>
      </div>
    `;
  }

  /**
   * キーボードショートカット情報HTMLを構築
   *
   * @returns キーボードショートカット情報HTML
   */
  private buildKeyboardShortcutsHTML(): string {
    // 翻訳からキーボードショートカットオブジェクトを取得
    const shortcutsString = getTranslationValue("usageGuide", "keyboardShortcuts");
    let shortcuts: Record<string, string> = {};

    try {
      shortcuts = JSON.parse(shortcutsString);
    } catch {
      // フォールバック
      shortcuts = {
        "Ctrl+O": "Open file selector",
        Space: "Pause/Resume processing",
        Delete: "Remove selected tasks",
      };
    }

    const shortcutItemsHTML = Object.entries(shortcuts)
      .map(
        ([key, description]) => `
        <div style="${this.getShortcutItemStyles()}">
          <code style="${this.getShortcutKeyStyles()}">${key}</code>
          <span style="${this.getShortcutDescStyles()}">${description}</span>
        </div>
      `,
      )
      .join("");

    return `
      <div style="${this.getKeyboardShortcutsStyles()}">
        <h5 style="${this.getKeyboardShortcutsTitleStyles()}">${getTranslationValue("usageGuide", "keyboardTitle")}</h5>
        <div style="${this.getShortcutListStyles()}">
          ${shortcutItemsHTML}
        </div>
      </div>
    `;
  }

  /**
   * ファイルサイズを人間が読みやすい形式にフォーマット
   *
   * @param bytes バイト数
   * @returns フォーマットされた文字列
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  /**
   * ステータスに対応する色を取得
   *
   * @param status タスクステータス
   * @returns CSS色文字列
   */
  private getStatusColor(status: string): string {
    switch (status) {
      case "completed":
        return "#4CAF50";
      case "processing":
        return "#2196F3";
      case "error":
        return "#F44336";
      default:
        return "#757575";
    }
  }

  /**
   * ステータスに対応するテキストを取得
   *
   * @param status タスクステータス
   * @returns ステータステキスト
   */
  private getStatusText(status: string): string {
    switch (status) {
      case "completed":
        return getTranslationValue("ui", "statusCompleted");
      case "processing":
        return getTranslationValue("ui", "statusProcessing");
      case "error":
        return getTranslationValue("ui", "statusError");
      default:
        return getTranslationValue("ui", "statusPending");
    }
  }

  // === スタイル定義メソッド群 ===

  private getMainContainerStyles(): string {
    return `
      padding: 16px;
      height: 100%;
      font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
      background: #1e1e1e;
      color: #fff;
      overflow: hidden;
    `;
  }

  /**
   * CSSアニメーション用のスタイルを追加
   */
  private injectAnimationStyles(): void {
    const styleId = "mcap-indexing-animations";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .doc-tab:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
      }
    `;
    document.head.appendChild(style);
  }

  private getContentWrapperStyles(): string {
    return `
      display: flex;
      flex-direction: column;
      height: 100%;
      gap: 16px;
      transition: flex-direction 0.3s ease;
    `;
  }

  private getMainContentStyles(): string {
    return `
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    `;
  }

  private getTitleStyles(): string {
    const colors = this.getThemeColors();
    return `margin: 0 0 16px 0; color: ${colors.text.primary}; font-size: 18px; font-weight: 600;`;
  }

  private getDescriptionStyles(): string {
    const colors = this.getThemeColors();
    return `margin: 0 0 20px 0; font-size: 14px; color: ${colors.text.secondary}; line-height: 1.4;`;
  }

  // === テーマ対応カラーパレット ===

  /**
   * テーマ対応カラーパレット取得
   */
  private getThemeColors() {
    if (this.currentTheme === "light") {
      return {
        // ライトテーマカラー（Lichtblick公式パレット準拠）
        background: {
          primary: "#ffffff",
          secondary: "#f4f4f5",
          tertiary: "#eeeeee",
          gradient: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
        },
        border: {
          default: "#d6d6d6",
          hover: "#1EA7FD",
          focus: "#EF833A",
        },
        text: {
          primary: "#393939",
          secondary: "#6f6d79",
          inverse: "#ffffff",
        },
        button: {
          primary: "linear-gradient(135deg, #1EA7FD 0%, #1976d2 100%)",
          primaryHover: "linear-gradient(135deg, #0d8ce0 0%, #1565c0 100%)",
          shadow: "rgba(30, 167, 253, 0.3)",
          shadowHover: "rgba(30, 167, 253, 0.4)",
        },
        overlay: {
          background:
            "linear-gradient(135deg, rgba(30, 167, 253, 0.9) 0%, rgba(25, 118, 210, 0.9) 100%)",
          hover: "rgba(30, 167, 253, 0.1)",
        },
        icon: {
          default: "#9e9e9e",
          active: "#1EA7FD",
        },
      };
    } else {
      return {
        // ダークテーマカラー（既存）
        background: {
          primary: "#2a2a2a",
          secondary: "#323232",
          tertiary: "#404040",
          gradient: "linear-gradient(135deg, #2a2a2a 0%, #323232 100%)",
        },
        border: {
          default: "#555",
          hover: "#007bff",
          focus: "#EF833A",
        },
        text: {
          primary: "#e1e1e4",
          secondary: "#a7a6af",
          inverse: "#ffffff",
        },
        button: {
          primary: "linear-gradient(135deg, #007bff 0%, #0056b3 100%)",
          primaryHover: "linear-gradient(135deg, #0056b3 0%, #004085 100%)",
          shadow: "rgba(0, 123, 255, 0.3)",
          shadowHover: "rgba(0, 123, 255, 0.4)",
        },
        overlay: {
          background:
            "linear-gradient(135deg, rgba(0, 123, 255, 0.9) 0%, rgba(0, 86, 179, 0.9) 100%)",
          hover: "rgba(0, 123, 255, 0.1)",
        },
        icon: {
          default: "#666",
          active: "#007bff",
        },
      };
    }
  }

  // === モダンドラッグ&ドロップゾーンのスタイル群 ===

  private getFileDropZoneStyles(isExpanded: boolean): string {
    const colors = this.getThemeColors();
    return `
      position: relative;
      margin-bottom: 20px;
      border: 2px dashed ${colors.border.default};
      border-radius: 12px;
      background: ${colors.background.gradient};
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      overflow: hidden;
      ${isExpanded ? "min-height: 200px; padding: 40px 20px;" : "min-height: 120px; padding: 20px;"}
    `;
  }

  private getHiddenFileInputStyles(): string {
    return "position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; z-index: 10;";
  }

  private getDropZoneContentStyles(): string {
    return `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      pointer-events: none;
      z-index: 1;
      position: relative;
    `;
  }

  private getDropZoneIconStyles(): string {
    const colors = this.getThemeColors();
    return `
      color: ${colors.icon.default};
      margin-bottom: 16px;
      transition: all 0.3s ease;
      opacity: 0.8;
    `;
  }

  private getDropZoneTextStyles(): string {
    return "display: flex; flex-direction: column; align-items: center; gap: 12px;";
  }

  private getDropZoneTitleStyles(): string {
    const colors = this.getThemeColors();
    return `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: ${colors.text.primary};
      opacity: 0.9;
    `;
  }

  private getDropZoneDescStyles(): string {
    const colors = this.getThemeColors();
    return `
      margin: 0;
      font-size: 14px;
      color: ${colors.text.secondary};
      opacity: 0.8;
    `;
  }

  private getFileSelectButtonStyles(): string {
    const colors = this.getThemeColors();
    return `
      display: inline-flex;
      align-items: center;
      padding: 12px 24px;
      background: ${colors.button.primary};
      color: ${colors.text.inverse};
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px ${colors.button.shadow};
      pointer-events: all;
      margin-top: 8px;
    `;
  }

  private getDropZoneOverlayStyles(): string {
    const colors = this.getThemeColors();
    return `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: ${colors.overlay.background};
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 20;
      border-radius: 10px;
    `;
  }

  private getDropZoneOverlayContentStyles(): string {
    return `
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      color: white;
      transform: translateY(20px);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
  }

  private getDropZoneOverlayTextStyles(): string {
    return `
      margin: 16px 0 0 0;
      font-size: 18px;
      font-weight: 600;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    `;
  }

  private getStatsContainerStyles(): string {
    const colors = this.getThemeColors();
    return `display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 12px; background: ${colors.background.secondary}; border-radius: 6px; border: 1px solid ${colors.border.default};`;
  }

  private getStatsTextStyles(): string {
    const colors = this.getThemeColors();
    return `font-size: 12px; color: ${colors.text.secondary};`;
  }

  private getClearButtonStyles(): string {
    const colors = this.getThemeColors();
    const errorColor = this.currentTheme === "light" ? "#db3553" : "#f54966";
    return `padding: 4px 8px; font-size: 12px; border: 1px solid ${colors.border.default}; border-radius: 4px; background: ${errorColor}; color: ${colors.text.inverse}; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
  }

  private getTaskListContainerStyles(): string {
    const scrollbarColor = this.currentTheme === "light" ? "#d6d6d6 #f4f4f5" : "#555 #2a2a2a";
    return `
      flex: 1;
      min-height: 100px;
      overflow-y: auto;
      padding-right: 8px;
      scrollbar-width: thin;
      scrollbar-color: ${scrollbarColor};
    `;
  }

  private getEmptyStateStyles(): string {
    const colors = this.getThemeColors();
    return `text-align: center; color: ${colors.text.secondary}; font-size: 14px; margin-top: 40px;`;
  }

  private getTaskItemStyles(): string {
    const colors = this.getThemeColors();
    return `border: 1px solid ${colors.border.default}; border-radius: 6px; padding: 12px; margin-bottom: 8px; background: ${colors.background.primary}; box-shadow: 0 1px 3px rgba(0,0,0,0.1);`;
  }

  private getTaskHeaderStyles(): string {
    return "display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;";
  }

  private getTaskInfoStyles(): string {
    return "flex: 1; min-width: 0;";
  }

  private getTaskNameStyles(): string {
    const colors = this.getThemeColors();
    return `font-weight: 600; font-size: 14px; color: ${colors.text.primary}; margin-bottom: 4px; word-break: break-all;`;
  }

  private getTaskMetaStyles(): string {
    const colors = this.getThemeColors();
    return `font-size: 12px; color: ${colors.text.secondary};`;
  }

  private getTaskControlsStyles(): string {
    return "display: flex; align-items: center; gap: 12px; margin-left: 12px;";
  }

  private getProgressTextStyles(): string {
    return "font-size: 12px; color: #2196F3; min-width: 40px; text-align: right;";
  }

  private getStatusContainerStyles(color: string): string {
    return `display: flex; align-items: center; gap: 6px; font-size: 12px; color: ${color};`;
  }

  private getStatusDotStyles(color: string): string {
    return `width: 8px; height: 8px; border-radius: 50%; background: ${color};`;
  }

  private getDownloadButtonStyles(): string {
    const successColor = this.currentTheme === "light" ? "#107c10" : "#92c353";
    return `padding: 6px 12px; font-size: 12px; border: 1px solid ${successColor}; border-radius: 4px; background: transparent; color: ${successColor}; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1);`;
  }

  private getProgressBarContainerStyles(): string {
    const progressBg = this.currentTheme === "light" ? "#e0e0e0" : "#444";
    return `width: 100%; height: 4px; background: ${progressBg}; border-radius: 2px; overflow: hidden;`;
  }

  private getProgressBarFillStyles(progress: number): string {
    return `width: ${progress}%; height: 100%; background: #2196F3; transition: width 0.3s ease;`;
  }

  private getErrorMessageStyles(): string {
    return "color: #F44336; font-size: 12px; margin-top: 8px; padding: 8px; background: #441111; border-radius: 4px; border: 1px solid #662222;";
  }

  // === 使い方説明のスタイル群 ===

  private getUsageGuideContainerStyles(): string {
    return `
      flex: 0 0 auto;
      width: 100%;
      max-width: 400px;
      margin-top: 16px;
      opacity: 0.9;
      transition: all 0.3s ease;
    `;
  }

  private getUsageGuideContentStyles(): string {
    return `
      background: linear-gradient(135deg, #2a2a2a 0%, #333333 100%);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #444;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      height: fit-content;
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    `;
  }

  private getUsageGuideTitleStyles(): string {
    return `
      margin: 0 0 20px 0;
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
      text-align: center;
      border-bottom: 2px solid #444;
      padding-bottom: 12px;
    `;
  }

  private getUsageStepStyles(): string {
    return `
      margin-bottom: 20px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      border-left: 3px solid #2196F3;
    `;
  }

  private getStepHeaderStyles(): string {
    return `
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      gap: 12px;
    `;
  }

  private getStepNumberStyles(): string {
    return `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: #2196F3;
      color: white;
      border-radius: 50%;
      font-size: 12px;
      font-weight: bold;
      flex-shrink: 0;
    `;
  }

  private getStepTitleStyles(): string {
    return `
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
    `;
  }

  private getStepDescriptionStyles(): string {
    return `
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      color: #cccccc;
    `;
  }

  private getTechnicalInfoStyles(): string {
    return `
      margin-top: 16px;
      padding: 16px;
      background: rgba(76, 175, 80, 0.1);
      border-radius: 8px;
      border: 1px solid rgba(76, 175, 80, 0.3);
    `;
  }

  private getTechnicalInfoTitleStyles(): string {
    return `
      margin: 0 0 12px 0;
      font-size: 13px;
      font-weight: 600;
      color: #4CAF50;
    `;
  }

  private getTechnicalInfoListStyles(): string {
    return `
      margin: 0;
      padding-left: 16px;
      font-size: 11px;
      line-height: 1.6;
      color: #cccccc;
    `;
  }

  private getKeyboardShortcutsStyles(): string {
    return `
      margin-top: 16px;
      padding: 16px;
      background: rgba(255, 193, 7, 0.1);
      border-radius: 8px;
      border: 1px solid rgba(255, 193, 7, 0.3);
    `;
  }

  private getKeyboardShortcutsTitleStyles(): string {
    return `
      margin: 0 0 12px 0;
      font-size: 13px;
      font-weight: 600;
      color: #FFC107;
    `;
  }

  private getShortcutListStyles(): string {
    return `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
  }

  private getShortcutItemStyles(): string {
    return `
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    `;
  }

  private getShortcutKeyStyles(): string {
    return `
      background: #333;
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      border: 1px solid #555;
      min-width: 60px;
      text-align: center;
    `;
  }

  private getShortcutDescStyles(): string {
    return `
      font-size: 11px;
      color: #cccccc;
      flex: 1;
    `;
  }

  // === タブシステムのスタイル群 ===

  private getTabNavigationStyles(): string {
    const colors = this.getThemeColors();
    return `
      display: flex;
      border-bottom: 2px solid ${colors.border.default};
      margin-bottom: 20px;
      gap: 4px;
    `;
  }

  private getTabButtonStyles(isActive: boolean): string {
    const colors = this.getThemeColors();
    return `
      padding: 12px 20px;
      background: ${isActive ? colors.background.secondary : "transparent"};
      border: none;
      border-bottom: 3px solid ${isActive ? colors.border.hover : "transparent"};
      color: ${isActive ? colors.text.primary : colors.text.secondary};
      font-size: 14px;
      font-weight: ${isActive ? "600" : "500"};
      cursor: pointer;
      transition: all 0.3s ease;
      border-radius: 4px 4px 0 0;
      position: relative;
      top: 2px;
      opacity: ${isActive ? "1" : "0.8"};
    `;
  }

  private getTabContentStyles(): string {
    return `
      min-height: 200px;
      animation: fadeIn 0.3s ease-in-out;
    `;
  }

  private getContentSectionStyles(): string {
    return `
      margin-bottom: 20px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      border-left: 3px solid #2196F3;
    `;
  }

  private getContentOverviewStyles(): string {
    const colors = this.getThemeColors();
    return `
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
      color: ${colors.text.primary};
      font-weight: 500;
    `;
  }

  private getContentSubtitleStyles(): string {
    const colors = this.getThemeColors();
    return `
      margin: 0 0 12px 0;
      font-size: 13px;
      font-weight: 600;
      color: ${colors.text.primary};
    `;
  }

  private getContentListStyles(): string {
    const colors = this.getThemeColors();
    return `
      margin: 0;
      padding-left: 20px;
      font-size: 12px;
      line-height: 1.8;
      color: ${colors.text.secondary};
    `;
  }

  private getPerformanceNoteStyles(): string {
    return `
      margin-top: 20px;
      padding: 16px;
      background: rgba(76, 175, 80, 0.1);
      border-radius: 8px;
      border: 1px solid rgba(76, 175, 80, 0.3);
      font-size: 13px;
      color: #4CAF50;
    `;
  }
}
