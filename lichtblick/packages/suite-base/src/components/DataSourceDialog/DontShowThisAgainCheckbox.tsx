// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { Checkbox, FormControlLabel } from "@mui/material";
import { useTranslation } from "react-i18next";

import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks";

/**
 * 「今後表示しない」チェックボックスコンポーネント
 *
 * このコンポーネントは、DataSourceDialogの下部に表示される設定チェックボックスです。
 * ユーザーがアプリケーション起動時にデータソースダイアログを表示するかどうかを
 * 制御する機能を提供します。
 *
 * ## 主な機能
 *
 * ### アプリケーション設定連動
 * - `AppSetting.SHOW_OPEN_DIALOG_ON_STARTUP` 設定との双方向バインディング
 * - 設定値の永続化（アプリケーション再起動後も保持）
 * - リアルタイムでの設定変更反映
 *
 * ### ユーザー体験の向上
 * - 経験豊富なユーザーの作業効率向上
 * - 繰り返し作業での煩雑さの軽減
 * - 設定の可逆性（いつでも元に戻せる）
 *
 * ### 国際化対応
 * - 多言語対応でのラベル表示
 * - 地域に応じた適切な表現
 *
 * ## 動作仕様
 *
 * ### 設定値の論理
 * - **アプリ設定**: `SHOW_OPEN_DIALOG_ON_STARTUP` (boolean)
 *   - `true`: 起動時にダイアログを表示（デフォルト）
 *   - `false`: 起動時にダイアログを表示しない
 *
 * - **チェックボックス表示**: 設定値の逆転
 *   - チェック済み: 「今後表示しない」= `SHOW_OPEN_DIALOG_ON_STARTUP: false`
 *   - 未チェック: 「今後も表示する」= `SHOW_OPEN_DIALOG_ON_STARTUP: true`
 *
 * ### 状態変更フロー
 * 1. **ユーザーアクション**: チェックボックスをクリック
 * 2. **イベント発火**: `handleChange` 関数が呼び出される
 * 3. **設定更新**: `setChecked` で設定値を更新
 * 4. **永続化**: 設定がアプリケーション設定に保存
 * 5. **UI更新**: チェックボックスの表示状態が更新
 *
 * ## 使用シナリオ
 *
 * ### 初回ユーザー
 * - ダイアログで各種データソースを学習
 * - 設定は変更せずデフォルト状態を維持
 * - 次回起動時も同じ学習体験を継続
 *
 * ### 経験豊富なユーザー
 * - 作業フローが確立済み
 * - 「今後表示しない」をチェック
 * - 起動時に直接作業を開始可能
 *
 * ### 設定変更が必要な場合
 * - アプリケーション設定から再度有効化可能
 * - 新機能の学習時に一時的に有効化
 * - チーム内での設定統一
 *
 * ## レイアウトとスタイル
 *
 * ### 配置
 * - ダイアログ下部の右寄せ配置
 * - 他のコンテンツとの適切な間隔
 * - 視覚的に目立ちすぎない控えめなデザイン
 *
 * ### フォントサイズ
 * - 0.7rem の小さなフォントサイズ
 * - メインコンテンツの邪魔にならない
 * - 読みやすさを保った最小サイズ
 *
 * ## アクセシビリティ
 *
 * ### キーボード操作
 * - Tab キーでのフォーカス移動対応
 * - Space キーでのチェック状態切り替え
 * - フォーカスインジケーターの表示
 *
 * ### スクリーンリーダー
 * - FormControlLabel による適切なラベル関連付け
 * - チェック状態の音声読み上げ
 * - 設定変更の通知
 *
 * ## 技術的詳細
 *
 * ### 設定管理
 * - `useAppConfigurationValue` フックによる設定値の管理
 * - 非同期での設定更新処理
 * - エラーハンドリングと設定の整合性保証
 *
 * ### パフォーマンス
 * - 軽量なコンポーネント設計
 * - 不要な再レンダリングの回避
 * - 設定変更時のみの更新処理
 *
 * @returns 「今後表示しない」チェックボックスのReactコンポーネント
 *
 * @example
 * ```tsx
 * // DataSourceDialogの下部で使用
 * <Stack fullHeight direction="column" justifyContent="space-between">
 *   <Stack>
 *     メインコンテンツ
 *   </Stack>
 *   <DontShowThisAgainCheckbox />
 * </Stack>
 * ```
 *
 * @example
 * ```tsx
 * // 設定値の確認方法
 * const [showDialog] = useAppConfigurationValue<boolean>(
 *   AppSetting.SHOW_OPEN_DIALOG_ON_STARTUP
 * );
 *
 * if (showDialog) {
 *   // ダイアログを表示
 * } else {
 *   // ダイアログをスキップ
 * }
 * ```
 */
const DontShowThisAgainCheckbox = (): React.JSX.Element => {
  const { t } = useTranslation("openDialog");

  /**
   * アプリケーション設定値の取得と更新
   *
   * `SHOW_OPEN_DIALOG_ON_STARTUP` 設定との双方向バインディングを提供します。
   *
   * ## 設定値の意味
   * - `true` (デフォルト): 起動時にダイアログを表示
   * - `false`: 起動時にダイアログを表示しない
   *
   * ## デフォルト値の設定
   * 設定が未初期化の場合、`true` がデフォルト値として使用されます。
   * これにより、初回ユーザーは必ずダイアログを確認できます。
   */
  const [checked = true, setChecked] = useAppConfigurationValue<boolean>(
    AppSetting.SHOW_OPEN_DIALOG_ON_STARTUP,
  );

  /**
   * チェックボックス状態変更ハンドラー
   *
   * ユーザーがチェックボックスをクリックした際の処理を行います。
   *
   * ## 処理内容
   * 1. **状態反転**: チェックボックスの状態を反転
   * 2. **設定更新**: アプリケーション設定を非同期で更新
   * 3. **永続化**: 設定変更をストレージに保存
   *
   * ## 論理の反転
   * - チェック済み → 「今後表示しない」→ `SHOW_OPEN_DIALOG_ON_STARTUP: false`
   * - 未チェック → 「今後も表示する」→ `SHOW_OPEN_DIALOG_ON_STARTUP: true`
   *
   * @param event - チェックボックス変更イベント
   */
  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await setChecked(!event.target.checked);
  };

  /**
   * チェックボックスラベルのカスタマイズ
   *
   * 小さなフォントサイズでの控えめな表示を実現します。
   * 国際化対応のテキストを使用し、視覚的に主要コンテンツの
   * 邪魔にならないよう配慮されています。
   */
  const LabelComponent = <span style={{ fontSize: "0.7rem" }}>{t("dontShowThisAgain")}</span>;

  return (
    <Stack direction="row" justifyContent="right">
      <FormControlLabel
        label={LabelComponent}
        control={<Checkbox size="small" checked={!checked} onChange={handleChange} />}
      />
    </Stack>
  );
};

export default DontShowThisAgainCheckbox;
