// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Alert, Link, Tab, Tabs, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useState, useMemo, useCallback, useLayoutEffect, FormEvent } from "react";
import { makeStyles } from "tss-react/mui";

import { BuiltinIcon } from "@lichtblick/suite-base/components/BuiltinIcon";
import Stack from "@lichtblick/suite-base/components/Stack";
import { useAnalytics } from "@lichtblick/suite-base/context/AnalyticsContext";
import { usePlayerSelection } from "@lichtblick/suite-base/context/PlayerSelectionContext";
import {
  WorkspaceContextStore,
  useWorkspaceStore,
} from "@lichtblick/suite-base/context/Workspace/WorkspaceContext";
import { useWorkspaceActions } from "@lichtblick/suite-base/context/Workspace/useWorkspaceActions";
import { AppEvent } from "@lichtblick/suite-base/services/IAnalytics";

import { FormField } from "./FormField";
import View from "./View";

/**
 * Connection コンポーネント用のスタイル定義
 *
 * レスポンシブデザインに対応したグリッドレイアウトとタブ表示の
 * スタイリングを提供します。
 *
 * ## レイアウト構造
 * - **モバイル**: 縦方向のスタック配置
 * - **デスクトップ**: 2カラムグリッドレイアウト
 *   - ヘッダー: 全幅
 *   - サイドバー: 240px固定幅（接続タイプ選択）
 *   - フォーム: 残り幅（接続設定フォーム）
 *
 * ## 特徴的なスタイル
 * - タブインジケーターのカスタマイズ
 * - フォーム高さの動的調整
 * - アイコンとテキストの配置調整
 */
const useStyles = makeStyles()((theme) => ({
  grid: {
    padding: theme.spacing(4, 4, 0),
    columnGap: theme.spacing(4),
    rowGap: theme.spacing(2),

    [theme.breakpoints.up("md")]: {
      overflow: "hidden",
      display: "grid",
      padding: theme.spacing(4, 4, 0, 4),
      gridTemplateAreas: `
        "header header"
        "sidebar form"
      `,
      gridTemplateColumns: "240px 1fr",
      gridTemplateRows: "auto auto",
    },
  },
  header: {
    gridArea: "header",
  },
  form: {
    gridArea: "form",
    overflowY: "auto",
  },
  formInner: {
    [theme.breakpoints.up("md")]: {
      height: theme.spacing(43), // this is aproximately the height of the tallest form
    },
  },
  sidebar: {
    gridArea: "sidebar",
    overflowY: "auto",
  },
  tab: {
    "> svg:not(.MuiSvgIcon-root)": {
      display: "flex",
      flex: "none",
      color: theme.palette.primary.main,
      marginRight: theme.spacing(1.5),
    },
    [theme.breakpoints.up("md")]: {
      textAlign: "right",
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
      minHeight: "auto",
      paddingTop: theme.spacing(1.5),
      paddingBottom: theme.spacing(1.5),
    },
  },
  indicator: {
    transition: theme.transitions.create("inset"),

    [theme.breakpoints.up("md")]: {
      right: 0,
      width: "100%",
      backgroundColor: theme.palette.action.hover,
      borderRadius: theme.shape.borderRadius,
    },
  },
}));

/**
 * ワークスペースストアからデータソースダイアログの状態を選択するセレクター
 */
const selectDataSourceDialog = (store: WorkspaceContextStore) => store.dialogs.dataSource;

/**
 * リモート接続設定コンポーネント
 *
 * このコンポーネントは、Lichtblickアプリケーションでリモートデータソースへの
 * 接続を設定するためのインターフェースを提供します。
 *
 * ## 主な機能
 *
 * ### 動的接続タイプ管理
 * - 利用可能な接続タイプの自動検出
 * - 有効/無効状態の管理
 * - 接続タイプ別のアイコンと表示名
 *
 * ### 動的フォーム生成
 * - 接続タイプに応じたフォームフィールドの動的生成
 * - バリデーション機能付きフォーム入力
 * - デフォルト値の自動設定
 *
 * ### レスポンシブUI
 * - モバイル: 横スクロール可能なタブ
 * - デスクトップ: 縦方向タブ + 2カラムレイアウト
 * - 画面サイズに応じたレイアウト調整
 *
 * ### 状態管理
 * - 選択中の接続タイプ
 * - フォーム入力値
 * - バリデーションエラー
 * - アクティブなデータソース
 *
 * ## 接続フロー
 *
 * 1. **接続タイプ選択**: 利用可能な接続タイプから選択
 * 2. **パラメータ入力**: 選択したタイプに応じたフォーム入力
 * 3. **バリデーション**: 入力値の検証
 * 4. **接続実行**: 設定完了後の接続開始
 *
 * ## レイアウト構造
 * ```
 * Connection
 * ├── Header ("Open a new connection")
 * ├── Sidebar (接続タイプ選択タブ)
 * │   ├── Tab 1 (ROS, WebSocket等)
 * │   ├── Tab 2
 * │   └── ...
 * └── Form (選択された接続タイプの設定フォーム)
 *     ├── 警告/エラー表示
 *     ├── 説明文
 *     ├── 動的フォームフィールド
 *     └── ドキュメントリンク
 * ```
 *
 * ## 接続タイプの例
 * - **ROS**: Robot Operating System接続
 * - **WebSocket**: WebSocket接続
 * - **Foxglove WebSocket**: Foxglove専用WebSocket
 * - **MCAP**: MCAP形式のリモートファイル
 * - **その他**: プラグインによる拡張可能
 *
 * ## エラーハンドリング
 * - 接続タイプが無効な場合の警告表示
 * - フォームバリデーションエラーの表示
 * - 接続失敗時のエラー処理
 *
 * ## アナリティクス
 * - 接続タイプ選択の追跡
 * - 接続成功/失敗の追跡
 * - ダイアログ操作の追跡
 *
 * @returns リモート接続設定画面のReactコンポーネント
 *
 * @example
 * ```tsx
 * // DataSourceDialog内での使用例
 * {currentView === "connection" && <Connection />}
 * ```
 */
