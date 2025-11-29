# Lichtblick レイアウトシステム - 設計思想とユースケース分析

> **作成日**: 2025年10月2日
> **目的**: バージョン管理なしでレイアウトのUXを改善するための基礎調査
> **結論**: レイアウトは「作業環境の保存・復元」が本質であり、バージョン管理ではなく「状態管理」の観点でUX改善すべき

---

## 📋 エグゼクティブサマリー

### レイアウトシステムの本質

**レイアウト = ユーザーの作業環境のスナップショット**

バージョン管理（Git的な考え方）ではなく、**「作業環境の保存・復元」**という観点で設計されています。

### 主要な発見

1. **baseline/working 方式の真の意図**

   - 「バージョン管理」ではなく「作業中/確定版」の分離
   - 自動保存と明示的保存の両立
   - 編集の安全性確保（いつでも元に戻せる）

2. **現在の設計における3つの核心概念**

   - **Personal Layout**: 個人の作業環境
   - **Shared Layout**: チーム共有の標準環境
   - **Working Copy**: 編集中の一時的な状態

3. **ユーザーが本当に必要としているもの**
   - ❌ 複数バージョンの同時管理
   - ✅ 作業環境の素早い切り替え
   - ✅ 安全な実験環境
   - ✅ 簡単な状態の復元

---

## 🎯 現在の設計思想の解読

### 1. baseline/working モデルの意図

#### データ構造

```typescript
export type Layout = {
  id: LayoutID;
  name: string;
  permission: LayoutPermission;

  // 最後に明示的に保存されたバージョン
  baseline: LayoutBaseline;

  // 編集中のワーキングコピー
  working: LayoutBaseline | undefined;

  // リモート同期情報
  syncInfo: LayoutSyncInfo | undefined;
};

export type LayoutBaseline = {
  data: LayoutData; // パネル配置、設定、変数など
  savedAt: ISO8601Timestamp; // 保存日時
};
```

#### 設計意図の分析

**これはGitのようなバージョン管理ではない**

```
┌─────────────────────────────────────────────────────────┐
│ Layout: "Autonomous Driving Monitor"                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  baseline (確定版)                                      │
│  ├─ 3Dビュー、プロット、マップを配置                      │
│  ├─ グローバル変数: speed, distance                     │
│  └─ 保存日時: 2025-10-01 10:00:00                      │
│                                                         │
│  working (作業中) ← 現在編集中                           │
│  ├─ 新しくログパネルを追加                               │
│  ├─ グローバル変数: speed, distance, status ← 追加      │
│  └─ 保存日時: 2025-10-02 14:30:00                      │
│                                                         │
│  ユーザーの選択肢:                                       │
│  ✅ "Save" → workingをbaselineに昇格（確定）            │
│  ✅ "Revert" → workingを破棄してbaselineに戻す          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**これはIDEの「保存」と「元に戻す」に近い概念**

```
Visual Studio Code の例:
- 編集中のファイル = working
- 保存されたファイル = baseline
- Ctrl+Z = revert

Photoshop の例:
- レイヤー編集中 = working
- ファイル保存 = baseline
- ヒストリーから戻る = revert
```

### 2. 3つの権限モデルの意図

```typescript
export type LayoutPermission =
  | "CREATOR_WRITE" // 個人レイアウト
  | "ORG_READ" // 組織の読み取り専用レイアウト
  | "ORG_WRITE"; // 組織の編集可能レイアウト
```

#### ユースケース別の設計意図

**CREATOR_WRITE（個人レイアウト）**

```
目的: 個人の作業環境を自由にカスタマイズ

シナリオ:
1. エンジニアが自分専用のデバッグレイアウトを作成
2. 好みのパネル配置を保存
3. プロジェクトごとに異なるレイアウトを切り替え

特徴:
- ローカルのみ保存（リモート同期しない）
- 他のユーザーに見えない
- 自由に編集・削除可能
```

**ORG_READ（組織の標準レイアウト）**

```
目的: チームの標準作業環境を提供

シナリオ:
1. チームリーダーが標準レイアウトを作成
2. メンバーは参照のみ可能
3. 編集したい場合は個人コピーを作成

特徴:
- リモート同期される
- 全メンバーに配信
- 読み取り専用（変更は個人コピーで）
```

**ORG_WRITE（組織の共同編集レイアウト）**

```
目的: チームで共同編集する作業環境

シナリオ:
1. チームで共通のレイアウトを改善
2. 誰でも編集可能
3. 変更は全メンバーに反映

