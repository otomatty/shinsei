// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import {
  Autocomplete as MuiAutocomplete,
  Popper,
  PopperProps,
  TextField,
  TextFieldProps,
} from "@mui/material";
import { Fzf, FzfResultItem } from "fzf";
import * as React from "react";
import {
  CSSProperties,
  SyntheticEvent,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { makeStyles } from "tss-react/mui";

import { ListboxAdapterChild, ReactWindowListboxAdapter } from "./ReactWindowListboxAdapter";

/** fzfライブラリで返される最大マッチ数の上限 */
const MAX_FZF_MATCHES = 200;

/** この数を超えるアイテム数の場合、高速なファジーファインドアルゴリズム（v1）に切り替える */
const FAST_FIND_ITEM_CUTOFF = 1_000;

/**
 * Autocompleteコンポーネントのプロパティ型定義
 *
 * @description Material-UIのAutocompleteをベースにしたLichtblick独自の高性能オートコンプリートコンポーネント用のプロパティ
 */
type AutocompleteProps = {
  /** コンポーネントに適用するCSSクラス名 */
  className?: string;
  /** 自動選択を無効にするかどうか */
  disableAutoSelect?: boolean;
  /** コンポーネントを無効化するかどうか */
  disabled?: boolean;
  /** フィルタリングに使用するテキスト（通常はvalueと同じ） */
  filterText?: string;
  /** エラー状態を表示するかどうか */
  hasError?: boolean;
  /** 入力フィールドに適用するインラインスタイル */
  inputStyle?: CSSProperties;
  /** オートコンプリートで表示するアイテムのリスト */
  items: readonly string[];
  /** ドロップダウンメニューに適用するインラインスタイル */
  menuStyle?: CSSProperties;
  /** ドロップダウンの最小幅 */
  minWidth?: number;
  /** フォーカスが外れた時のコールバック */
  onBlur?: () => void;
  /** 入力値が変更された時のコールバック */
  onChange?: (event: React.SyntheticEvent, text: string) => void;
  /** アイテムが選択された時のコールバック */
  onSelect: (value: string, autocomplete: IAutocomplete) => void;
  /** 入力フィールドのプレースホルダーテキスト */
  placeholder?: string;
  /** 読み取り専用モードにするかどうか */
  readOnly?: boolean;
  /** フォーカス時にテキストを選択するかどうか */
  selectOnFocus?: boolean;
  /** フィルタリング時にソートするかどうか */
  sortWhenFiltering?: boolean;
  /** 入力フィールドの現在の値 */
  value?: string;
  /** TextFieldのバリアント（filled, outlined, standard） */
  variant?: TextFieldProps["variant"];
};

/**
 * Autocompleteコンポーネントのインターフェース
 *
 * @description 親コンポーネントがAutocompleteを制御するためのメソッドを提供
 */
export interface IAutocomplete {
  /** 入力フィールドの選択範囲を設定 */
  setSelectionRange(selectionStart: number, selectionEnd: number): void;
  /** 入力フィールドにフォーカスを設定 */
  focus(): void;
  /** 入力フィールドからフォーカスを外す */
  blur(): void;
}

/**
 * コンポーネントのスタイル定義
 */
const useStyles = makeStyles()((theme) => ({
  /** エラー状態の入力フィールドスタイル */
  inputError: {
    input: {
      color: theme.palette.error.main,
    },
  },
}));

/** 空のSetオブジェクト（パフォーマンス最適化のため再利用） */
const EMPTY_SET = new Set<number>();

/**
 * 通常のアイテムをFzfResultItem形式に変換する関数
 *
 * @param item - 変換対象のアイテム
 * @returns FzfResultItem形式のオブジェクト
 */
function itemToFzfResult<T>(item: T): FzfResultItem<T> {
  return {
    item,
    score: 0,
    positions: EMPTY_SET,
    start: 0,
    end: 0,
  };
}

/**
 * MuiAutocompleteの内部フィルタリングを無効化するためのパススルー関数
 *
 * @description fzfライブラリで事前にフィルタリングを行うため、MuiAutocompleteの
 * 内部フィルタリングは不要。この関数により内部フィルタリングを無効化する。
 *
 * @see https://mui.com/material-ui/react-autocomplete/#search-as-you-type
 */
const filterOptions = (options: FzfResultItem[]) => options;

/**
 * オプションのラベルを取得する関数
 *
 * @param item - 文字列またはFzfResultItem
 * @returns 表示用のラベル文字列
 */
const getOptionLabel = (item: string | FzfResultItem) =>
  typeof item === "string" ? item : item.item;

/**
 * カスタムPopperコンポーネント
 *
 * @description MuiAutocompleteの標準Popperは親要素の幅に制限されるが、
 * このカスタムPopperは最小幅を設定してより長いトピックパスや
 * オートコンプリートエントリを表示できるようにする。
 */
const CustomPopper = function (props: PopperProps) {
  const width = props.style?.width ?? 0;
  return <Popper {...props} style={{ minWidth: width }} placement="bottom-start" />;
};

/**
 * Lichtblick独自の高性能オートコンプリートコンポーネント
 *
 * @description Material-UIのAutocompleteをベースにしたStudio専用のラッパーコンポーネント。
 * 以下の特徴を持つ：
 *
 * - **高性能ファジーファインド**: fzfライブラリを使用した高速検索
 * - **仮想化リスト**: react-windowによる大量アイテムの効率的な描画
 * - **複数連続補完**: Plotパネルなどで複雑な文字列を構築する際の
 *   シームレスな連続オートコンプリート対応
 * - **パフォーマンス最適化**: 1000件以上のアイテムで高速アルゴリズムに自動切り替え
 * - **カスタムPopper**: 長いパスを表示するための幅制限解除
 *
 * @example
 * ```tsx
 * <Autocomplete
 *   items={topicNames}
 *   value={currentTopic}
 *   onSelect={(value, autocomplete) => {
 *     setCurrentTopic(value);
 *     autocomplete.blur(); // 連続補完を終了
 *   }}
 *   placeholder="トピック名を入力..."
 * />
 * ```
 */
export const Autocomplete = React.forwardRef(function Autocomplete(
  props: AutocompleteProps,
  ref: React.ForwardedRef<IAutocomplete>,
): React.JSX.Element {
  /** 入力フィールドへの参照 */
  const inputRef = useRef<HTMLInputElement>(ReactNull);

  const { classes, cx } = useStyles();

  /** 内部状態として管理される値（制御されていない場合） */
  const [stateValue, setValue] = useState<string | undefined>(undefined);

  const {
    className,
    value = stateValue,
    disabled,
    filterText = value ?? "",
    items,
    onBlur: onBlurCallback,
    onChange: onChangeCallback,
    onSelect: onSelectCallback,
    placeholder,
    readOnly,
    selectOnFocus,
    sortWhenFiltering = true,
    variant = "filled",
  }: AutocompleteProps = props;

  /** フィルタリングされていない全アイテムをFzfResultItem形式に変換 */
  const fzfUnfiltered = useMemo(() => {
    return items.map((item) => itemToFzfResult(item));
  }, [items]);

  /** fzfインスタンス（ファジーファインド検索エンジン） */
  const fzf = useMemo(() => {
    return new Fzf(items, {
      // アイテム数が多い場合はv1アルゴリズムを使用（高速）
      fuzzy: items.length > FAST_FIND_ITEM_CUTOFF ? "v1" : "v2",
      sort: sortWhenFiltering,
      limit: MAX_FZF_MATCHES,
    });
  }, [items, sortWhenFiltering]);

  /** フィルタリングされたオートコンプリートアイテム */
  const autocompleteItems = useMemo(() => {
    return filterText ? fzf.find(filterText) : fzfUnfiltered;
  }, [filterText, fzf, fzfUnfiltered]);

  /** エラー状態の判定（マッチするアイテムがなく、値が入力されている場合） */
  const hasError = props.hasError ?? (autocompleteItems.length === 0 && value?.length !== 0);

  /** 入力フィールドの選択範囲を設定する関数 */
  const setSelectionRange = useCallback((selectionStart: number, selectionEnd: number): void => {
    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(selectionStart, selectionEnd);
  }, []);

  /** 入力フィールドにフォーカスを設定する関数 */
  const focus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  /** 入力フィールドからフォーカスを外す関数 */
  const blur = useCallback(() => {
    inputRef.current?.blur();
    onBlurCallback?.();
  }, [onBlurCallback]);

  /** 親コンポーネントがオートコンプリートを制御するためのインターフェースを提供 */
  useImperativeHandle(ref, () => ({ setSelectionRange, focus, blur }), [
    setSelectionRange,
    focus,
    blur,
  ]);

  /** 入力値変更時のハンドラー */
  const onChange = useCallback(
    (_event: ReactNull | React.SyntheticEvent, newValue: string): void => {
      if (onChangeCallback) {
        if (_event) {
          onChangeCallback(_event, newValue);
        }
      } else {
        setValue(newValue);
      }
    },
    [onChangeCallback],
  );

  /**
   * アイテム選択時のハンドラー
   *
   * @description 複数の連続補完を可能にするため、親コンポーネントが
   * 手動でblur()を呼び出して補完を終了する必要がある
   */
  const onSelect = useCallback(
    (_event: SyntheticEvent, selectedValue: ReactNull | string | FzfResultItem): void => {
      if (selectedValue != undefined && typeof selectedValue !== "string") {
        setValue(undefined);
        onSelectCallback(selectedValue.item, { setSelectionRange, focus, blur });
      }
    },
    [onSelectCallback, blur, focus, setSelectionRange],
  );

  return (
    <MuiAutocomplete
      className={className}
      getOptionLabel={getOptionLabel}
      disableCloseOnSelect
      disabled={disabled}
      freeSolo
      fullWidth
      slotProps={{
        paper: { elevation: 8 },
        listbox: {
          component: ReactWindowListboxAdapter,
        },
      }}
      slots={{ popper: CustomPopper }}
      filterOptions={filterOptions}
      onChange={onSelect}
      onInputChange={onChange}
      openOnFocus
      options={autocompleteItems}
      readOnly={readOnly}
      renderInput={(params) => (
        <TextField
          {...params}
          variant={variant}
          inputRef={inputRef}
          data-testid="autocomplete-textfield"
          placeholder={placeholder}
          className={cx({ [classes.inputError]: hasError })}
          size="small"
        />
      )}
      renderOption={(optProps, option: FzfResultItem, state) => {
        // renderOptionの戻り値はListboxComponentの_child_引数として渡される。
        // ReactWindowListboxAdapterは各アイテムに対してタプルを期待し、
        // 仮想化を使用してアイテムの描画を自分で管理する。
        //
        // 最後のas ReactNodeキャストは、renderOptionの期待される戻り値の型を
        // 満たすためのもの。ListboxAdapterがReactNodeではなくタプルを必要とする
        // ことを理解していないため。
        return [optProps, option, state] satisfies ListboxAdapterChild as React.ReactNode;
      }}
      selectOnFocus={selectOnFocus}
      size="small"
      value={value ?? ReactNull}
    />
  );
});
