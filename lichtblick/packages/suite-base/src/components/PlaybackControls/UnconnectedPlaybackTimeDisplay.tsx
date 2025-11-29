// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * UnconnectedPlaybackTimeDisplay - 再生時間表示・編集コンポーネント
 *
 * @overview
 * 動画再生システムの現在時刻を表示し、ユーザーによる直接編集を可能にする統合コンポーネント。
 * 2つの時間フォーマット（秒・時刻）をサポートし、入力検証とエラーハンドリング機能を提供。
 * プレイバック制御において、視覚的なフィードバックとインタラクティブな時間操作を実現。
 *
 * @features
 * - **時間表示**: 現在の再生時刻をリアルタイム表示
 * - **フォーマット切替**: 秒表示（SEC）と時刻表示（TOD）の動的切替
 * - **インライン編集**: テキストフィールドでの直接時刻入力
 * - **入力検証**: 時刻フォーマットと範囲の妥当性チェック
 * - **エラーハンドリング**: 不正入力時の視覚的エラー表示
 * - **自動一時停止**: 編集開始時の自動再生停止
 * - **シーク機能**: 有効な時刻入力時の自動シーク
 *
 * @architecture
 * - **分離されたコンポーネント**: MessagePipelineに依存しない純粋なUIコンポーネント
 * - **制御されたコンポーネント**: 親コンポーネントからの完全な状態管理
 * - **Material-UI統合**: テーマ対応のスタイリングとアクセシビリティ
 * - **TimeDisplayMethod**: 時間表示形式の統一的管理
 * - **バリデーション**: 厳密な時刻検証とエラーフィードバック
 *
 * @userInteraction
 * 1. **通常表示**: 現在時刻を選択されたフォーマットで表示
 * 2. **フォーカス**: テキストフィールドクリック時に編集モードに入る
 * 3. **編集**: 時刻文字列を直接入力・修正
 * 4. **検証**: 入力内容の妥当性をリアルタイムチェック
 * 5. **確定**: Enter押下またはフォーカス離脱時に新しい時刻にシーク
 * 6. **エラー**: 不正な入力時に視覚的エラー表示
 *
 * @timeFormats
 * - **SEC**: 秒単位の数値表示（例: 1234.567890123）
 * - **TOD**: 時刻形式の表示（例: 2024-01-01 12:34:56.789）
 *
 * @errorHandling
 * - **入力検証**: 時刻フォーマットと範囲の妥当性チェック
 * - **視覚的フィードバック**: エラー時の赤色アウトラインと警告アイコン
 * - **自動回復**: 再生再開時または空入力時のエラー状態自動解除
 * - **timeout制御**: エラー表示の一定時間後自動解除
 *
 * @accessibility
 * - **キーボードナビゲーション**: Tab, Enter, Escapeキーの適切な処理
 * - **スクリーンリーダー**: aria-label, data-testid属性による支援技術対応
 * - **フォーカス管理**: 編集時の自動テキスト選択とフォーカス制御
 *
 * @performanceOptimizations
 * - **useMemo**: 時刻文字列の重複計算を防止
 * - **useCallback**: イベントハンドラーの最適化
 * - **条件付きレンダリング**: 無効状態での最小限のUI描画
 *
 * @dependencies
 * - **@lichtblick/rostime**: 時刻計算とフォーマット処理
 * - **@lichtblick/suite-base/util/formatTime**: 時刻フォーマット変換
 * - **Material-UI**: TextField, Menu, アイコンコンポーネント
 * - **tss-react/mui**: テーマ対応スタイリング
 *
 * @usageExample
 * ```tsx
 * <UnconnectedPlaybackTimeDisplay
 *   appTimeFormat={appTimeFormat}
 *   currentTime={currentTime}
 *   startTime={startTime}
 *   endTime={endTime}
 *   timezone="UTC"
 *   onSeek={(time) => player.seek(time)}
 *   onPause={() => player.pause()}
 *   isPlaying={player.isPlaying}
 * />
 * ```
 *
 * @relatedComponents
 * - **PlaybackTimeDisplay**: MessagePipeline接続版のラッパー
 * - **Scrubber**: タイムライン操作コンポーネント
 * - **PlaybackControls**: 統合再生制御コンポーネント
 */