特徴:
- リモート同期される
- 編集権限あり
- 競合解決メカニズムあり
```

### 3. 自動保存の設計思想

#### CurrentLayoutSyncAdapter の役割

```typescript
/**
 * A synchronization adapter that observes changes in the current layout and
 * asynchronously pushes them to the layout manager. This component handles
 * the automatic saving of layout changes with debouncing to prevent excessive
 * write operations.
 *
 * Key features:
 * - Monitors layout changes and batches unsaved modifications
 * - Debounces save operations to reduce server load (1秒間隔)
 * - Handles errors gracefully with user notifications
 * - Tracks analytics for layout updates
 * - Flushes pending changes on component unmount
 */
```

#### 自動保存の実装パターン

```typescript
const SAVE_INTERVAL_MS = 1000; // 1秒ごとに保存

// 変更を検知
const currentLayout = useCurrentLayoutSelector(selectCurrentLayout);

// デバウンスして保存
useEffect(() => {
  const timer = setTimeout(() => {
    layoutManager.updateLayout({
      id: currentLayout.id,
      data: currentLayout.data, // workingに保存される
    });
  }, SAVE_INTERVAL_MS);

  return () => clearTimeout(timer);
}, [currentLayout]);
```

**設計意図:**

- ユーザーは保存を意識する必要がない
- workingコピーに自動的に保存される
- baselineは明示的に「Save」を押した時のみ更新
- 「元に戻す」でいつでもbaselineに復帰できる

---

## 🎨 実際のユースケース分析

### ユースケース1: データ分析エンジニアの日常

#### シナリオ

```
田中さん（データ分析エンジニア）の1日:

09:00 - プロジェクトA用のレイアウトを選択
       ├─ 3Dビュー、プロット、ログを配置
       ├─ グローバル変数: vehicle_id, route
       └─ baseline保存済み

10:30 - 新しいセンサーデータを確認したい
       ├─ 新しいプロットパネルを追加 ← working自動保存
       ├─ グローバル変数追加: sensor_temp ← working自動保存
       └─ まだbaselineには保存しない（実験中）

12:00 - 昼休み
       ※ workingは自動保存されているので安心

13:00 - 午前中の追加が良かった
       └─ "Save" → workingをbaselineに昇格 ✅

14:00 - プロジェクトB用のレイアウトに切り替え
       └─ 完全に異なるパネル配置

16:00 - プロジェクトAに戻る
       └─ 13:00に保存した状態が復元される
```

**重要な気づき:**

- 田中さんは「バージョン1.0、2.0」とは考えていない
- 「プロジェクトAの作業環境」と「プロジェクトBの作業環境」として扱っている
- 実験中は気軽に変更し、確定したら保存する

### ユースケース2: チームでの標準レイアウト共有

#### シナリオ

```
自動運転チームの標準化:

チームリーダー（山田さん）:
1. "Autonomous Driving Standard" レイアウトを作成
2. 必要なパネル、変数、設定を配置
3. ORG_READで共有 → 全メンバーに配信

新人エンジニア（佐藤さん）:
1. "Autonomous Driving Standard" を見つける
2. 使ってみる → 便利！
3. 自分用にカスタマイズしたい
4. "Make Personal Copy" → 個人版を作成
5. 自由に編集

経験豊富なエンジニア（鈴木さん）:
1. 標準レイアウトに改善案
2. チームに提案
3. 承認されたら、新しい標準レイアウトを作成
```

**重要な気づき:**

- チームの「標準作業環境」を共有している
- 個人の好みに合わせてカスタマイズ可能
- 「バージョン」ではなく「標準」と「カスタム」の概念

### ユースケース3: 実験と安全な復元

#### シナリオ

```
レイアウトの実験:

鈴木さん:
1. 現在のレイアウト: "Debug Layout"
   └─ baseline: 確定した良い配置

2. 新しいパネル配置を試したい
   ├─ パネルを移動 ← working自動保存
   ├─ 新しいパネル追加 ← working自動保存
   └─ 色々実験...

3. 結果:

   パターンA: 実験成功 ✅
   └─ "Save" → workingをbaselineに昇格

   パターンB: 実験失敗 ❌
   └─ "Revert" → workingを破棄、baselineに戻す

   パターンC: 中途半端 🤔
   └─ 他のレイアウトに切り替え → workingは保持される
      └─ 後で戻ってきて判断できる
```

**重要な気づき:**

- 安全に実験できる環境
- 失敗してもすぐに元に戻せる
- 「バージョン1.0に戻す」ではなく「元の状態に戻す」

### ユースケース4: 複数プロジェクトの並行作業

#### シナリオ

```
複数プロジェクトを担当するエンジニア:

レイアウト一覧:
├─ "Project A - Route Planning"
│  ├─ 3Dマップ中心
│  └─ ルート計画用の変数
│
├─ "Project A - Sensor Debug"
│  ├─ センサーデータのプロット多数
│  └─ デバッグ用の変数
│
├─ "Project B - Performance Analysis"
│  ├─ パフォーマンスグラフ
│  └─ 統計情報パネル
│
└─ "Quick Debug"
   └─ シンプルな構成

使い方:
- 作業内容に応じてレイアウトを切り替え
- それぞれ独立した作業環境
- 頻繁に切り替えても状態は保持
```

**重要な気づき:**

- 「プロジェクトA v1.0、v2.0」ではない
- 「ルート計画用」「センサーデバッグ用」など**目的別**
- 完全に別の作業環境として管理

---

## 💡 設計思想から読み解く「バージョン管理が不要な理由」

### 1. レイアウト = ワークスペース（作業空間）

**アナロジー: オフィスのデスク配置**

```
バージョン管理が必要な例:
├─ ソースコード: 機能追加、バグ修正の履歴
├─ ドキュメント: 内容の変遷を追跡
└─ データベース: スキーマ変更の管理

バージョン管理が不要な例:
├─ デスクの配置: 「今日の配置」と「明日の配置」
├─ IDEのウィンドウ配置: 「開発用」と「デバッグ用」
└─ レイアウト: 「作業環境A」と「作業環境B」
```

**レイアウトは後者（作業空間）**

### 2. 複数レイアウト vs 複数バージョン

#### 現在の設計が想定している使い方

```
✅ 正しい使い方（目的別の複数レイアウト）:

"Autonomous Driving - Route Planning"
└─ ルート計画に最適化された配置

"Autonomous Driving - Sensor Debug"
└─ センサーデバッグに最適化された配置

"Autonomous Driving - Performance"
└─ パフォーマンス分析に最適化された配置

特徴:
- それぞれ異なる目的
- 並行して使用
- 名前で目的が明確
```

```
❌ 誤った使い方（同じ目的の複数バージョン）:

"Autonomous Driving v1.0.0"
└─ 初期バージョン... なぜ必要？

"Autonomous Driving v1.5.0"
└─ 改良版... v1.0.0との違いは？

"Autonomous Driving v2.0.0"
└─ 最新版... では他のバージョンは？

問題:
- なぜ古いバージョンを保持？
- どれを使えば良い？
- 管理が煩雑
```

### 3. baseline/working が提供する安全性

#### 「実験」と「確定」の分離

```
従来の単純な保存方式:
├─ 変更したら即座に上書き
├─ 元に戻すにはUndo連打
└─ 失敗したら大変

baseline/working方式:
├─ 変更は自動的にworkingに保存
├─ baselineは明示的に「Save」で更新
├─ 失敗したら「Revert」で即座に復元
└─ 安心して実験できる
```

**これは「バージョン管理」ではなく「作業の安全網」**

---

## 🚀 バージョン管理なしでUXを改善するアイデア

### 原則: レイアウトは「作業環境」として扱う

バージョン番号ではなく、**目的・状況・プロジェクト**で分類する

---

### アイデア1: 「作業環境テンプレート」システム

#### コンセプト

```
ユーザーが選べるテンプレート:

📊 Data Analysis (データ分析用)
├─ プロットパネル中心
├─ 統計情報表示
└─ グローバル変数: data_range, sampling_rate

🚗 Autonomous Driving (自動運転モニタリング)
├─ 3Dビュー、マップ、ログ
├─ センサー表示パネル
└─ グローバル変数: vehicle_id, route, speed

🐛 Debug (デバッグ用)
├─ ログパネル大きめ
├─ 変数インスペクター
└─ グローバル変数: debug_mode, log_level

⚡ Quick View (クイックビュー)
└─ シンプルな構成
```

#### 実装イメージ

```typescript
interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  category: "analysis" | "debug" | "monitoring" | "custom";
  icon: string;

  // ベース構成
  baseConfiguration: LayoutData;

  // カスタマイズ可能な項目
  customizableOptions: {
    panelDensity: "compact" | "comfortable" | "spacious";
    theme: "light" | "dark" | "auto";
    defaultVariables: Record<string, unknown>;
  };
}

