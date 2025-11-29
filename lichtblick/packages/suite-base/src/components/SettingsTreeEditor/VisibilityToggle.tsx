// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview SettingsTreeEditor用の表示切り替えトグルコンポーネント
 *
 * 設定ツリーのノードやフィールドの表示/非表示を切り替えるための
 * カスタムチェックボックスコンポーネントです。
 *
 * 主な機能：
 * - 目のアイコンによる直感的な表示状態の表現
 * - チェック状態：目が開いている（表示）
 * - 未チェック状態：目が閉じている（非表示）
 * - ホバー効果とサイズ調整
 * - アクセシビリティ対応（適切なタイトル属性）
 * - フォーカス管理（変更後の自動ブラー）
 *
 * 使用例：
 * ```tsx
 * <VisibilityToggle
 *   size="small"
 *   checked={isVisible}
 *   onChange={(event, checked) => setIsVisible(checked)}
 *   disabled={!canToggle}
 * />
 * ```
 */

import { Checkbox, CheckboxProps, SvgIcon, IconButtonProps } from "@mui/material";
import { makeStyles } from "tss-react/mui";

/**
 * VisibilityToggleのスタイル定義
 *
 * Material-UIテーマに基づいたスタイルを提供します。
 */
const useStyles = makeStyles()((theme) => ({
  /** 基本のチェックボックススタイル */
  checkbox: {
    borderRadius: theme.shape.borderRadius, // テーマの角丸設定を適用
    padding: theme.spacing(1), // 標準パディング

    "&:hover": {
      backgroundColor: theme.palette.action.hover, // ホバー時の背景色
    },
  },
  /** 小サイズ用のスタイル */
  checkboxSizeSmall: {
    padding: theme.spacing(0.625), // 小サイズ用の縮小パディング
  },
}));

/**
 * 表示切り替えトグルコンポーネント
 *
 * 目のアイコンを使用した直感的な表示/非表示切り替えチェックボックスです。
 * 標準のCheckboxコンポーネントをベースに、カスタムアイコンとスタイルを適用しています。
 *
 * @param props - CheckboxPropsと追加のsizeプロパティ
 * @returns 表示切り替えトグルコンポーネント
 */
export function VisibilityToggle(
  props: CheckboxProps & { size: IconButtonProps["size"] },
): React.JSX.Element {
  const { className, onChange, ...rest } = props;
  const { classes, cx } = useStyles();

  /**
   * チェック状態変更時のハンドラー
   *
   * 変更イベントを親コンポーネントに伝播し、
   * その後フォーカスを外してキーボードナビゲーションを改善します。
   *
   * @param event - チェンジイベント
   * @param checked - 新しいチェック状態
   */
  const handleChange: CheckboxProps["onChange"] = (event, checked) => {
    onChange?.(event, checked);
    event.currentTarget.blur(); // フォーカスを外す
  };

  return (
    <Checkbox
      className={cx(className, classes.checkbox, {
        [classes.checkboxSizeSmall]: props.size === "small", // 小サイズ時のスタイル適用
      })}
      onChange={handleChange}
      {...rest}
      title="Toggle visibility" // アクセシビリティ用のタイトル
      icon={
        // 未チェック状態：目が閉じている（非表示）
        <SvgIcon fontSize="small" viewBox="0 0 16 16" color="disabled">
          <path
            fill="currentColor"
            d="M13.508 7.801c.556-.527 1.036-1.134 1.422-1.801h-1.185C12.48 7.814 10.378 9 8 9 5.622 9 3.52 7.814 2.254 6H1.07c.386.667.866 1.274 1.421 1.801L.896 9.396l.708.707L3.26 8.446c.71.523 1.511.932 2.374 1.199l-.617 2.221.964.268.626-2.255C7.06 9.96 7.525 10 8 10c.475 0 .94-.041 1.392-.12l.626 2.254.964-.268-.617-2.221c.863-.267 1.663-.676 2.374-1.2l1.657 1.658.708-.707-1.595-1.595z"
            fillRule="nonzero"
          />
        </SvgIcon>
      }
      checkedIcon={
        // チェック状態：目が開いている（表示）
        <SvgIcon fontSize="small" viewBox="0 0 16 16">
          <g fill="currentColor">
            {/* 瞳孔部分 */}
            <path
              d="M8 10c1.105 0 2-.895 2-2 0-1.105-.895-2-2-2-1.104 0-2 .895-2 2 0 1.105.896 2 2 2z"
              fillRule="nonzero"
            />
            {/* 目の輪郭部分 */}
            <path
              d="M8 4c2.878 0 5.378 1.621 6.635 4-1.257 2.379-3.757 4-6.635 4-2.878 0-5.377-1.621-6.635-4C2.623 5.621 5.122 4 8 4zm0 7c-2.3 0-4.322-1.194-5.478-3C3.678 6.194 5.7 5 8 5c2.3 0 4.322 1.194 5.479 3C12.322 9.806 10.3 11 8 11z"
              fillRule="evenodd"
            />
          </g>
        </SvgIcon>
      }
    />
  );
}
