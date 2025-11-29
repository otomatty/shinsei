// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PanelExtensionContext, RegisterMessageConverterArgs } from "@lichtblick/suite";
import { IteratorResult } from "@lichtblick/suite-base/players/IterablePlayer/IIterableSource";
import { Topic } from "@lichtblick/suite-base/players/types";

/**
 * Studioのアセットマネージャーから読み込まれたアセット
 *
 * @description パネル拡張機能がファイルやリソースを取得するための統一されたインターフェース。
 * URIを通じて様々なソースからアセットを取得できます。
 *
 * ### サポートされるURIスキーム
 * - `package://`: パッケージ内のリソースへのアクセス
 * - `http://` / `https://`: ウェブリソースへのアクセス
 * - `file://`: ローカルファイルへのアクセス（制限あり）
 * - その他のカスタムスキーム（データソース依存）
 *
 * ### 使用上の注意
 * - `data`フィールドは常にバイナリデータとして提供されます
 * - テキストコンテンツの場合、適切なエンコーディングでデコードしてください
 * - `mediaType`がない場合、ファイル拡張子から推測する必要があります
 * - 大きなファイルの場合、メモリ使用量に注意してください
 *
 * @example
 * ```typescript
 * // JSONファイルの読み込み
 * const asset: Asset = {
 *   uri: "package://my-package/config.json",
 *   data: new Uint8Array([...]),
 *   mediaType: "application/json"
 * };
 *
 * // テキストとしてデコード
 * const text = new TextDecoder().decode(asset.data);
 * const config = JSON.parse(text);
 *
 * // 画像ファイルの読み込み
 * const imageAsset: Asset = {
 *   uri: "https://example.com/image.png",
 *   data: new Uint8Array([...]),
 *   mediaType: "image/png"
 * };
 * ```
 */
export type Asset = {
  /**
   * アセットURI
   *
   * @description アセットを取得したURIと対応。package://やhttp://などの
   * 様々なスキームをサポートします。
   *
   * @example
   * - `"package://my-package/data/model.urdf"`
   * - `"https://example.com/assets/texture.jpg"`
   * - `"file:///path/to/local/file.txt"`
   */
  uri: string;

  /**
   * バイナリアセットデータ
   *
   * @description アセットの生のバイナリデータ。テキストファイルの場合は
   * TextDecoderを使用してデコードする必要があります。
   *
   * @example
   * ```typescript
   * // テキストファイルの場合
   * const text = new TextDecoder('utf-8').decode(asset.data);
   *
   * // バイナリファイルの場合
   * const arrayBuffer = asset.data.buffer;
   * ```
   */
  data: Uint8Array;

  /**
   * アセットのMIMEタイプ
   *
   * @description ファイルの種類を示すMIMEタイプ（application/json、image/pngなど）。
   * 省略可能ですが、アセットの適切な処理のために推奨されます。
   *
   * @example
   * - `"application/json"` - JSONファイル
   * - `"image/png"` - PNG画像
   * - `"text/plain"` - テキストファイル
   * - `"application/octet-stream"` - バイナリファイル
   */
  mediaType?: string;
};

/**
 * ドラッグされたメッセージパス
 *
 * @description ユーザーがパネルにドラッグ＆ドロップしたトピックやメッセージフィールドの情報。
 * パネルがドラッグされたデータを適切に処理するための詳細な情報を提供します。
 *
 * ### メッセージパスの構造
 * - トピック名: `/robot/odom`
 * - フィールドパス: `.pose.position.x`
 * - 完全パス: `/robot/odom.pose.position.x`
 *
 * ### 使用シナリオ
 * - チャートパネルへのデータ系列の追加
 * - 3Dビューアーへのマーカーデータの追加
 * - テーブルビューへのフィールドの追加
 * - カスタムパネルでのデータ選択
 *
 * @example
 * ```typescript
 * // トピック全体がドラッグされた場合
 * const topicDrag: DraggedMessagePath = {
 *   path: "/robot/odom",
 *   rootSchemaName: "nav_msgs/Odometry",
 *   isTopic: true,
 *   isLeaf: false,
 *   topicName: "/robot/odom"
 * };
 *
 * // 特定のフィールドがドラッグされた場合
 * const fieldDrag: DraggedMessagePath = {
 *   path: "/robot/odom.pose.position.x",
 *   rootSchemaName: "nav_msgs/Odometry",
 *   isTopic: false,
 *   isLeaf: true,
 *   topicName: "/robot/odom"
 * };
 * ```
 */