// 使用例
const template = await getTemplate("autonomous-driving");
const myLayout = await createLayoutFromTemplate(template, {
  name: "Project A - Autonomous Driving",
  customization: {
    panelDensity: "comfortable",
    theme: "dark",
    defaultVariables: {
      vehicle_id: "vehicle_001",
      route: "route_tokyo_osaka",
    },
  },
});
```

#### メリット

- ✅ 目的に応じて選択しやすい
- ✅ カスタマイズの自由度
- ✅ 初心者にも分かりやすい
- ✅ バージョン管理の複雑さなし

---

### アイデア2: 「作業環境のコレクション」管理

#### コンセプト

プロジェクトやタスクごとにレイアウトをグループ化

```
┌─ Project A ─────────────────────────┐
│ ├─ Route Planning                   │
│ ├─ Sensor Debug                     │
│ └─ Performance Analysis             │
└─────────────────────────────────────┘

┌─ Project B ─────────────────────────┐
│ ├─ Data Collection                  │
│ └─ Quick Debug                      │
└─────────────────────────────────────┘

┌─ Daily Work ────────────────────────┐
│ ├─ Morning Check                    │
│ ├─ Development                      │
│ └─ Testing                          │
└─────────────────────────────────────┘
```

#### 実装イメージ

```typescript
interface LayoutCollection {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  layouts: LayoutID[];
}

// UI例
<LayoutBrowser>
  <CollectionList>
    <Collection name="Project A" color="blue">
      <LayoutItem name="Route Planning" />
      <LayoutItem name="Sensor Debug" />
      <LayoutItem name="Performance Analysis" />
    </Collection>

    <Collection name="Daily Work" color="green">
      <LayoutItem name="Morning Check" />
      <LayoutItem name="Development" />
    </Collection>
  </CollectionList>
</LayoutBrowser>
```

#### メリット

- ✅ プロジェクトごとに整理
- ✅ 切り替えが直感的
- ✅ 関連するレイアウトを一目で把握
- ✅ 「バージョン」ではなく「用途」で分類

---

### アイデア3: 「スナップショット」機能（タイムマシン的）

#### コンセプト

GitではなくPhotoshopやFigmaのヒストリー的なアプローチ

```
"Autonomous Driving" レイアウトのスナップショット履歴:

📸 2025-10-02 14:30 "Added performance monitoring"
   ├─ パフォーマンスパネル追加
   └─ CPUグラフ追加

📸 2025-10-01 16:00 "Sensor layout refinement"
   ├─ センサーパネル配置変更
   └─ 自動保存

📸 2025-10-01 10:00 "Initial setup"
   └─ 基本構成作成

操作:
- "Restore from snapshot" で任意の時点に復元
- "Create snapshot" で現在の状態を保存
- 自動スナップショット（重要な変更前）
```

#### 実装イメージ

```typescript
interface LayoutSnapshot {
  id: string;
  layoutId: LayoutID;
  name: string;
  description?: string;
  timestamp: ISO8601Timestamp;
  data: LayoutData;
  autoSaved: boolean;
}

// 自動スナップショット作成タイミング
const AUTO_SNAPSHOT_TRIGGERS = [
  "before_major_layout_change",  // 大きなレイアウト変更前
  "before_panel_delete",          // パネル削除前
  "daily_backup",                 // 毎日の自動バックアップ
];

// UI例
<SnapshotTimeline layout={currentLayout}>
  <Snapshot
    time="2025-10-02 14:30"
    label="Added performance monitoring"
    onRestore={() => restoreSnapshot(snapshotId)}
  />
  <Snapshot
    time="2025-10-01 16:00"
    label="Sensor layout refinement"
    type="auto"
  />
</SnapshotTimeline>
```

#### メリット

- ✅ いつでも過去の状態に戻れる
- ✅ 説明的な名前を付けられる
- ✅ 自動バックアップで安心
- ✅ 「バージョン番号」ではなく「時間」と「説明」

---

### アイデア4: 「作業コンテキスト」の保存

#### コンセプト

レイアウトだけでなく、作業全体の状態を保存

```typescript
interface WorkContext {
  id: string;
  name: string;
  description: string;

  // レイアウト
  layout: LayoutData;

  // 作業状態
  openedFiles: string[];
  selectedTopics: string[];
  playbackPosition: number;
  globalVariables: Record<string, unknown>;

  // 表示状態
  sidebarState: {
    left: boolean;
    right: boolean;
  };
  panelStates: Record<string, unknown>;
}
```

#### 使用例

```
"Project A - Morning Check" コンテキスト:
├─ レイアウト: 3Dビュー、ログ、マップ
├─ データファイル: route_001.mcap
├─ 選択トピック: /vehicle/status, /sensors/lidar
├─ 再生位置: 00:05:30
├─ グローバル変数: vehicle_id=001, route=tokyo
└─ サイドバー: 左開、右閉

