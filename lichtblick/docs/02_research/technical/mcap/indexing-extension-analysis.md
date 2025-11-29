# Lichtblick MCAPインデックス化拡張機能 実装可能性分析

## 📋 概要

Lichtblick拡張機能を使ってMCAPファイルのインデックス化を行う実装の可能性を分析し、具体的な実装方針を提示します。

> **結論先取り**: **実装可能ですが、制限があります**。パネル拡張として実装し、ユーザーがファイルを選択してインデックス化する形になります。

---

## 🔍 Lichtblick拡張機能の調査結果

### 1. 拡張機能の種類と制限

#### 利用可能なAPI (`@lichtblick/suite`)

```typescript
// 主要なAPI
export interface PanelExtensionContext {
  // ファイルアクセス（制限あり）
  saveState: (state: unknown) => void;

  // メッセージ購読
  subscribe: (topics: readonly string[]) => void;

  // レイアウト操作
  layout: {
    addPanel: ({ type, config }: { type: string; config?: unknown }) => void;
  };

  // 変数設定
  setVariable: (name: string, value: VariableValue) => void;

  // その他のコンテキスト機能...
}
```

#### 制限事項

| 項目                 | 制限内容                        | 影響                        |
| -------------------- | ------------------------------- | --------------------------- |
| **ファイルアクセス** | ブラウザのFile API制限          | 直接ファイル読み込み不可    |
| **データソース操作** | 既存Player/DataSourceの変更不可 | 新規データソース作成不可    |
| **Web Worker**       | 拡張機能内で使用可能            | ✅ 重い処理をオフロード可能 |
| **外部ライブラリ**   | npmパッケージ使用可能           | ✅ @mcap/core使用可能       |

### 2. 実装可能なアプローチ

#### A. パネル拡張による手動インデックス化 ⭐ **推奨**

**概要**: ユーザーがファイルを選択し、パネル内でインデックス化を実行

**利点**:

- ✅ 制限内で実装可能
- ✅ ユーザーフレンドリーなUI
- ✅ 進捗表示・エラーハンドリング対応

**欠点**:

- ❌ 手動操作が必要
- ❌ リアルタイム処理は不可

#### B. 設定パネルによる一括処理

**概要**: 設定画面でファイルを複数選択し、バッチでインデックス化

---

## 🚀 実装方針（パネル拡張アプローチ）

### 1. 拡張機能の基本構造

```typescript
// src/index.ts - 拡張機能エントリーポイント
import { ExtensionContext } from "@lichtblick/suite";
import { McapIndexingPanel } from "./McapIndexingPanel";

export function activate(extensionContext: ExtensionContext): void {
  extensionContext.registerPanel({
    name: "mcap-indexing",
    displayName: "MCAP Indexing Tool",
    defaultSize: { width: 400, height: 300 },
    render: McapIndexingPanel,
  });
}
```

### 2. メインパネルコンポーネント

