// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * @fileoverview 英語翻訳（デフォルト言語）
 * MCAP Indexing Tool の英語文字列定義
 */

export const ui = {
  // ヘッダー
  title: "MCAP Indexing Tool",
  description: "Create indexed versions of MCAP files for improved playback performance in SORA.",

  // ファイル入力
  fileInputHelp: "Select MCAP files to create indexed versions with real processing",
  dropZoneTitle: "Drop MCAP files here",
  dropZoneDescription: "or click to browse files",
  selectFiles: "Select Files",
  dropFilesHere: "Drop files here",

  // 統計
  statsTotal: "Total",
  statsCompleted: "Completed",
  statsProcessing: "Processing",
  statsErrors: "Errors",
  clearAll: "Clear All",

  // タスクステータス
  statusPending: "Pending",
  statusProcessing: "Processing",
  statusCompleted: "Completed",
  statusError: "Error",

  // ボタン
  download: "Download",

  // ファイルサイズ
  originalSize: "Original",
  indexedSize: "Indexed",

  // エラー
  errorLabel: "Error",

  // 空の状態
  emptyStateMessage: "No files selected. Choose MCAP files to start indexing.",
} as const;

export const usageGuide = {
  // タブタイトル
  tabUsage: "🚀 How to Use",
  tabIndexing: "📖 About Indexing",
  tabPurpose: "🎯 Why Index?",

  // 使い方タブ
  usageTitle: "How to Use MCAP Indexing Tool",
  step1Title: "Select MCAP Files",
  step1Description:
    "Click the file input above or drag & drop your MCAP files here. Multiple files can be processed simultaneously.",

  step2Title: "Automatic Processing",
  step2Description:
    "The tool will automatically read, analyze, and create indexed versions of your MCAP files. You can track progress with real-time updates.",

  step3Title: "Download Results",
  step3Description:
    "Once processing is complete, download buttons will appear. Indexed files typically have better seek performance in Lichtblick.",

  // 技術情報
  technicalTitle: "📊 Technical Details",
  technicalFeatures:
    "✅ Preserves all original data and metadata\n📈 Adds summary sections for efficient seeking\n⚡ Optimizes playback performance in Lichtblick\n🔒 Processes files locally (no data uploaded)\n💾 Supports files up to 2GB per batch",

  // キーボードショートカット
  keyboardTitle: "⌨️ Keyboard Shortcuts",
  keyboardShortcuts: {
    "Ctrl+O": "Open file selector",
    Space: "Pause/Resume processing",
    Delete: "Remove selected tasks",
  },

  // インデックス化について
  indexingTitle: "What is MCAP Indexing?",
  indexingContent: {
    overview:
      "MCAP indexing creates optimized versions of MCAP files by adding summary sections and metadata that enable faster seeking and playback.",

    whatHappens: "What happens during indexing:",
    indexingSteps: [
      "📊 Analyzes message streams and timing patterns",
      "🗂️ Creates chunk and message indexes for fast navigation",
      "📈 Generates statistical summaries for each topic",
      "⚡ Optimizes data layout for sequential and random access",
      "🔍 Preserves all original data while adding navigation metadata",
    ],

    technicalDetails: "Technical Implementation:",
    technicalPoints: [
      "Uses MCAP format's built-in indexing capabilities",
      "Maintains backward compatibility with all MCAP readers",
      "Adds minimal overhead (typically <5% file size increase)",
      "Optimizes for Lichtblick's playback engine specifically",
    ],
  },

  // 目的と効果
  purposeTitle: "Why Should You Index MCAP Files?",
  purposeContent: {
    overview:
      "Indexing dramatically improves the playback experience, especially for large files and complex data analysis workflows.",

    benefits: "Key Benefits:",
    benefitsList: [
      "🚀 Faster seeking: Jump to any time instantly",
      "📊 Improved scrubbing: Smooth timeline navigation",
      "⚡ Reduced memory usage: Efficient data loading",
      "🎯 Better analysis: Quick access to specific data ranges",
      "🔄 Enhanced workflows: Faster iteration in development",
    ],

    whenToUse: "When to index:",
    useCases: [
      "Files larger than 100MB for optimal performance",
      "Datasets with many topics (>20 channels)",
      "Long recordings (>10 minutes) requiring frequent seeking",
      "Files used repeatedly for analysis or debugging",
      "Data shared with team members for collaborative analysis",
    ],

    performanceNote:
      "Performance Impact: Indexed files can improve seek performance by 10-100x depending on file size and complexity.",
  },
} as const;

export const messages = {
  // 処理完了メッセージ
  taskCompleted: "indexing completed!",
  batchCompleted: "Batch processing completed!",

  // エラーメッセージ
  processingFailed: "Failed to process MCAP file",
  noCompletedTasks: "No completed tasks available for download",
  taskNotReady: "Task is not ready for download",

  // ログメッセージ
  taskAdded: "Task added",
  taskUpdated: "Task updated",
  taskFailed: "Task failed",
  allTasksCompleted: "All tasks completed. Processed",
} as const;

// 全ての翻訳をエクスポート
export default {
  ui,
  usageGuide,
  messages,
} as const;