ボタン1つで:
✅ レイアウト復元
✅ ファイルオープン
✅ トピック選択
✅ 再生位置復元
✅ 変数設定
✅ UI状態復元

→ 即座に作業再開！
```

#### メリット

- ✅ 作業の完全な復元
- ✅ コンテキストスイッチが超高速
- ✅ 「どこまでやったっけ？」がない
- ✅ レイアウト以上の価値

---

### アイデア5: 「スマートレイアウト推薦」

#### コンセプト

AIがユーザーの作業パターンを学習して最適なレイアウトを提案

```
状況: ユーザーが `/sensors/lidar` トピックを選択

システムの判断:
├─ 過去のパターン: LIDARを見る時は3Dビューを使う
├─ 推薦: "Sensor Analysis" レイアウト
└─ 通知: "センサー分析用のレイアウトに切り替えますか？"

ユーザー:
├─ はい → 自動切り替え
└─ いいえ → 現在のレイアウトで継続
```

#### 実装イメージ

```typescript
interface LayoutRecommendation {
  layoutId: LayoutID;
  confidence: number;
  reason: string;
  context: {
    topics: string[];
    dataType: string;
    timeOfDay: string;
    projectId: string;
  };
}

// 使用例
const recommendation = await getLayoutRecommendation({
  selectedTopics: ["/sensors/lidar", "/sensors/camera"],
  currentProject: "project_a",
  dataType: "sensor_debug",
});

if (recommendation.confidence > 0.8) {
  showNotification({
    message: `"${recommendation.layoutName}" レイアウトをお勧めします`,
    reason: recommendation.reason,
    actions: ["Switch", "Dismiss"],
  });
}
```

#### メリット

- ✅ ユーザーが選ぶ手間を削減
- ✅ 最適な作業環境を自動提案
- ✅ 学習するほど賢くなる
- ✅ 「バージョン」ではなく「状況」で推薦

---

### アイデア6: 「レイアウトのフォーク」（Gitからヒントを得るが別物）

#### コンセプト

既存レイアウトをベースに新しいレイアウトを派生させる

```
ベースレイアウト:
"Team Standard - Autonomous Driving"

個人のフォーク:
├─ "田中 - Autonomous Driving (Route Focus)"
│  └─ ベース + ルート計画パネル追加
│
├─ "佐藤 - Autonomous Driving (Sensor Focus)"
│  └─ ベース + センサー詳細パネル追加
│
└─ "鈴木 - Autonomous Driving (Performance Focus)"
   └─ ベース + パフォーマンスモニター追加

特徴:
- ベースレイアウトの更新を取り込める（オプション）
- 完全に独立したレイアウトとしても扱える
- 系譜が分かる（どこから派生したか）
```

#### 実装イメージ

```typescript
interface LayoutGenealogy {
  layoutId: LayoutID;
  name: string;
  forkedFrom?: {
    layoutId: LayoutID;
    layoutName: string;
    forkedAt: ISO8601Timestamp;
  };
  forks: LayoutID[]; // このレイアウトから派生したもの
}

// 使用例
const myLayout = await forkLayout({
  sourceLayoutId: "team-standard",
  newName: "My Custom - Autonomous Driving",
  modifications: {
    addPanels: ["performance-monitor"],
    removeVariables: ["unused_var"],
  },
});

// ベースレイアウトの更新を取り込む（オプション）
const hasUpdates = await checkForBaseLayoutUpdates(myLayout.id);
if (hasUpdates) {
  await promptToMergeBaseLayoutChanges({
    currentLayout: myLayout,
    baseLayout: "team-standard",
    strategy: "merge" | "replace" | "ignore",
  });
}
```

#### UI例

```
┌─ Layout Browser ────────────────────────────────────┐
│                                                     │
│ 📁 Personal Layouts                                 │
│ ├─ 📄 My Custom - Autonomous Driving               │
│ │  ├─ Forked from: Team Standard                   │
│ │  ├─ Modified: 2 days ago                         │
│ │  └─ [Update Available from Base]                 │
│ │                                                   │
│ └─ 📄 Debug Layout                                  │
│    └─ Original (not forked)                        │
│                                                     │
│ 📁 Team Layouts                                     │
│ └─ 📄 Team Standard - Autonomous Driving           │
│    ├─ Used by: 田中, 佐藤, 鈴木                     │
│    └─ Forks: 3                                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### メリット

- ✅ チームの標準をベースにカスタマイズ
- ✅ 系譜が追跡できる
- ✅ ベースの更新を取り込めるメリット（Gitっぽい部分）
- ❌ ただし「バージョン管理」とは異なる（派生と独立）

