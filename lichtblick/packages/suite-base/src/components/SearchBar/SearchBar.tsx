// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import { IconButton, TextField, InputAdornment } from "@mui/material";
import { TextFieldProps } from "@mui/material/TextField";
import { PropsWithChildren } from "react";

import { useStyles } from "@lichtblick/suite-base/components/SearchBar/SearchBar.style";

/**
 * SearchBar - 汎用検索バーコンポーネント
 *
 * @overview
 * Material UI の TextField をベースにしたカスタム検索バーコンポーネント。
 * 開始アドーンメント（検索アイコン）とオプションのクリアアイコンを持つ。
 *
 * @features
 * - 検索アイコン付きの入力フィールド
 * - オプションのクリアボタン機能
 * - カスタマイズ可能な開始アドーンメント
 * - Material UI TextField の全機能を継承
 * - スティッキーポジション対応のスタイル
 *
 * @architecture
 * - Material UI TextField のラッパーコンポーネント
 * - InputAdornment を使用してアイコンを配置
 * - tss-react/mui を使用したスタイル適用
 * - TextFieldProps を拡張した型安全な props
 *
 * @usageExamples
 * ```tsx
 * // 基本的な使用例
 * <SearchBar
 *   value={searchText}
 *   onChange={(e) => setSearchText(e.target.value)}
 *   placeholder="検索..."
 * />
 *
 * // クリアボタン付きの使用例
 * <SearchBar
 *   value={searchText}
 *   onChange={(e) => setSearchText(e.target.value)}
 *   onClear={() => setSearchText("")}
 *   showClearIcon={!!searchText}
 *   placeholder="検索..."
 * />
 *
 * // カスタム開始アドーンメント
 * <SearchBar
 *   value={searchText}
 *   onChange={(e) => setSearchText(e.target.value)}
 *   startAdornment={<FilterIcon />}
 *   placeholder="フィルタリング..."
 * />
 * ```
 *
 * @param props - SearchBar のプロパティ
 * @param props.onClear - クリアボタンクリック時のコールバック関数
 * @param props.showClearIcon - クリアアイコンの表示/非表示フラグ
 * @param props.startAdornment - カスタム開始アドーンメント（デフォルト: SearchIcon）
 * @param props.id - input 要素の ID（デフォルト: "search-bar"）
 * @param props.variant - TextField のバリアント（デフォルト: "filled"）
 * @param props.disabled - 無効化状態（デフォルト: false）
 * @param props.value - 入力値
 * @param props.onChange - 値変更時のコールバック
 * @param props.children - 子要素（react の PropsWithChildren 対応）
 * @param ...rest - その他 TextField に渡される props
 *
 * @returns 検索バーコンポーネント
 */
function SearchBar(
  props: PropsWithChildren<
    TextFieldProps & {
      /** クリアボタンクリック時のコールバック関数 */
      onClear?: () => void;
      /** クリアアイコンの表示/非表示フラグ */
      showClearIcon?: boolean;
      /** カスタム開始アドーンメント（デフォルト: SearchIcon） */
      startAdornment?: React.ReactNode;
    }
  >,
): React.JSX.Element {
  const {
    id = "search-bar",
    variant = "filled",
    disabled = false,
    value,
    onChange,
    onClear,
    showClearIcon = false,
    startAdornment = <SearchIcon fontSize="small" data-testid="SearchIcon" />,
    ...rest
  } = props;

  const { classes } = useStyles();

  return (
    <div className={classes.filterSearchBar}>
      <TextField
        data-testid="SearchBarComponent"
        id={id}
        variant={variant}
        disabled={disabled}
        value={value}
        onChange={onChange}
        fullWidth
        slotProps={{
          ...rest.slotProps,
          input: {
            startAdornment: (
              <InputAdornment className={classes.filterStartAdornment} position="start">
                {startAdornment}
              </InputAdornment>
            ),
            endAdornment: showClearIcon && (
              <InputAdornment position="end">
                <IconButton size="small" title="Clear" onClick={onClear} edge="end">
                  <ClearIcon fontSize="small" data-testid="ClearIcon" />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        {...rest}
      />
    </div>
  );
}

export default SearchBar;