export type DraggedMessagePath = {
  /**
   * 完全なメッセージパス
   *
   * @description トピック名とメッセージ内のフィールドパスを含む完全なパス。
   * トピックのみの場合はトピック名のみ、フィールドの場合はドット記法を使用。
   *
   * @example
   * - `"/robot/odom"` - トピック全体
   * - `"/robot/odom.pose.position"` - 位置情報
   * - `"/robot/odom.pose.position.x"` - X座標のみ
   */
  path: string;

  /**
   * ドラッグされたトップレベルトピックのスキーマ名
   *
   * @description メッセージタイプを識別するためのスキーマ名。
   * ROS/ROSBagファイルで使用されるメッセージタイプ名と対応します。
   *
   * @example
   * - `"sensor_msgs/PointCloud2"` - ポイントクラウドデータ
   * - `"geometry_msgs/PoseStamped"` - 位置・姿勢情報
   * - `"nav_msgs/Odometry"` - オドメトリ情報
   */
  rootSchemaName: string | undefined;

  /**
   * パスが完全なトピックを表すかどうか
   *
   * @description trueの場合、パスにはメッセージパスコンポーネントが含まれず、
   * トピック全体を表します。falseの場合、特定のフィールドを表します。
   *
   * @example
   * ```typescript
   * // トピック全体の場合
   * isTopic: true  // path: "/robot/odom"
   *
   * // 特定フィールドの場合
   * isTopic: false // path: "/robot/odom.pose.position.x"
   * ```
   */
  isTopic: boolean;

  /**
   * パスがメッセージ内のプリミティブ値を表すかどうか
   *
   * @description trueの場合、パスは最終的なデータ値（数値、文字列、ブール値など）を指します。
   * falseの場合、パスは複合オブジェクトを指します。
   *
   * @example
   * ```typescript
   * // プリミティブ値の場合
   * isLeaf: true  // path: "/robot/odom.pose.position.x" (数値)
   *
   * // 複合オブジェクトの場合
   * isLeaf: false // path: "/robot/odom.pose.position" (座標オブジェクト)
   * ```
   */
  isLeaf: boolean;

  /**
   * ドラッグされたトップレベルトピックの名前
   *
   * @description メッセージが属するトピック名。フィールドパスの場合も、
   * 元のトピック名を保持します。
   *
   * @example
   * ```typescript
   * // どちらの場合も同じトピック名
   * topicName: "/robot/odom"
   * ```
   */
  topicName: string;
};

/**
 * メッセージパスドロップステータス
 *
 * @description パネルがドラッグされたメッセージパスを受け入れるかどうか、
 * および受け入れる場合の操作タイプを示す情報。
 * ドラッグ＆ドロップのUI フィードバックに使用されます。
 *
 * ### UI への影響
 * - `canDrop: true` の場合、マウスカーソルがドロップ可能状態に変化
 * - `effect` に基づいてカーソルの種類が決定される
 * - `message` はツールチップとして表示される場合がある
 *
 * ### 操作タイプ
 * - `"add"`: 新しいデータを追加する（緑色のプラスアイコンなど）
 * - `"replace"`: 既存のデータを置き換える（矢印アイコンなど）
 *
 * @example
 * ```typescript
 * // 新しいデータを追加する場合
 * const addStatus: MessagePathDropStatus = {
 *   canDrop: true,
 *   effect: "add",
 *   message: "Add field to visualization"
 * };
 *
 * // 既存のデータを置き換える場合
 * const replaceStatus: MessagePathDropStatus = {
 *   canDrop: true,
 *   effect: "replace",
 *   message: "Replace current data source"
 * };
 *
 * // ドロップを受け入れない場合
 * const rejectStatus: MessagePathDropStatus = {
 *   canDrop: false,
 *   message: "This panel does not support this data type"
 * };
 * ```
 */
export type MessagePathDropStatus = {
  /**
   * パネルがドラッグされたメッセージパスを受け入れるかどうか
   *
   * @description trueの場合、パネルはこのパスを処理可能で、
   * ドロップ操作が実行されます。falseの場合、ドロップは無視されます。
   */
  canDrop: boolean;

  /**
   * パスがドロップされた場合に発生する操作タイプ
   *
   * @description マウスカーソルの変更に使用されます。
   * - `"replace"`: 既存のデータを置き換える
   * - `"add"`: 新しいデータを追加する
   *
   * @example
   * ```typescript
   * // 新しいプロットラインを追加
   * effect: "add"
   *
   * // 現在のデータソースを置き換え
   * effect: "replace"
   * ```
   */
  effect?: "replace" | "add";

  /**
   * ユーザーに表示するメッセージ
   *
   * @description パスがドロップされた場合に何が起こるかを示すメッセージ。
   * ツールチップやステータスバーに表示される場合があります。
   *
   * @example
   * - `"Add field to chart"` - チャートに新しい系列を追加
   * - `"Replace current selection"` - 現在の選択を置き換え
   * - `"Cannot drop: unsupported data type"` - サポートされていないデータ型
   */
  message?: string;
};

