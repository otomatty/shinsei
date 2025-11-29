// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0
import { Immutable } from "immer";

import {
  SettingsTree,
  SettingsTreeAction,
  SettingsTreeField,
  SettingsTreeNode,
  SettingsTreeNodeAction,
} from "@lichtblick/suite";

/**
 * @fileoverview SettingsTreeEditor 型定義
 *
 * このファイルは、SettingsTreeEditorコンポーネントシステムで使用される
 * TypeScript型定義を提供します。
 *
 * 主な型：
 * - NodeActionsMenuProps: ノードアクションメニューのプロパティ
 * - NodeEditorProps: ノード編集コンポーネントのプロパティ
 * - FieldEditorProps: フィールド編集コンポーネントのプロパティ
 * - SelectVisibilityFilterValue: 表示フィルターの値
 *
 * 使用場面：
 * - コンポーネント間の型安全な通信
 * - プロパティの型チェック
 * - IDEでの型補完とエラー検出
 */

/**
 * ノードアクションメニューのプロパティ型
 *
 * 設定ノードに対して実行可能なアクション（削除、複製、エクスポート等）を
 * 表示するメニューコンポーネントのプロパティを定義します。
 *
 * @interface NodeActionsMenuProps
 * @property {readonly SettingsTreeNodeAction[]} actions - 表示するアクション一覧
 * @property {function} onSelectAction - アクション選択時のコールバック関数
 *
 * @example
 * ```tsx
 * const menuProps: NodeActionsMenuProps = {
 *   actions: [
 *     { type: "action", id: "delete", label: "Delete", display: "menu" },
 *     { type: "action", id: "duplicate", label: "Duplicate", display: "menu" }
 *   ],
 *   onSelectAction: (actionId: string) => {
 *     console.log(`Action selected: ${actionId}`);
 *   }
 * };
 *
 * <NodeActionsMenu {...menuProps} />
 * ```
 */
export type NodeActionsMenuProps = {
  /**
   * 表示するアクション一覧
   * 各アクションは type, id, label, display プロパティを持つ
   * display が "menu" のアクションのみがメニューに表示される
   */
  actions: readonly SettingsTreeNodeAction[];

  /**
   * アクション選択時のコールバック関数
   * @param actionId - 選択されたアクションのID
   */
  onSelectAction: (actionId: string) => void;
};

/**
 * ノード編集コンポーネントのプロパティ型
 *
 * 設定ツリーの各ノード（フォルダ/グループ）を表示・編集するための
 * NodeEditorコンポーネントのプロパティを定義します。
 *
 * @interface NodeEditorProps
 * @property {function} actionHandler - 設定変更時のアクションハンドラー
 * @property {boolean} [defaultOpen] - デフォルトの展開状態
 * @property {string} [filter] - 検索フィルター文字列
 * @property {readonly string[]} [focusedPath] - フォーカスされているパス
 * @property {readonly string[]} path - ノードのパス（階層構造）
 * @property {Immutable<SettingsTreeNode>} [settings] - ノードの設定データ
 *
 * @example
 * ```tsx
 * const nodeProps: NodeEditorProps = {
 *   actionHandler: (action) => {
 *     // 設定変更の処理
 *     console.log('Action:', action);
 *   },
 *   defaultOpen: true,
 *   filter: "camera",
 *   focusedPath: ["sensors", "camera"],
 *   path: ["sensors", "camera"],
 *   settings: {
 *     label: "Camera Settings",
 *     icon: "Camera",
 *     fields: {
 *       resolution: { input: "select", label: "Resolution" }
 *     }
 *   }
 * };
 *
 * <NodeEditor {...nodeProps} />
 * ```
 */