import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CheckIcon from "@mui/icons-material/Check";
import WarningIcon from "@mui/icons-material/Warning";
import {
  TextField,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  filledInputClasses,
  iconButtonClasses,
  inputBaseClasses,
} from "@mui/material";
import { useState, useCallback, useMemo, useEffect, MouseEvent, useRef } from "react";
import { makeStyles } from "tss-react/mui";

import { Time, isTimeInRangeInclusive } from "@lichtblick/rostime";
import Stack from "@lichtblick/suite-base/components/Stack";
import { IAppTimeFormat } from "@lichtblick/suite-base/hooks/useAppTimeFormat";
import { TimeDisplayMethod } from "@lichtblick/suite-base/types/panels";
import {
  formatDate,
  formatTime,
  getValidatedTimeAndMethodFromString,
} from "@lichtblick/suite-base/util/formatTime";
import { formatTimeRaw } from "@lichtblick/suite-base/util/time";
import { customTypography } from "@lichtblick/theme";

/**
 * UnconnectedPlaybackTimeDisplay のプロパティ定義
 *
 * @interface PlaybackTimeDisplayMethodProps
 */
type PlaybackTimeDisplayMethodProps = {
  /** アプリケーションの時刻フォーマット設定 */
  appTimeFormat: IAppTimeFormat;
  /** 現在の再生時刻 */
  currentTime?: Time;
  /** 再生開始時刻 */
  startTime?: Time;
  /** 再生終了時刻 */
  endTime?: Time;
  /** 表示用タイムゾーン */
  timezone?: string;
  /** シーク操作のコールバック関数 */
  onSeek: (arg0: Time) => void;
  /** 一時停止操作のコールバック関数 */
  onPause: () => void;
  /** 現在の再生状態 */
  isPlaying: boolean;
};

/**
 * コンポーネントのスタイル定義
 *
 * @param timeDisplayMethod - 時刻表示方式
 * @returns スタイルクラス定義
 */
const useStyles = makeStyles<{ timeDisplayMethod: TimeDisplayMethod }>()(
  (theme, { timeDisplayMethod }) => ({
    /**
     * メインのテキストフィールドスタイル
     *
     * @style
     * - 角丸: テーマのborderRadius適用
     * - 無効状態: 透明背景
     * - ホバー状態: action.hoverカラー、ドロップダウンボタン表示
     * - 入力幅: 時刻フォーマットに応じた動的幅設定
     * - フォント: 等幅フォント機能（'zero'）の強制適用
     */
    textField: {
      borderRadius: theme.shape.borderRadius,

      "&.Mui-disabled": {
        [`.${filledInputClasses.root}`]: {
          backgroundColor: "transparent",
        },
      },
      "&:not(.Mui-disabled):hover": {
        backgroundColor: theme.palette.action.hover,

        [`.${iconButtonClasses.root}`]: {
          visibility: "visible",
        },
      },
      [`.${filledInputClasses.root}`]: {
        backgroundColor: "transparent",

        ":hover": {
          backgroundColor: "transparent",
        },
      },
      [`.${inputBaseClasses.input}`]: {
        fontFeatureSettings: `${customTypography.fontFeatureSettings}, 'zero' !important`,
        fontVariantNumeric: "tabular-nums", // Example of a valid property
        minWidth: timeDisplayMethod === "TOD" ? "28ch" : "20ch",
      },
      [`.${iconButtonClasses.root}`]: {
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        borderLeft: `1px solid ${theme.palette.background.paper}`,
        visibility: "hidden",
        marginRight: theme.spacing(-1),
      },
    },
    /**
     * エラー状態のテキストフィールドスタイル
     *
     * @style
     * - アウトライン: エラーカラーの境界線
     * - テキスト色: エラーカラー
     * - 境界線: 左側にエラーカラー適用
     */
    textFieldError: {
      outline: `1px solid ${theme.palette.error.main}`,
      outlineOffset: -1,

      [`.${inputBaseClasses.root}`]: {
        color: theme.palette.error.main,
        borderLeftColor: theme.palette.error.main,
      },
    },
  }),
);

