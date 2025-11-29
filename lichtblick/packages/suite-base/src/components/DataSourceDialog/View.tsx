// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * View: DataSourceDialog共通ビューラッパーコンポーネント
 *
 * DataSourceDialogの各ビュー（Connection、設定画面等）で使用される
 * 共通のレイアウトとナビゲーション機能を提供するラッパーコンポーネントです。
 *
 * ## 主な機能
 *
 * ### レイアウト構造
 * - **コンテンツ領域**: 子コンポーネントを表示するメイン領域
 * - **ナビゲーションバー**: 戻る・キャンセル・開くボタンを配置
 * - **レスポンシブ対応**: 画面サイズに応じた適切な配置
 *
 * ### ナビゲーション機能
 * - **戻るボタン**: スタート画面への遷移
 * - **キャンセルボタン**: ダイアログを閉じる
 * - **開くボタン**: 選択されたデータソースを開く（条件付き有効化）
 *
 * ### 使用場面
 * - Connection画面での接続設定
 * - 将来的な設定画面やウィザード形式のUI
 * - 複数ステップを持つデータソース選択フロー
 *
 * @example
 * ```tsx
 * // 基本的な使用例
 * <View onOpen={handleOpen}>
 *   <ConnectionForm />
 * </View>
 *
 * // 開くボタンを無効化
 * <View>
 *   <ReadOnlyContent />
 * </View>
 * ```
 */

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { Button } from "@mui/material";
import { PropsWithChildren } from "react";
import { makeStyles } from "tss-react/mui";

import Stack from "@lichtblick/suite-base/components/Stack";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";

/**
 * Viewコンポーネントのプロパティ型
 */
type ViewProps = {
  /**
   * 開くボタンのクリックハンドラー
   *
   * 定義されている場合、開くボタンが有効になります。
   * 未定義の場合、開くボタンは無効化されます。
   *
   * @example
   * ```tsx
   * const handleOpen = () => {
   *   // データソース接続処理
   *   connectToDataSource(selectedSource);
   * };
   *
   * <View onOpen={handleOpen}>
   *   <SourceSelector />
   * </View>
   * ```
   */
  onOpen?: () => void;
};

/**
 * View固有のスタイル定義
 */
const useStyles = makeStyles()((theme) => ({
  /**
   * メインコンテンツ領域のスタイル
   *
   * フレックスレイアウトを使用して、子コンポーネントを
   * 垂直方向に配置し、利用可能な高さを最大限活用します。
   */
  content: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1, // 利用可能な空間を最大限使用
    height: "100%", // 親要素の高さを継承
    justifyContent: "space-between", // 上下に要素を分散配置
    gap: theme.spacing(2), // 要素間の適切な間隔
    overflowY: "auto", // 縦スクロールを許可
  },
}));

/**
 * View コンポーネント
 *
 * DataSourceDialogの各ビューで共通して使用されるレイアウトと
 * ナビゲーション機能を提供します。子コンポーネントをメイン
 * コンテンツ領域に表示し、下部にナビゲーションボタンを配置します。
 *
 * ## レイアウト構造
 *
 * ```
 * ┌─────────────────────────────────┐
 * │ コンテンツ領域                    │
 * │ (子コンポーネント)                │
 * │                               │
 * │                               │
 * ├─────────────────────────────────┤
 * │ [戻る]              [キャンセル] [開く] │
 * └─────────────────────────────────┘
 * ```
 *
 * ## ボタンの動作
 *
 * - **戻るボタン**: 常に表示され、スタート画面に遷移
 * - **キャンセルボタン**: 常に表示され、ダイアログを閉じる
 * - **開くボタン**: onOpenが定義されている場合のみ有効
 *
 * @param props - コンポーネントプロパティ（children含む）
 * @returns レンダリングされたビューコンポーネント
 */
export default function View(props: PropsWithChildren<ViewProps>): React.JSX.Element {
  const { onOpen } = props;
  const { classes } = useStyles();
  const { dialogActions } = useWorkspaceActions();

  return (
    <>
      {/* メインコンテンツ領域 */}
      <div className={classes.content}>{props.children}</div>

      {/* ナビゲーションバー */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        paddingX={4}
        paddingBottom={4}
        paddingTop={2}
      >
        {/* 戻るボタン - スタート画面への遷移 */}
        <Button
          startIcon={<ChevronLeftIcon fontSize="large" />}
          onClick={() => {
            dialogActions.dataSource.open("start");
          }}
        >
          Back
        </Button>

        {/* 右側のアクションボタン群 */}
        <Stack direction="row" gap={2}>
          {/* キャンセルボタン - ダイアログを閉じる */}
          <Button
            color="inherit"
            variant="outlined"
            onClick={() => {
              dialogActions.dataSource.close();
            }}
          >
            Cancel
          </Button>

          {/* 開くボタン - データソースを開く（条件付き有効化） */}
          <Button
            variant="contained"
            onClick={onOpen}
            disabled={onOpen == undefined} // onOpenが未定義の場合は無効化
          >
            Open
          </Button>
        </Stack>
      </Stack>
    </>
  );

  // 注意: 以下のreturn文は到達不能コード（デッドコード）
  // 実装上の残存コードと思われるため、削除対象
  return <>{props.children}</>;
}