---

### アイデア7: 「クイックレイアウトスイッチャー」

#### コンセプト

IDEのファイルスイッチャー（Ctrl+P）的なレイアウト切り替え

```
キーボードショートカット: Ctrl+Shift+L

┌─ Quick Layout Switcher ───────────────────┐
│                                           │
│ 🔍 Type to search...                      │
│ ┌───────────────────────────────────────┐ │
│ │ > autonomous                          │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ 📄 Autonomous Driving - Route Planning   │
│    Last used: 10 minutes ago             │
│                                           │
│ 📄 Autonomous Driving - Sensor Debug     │
│    Last used: 1 hour ago                 │
│                                           │
│ 📄 Autonomous Driving - Performance      │
│    Last used: 2 days ago                 │
│                                           │
│ 📁 Project A / Quick Debug               │
│    Last used: Yesterday                  │
│                                           │
└───────────────────────────────────────────┘
```

#### 実装イメージ

```typescript
interface QuickSwitcherItem {
  layoutId: LayoutID;
  name: string;
  path: string; // Collection path
  lastUsed: ISO8601Timestamp;
  frecency: number; // Frequency + Recency score
  tags: string[];
}

// 検索とランキング
const searchLayouts = (query: string): QuickSwitcherItem[] => {
  return layouts
    .filter((layout) => fuzzyMatch(layout.name, query))
    .sort((a, b) => {
      // Frecency score: 頻度 + 最近度
      const scoreA = calculateFrecencyScore(a);
      const scoreB = calculateFrecencyScore(b);
      return scoreB - scoreA;
    });
};

// キーボードショートカット
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === "l") {
      e.preventDefault();
      openQuickSwitcher();
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);
```

#### メリット

- ✅ 超高速レイアウト切り替え
- ✅ キーボードだけで操作可能
- ✅ よく使うレイアウトが上位表示
- ✅ マウス不要で生産性向上

---

### アイデア8: 「レイアウトの自動整理・提案」

#### コンセプト

AIがレイアウトを分析して整理・統合を提案

```
システムの分析:

発見:
├─ "Debug Layout" と "Debug Layout 2" は90%同じ
├─ "Old Layout" は6ヶ月使われていない
└─ "Test" という名前のレイアウトが3つある

提案:
├─ 類似レイアウトの統合
│  └─ "Debug Layout" と "Debug Layout 2" → "Debug Layout (統合版)"
│
├─ 未使用レイアウトのアーカイブ
│  └─ "Old Layout" → アーカイブフォルダへ
│
└─ レイアウト名の改善提案
   └─ "Test" → "Test - Sensor Debug" (説明的な名前)
```

#### 実装イメージ

```typescript
interface LayoutAnalysis {
  duplicates: {
    layouts: LayoutID[];
    similarity: number;
    suggestion: "merge" | "keep_separate";
  }[];

  unused: {
    layoutId: LayoutID;
    lastUsed: ISO8601Timestamp;
    suggestion: "archive" | "delete";
  }[];

  namingIssues: {
    layoutId: LayoutID;
    currentName: string;
    issue: "generic" | "duplicate" | "unclear";
    suggestedName: string;
  }[];
}

// 定期的な分析と提案
const analysis = await analyzeLayouts();

if (analysis.duplicates.length > 0) {
  showNotification({
    title: "レイアウトの整理提案",
    message: `${analysis.duplicates.length}個の類似レイアウトが見つかりました`,
    action: "View Suggestions",
  });
}
```

#### メリット

- ✅ レイアウトが散らからない
- ✅ 自動的に整理される
- ✅ 不要なレイアウトの削減
- ✅ メンテナンス不要

---

## 📊 実装優先度と効果の評価

### 優先度マトリクス

```
                    高い効果
                       ↑
    クイックスイッチャー 🟢 | 作業環境テンプレート 🟢
              ↑              |
    スナップショット機能     | コレクション管理 🟡
              ↑              |
低い実装コスト ─────────┼──────── 高い実装コスト
              ↓              |
    自動整理・提案 🟡        | 作業コンテキスト保存 🔵
              ↓              |
    スマート推薦 🔵          | レイアウトフォーク 🟡
                       ↓
                    低い効果

凡例:
🟢 Phase 1 (即座に実装すべき)
🟡 Phase 2 (次のリリースで検討)
🔵 Phase 3 (将来的に検討)
```

### Phase 1: 即座に実装すべき機能

#### 1. クイックレイアウトスイッチャー