/**
 * メッセージパスドロップ設定
 *
 * @description パネルがドラッグ＆ドロップ操作を処理するための設定。
 * パネルはこの設定を使用して、ドラッグされたメッセージパスを
 * 適切に処理できるようになります。
 *
 * ### 実装パターン
 * 1. **条件付き受け入れ**: データ型や数量に基づいてドロップを制御
 * 2. **複数パス対応**: 複数のパスを同時にドロップ
 * 3. **バリデーション**: パスの有効性をチェック
 * 4. **フィードバック**: ユーザーに分かりやすいメッセージを提供
 *
 * ### パフォーマンス考慮事項
 * - `getDropStatus` は頻繁に呼び出されるため、軽量にする
 * - 複雑な検証は `handleDrop` で行う
 * - 状態の変更は `handleDrop` でのみ行う
 *
 * @example
 * ```typescript
 * // 基本的な実装
 * const dropConfig: MessagePathDropConfig = {
 *   getDropStatus: (paths) => {
 *     // 単一のリーフノードのみ受け入れ
 *     if (paths.length === 1 && paths[0].isLeaf) {
 *       return {
 *         canDrop: true,
 *         effect: "add",
 *         message: "Add field to chart"
 *       };
 *     }
 *     return { canDrop: false };
 *   },
 *   handleDrop: (paths) => {
 *     const path = paths[0];
 *     addPlotLine(path.path);
 *   }
 * };
 *
 * // 複雑な実装例
 * const advancedDropConfig: MessagePathDropConfig = {
 *   getDropStatus: (paths) => {
 *     if (paths.length === 0) return { canDrop: false };
 *
 *     // 数値型のフィールドのみ受け入れ
 *     const allNumeric = paths.every(path =>
 *       path.isLeaf && isNumericField(path.path)
 *     );
 *
 *     if (allNumeric) {
 *       return {
 *         canDrop: true,
 *         effect: paths.length === 1 ? "add" : "replace",
 *         message: `Add ${paths.length} numeric field(s)`
 *       };
 *     }
 *
 *     return {
 *       canDrop: false,
 *       message: "Only numeric fields are supported"
 *     };
 *   },
 *   handleDrop: (paths) => {
 *     const numericPaths = paths.filter(path =>
 *       path.isLeaf && isNumericField(path.path)
 *     );
 *     setPlotData(numericPaths.map(path => path.path));
 *   }
 * };
 * ```
 */
export type MessagePathDropConfig = {
  /**
   * ユーザーがメッセージパスをパネル上にドラッグした時に呼び出される
   *
   * @description この関数は、パネルがドラッグされたパスを受け入れるかどうかを
   * 判断し、適切なUI フィードバックを提供します。
   *
   * ### 呼び出しタイミング
   * - ユーザーがパネル上でドラッグを開始した時
   * - ドラッグ中にマウスが移動した時
   * - ドラッグされたアイテムが変更された時
   *
   * ### パフォーマンス注意点
   * - この関数は頻繁に呼び出されるため、軽量である必要があります
   * - 重い計算や状態の変更は避けてください
   * - 結果をキャッシュすることを検討してください
   *
   * @param paths - ドラッグされたメッセージパスの配列
   * @returns パネルがパスを受け入れるかどうかの情報
   *
   * @example
   * ```typescript
   * getDropStatus: (paths) => {
   *   // 単一パスのみ受け入れ
   *   if (paths.length !== 1) {
   *     return { canDrop: false, message: "Only single path is supported" };
   *   }
   *
   *   const path = paths[0];
   *
   *   // 数値フィールドのみ受け入れ
   *   if (!path.isLeaf || !isNumericPath(path.path)) {
   *     return { canDrop: false, message: "Only numeric fields are supported" };
   *   }
   *
   *   return {
   *     canDrop: true,
   *     effect: "add",
   *     message: `Add ${path.path} to chart`
   *   };
   * }
   * ```
   */
  getDropStatus: (paths: readonly DraggedMessagePath[]) => MessagePathDropStatus;

  /**
   * ユーザーがメッセージパスをパネル上にドロップした時に呼び出される
   *
   * @description この関数は、実際のドロップ処理を実行します。
   * パネルの状態を更新し、設定を保存する必要があります。
   *
   * ### 実行タイミング
   * - ユーザーがマウスボタンを離した時
   * - `getDropStatus` が `canDrop: true` を返している場合のみ呼び出される
   *
   * ### 実装時の注意点
   * - パネルの状態を適切に更新してください
   * - 設定の保存を忘れないでください
   * - エラーハンドリングを適切に行ってください
   * - ユーザーフィードバックを提供してください
   *
   * @param paths - ドロップされたメッセージパスの配列
   *
   * @example
   * ```typescript
   * handleDrop: (paths) => {
   *   try {
   *     // 新しいデータソースを追加
   *     const newDataSources = paths.map(path => ({
   *       path: path.path,
   *       label: path.path.split('.').pop() || path.path,
   *       color: getNextColor()
   *     }));
   *
   *     // パネル状態を更新
   *     setDataSources(prev => [...prev, ...newDataSources]);
   *
   *     // 設定を保存
   *     saveConfig({
   *       dataSources: [...dataSources, ...newDataSources]
   *     });
   *
   *     // 成功メッセージを表示
   *     showSuccessMessage(`Added ${paths.length} data source(s)`);
   *   } catch (error) {
   *     // エラーハンドリング
   *     showErrorMessage("Failed to add data source");
   *     console.error("Drop handling error:", error);
   *   }
   * }
   * ```
   */
  handleDrop: (paths: readonly DraggedMessagePath[]) => void;
};