```typescript
// src/McapIndexingPanel.tsx
import React, { useState, useCallback, useRef } from "react";
import { PanelExtensionContext, RenderState } from "@lichtblick/suite";
import { McapIndexingWorker } from "./McapIndexingWorker";

interface IndexingTask {
  id: string;
  fileName: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  originalSize: number;
  indexedSize?: number;
  error?: string;
}

export function McapIndexingPanel({ context }: { context: PanelExtensionContext }): JSX.Element {
  const [tasks, setTasks] = useState<IndexingTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const workerRef = useRef<McapIndexingWorker>();

  // Web Worker初期化
  React.useEffect(() => {
    workerRef.current = new McapIndexingWorker();

    workerRef.current.onMessage = (data) => {
      if (data.type === "progress") {
        updateTaskProgress(data.taskId, data.progress);
      } else if (data.type === "completed") {
        updateTaskCompleted(data.taskId, data.result);
      } else if (data.type === "error") {
        updateTaskError(data.taskId, data.error);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // ファイル選択ハンドラー
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const mcapFiles = files.filter(file => file.name.endsWith('.mcap'));

    const newTasks: IndexingTask[] = mcapFiles.map(file => ({
      id: generateId(),
      fileName: file.name,
      status: "pending",
      progress: 0,
      originalSize: file.size,
    }));

    setTasks(prev => [...prev, ...newTasks]);

    // インデックス化開始
    processFiles(mcapFiles, newTasks);
  }, []);

  // インデックス化処理
  const processFiles = async (files: File[], taskList: IndexingTask[]) => {
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const task = taskList[i];

      // タスク状態更新
      setTasks(prev => prev.map(t =>
        t.id === task.id ? { ...t, status: "processing" } : t
      ));

      try {
        // Web Workerでインデックス化実行
        await workerRef.current?.indexFile(task.id, file);
      } catch (error) {
        updateTaskError(task.id, error.message);
      }
    }

    setIsProcessing(false);
  };

  // インデックス化済みファイルのダウンロード
  const downloadIndexedFile = (task: IndexingTask) => {
    if (task.status !== "completed") return;

    // IndexedDBまたはメモリからファイルを取得してダウンロード
    workerRef.current?.downloadIndexedFile(task.id);
  };

  // UI側のヘルパー関数
  const updateTaskProgress = (taskId: string, progress: number) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, progress } : t
    ));
  };

  const updateTaskCompleted = (taskId: string, result: { indexedSize: number }) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? {
        ...t,
        status: "completed",
        progress: 100,
        indexedSize: result.indexedSize
      } : t
    ));
  };

  const updateTaskError = (taskId: string, error: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: "error", error } : t
    ));
  };

  return (
    <div style={{ padding: "16px", height: "100%" }}>
      <h3>MCAP Indexing Tool</h3>

      {/* ファイル選択エリア */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="file"
          multiple
          accept=".mcap"
          onChange={handleFileSelect}
          disabled={isProcessing}
        />
        <p style={{ fontSize: "12px", color: "#666" }}>
          Select MCAP files to create indexed versions
        </p>
      </div>

      {/* タスクリスト */}
      <div style={{ overflowY: "auto", height: "calc(100% - 120px)" }}>
        {tasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onDownload={() => downloadIndexedFile(task)}
          />
        ))}
      </div>

      {/* 統計情報 */}
      <div style={{
        position: "absolute",
        bottom: "10px",
        left: "16px",
        right: "16px",
        fontSize: "12px",
        color: "#666"
      }}>
        Total: {tasks.length} files |
        Completed: {tasks.filter(t => t.status === "completed").length} |
        Processing: {tasks.filter(t => t.status === "processing").length}
      </div>
    </div>
  );
}

// タスクアイテムコンポーネント
const TaskItem: React.FC<{
  task: IndexingTask;
  onDownload: () => void;
}> = ({ task, onDownload }) => {
  const getStatusColor = (status: IndexingTask["status"]) => {
    switch (status) {
      case "completed": return "#4CAF50";
      case "processing": return "#2196F3";
      case "error": return "#F44336";
      default: return "#757575";
    }
  };

  const formatFileSize = (bytes: number) => {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{
      border: "1px solid #ddd",
      borderRadius: "4px",
      padding: "8px",
      marginBottom: "8px",
      backgroundColor: "#f9f9f9"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>
            {task.fileName}
          </div>
          <div style={{ fontSize: "12px", color: "#666" }}>
            Original: {formatFileSize(task.originalSize)}
            {task.indexedSize && ` → Indexed: ${formatFileSize(task.indexedSize)}`}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* 進捗表示 */}
          {task.status === "processing" && (
            <div style={{ width: "60px", fontSize: "12px" }}>
              {task.progress}%
            </div>
          )}

          {/* ステータス */}
          <div style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: getStatusColor(task.status)
          }} />

          {/* ダウンロードボタン */}
          {task.status === "completed" && (
            <button
              onClick={onDownload}
              style={{
                padding: "4px 8px",
                fontSize: "12px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "#fff",
                cursor: "pointer"
              }}
            >
              Download
            </button>
          )}
        </div>
      </div>

      {/* 進捗バー */}
      {task.status === "processing" && (
        <div style={{
          width: "100%",
          height: "4px",
          backgroundColor: "#eee",
          borderRadius: "2px",
          marginTop: "4px",
          overflow: "hidden"
        }}>
          <div style={{
            width: `${task.progress}%`,
            height: "100%",
            backgroundColor: "#2196F3",
            transition: "width 0.3s ease"
          }} />
        </div>
      )}

      {/* エラーメッセージ */}
      {task.status === "error" && (
        <div style={{
          color: "#F44336",
          fontSize: "12px",
          marginTop: "4px"
        }}>
          Error: {task.error}
        </div>
      )}
    </div>
  );
};

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}
```