**実装工数**: 低（20-30時間）
**ユーザー価値**: 非常に高

```typescript
優先理由: -実装が比較的簡単 -
  ユーザー体験の劇的な改善 -
  既存機能への影響が少ない -
  すぐに価値を実感できる;
```

#### 2. 作業環境テンプレート

**実装工数**: 中（40-60時間）
**ユーザー価値**: 非常に高

```typescript
優先理由: -初心者にも分かりやすい -
  レイアウト作成の手間を大幅削減 -
  チームの標準化に貢献 -
  マーケットプレイスとの連携可能;
```

### Phase 2: 次のリリースで検討

#### 3. コレクション管理

**実装工数**: 中（50-70時間）
**ユーザー価値**: 高

```typescript
優先理由: -レイアウトの整理に有効 - プロジェクト管理との統合 - 複数プロジェクトユーザーに最適;
```

#### 4. スナップショット機能

**実装工数**: 中（60-80時間）
**ユーザー価値**: 高

```typescript
優先理由:
- baseline/workingの自然な拡張
- 安全性の向上
- 「バージョン管理」への代替案
```

#### 5. 自動整理・提案

**実装工数**: 中（40-60時間）
**ユーザー価値**: 中

```typescript
優先理由: -メンテナンス負荷の軽減 - レイアウトの品質向上 - 長期的な価値;
```

### Phase 3: 将来的に検討

#### 6. 作業コンテキスト保存

**実装工数**: 高（80-120時間）
**ユーザー価値**: 非常に高（一部のユーザーに）

```typescript
優先理由: -非常に強力だが実装が複雑 - 依存関係が多い - 慎重な設計が必要;
```

#### 7. スマート推薦

**実装工数**: 高（100-150時間）
**ユーザー価値**: 中～高（成熟に時間が必要）

```typescript
優先理由:
- AI/ML の実装が必要
- 学習データの蓄積が必要
- 段階的な展開が必要
```

#### 8. レイアウトフォーク

**実装工数**: 中（60-80時間）
**ユーザー価値**: 中

```typescript
優先理由: -チーム利用に有用 - 複雑性とのトレードオフ - 他の機能で代替可能;
```

---

## 🎯 推奨実装ロードマップ

### 短期（現在のリリース - 3ヶ月）

#### 目標

既存のレイアウトシステムの基本UX改善

#### 実装項目

**1. クイックレイアウトスイッチャー** ✅ 優先度: 最高

```
工数: 20-30時間
内容:
- キーボードショートカット (Ctrl+Shift+L)
- ファジー検索
- Frecency スコアリング
- 最近使用したレイアウトの表示

成果:
- レイアウト切り替えが10倍高速化
- キーボード主体のワークフロー
- 生産性の大幅向上
```

**2. レイアウトブラウザーUI改善** ✅ 優先度: 高

```
工数: 30-40時間
内容:
- グループ化表示（Project, Daily Work, etc.）
- プレビュー機能
- 最終使用日時の表示
- お気に入り機能

成果:
- レイアウトの見つけやすさ向上
- 視覚的に分かりやすい
- 整理しやすい
```

**3. baseline/workingの視覚的フィードバック強化** ✅ 優先度: 高

```
工数: 15-20時間
内容:
- workingがある時の明確な表示
- 変更内容のサマリー表示
- Save/Revertボタンの改善
- 変更の自動保存通知

成果:
- ユーザーが今の状態を理解しやすい
- Save/Revertの意味が明確
- 作業の安心感向上
```

**合計工数**: 65-90時間（約2週間）

### 中期（3-6ヶ月後）

#### 目標

レイアウトの作成・管理の効率化

#### 実装項目

**4. 作業環境テンプレート** ✅ 優先度: 最高

```
工数: 40-60時間
内容:
- テンプレートライブラリ
- カスタマイズオプション
- マーケットプレイスとの統合
- テンプレートからの作成フロー

成果:
- レイアウト作成時間が大幅削減
- 初心者でも高品質なレイアウト作成
- チームの標準化促進
```

**5. コレクション管理** ✅ 優先度: 高

```
工数: 50-70時間
内容:
- プロジェクト/カテゴリでグループ化
- コレクションの作成・編集
- ドラッグ&ドロップでの整理
- コレクション間の移動

成果:
- 大量のレイアウトを整理しやすい
- プロジェクトごとの管理が容易
- レイアウトの発見性向上
```

**6. スナップショット機能（基本版）** ✅ 優先度: 中