/**
 * 組み込みパネル拡張機能のコンテキスト
 *
 * @description PanelExtensionContextに追加の組み込み専用機能を追加します。
 * これらは開発中の不安定な内部インターフェースであり、
 * まだサードパーティ拡張機能では利用できません。
 *
 * ### 重要な注意点
 * - `unstable_` プレフィックスが付いた機能は実験的です
 * - 将来のバージョンで予告なく変更される可能性があります
 * - 本番環境での使用は推奨されません
 * - サードパーティ拡張機能では利用できません
 *
 * ### 設計原則
 * - 後方互換性よりも機能性を優先
 * - 頻繁に変更される可能性がある実験的機能
 * - 安定化後は正式なAPIに昇格される予定
 *
 * ### 使用ガイドライン
 * - 組み込みパネルでのみ使用
 * - 実験的機能であることを常に意識
 * - 頻繁なAPIの変更に対応できる体制を整える
 *
 * @example
 * ```typescript
 * // 組み込みパネルでの使用例
 * function initPanel(context: BuiltinPanelExtensionContext) {
 *   // アセットの取得
 *   const loadAsset = async (uri: string) => {
 *     try {
 *       const asset = await context.unstable_fetchAsset(uri);
 *       return new TextDecoder().decode(asset.data);
 *     } catch (error) {
 *       console.error("Failed to load asset:", error);
 *       return null;
 *     }
 *   };
 *
 *   // ドラッグ＆ドロップサポートの設定
 *   context.unstable_setMessagePathDropConfig({
 *     getDropStatus: (paths) => {
 *       if (paths.length === 1 && paths[0].isLeaf) {
 *         return { canDrop: true, effect: "add" };
 *       }
 *       return { canDrop: false };
 *     },
 *     handleDrop: (paths) => {
 *       console.log("Dropped paths:", paths);
 *       // パネル固有の処理を実装
 *     }
 *   });
 * }
 * ```
 */