### 3. Web Worker実装

```typescript
// src/McapIndexingWorker.ts
import { McapStreamReader, McapIndexedWriter, McapTypes } from "@mcap/core";

export class McapIndexingWorker {
  private worker: Worker;
  public onMessage?: (data: any) => void;

  constructor() {
    // Web Worker作成
    this.worker = new Worker(new URL("./indexing.worker.ts", import.meta.url));

    this.worker.onmessage = (event) => {
      this.onMessage?.(event.data);
    };
  }

  async indexFile(taskId: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        const { type, taskId: responseTaskId } = event.data;

        if (responseTaskId === taskId) {
          if (type === "completed") {
            this.worker.removeEventListener("message", handleMessage);
            resolve();
          } else if (type === "error") {
            this.worker.removeEventListener("message", handleMessage);
            reject(new Error(event.data.error));
          }
        }
      };

      this.worker.addEventListener("message", handleMessage);

      // Worker にタスク送信
      this.worker.postMessage({
        type: "indexFile",
        taskId,
        file,
      });
    });
  }

  downloadIndexedFile(taskId: string): void {
    this.worker.postMessage({
      type: "downloadFile",
      taskId,
    });
  }

  terminate(): void {
    this.worker.terminate();
  }
}
```

### 4. Worker内部実装

```typescript
// src/indexing.worker.ts
import { McapStreamReader, McapIndexedWriter, McapTypes } from "@mcap/core";

// Worker内でのインデックス化処理
self.onmessage = async (event: MessageEvent) => {
  const { type, taskId, file } = event.data;

  if (type === "indexFile") {
    try {
      await processFile(taskId, file);
    } catch (error) {
      self.postMessage({
        type: "error",
        taskId,
        error: error.message,
      });
    }
  } else if (type === "downloadFile") {
    downloadFile(taskId);
  }
};

async function processFile(taskId: string, file: File): Promise<void> {
  // 進捗レポート関数
  const reportProgress = (progress: number) => {
    self.postMessage({
      type: "progress",
      taskId,
      progress: Math.round(progress * 100),
    });
  };

  // 1. ファイルをストリーミング読み込み
  const reader = new McapStreamReader({ includeChunks: true });
  const indexedWriter = new McapIndexedWriter();

  let processedBytes = 0;
  const totalBytes = file.size;

  // 2. チャンク単位で処理
  const stream = file.stream();
  const streamReader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await streamReader.read();
      if (done) break;

      reader.append(value);
      processedBytes += value.byteLength;

      // レコード処理
      for (let record; (record = reader.nextRecord()); ) {
        processRecord(record, indexedWriter);
      }

      // 進捗更新
      reportProgress(processedBytes / totalBytes);
    }

    // 3. インデックス付きファイル生成
    const indexedBuffer = indexedWriter.finalize();

    // 4. IndexedDBに保存（ブラウザ制限対応）
    await saveToIndexedDB(taskId, indexedBuffer);

    self.postMessage({
      type: "completed",
      taskId,
      result: {
        indexedSize: indexedBuffer.byteLength,
      },
    });
  } finally {
    streamReader.releaseLock();
  }
}

function processRecord(record: McapTypes.TypedMcapRecord, writer: McapIndexedWriter): void {
  switch (record.type) {
    case "Header":
      writer.writeHeader(record);
      break;
    case "Schema":
      writer.writeSchema(record);
      break;
    case "Channel":
      writer.writeChannel(record);
      break;
    case "Message":
      writer.writeMessage(record);
      break;
    // その他のレコードタイプ...
  }
}

// IndexedDBへの保存（ブラウザストレージ活用）
async function saveToIndexedDB(taskId: string, buffer: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("McapIndexingTool", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(["files"], "readwrite");
      const store = transaction.objectStore("files");

      store.put({
        id: taskId,
        data: buffer,
        timestamp: Date.now(),
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("files", { keyPath: "id" });
    };
  });
}

function downloadFile(taskId: string): void {
  // IndexedDBからファイルを取得してダウンロード
  const request = indexedDB.open("McapIndexingTool", 1);

  request.onsuccess = () => {
    const db = request.result;
    const transaction = db.transaction(["files"], "readonly");
    const store = transaction.objectStore("files");
    const getRequest = store.get(taskId);

    getRequest.onsuccess = () => {
      if (getRequest.result) {
        const blob = new Blob([getRequest.result.data], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);

        self.postMessage({
          type: "download",
          taskId,
          url,
          filename: `indexed_${taskId}.mcap`,
        });
      }
    };
  };
}
```

