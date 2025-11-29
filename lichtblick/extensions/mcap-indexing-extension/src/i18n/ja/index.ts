/**
 * @fileoverview 日本語翻訳
 * MCAP Indexing Tool の日本語文字列定義
 */

export const ui = {
  // ヘッダー
  title: "MCAPインデックス化ツール",
  description:
    "SORAでの再生パフォーマンス向上のため、インデックス化されたMCAPファイルを作成します。",

  // ファイル入力
  fileInputHelp: "MCAPファイルを選択して、実際の処理でインデックス版を作成します",
  dropZoneTitle: "MCAPファイルをここにドロップ",
  dropZoneDescription: "またはクリックしてファイルを選択",
  selectFiles: "ファイルを選択",
  dropFilesHere: "ファイルをここにドロップ",

  // 統計
  statsTotal: "合計",
  statsCompleted: "完了",
  statsProcessing: "処理中",
  statsErrors: "エラー",
  clearAll: "すべてクリア",

  // タスクステータス
  statusPending: "待機中",
  statusProcessing: "処理中",
  statusCompleted: "完了",
  statusError: "エラー",

  // ボタン
  download: "ダウンロード",

  // ファイルサイズ
  originalSize: "元ファイル",
  indexedSize: "インデックス版",

  // エラー
  errorLabel: "エラー",

  // 空の状態
  emptyStateMessage:
    "ファイルが選択されていません。MCAPファイルを選択してインデックス化を開始してください。",
} as const;

export const usageGuide = {
  // タブタイトル
  tabUsage: "🚀 使い方",
  tabIndexing: "📖 インデックス化とは",
  tabPurpose: "🎯 なぜインデックス化？",

  // 使い方タブ
  usageTitle: "MCAPインデックス化ツールの使い方",
  step1Title: "MCAPファイルの選択",
  step1Description:
    "上のファイル入力をクリックするか、MCAPファイルをここにドラッグ&ドロップしてください。複数ファイルの同時処理が可能です。",

  step2Title: "自動処理",
  step2Description:
    "ツールが自動的にMCAPファイルを読み込み、解析して、インデックス版を作成します。リアルタイムで進捗を確認できます。",

  step3Title: "結果のダウンロード",
  step3Description:
    "処理が完了すると、ダウンロードボタンが表示されます。インデックス化されたファイルは、通常Lichtblickでのシーク性能が向上します。",

  // 技術情報
  technicalTitle: "📊 技術的詳細",
  technicalFeatures:
    "✅ 元データとメタデータをすべて保持\n📈 効率的なシークのためのサマリーセクションを追加\n⚡ Lichtblickでの再生パフォーマンスを最適化\n🔒 ファイルをローカルで処理（データアップロードなし）\n💾 バッチあたり最大2GBのファイルをサポート",

  // キーボードショートカット
  keyboardTitle: "⌨️ キーボードショートカット",
  keyboardShortcuts: {
    "Ctrl+O": "ファイル選択を開く",
    Space: "処理の一時停止/再開",
    Delete: "選択したタスクを削除",
  },

  // インデックス化について
  indexingTitle: "MCAPインデックス化とは？",
  indexingContent: {
    overview:
      "MCAPインデックス化は、サマリーセクションとメタデータを追加して、高速なシークと再生を可能にするMCAPファイルの最適化版を作成します。",

    whatHappens: "インデックス化中に実行される処理：",
    indexingSteps: [
      "📊 メッセージストリームとタイミングパターンを解析",
      "🗂️ 高速ナビゲーション用のチャンクおよびメッセージインデックスを作成",
      "📈 各トピックの統計情報を生成",
      "⚡ 連続アクセスとランダムアクセス用にデータレイアウトを最適化",
      "🔍 ナビゲーションメタデータを追加しながら元データをすべて保持",
    ],

    technicalDetails: "技術的実装：",
    technicalPoints: [
      "MCAPフォーマット組み込みのインデックシング機能を使用",
      "すべてのMCAPリーダーとの後方互換性を維持",
      "最小限のオーバーヘッド（通常ファイルサイズて5%未満の増加）",
      "Lichtblickの再生エンジンに特化した最適化",
    ],
  },

  // 目的と効果
  purposeTitle: "なぜMCAPファイルをインデックス化すべきか？",
  purposeContent: {
    overview:
      "インデックス化は再生体験を劇的に改善し、特に大きなファイルや複雑なデータ解析ワークフローでその効果を発揮します。",

    benefits: "主なメリット：",
    benefitsList: [
      "🚀 高速シーク: 任意の時刻に瞬時ジャンプ",
      "📊 スクラビング改善: スムーズなタイムラインナビゲーション",
      "⚡ メモリ使用量減少: 効率的なデータロード",
      "🎯 解析性能向上: 特定のデータ範囲への高速アクセス",
      "🔄 ワークフロー強化: 開発での高速反復処理",
    ],

    whenToUse: "インデックス化すべきケース：",
    useCases: [
      "最適なパフォーマンスのため100MB以上のファイル",
      "多数のトピック（20チャンネル以上）を持つデータセット",
      "頻繁なシークが必要な長時間記録（10分以上）",
      "解析やデバッグに繰り返し使用されるファイル",
      "チームメンバーと共有して協力解析するデータ",
    ],

    performanceNote:
      "パフォーマンス影響: インデックス化されたファイルは、ファイルサイズと複雑さによってシークパフォーマンスを10～100倍改善できます。",
  },
} as const;

export const messages = {
  // 処理完了メッセージ
  taskCompleted: "のインデックス化が完了しました！",
  batchCompleted: "バッチ処理が完了しました！",

  // エラーメッセージ
  processingFailed: "MCAPファイルの処理に失敗しました",
  noCompletedTasks: "ダウンロード可能な完了タスクがありません",
  taskNotReady: "タスクはダウンロードの準備ができていません",

  // ログメッセージ
  taskAdded: "タスクが追加されました",
  taskUpdated: "タスクが更新されました",
  taskFailed: "タスクが失敗しました",
  allTasksCompleted: "すべてのタスクが完了しました。処理済み",
} as const;

// 全ての翻訳をエクスポート
export default {
  ui,
  usageGuide,
  messages,
} as const;