export type BuiltinPanelExtensionContext = {
  /**
   * Studioのアセットマネージャーからアセットを取得
   *
   * @description アセットマネージャーはアセットの取得方法を決定します。
   * 例：http(s) URIはHTTPリクエストを使用し、
   * その他のスキームはデータソースにフォールバックする可能性があります。
   *
   * ### サポートされるURI形式
   * - `package://package-name/path/to/file` - パッケージ内リソース
   * - `https://example.com/file.json` - ウェブリソース
   * - `file:///path/to/file` - ローカルファイル（制限あり）
   *
   * ### エラーハンドリング
   * - ネットワークエラー、ファイルが見つからない、アクセス権限エラーなどで例外が発生
   * - AbortSignalを使用してリクエストを中止可能
   * - 大きなファイルはメモリ不足の原因となる可能性
   *
   * ### パフォーマンス考慮事項
   * - 結果はキャッシュされる場合があります
   * - 大きなファイルは分割読み込みを検討してください
   * - 同時リクエスト数の制限に注意してください
   *
   * @param uri - アセットを識別するURI
   * @param options - 追加オプション
   * @param options.signal - アセット取得を中止するためのオプションのAbortSignal
   * @param options.referenceUrl - package:// URIを解決するために使用される可能性のあるオプションのURL
   * @returns アセットのPromise
   *
   * @throws {Error} URIが無効な場合
   * @throws {Error} アセットが見つからない場合
   * @throws {Error} ネットワークエラーが発生した場合
   * @throws {Error} アクセス権限がない場合
   * @throws {DOMException} AbortSignalによってリクエストが中止された場合
   *
   * @example
   * ```typescript
   * // 基本的な使用法
   * const asset = await context.unstable_fetchAsset("package://my-package/config.json");
   * const config = JSON.parse(new TextDecoder().decode(asset.data));
   *
   * // AbortSignalを使用した中止可能な取得
   * const controller = new AbortController();
   * setTimeout(() => controller.abort(), 5000); // 5秒でタイムアウト
   *
   * try {
   *   const asset = await context.unstable_fetchAsset(
   *     "https://example.com/large-file.bin",
   *     { signal: controller.signal }
   *   );
   *   console.log("Asset loaded:", asset.uri);
   * } catch (error) {
   *   if (error.name === "AbortError") {
   *     console.log("Request was aborted");
   *   } else {
   *     console.error("Failed to load asset:", error);
   *   }
   * }
   *
   * // 複数のアセットを並行して取得
   * const assetPromises = [
   *   context.unstable_fetchAsset("package://my-package/model.urdf"),
   *   context.unstable_fetchAsset("package://my-package/texture.png"),
   *   context.unstable_fetchAsset("package://my-package/config.json")
   * ];
   *
   * const assets = await Promise.all(assetPromises);
   * ```
   */
  unstable_fetchAsset: (
    uri: string,
    options?: { signal?: AbortSignal; referenceUrl?: string },
  ) => Promise<Asset>;

  /**
   * メッセージパスドラッグ＆ドロップサポートの設定を更新
   *
   * @description `undefined`の値は、パネルがドラッグされたメッセージパスを
   * 受け入れないことを示します。
   *
   * ### 設定の更新
   * - この関数を呼び出すと、前の設定は完全に置き換えられます
   * - `undefined`を渡すとドラッグ＆ドロップサポートが無効になります
   * - 設定は即座に有効になります
   *
   * ### ライフサイクル
   * - パネルの初期化時に設定することが推奨されます
   * - 動的に設定を変更することも可能です
   * - パネルの破棄時に自動的にクリーンアップされます
   *
   * ### パフォーマンス
   * - 設定の変更は軽量な操作です
   * - ドラッグ操作中の設定変更は避けてください
   * - 頻繁な設定変更は避けてください
   *
   * @param config - ドラッグ＆ドロップ設定、またはundefinedで無効化
   *
   * @example
   * ```typescript
   * // ドラッグ＆ドロップサポートを有効化
   * context.unstable_setMessagePathDropConfig({
   *   getDropStatus: (paths) => {
   *     if (paths.length === 1 && paths[0].isLeaf) {
   *       return { canDrop: true, effect: "add", message: "Add to chart" };
   *     }
   *     return { canDrop: false };
   *   },
   *   handleDrop: (paths) => {
   *     // ドロップされたパスを処理
   *     addPathToChart(paths[0]);
   *   }
   * });
   *
   * // ドラッグ＆ドロップサポートを無効化
   * context.unstable_setMessagePathDropConfig(undefined);
   *
   * // 動的な設定変更
   * if (chartIsFull) {
   *   context.unstable_setMessagePathDropConfig({
   *     getDropStatus: (paths) => ({
   *       canDrop: false,
   *       message: "Chart is full. Remove some data first."
   *     }),
   *     handleDrop: () => {}
   *   });
   * } else {
   *   context.unstable_setMessagePathDropConfig({
   *     getDropStatus: (paths) => ({
   *       canDrop: true,
   *       effect: "add",
   *       message: `Add ${paths.length} field(s) to chart`
   *     }),
   *     handleDrop: (paths) => {
   *       paths.forEach(path => addPathToChart(path));
   *     }
   *   });
   * }
   * ```
   */
  unstable_setMessagePathDropConfig: (config: MessagePathDropConfig | undefined) => void;
} & PanelExtensionContext;

type MessageConverter = RegisterMessageConverterArgs<unknown>;

export type CreateMessageRangeIteratorParams = {
  topic: string;
  convertTo?: string;
  rawBatchIterator: AsyncIterableIterator<Readonly<IteratorResult>>;
  sortedTopics: readonly Topic[];
  messageConverters: readonly MessageConverter[];
};