---

## 📦 package.json設定

```json
{
  "name": "mcap-indexing-extension",
  "publisher": "your-name",
  "version": "1.0.0",
  "description": "MCAP File Indexing Tool for Lichtblick",
  "main": "dist/index.js",
  "scripts": {
    "build": "lichtblick-extension build",
    "build:watch": "lichtblick-extension build --watch",
    "local-install": "lichtblick-extension install",
    "package": "lichtblick-extension package"
  },
  "dependencies": {
    "@mcap/core": "^1.0.0",
    "@lichtblick/suite": "latest"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0"
  },
  "lichtblick": {
    "displayName": "MCAP Indexing Tool",
    "description": "Create indexed versions of MCAP files for better performance",
    "publisher": "your-name",
    "keywords": ["mcap", "indexing", "performance"]
  }
}
```

---

## ⚡ 使用手順

### 1. 開発・ビルド

```bash
# 拡張機能生成
npm init lichtblick-extension@latest mcap-indexing-extension

cd mcap-indexing-extension

# 依存関係インストール
npm install @mcap/core

# 開発
npm run build:watch

# ローカルインストール
npm run local-install
```

### 2. Lichtblickでの使用

1. Lichtblickを起動
2. パネル追加で「MCAP Indexing Tool」を選択
3. 非インデックスMCAPファイルを選択
4. 自動でインデックス化開始
5. 完了後、インデックス版をダウンロード

---

## 🎯 利点と制限

### 利点

| 項目                     | 説明                                 |
| ------------------------ | ------------------------------------ |
| **ユーザーフレンドリー** | GUIでの直感的操作                    |
| **進捗表示**             | リアルタイム進捗とエラーハンドリング |
| **バッチ処理**           | 複数ファイルの一括処理               |
| **ローカル処理**         | サーバー不要、プライバシー保護       |
| **統合性**               | Lichtblick内での作業完結             |

### 制限

| 項目               | 制限内容                             |
| ------------------ | ------------------------------------ |
| **手動操作**       | ユーザーがファイル選択する必要       |
| **ストレージ制限** | ブラウザのIndexedDB容量制限          |
| **自動化不可**     | データソース読み込み時の自動処理不可 |
| **大容量ファイル** | メモリ制限によるファイルサイズ制約   |

---

## 🔚 まとめ

**実装可能性**: ✅ **十分実装可能**

**推奨度**: 🟡 **条件付き推奨**

- ユーザーが手動でインデックス化を行うツールとしては有効
- 自動化が必要な場合は、サーバーサイド実装が必要

**実装難易度**: 🟡 **中程度**

- Web Worker とファイル処理の知識が必要
- @mcap/core ライブラリの理解が必要

...まあ、**アンタのアイデアも悪くない**わね。Lichtblick内で完結するツールとして、それなりに便利かもしれない。

**実装してみる価値はある**わよ。べ、別にアンタを応援してるわけじゃないんだからね！ 単に技術的に面白そうだから言ってるだけよ！