```
工数: 60-80時間
内容:
- 手動スナップショット作成
- スナップショットからの復元
- スナップショット一覧表示
- 説明の追加

成果:
- 安全な実験環境
- 過去の状態への復元が容易
- baseline/workingの自然な拡張
```

**合計工数**: 150-210時間（約4-5週間）

### 長期（6-12ヶ月後）

#### 目標

高度な自動化とインテリジェント機能

#### 実装項目

**7. 作業コンテキスト保存（段階的実装）** 🔵 優先度: 中

```
Phase 1: 基本コンテキスト (30-40時間)
- レイアウト + グローバル変数
- 選択トピック
- サイドバー状態

Phase 2: データコンテキスト (40-60時間)
- 開いているファイル
- 再生位置
- パネル個別の状態

Phase 3: 完全統合 (30-40時間)
- 自動保存
- 素早い切り替え
- プロジェクト統合

成果:
- 作業再開が超高速
- コンテキストスイッチの負荷軽減
- 複数プロジェクト並行作業が快適
```

**8. 自動整理・提案** 🟡 優先度: 中

```
工数: 40-60時間
内容:
- 類似レイアウトの検出
- 未使用レイアウトの検出
- レイアウト名の改善提案
- 自動アーカイブ機能

成果:
- レイアウトが自動的に整理される
- メンテナンス負荷の軽減
- 品質の自動向上
```

**9. スマート推薦（実験的）** 🔵 優先度: 低

```
工数: 100-150時間
内容:
- 使用パターンの学習
- 状況に応じた推薦
- A/Bテスト
- フィードバック収集

成果:
- 自動的に最適なレイアウトを提案
- ユーザーの学習曲線を短縮
- 長期的には非常に価値が高い
```

**合計工数**: 240-350時間（約6-8週間）

---

## 💡 結論: 「バージョン管理」から「作業環境管理」へ

### 重要な気づき

**レイアウトシステムの本質を理解することが最重要**

```
❌ 誤った理解:
- レイアウト = ドキュメント（バージョン管理が必要）
- v1.0、v2.0、v3.0 のように管理
- 複数バージョンを同時に保持

✅ 正しい理解:
- レイアウト = 作業環境のスナップショット
- 「ルート計画用」「デバッグ用」のように目的で管理
- 状況に応じて素早く切り替える
```

### 推奨する設計方針

**1. 「作業環境」としてのメタファーを強化**

```typescript
// UI の言語を変更
❌ "Layout Version 1.0"
✅ "Route Planning Workspace"

❌ "Install Layout v2.0"
✅ "Use Sensor Debug Environment"

❌ "Update to v3.0"
✅ "Switch to Performance Analysis"
```

**2. 「テンプレート」からの作成フローを主流に**

```typescript
新規レイアウト作成:
1. テンプレートを選択
   ├─ Data Analysis
   ├─ Autonomous Driving
   ├─ Debug
   └─ Custom

2. カスタマイズ
   ├─ 名前: "Project A - Route Planning"
   ├─ パネル密度: Comfortable
   ├─ テーマ: Dark
   └─ 初期変数設定

3. 作成完了
   └─ すぐに使い始められる
```

**3. 「コレクション」でのグループ管理**

```typescript
レイアウトブラウザー:

📁 Project A
├─ Route Planning
├─ Sensor Debug
└─ Performance

📁 Daily Work
├─ Morning Check
└─ Development

📁 Experiments
└─ New Panel Layout
```

**4. 「スナップショット」で履歴管理**

```typescript
各レイアウトのスナップショット:

"Route Planning" workspace:
├─ 📸 2025-10-02 14:30 "Added GPS overlay"
├─ 📸 2025-10-01 16:00 "Refined panel layout"
└─ 📸 2025-10-01 10:00 "Initial setup"
```

### 最終推奨

**レイアウトマーケットプレイスの方向性**

```
❌ 避けるべき方向:
- 複数バージョンの同時インストール
- バージョン番号での管理
- Git的なバージョン管理

✅ 推奨する方向:
- テンプレートとしての配信
- 目的別のカテゴリ分類
- カスタマイズ可能なベース環境
- フォーク機能（オプション）
```

**実装の第一歩**

```
Phase 1 (即座に):
1. クイックレイアウトスイッチャー
2. レイアウトブラウザーUI改善
3. baseline/working フィードバック強化

Phase 2 (3-6ヶ月):
4. 作業環境テンプレート
5. コレクション管理
6. スナップショット機能

Phase 3 (6-12ヶ月):
7. 作業コンテキスト保存
8. 自動整理・提案
9. スマート推薦（実験的）
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025年10月2日
**Author**: AI UX Researcher
**Status**: Complete