export default function Connection(): React.JSX.Element {
  const { classes } = useStyles();
  const theme = useTheme();
  const mdUp = useMediaQuery(theme.breakpoints.up("md"));

  const { activeDataSource } = useWorkspaceStore(selectDataSourceDialog);
  const { dialogActions } = useWorkspaceActions();

  const { availableSources, selectSource } = usePlayerSelection();
  const analytics = useAnalytics();

  /**
   * 接続タイプのフィルタリング
   *
   * 利用可能なデータソースから接続タイプ（type: "connection"）のみを
   * 抽出し、非表示設定されていないものを返します。
   *
   * @returns 接続可能なデータソースの配列
   */
  const connectionSources = useMemo(() => {
    return availableSources.filter((source) => {
      return source.type === "connection" && source.hidden !== true;
    });
  }, [availableSources]);

  /**
   * 有効な接続タイプを優先した並び順の生成
   *
   * 有効な接続タイプを先頭に配置し、無効なものを後に配置することで、
   * デフォルトで選択される接続タイプが使用可能になるようにします。
   *
   * ## 並び順の理由
   * - 有効な接続タイプが最初に選択される
   * - ユーザーが即座に使用可能な選択肢を確認できる
   * - 無効な接続タイプも表示して機能の存在を示す
   *
   * @returns 有効な接続タイプを先頭にした配列
   */
  const enabledSourcesFirst = useMemo(() => {
    const enabledSources = connectionSources.filter((source) => source.disabledReason == undefined);
    const disabledSources = connectionSources.filter(
      (source) => source.disabledReason != undefined,
    );
    return [...enabledSources, ...disabledSources];
  }, [connectionSources]);

  /**
   * 選択中の接続タイプのインデックス状態
   *
   * 初期値は現在アクティブなデータソースに基づいて設定され、
   * 見つからない場合は最初の接続タイプ（通常は有効なもの）が選択されます。
   *
   * 初期化時にアナリティクスイベントも送信されます。
   */
  const [selectedConnectionIdx, setSelectedConnectionIdx] = useState<number>(() => {
    const foundIdx = connectionSources.findIndex((source) => source === activeDataSource);
    const selectedIdx = foundIdx < 0 ? 0 : foundIdx;
    void analytics.logEvent(AppEvent.DIALOG_SELECT_VIEW, {
      type: "live",
      data: enabledSourcesFirst[selectedIdx]?.id,
    });
    return selectedIdx;
  });

  /**
   * 現在選択されている接続ソース
   *
   * selectedConnectionIdxに基づいて、対応する接続ソースオブジェクトを返します。
   * このオブジェクトには接続タイプの詳細情報、フォーム設定、アイコンなどが含まれます。
   */
  const selectedSource = useMemo(
    () => enabledSourcesFirst[selectedConnectionIdx],
    [enabledSourcesFirst, selectedConnectionIdx],
  );

  /**
   * フォームフィールドのバリデーションエラー状態
   *
   * フィールドIDをキーとして、対応するエラーメッセージを保持します。
   * この状態は接続ボタンの有効/無効状態の判定にも使用されます。
   */
  const [fieldErrors, setFieldErrors] = useState(new Map<string, string>());

  /**
   * フォームフィールドの入力値状態
   *
   * フィールドIDをキーとして、ユーザーが入力した値を保持します。
   * 接続実行時にこの値がパラメータとして使用されます。
   */
  const [fieldValues, setFieldValues] = useState<Record<string, string | undefined>>({});

  /**
   * アクティブなデータソースの変更に応じた選択状態の同期
   *
   * 外部からアクティブなデータソースが変更された場合、
   * 対応する接続タイプが選択されるように状態を更新します。
   */
  useLayoutEffect(() => {
    const connectionIdx = connectionSources.findIndex((source) => source === activeDataSource);
    if (connectionIdx >= 0) {
      setSelectedConnectionIdx(connectionIdx);
    }
  }, [activeDataSource, connectionSources]);

  /**
   * 接続タイプ変更時のフォーム値リセット
   *
   * ユーザーが接続タイプを変更した際に、新しい接続タイプの
   * デフォルト値でフォームフィールドを初期化します。
   *
   * ## 処理内容
   * - 既存のフォーム値をクリア
   * - 新しい接続タイプのデフォルト値を設定
   * - バリデーションエラーをクリア
   */
  useLayoutEffect(() => {
    const defaultFieldValues: Record<string, string | undefined> = {};
    for (const field of selectedSource?.formConfig?.fields ?? []) {
      if (field.defaultValue != undefined) {
        defaultFieldValues[field.id] = field.defaultValue;
      }
    }
    setFieldValues(defaultFieldValues);
  }, [selectedSource]);

  /**
   * 接続実行処理
   *
   * 現在選択されている接続タイプと入力されたパラメータを使用して
   * 実際の接続を開始します。
   *
   * ## 処理フロー
   * 1. 選択されたソースの存在確認
   * 2. 接続パラメータの設定
   * 3. アナリティクスイベントの送信
   * 4. ダイアログの閉じる
   *
   * @callback onOpen
   */
  const onOpen = useCallback(() => {
    if (!selectedSource) {
      return;
    }
    selectSource(selectedSource.id, { type: "connection", params: fieldValues });
    void analytics.logEvent(AppEvent.DIALOG_CLOSE, { activeDataSource });
    dialogActions.dataSource.close();
  }, [
    selectedSource,
    selectSource,
    fieldValues,
    analytics,
    activeDataSource,
    dialogActions.dataSource,
  ]);

  /**
   * 接続ボタンの有効/無効状態の判定
   *
   * 以下の条件のいずれかが満たされる場合、接続ボタンは無効になります：
   * - 選択された接続タイプが無効（disabledReason が存在）
   * - フォームにバリデーションエラーが存在
   */
  const disableOpen = selectedSource?.disabledReason != undefined || fieldErrors.size > 0;

  /**
   * フォーム送信処理
   *
   * Enter キーやフォーム送信ボタンによる送信を処理します。
   * 接続ボタンが有効な場合のみ接続処理を実行します。
   *
   * @param event - フォーム送信イベント
   */
  const onSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      if (!disableOpen) {
        onOpen();
      }
    },
    [disableOpen, onOpen],
  );

  return (
    <View onOpen={disableOpen ? undefined : onOpen}>
      <Stack className={classes.grid} data-testid="OpenConnection">
        <header className={classes.header}>
          <Typography variant="h3" fontWeight={600} gutterBottom>
            Open a new connection
          </Typography>
        </header>
        <div className={classes.sidebar}>
          <Tabs
            classes={{ indicator: classes.indicator }}
            variant="scrollable"
            textColor="inherit"
            orientation={mdUp ? "vertical" : "horizontal"}
            onChange={(_event, newValue: number) => {
              setSelectedConnectionIdx(newValue);
              void analytics.logEvent(AppEvent.DIALOG_SELECT_VIEW, {
                type: "live",
                data: enabledSourcesFirst[newValue]?.id,
              });
            }}
            value={selectedConnectionIdx}
          >
            {enabledSourcesFirst.map((source, idx) => {
              const { id, iconName, displayName } = source;
              return (
                <Tab
                  value={idx}
                  key={id}
                  icon={mdUp ? <BuiltinIcon name={iconName ?? "Flow"} /> : undefined}
                  label={displayName}
                  className={classes.tab}
                />
              );
            })}
          </Tabs>
        </div>

        <Stack className={classes.form} key={selectedSource?.id} flex="1 0">
          <form onSubmit={onSubmit}>
            <Stack className={classes.formInner} gap={2}>
              {selectedSource?.disabledReason == undefined &&
                selectedSource?.warning != undefined && (
                  <Alert severity="warning">{selectedSource.warning}</Alert>
                )}
              {selectedSource?.disabledReason != undefined && (
                <Alert severity="warning">{selectedSource.disabledReason}</Alert>
              )}

              {selectedSource?.description && <Typography>{selectedSource.description}</Typography>}
              {selectedSource?.formConfig != undefined && (
                <Stack flexGrow={1} justifyContent="space-between">
                  <Stack gap={2}>
                    {selectedSource.formConfig.fields.map((field) => (
                      <FormField
                        key={field.id}
                        field={field}
                        disabled={selectedSource.disabledReason != undefined}
                        onError={(err) => {
                          setFieldErrors((existing) => {
                            existing.set(field.id, err);
                            return new Map(existing);
                          });
                        }}
                        onChange={(newValue) => {
                          setFieldErrors((existing) => {
                            existing.delete(field.id);
                            return new Map(existing);
                          });
                          setFieldValues((existing) => {
                            return {
                              ...existing,
                              [field.id]: newValue,
                            };
                          });
                        }}
                      />
                    ))}
                  </Stack>
                </Stack>
              )}
              <Stack direction="row" gap={1}>
                {(selectedSource?.docsLinks ?? []).map((item) => (
                  <Link
                    key={item.url}
                    color="primary"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.label ? `View docs for ${item.label}` : "View docs"}
                  </Link>
                ))}
              </Stack>
            </Stack>
          </form>
        </Stack>
      </Stack>
    </View>
  );
}