/**
 * 時刻表示方式選択メニューコンポーネント
 *
 * @description
 * 秒表示（SEC）と時刻表示（TOD）を切り替えるドロップダウンメニュー。
 * 現在の選択状態を視覚的に表示し、変更時に設定を自動保存。
 *
 * @param props - メニューコンポーネントのプロパティ
 * @param props.timeFormat - 現在の時刻表示フォーマット
 * @param props.timeRawString - 秒表示の文字列
 * @param props.timeOfDayString - 時刻表示の文字列
 * @param props.setTimeFormat - フォーマット変更のコールバック
 * @returns 時刻表示方式選択メニュー
 */
function PlaybackTimeMethodMenu({
  timeFormat,
  timeRawString,
  timeOfDayString,
  setTimeFormat,
}: {
  timeFormat: TimeDisplayMethod;
  timeRawString?: string;
  timeOfDayString?: string;
  setTimeFormat: (format: TimeDisplayMethod) => Promise<void>;
}): React.JSX.Element {
  const [anchorEl, setAnchorEl] = useState<undefined | HTMLElement>(undefined);
  const open = Boolean(anchorEl);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(undefined);
  };

  return (
    <>
      <IconButton
        id="playback-time-display-toggle-button"
        data-testid="playback-time-display-toggle-button"
        aria-controls={open ? "playback-time-display-toggle-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        size="small"
      >
        <ArrowDropDownIcon fontSize="small" />
      </IconButton>
      <Menu
        id="playback-time-display-toggle-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          list: {
            dense: true,
            "aria-labelledby": "playback-time-display-toggle-button",
          },
        }}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        {[
          { key: "TOD", label: timeOfDayString ?? "Time of Day" },
          { key: "SEC", label: timeRawString ?? "Seconds" },
        ].map((option) => (
          <MenuItem
            key={option.key}
            data-testid={`playback-time-display-option-${option.key}`}
            selected={timeFormat === option.key}
            onClick={async () => {
              await setTimeFormat(option.key as TimeDisplayMethod);
              handleClose();
            }}
          >
            {timeFormat === option.key && (
              <ListItemIcon>
                <CheckIcon fontSize="small" />
              </ListItemIcon>
            )}
            <ListItemText
              inset={timeFormat !== option.key}
              primary={option.label}
              slotProps={{
                primary: {
                  variant: "inherit",
                },
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/**
 * UnconnectedPlaybackTimeDisplay メインコンポーネント
 *
 * @description
 * 再生時刻の表示と編集機能を提供するコンポーネント。
 * MessagePipelineに依存しない純粋なUIコンポーネントとして実装され、
 * 親コンポーネントから必要な状態とコールバックを受け取る。
 *
 * @param props - コンポーネントのプロパティ
 * @returns 再生時刻表示・編集コンポーネント
 */
export function UnconnectedPlaybackTimeDisplay({
  appTimeFormat,
  currentTime,
  startTime,
  endTime,
  timezone,
  onSeek,
  onPause,
  isPlaying,
}: PlaybackTimeDisplayMethodProps): React.JSX.Element {
  const { classes, cx } = useStyles({ timeDisplayMethod: appTimeFormat.timeFormat });

  /**
   * エラー状態の自動解除用タイマーID
   *
   * @description
   * エラー表示後に一定時間（600ms）経過後に自動でエラー状態を解除するためのタイマー。
   * フォーカス離脱後にエラーが表示されたまま永続化することを防ぐ。
   * コンポーネントのアンマウント時にはタイマーをクリーンアップする。
   */
  const timeOutID = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /**
   * 秒表示フォーマット文字列
   *
   * @memo 現在時刻からの秒単位文字列を生成
   * @description
   * 現在時刻を高精度の秒値（小数点以下9桁まで）として表示するための文字列。
   * formatTimeRaw関数により、ROS時刻フォーマットから秒値への変換を実行。
   * 依存関係: [currentTime] - 現在時刻が変更された場合のみ再計算
   */
  const timeRawString = useMemo(
    () => (currentTime ? formatTimeRaw(currentTime) : undefined),
    [currentTime],
  );

  /**
   * 時刻表示フォーマット文字列
   *
   * @memo 現在時刻からの日時文字列を生成
   * @description
   * 現在時刻を人間が読みやすい日時形式（YYYY-MM-DD HH:mm:ss.SSS）として表示するための文字列。
   * formatDate + formatTime関数により、タイムゾーンを考慮した日時文字列を生成。
   * 依存関係: [currentTime, timezone] - 現在時刻またはタイムゾーンが変更された場合のみ再計算
   */
  const timeOfDayString = useMemo(
    () =>
      currentTime
        ? `${formatDate(currentTime, timezone)} ${formatTime(currentTime, timezone)}`
        : undefined,
    [currentTime, timezone],
  );

  /**
   * 現在の表示用時刻文字列
   *
   * @memo 選択されたフォーマットに応じた時刻文字列
   * @description
   * アプリケーションの時刻表示設定（SEC/TOD）に基づいて表示する時刻文字列を決定。
   * - SEC: 秒値表示（例: 1234.567890123）
   * - TOD: 時刻表示（例: 2024-01-01 12:34:56.789）
   * 依存関係: [appTimeFormat.timeFormat, timeRawString, timeOfDayString]
   */
  const currentTimeString = useMemo(
    () => (appTimeFormat.timeFormat === "SEC" ? timeRawString : timeOfDayString),
    [appTimeFormat.timeFormat, timeRawString, timeOfDayString],
  );

  /**
   * 編集状態の管理
   *
   * @state
   * @description
   * テキストフィールドが編集モードかどうかを制御する状態。
   * - true: ユーザーがテキストフィールドをクリック/フォーカスし、編集中
   * - false: 通常の表示モード
   * 編集モード時は自動的に再生が一時停止され、入力値が表示される。
   */
  const [isEditing, setIsEditing] = useState<boolean>(false);

  /**
   * 入力テキストの管理
   *
   * @state
   * @description
   * ユーザーが入力中の時刻文字列を管理する状態。
   * - 編集開始時: currentTimeStringで初期化
   * - 編集中: ユーザーの入力内容を反映
   * - 編集終了時: 検証後にシーク処理または元の値に復元
   */
  const [inputText, setInputText] = useState<string | undefined>(currentTimeString ?? undefined);

  /**
   * エラー状態の管理
   *
   * @state
   * @description
   * 入力された時刻文字列が無効な場合のエラー状態を管理。
   * - true: 無効な時刻入力によりエラー表示中
   * - false: 正常状態
   * エラー時は以下の視覚的フィードバックを提供：
   * - 赤色のアウトライン表示
   * - 警告アイコンの表示
   * - エラーカラーのテキスト色
   */
  const [hasError, setHasError] = useState<boolean>(false);

  /**
   * 時刻入力の送信処理
   *
   * @description
   * 入力された時刻文字列を検証し、有効な場合はシーク操作を実行。
   * 無効な場合はエラー状態を設定し、視覚的フィードバックを提供。
   *
   * @validation
   * 以下の条件をチェック：
   * 1. 入力文字列が空でないか
   * 2. startTime, currentTime, endTimeが存在するか
   * 3. getValidatedTimeAndMethodFromString による時刻形式の妥当性
   * 4. isTimeInRangeInclusive による時刻範囲の妥当性
   *
   * @sideEffects
   * - 有効な時刻の場合: onSeek実行、時刻フォーマット更新、エラー状態解除
   * - 無効な時刻の場合: エラー状態設定、視覚的フィードバック表示
   *
   * @param e - フォーム送信イベント
   */
  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (inputText == undefined || inputText.length === 0) {
        return;
      }
      if (!startTime || !currentTime || !endTime) {
        return;
      }

      const validTimeAndMethod = getValidatedTimeAndMethodFromString({
        text: inputText,
        timezone,
      });

      if (validTimeAndMethod == undefined) {
        setHasError(true);
        return;
      }

      // If input is valid, clear error state, exit edit mode, and seek to input timestamp
      setHasError(false);

      if (
        validTimeAndMethod.time &&
        isTimeInRangeInclusive(validTimeAndMethod.time, startTime, endTime)
      ) {
        onSeek(validTimeAndMethod.time);
        if (validTimeAndMethod.method !== appTimeFormat.timeFormat) {
          void appTimeFormat.setTimeFormat(validTimeAndMethod.method);
        }
      }
    },
    [inputText, startTime, currentTime, endTime, timezone, onSeek, appTimeFormat],
  );

  /**
   * エラー状態の自動解除処理
   *
   * @description
   * 以下の条件でエラー状態を自動的に解除：
   * - 空の入力フィールド送信時
   * - 再生再開時
   * - タイムアウト時（600ms後）
   *
   * @autoRecovery
   * エラー状態からの自動回復機能：
   * 1. **空入力での回復**: ユーザーが入力を削除した場合
   * 2. **再生再開での回復**: 再生を再開した場合（編集を中断したと判断）
   * 3. **タイムアウトでの回復**: フォーカス離脱後600ms経過時
   *
   * @cleanup
   * コンポーネントのアンマウント時にタイマーをクリーンアップし、
   * メモリリークを防止する。
   */
  useEffect(() => {
    // If user submits an empty input field or resumes playback, clear error state and show current timestamp
    if (hasError && (inputText == undefined || inputText.length === 0 || isPlaying)) {
      setIsEditing(false);
      setHasError(false);
    }

    return () => {
      if (timeOutID.current != undefined) {
        clearTimeout(timeOutID.current);
      }
    };
  }, [hasError, inputText, isPlaying]);

  return (
    <Stack direction="row" alignItems="center" flexGrow={0} gap={0.5}>
      {currentTime ? (
        <form onSubmit={onSubmit} style={{ width: "100%" }}>
          <TextField
            className={cx(classes.textField, { [classes.textFieldError]: hasError })}
            aria-label="Playback Time Method"
            data-testid="PlaybackTime-text"
            value={isEditing ? inputText : currentTimeString}
            error={hasError}
            variant="filled"
            size="small"
            slotProps={{
              input: {
                startAdornment: hasError ? <WarningIcon color="error" /> : undefined,
                endAdornment: (
                  <PlaybackTimeMethodMenu
                    {...{
                      currentTime,
                      timezone,
                      timeOfDayString,
                      timeRawString,
                      timeFormat: appTimeFormat.timeFormat,
                      setTimeFormat: appTimeFormat.setTimeFormat,
                    }}
                  />
                ),
              },
            }}
            onFocus={(e) => {
              onPause();
              setHasError(false);
              setIsEditing(true);
              setInputText(currentTimeString);
              e.target.select();
            }}
            onBlur={(e) => {
              onSubmit(e);
              setIsEditing(false);
              timeOutID.current = setTimeout(() => {
                setHasError(false);
              }, 600);
            }}
            onChange={(event) => {
              setInputText(event.target.value);
            }}
          />
        </form>
      ) : (
        <TextField
          className={cx(classes.textField, "Mui-disabled")}
          disabled
          variant="filled"
          size="small"
          defaultValue={
            appTimeFormat.timeFormat === "SEC" ? "0000000000.000000000" : "0000-00-00 00:00:00.000"
          }
          slotProps={{
            input: {
              endAdornment: (
                <IconButton edge="end" size="small" disabled>
                  <ArrowDropDownIcon fontSize="small" />
                </IconButton>
              ),
            },
          }}
        />
      )}
    </Stack>
  );
}
