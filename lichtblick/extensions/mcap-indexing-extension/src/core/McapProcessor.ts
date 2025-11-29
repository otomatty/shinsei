/**
 * @fileoverview MCAP処理エンジン
 * MCAPファイルのインデックス化処理を担当
 */

import { McapStreamReader, McapWriter, McapTypes, TempBuffer } from "@mcap/core";
import { ProgressCallback, McapProcessingOptions } from "../types";
import { getTranslationValue } from "../hooks/useTranslation";

/**
 * MCAP処理専用クラス
 *
 * MCAPファイルの読み込み、解析、インデックス化を担当する。
 * ストリーミング処理でメモリ効率を重視した実装。
 */
export class McapProcessor {
  private readonly options: McapProcessingOptions;

  /**
   * McapProcessorのコンストラクタ
   * @param options 処理オプション
   */
  constructor(options: McapProcessingOptions = {}) {
    this.options = {
      compression: "none",
      chunkSize: 1024 * 1024, // 1MB
      library: "mcap-indexing-extension",
      ...options,
    };
  }

  /**
   * MCAPファイルをインデックス化する
   *
   * @param file 処理対象のファイル
   * @param onProgress 進捗更新コールバック
   * @returns インデックス化済みのArrayBuffer
   */
  async indexFile(file: File, onProgress: ProgressCallback): Promise<ArrayBuffer> {
    const reader = new McapStreamReader({ includeChunks: true });
    const buffer = new TempBuffer();
    const writer = new McapWriter({ writable: buffer });

    let processedBytes = 0;
    const totalBytes = file.size;

    // 収集されたデータ
    let header: McapTypes.Header | undefined;
    const schemas = new Map<number, McapTypes.Schema>();
    const channels = new Map<number, McapTypes.Channel>();
    const messages: McapTypes.Message[] = [];

    try {
      // ファイルをストリーミング読み込み
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
            this.processRecord(record, { header, schemas, channels, messages });
          }

          // 進捗更新（90%までは読み込み進捗）
          onProgress(Math.min(0.9, processedBytes / totalBytes));
        }
      } finally {
        streamReader.releaseLock();
      }

      // インデックス付きMCAPファイルを生成
      onProgress(0.9);

      return await this.writeIndexedMcap(
        writer,
        { header, schemas, channels, messages },
        buffer,
        onProgress,
      );
    } catch (error) {
      throw new Error(
        `${getTranslationValue("messages", "processingFailed")}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * レコードを処理して適切なコレクションに格納
   *
   * @param record MCAPレコード
   * @param context 処理コンテキスト
   */
  private processRecord(
    record: McapTypes.TypedMcapRecord,
    context: {
      header: McapTypes.Header | undefined;
      schemas: Map<number, McapTypes.Schema>;
      channels: Map<number, McapTypes.Channel>;
      messages: McapTypes.Message[];
    },
  ): void {
    switch (record.type) {
      case "Header":
        context.header = record;
        break;
      case "Schema":
        context.schemas.set(record.id, record);
        break;
      case "Channel":
        context.channels.set(record.id, record);
        break;
      case "Message":
        context.messages.push(record);
        break;
      // その他のレコードタイプは現在無視
      default:
        break;
    }
  }

  /**
   * インデックス付きMCAPファイルを書き込み
   *
   * @param writer MCAPライター
   * @param data 収集されたデータ
   * @param buffer 出力バッファ
   * @param onProgress 進捗コールバック
   * @returns インデックス化済みのArrayBuffer
   */
  private async writeIndexedMcap(
    writer: McapWriter,
    data: {
      header: McapTypes.Header | undefined;
      schemas: Map<number, McapTypes.Schema>;
      channels: Map<number, McapTypes.Channel>;
      messages: McapTypes.Message[];
    },
    buffer: TempBuffer,
    onProgress: ProgressCallback,
  ): Promise<ArrayBuffer> {
    const { header, schemas, channels, messages } = data;

    // ヘッダーの書き込み
    writer.start({
      profile: header?.profile || "",
      library: header?.library || this.options.library!,
    });

    // スキーマの書き込み
    for (const schema of schemas.values()) {
      writer.registerSchema(schema);
    }

    // チャンネルの書き込み
    for (const channel of channels.values()) {
      writer.registerChannel(channel);
    }

    onProgress(0.95);

    // メッセージの書き込み（時系列順）
    messages.sort((a, b) => Number(a.logTime - b.logTime));

    for (const message of messages) {
      writer.addMessage(message);
    }

    // ファイナライズ
    writer.end();
    onProgress(1.0);

    // TempBufferから結果を取得
    const result = buffer.get();
    return result.buffer instanceof ArrayBuffer
      ? result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength)
      : new ArrayBuffer(result.byteLength);
  }

  /**
   * ファイルの基本情報を取得（将来の分析機能用）
   *
   * @param _file 分析対象のファイル（現在未使用）
   * @returns ファイルの基本情報
   */
  async analyzeFile(_file: File): Promise<{
    messageCount: number;
    topicCount: number;
    timeRange?: { start: bigint; end: bigint };
  }> {
    // 簡易分析実装（将来拡張予定）
    return {
      messageCount: 0,
      topicCount: 0,
    };
  }
}