export type NodeEditorProps = {
  /**
   * 設定変更時のアクションハンドラー
   * ノード内のフィールド値変更、ノードアクション実行時に呼び出される
   * @param action - 実行されるアクション（update, perform-node-action等）
   */
  actionHandler: (action: SettingsTreeAction) => void;

  /**
   * デフォルトの展開状態
   * true: 初期状態で展開表示
   * false: 初期状態で折りたたみ表示
   * undefined: ノードの defaultExpansionState 設定に従う
   */
  defaultOpen?: boolean;

  /**
   * 検索フィルター文字列
   * 指定された場合、ノード名やフィールド名のハイライト表示に使用
   */
  filter?: string;

  /**
   * フォーカスされているパス
   * 指定されたパスのノードが自動的に展開され、スクロール位置が調整される
   */
  focusedPath?: readonly string[];

  /**
   * ノードのパス（階層構造）
   * 例: ["sensors", "camera", "resolution"] のような配列
   * 設定の保存時やアクション実行時のパス特定に使用
   */
  path: readonly string[];

  /**
   * ノードの設定データ（Immutable）
   * ラベル、アイコン、フィールド、子ノード等の情報を含む
   */
  settings?: Immutable<SettingsTreeNode>;
};

/**
 * 表示フィルターの値型
 *
 * ノードの表示/非表示を制御するフィルターの値を定義します。
 *
 * @type SelectVisibilityFilterValue
 * @value "all" - 全ての項目を表示
 * @value "visible" - 表示状態の項目のみを表示
 * @value "invisible" - 非表示状態の項目のみを表示
 *
 * @example
 * ```tsx
 * const [visibilityFilter, setVisibilityFilter] =
 *   useState<SelectVisibilityFilterValue>("all");
 *
 * // フィルターに基づいて項目を絞り込み
 * const filteredItems = items.filter(item => {
 *   if (visibilityFilter === "visible") return item.visible === true;
 *   if (visibilityFilter === "invisible") return item.visible === false;
 *   return true; // "all" の場合
 * });
 * ```
 */
export type SelectVisibilityFilterValue = "all" | "visible" | "invisible";

/**
 * フィールド編集コンポーネントのプロパティ型
 *
 * 設定ツリーの個別フィールド（文字列、数値、色等）を表示・編集するための
 * FieldEditorコンポーネントのプロパティを定義します。
 *
 * @interface FieldEditorProps
 * @property {function} actionHandler - 設定変更時のアクションハンドラー
 * @property {Immutable<SettingsTreeField>} field - フィールドの設定データ
 * @property {readonly string[]} path - フィールドのパス（階層構造）
 *
 * @example
 * ```tsx
 * const fieldProps: FieldEditorProps = {
 *   actionHandler: (action) => {
 *     if (action.action === "update") {
 *       // フィールド値の更新処理
 *       console.log('Field updated:', action.payload);
 *     }
 *   },
 *   field: {
 *     input: "string",
 *     label: "Camera Name",
 *     value: "Main Camera",
 *     placeholder: "Enter camera name"
 *   },
 *   path: ["sensors", "camera", "name"]
 * };
 *
 * <FieldEditor {...fieldProps} />
 * ```
 */
export type FieldEditorProps = {
  /**
   * 設定変更時のアクションハンドラー
   * フィールド値が変更された際に呼び出される
   * @param action - 実行されるアクション（主にupdate）
   */
  actionHandler: (action: SettingsTreeAction) => void;

  /**
   * フィールドの設定データ（Immutable）
   * 入力タイプ、ラベル、現在値、制約条件等の情報を含む
   *
   * 対応する入力タイプ：
   * - string: 文字列入力
   * - number: 数値入力
   * - boolean: ON/OFF切り替え
   * - select: 選択肢から選択
   * - rgb/rgba: 色選択
   * - vec2/vec3: ベクトル入力
   * - messagepath: メッセージパス入力
   * - autocomplete: 自動補完付き入力
   */
  field: Immutable<SettingsTreeField>;

  /**
   * フィールドのパス（階層構造）
   * 例: ["sensors", "camera", "resolution"] のような配列
   * 設定の保存時にパス特定に使用
   */
  path: readonly string[];
};

export type SettingsTreeEditorProps = {
  variant: "panel" | "log";
  settings: Immutable<SettingsTree>;
};
