/**
 * TauriDataSourceFactory
 *
 * Tauri環境用のデータソースファクトリー
 * MCAPファイルなどのローカルファイルを読み込むためのファクトリー
 *
 * NOTE: このファクトリーは、Lichtblickの本体統合時に
 * 実際のIterablePlayer/WorkerSerializedIterableSourceを使用します。
 * 現時点では、IDataSourceFactoryインターフェースの実装テンプレートとして機能します。
 */
import type {
  IDataSourceFactory,
  DataSourceFactoryInitializeArgs,
} from "@lichtblick/suite-base/context/PlayerSelectionContext";
import type { Player } from "@lichtblick/suite-base/players/types";
import type { RegisteredIconNames } from "@lichtblick/suite-base/types/Icons";

/**
 * Tauri環境用のMCAPローカルファイルデータソースファクトリー
 *
 * @example
 * ```typescript
 * const factory = new TauriDataSourceFactory();
 * const player = factory.initialize({
 *   metricsCollector,
 *   files: [mcapFile],
 * });
 * ```
 */
export class TauriDataSourceFactory implements IDataSourceFactory {
  public readonly id = "tauri-mcap-local-file";
  public readonly type: IDataSourceFactory["type"] = "file";
  public readonly displayName = "MCAP (Tauri)";
  public readonly iconName: RegisteredIconNames = "OpenFile";
  public readonly supportedFileTypes = [".mcap"];
  public readonly supportsMultiFile = true;
  public readonly description = "Open local MCAP files in Tauri environment";

  /** プレイヤー作成関数（外部から注入可能） */
  private playerFactory?: (
    files: File[],
    args: DataSourceFactoryInitializeArgs
  ) => Player;

  /**
   * プレイヤーファクトリーを設定
   * Lichtblick統合時にIterablePlayerを作成する関数を注入
   */
  public setPlayerFactory(
    factory: (files: File[], args: DataSourceFactoryInitializeArgs) => Player
  ): void {
    this.playerFactory = factory;
  }

  /**
   * プレイヤーを初期化する
   *
   * @param args - 初期化引数（ファイル、メトリクスコレクターなど）
   * @returns 初期化されたPlayerインスタンス、またはファイルがない場合はundefined
   */
  public initialize(args: DataSourceFactoryInitializeArgs): Player | undefined {
    const files: File[] = [];

    // 単一ファイルを追加
    if (args.file) {
      files.push(args.file);
    }

    // 複数ファイルを追加
    if (args.files) {
      files.push(...args.files);
    }

    // ファイルがない場合はundefinedを返す
    if (files.length === 0) {
      return undefined;
    }

    // プレイヤーファクトリーが設定されている場合は使用
    if (this.playerFactory) {
      return this.playerFactory(files, args);
    }

    // プレイヤーファクトリーが未設定の場合
    // 注意: 実際のLichtblick統合時にsetPlayerFactoryで設定するか、
    // TauriAppでIterablePlayerを直接使用する必要があります
    console.warn(
      "TauriDataSourceFactory: playerFactory not set. " +
        "Call setPlayerFactory() or use McapLocalDataSourceFactory directly."
    );
    return undefined;
  }
}

/**
 * Tauri環境用のデータソースファクトリー配列を作成
 *
 * @returns データソースファクトリーの配列
 *
 * @example
 * ```typescript
 * const factories = createTauriDataSourceFactories();
 * // AppのdataSourcesに渡す
 * <App dataSources={factories} />
 * ```
 */
export function createTauriDataSourceFactories(): IDataSourceFactory[] {
  return [
    new TauriDataSourceFactory(),
    // 将来的に追加のデータソース（ROS2接続、Foxglove WebSocketなど）をここに追加
  ];
}

export default TauriDataSourceFactory;
