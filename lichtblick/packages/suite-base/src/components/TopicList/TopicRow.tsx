// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ReOrderDotsVertical16Regular } from "@fluentui/react-icons";
import { Badge, Typography } from "@mui/material";
import { FzfResultItem } from "fzf";
import { useCallback, useMemo } from "react";

import { quoteTopicNameIfNeeded } from "@lichtblick/message-path";
import { HighlightChars } from "@lichtblick/suite-base/components/HighlightChars";
import { DraggedMessagePath } from "@lichtblick/suite-base/components/PanelExtensionAdapter";
import Stack from "@lichtblick/suite-base/components/Stack";
import { Topic } from "@lichtblick/suite-base/players/types";
import { useMessagePathDrag } from "@lichtblick/suite-base/services/messagePathDragging";

import { TopicStatsChip } from "./TopicStatsChip";
import { useTopicListStyles } from "./useTopicListStyles";

/**
 * TopicRow - ROSトピック表示行コンポーネント
 *
 * @description
 * このコンポーネントは、TopicListの仮想化リスト内でROSトピックを表示する行コンポーネントです。
 * 以下の機能を提供します：
 *
 * **主要機能:**
 * - 📋 トピック名の表示（検索ハイライト付き）
 * - 🏷️ スキーマ名の表示（型情報）
 * - 📊 統計情報チップ（メッセージ数、頻度）
 * - 🔄 エイリアス表示（元のトピック名）
 * - 🖱️ ドラッグ&ドロップ対応
 * - 🎯 選択状態の視覚的表示
 * - 📱 複数選択時のバッジ表示
 *
 * **ドラッグ機能:**
 * - useMessagePathDrag フックによるドラッグ対応
 * - パネルへのドロップでチャート追加
 * - 複数選択時のアイテム数表示
 *
 * **表示要素:**
 * - トピック名（ハイライト付き）
 * - スキーマ名（型情報、セカンダリテキスト）
 * - エイリアス情報
 * - 統計チップ（TopicStatsChip）
 * - ドラッグハンドル（⋮アイコン）
 *
 * **依存関係:**
 * - HighlightChars: 検索文字列のハイライト表示
 * - TopicStatsChip: トピック統計情報の表示
 * - useMessagePathDrag: ドラッグ&ドロップ機能
 * - useTopicListStyles: スタイリング
 *
 * @param props - コンポーネントのプロパティ
 * @param props.topicResult - FZF検索結果（トピック情報 + ハイライト位置）
 * @param props.style - react-windowから渡されるスタイル
 * @param props.selected - 選択状態
 * @param props.onClick - クリックイベントハンドラー
 * @param props.onContextMenu - コンテキストメニューイベントハンドラー
 * @returns トピック行のJSX要素
 */
export function TopicRow({
  topicResult,
  style,
  selected,
  onClick,
  onContextMenu,
}: {
  topicResult: FzfResultItem<Topic>;
  style: React.CSSProperties;
  selected: boolean;
  onClick: React.MouseEventHandler<HTMLDivElement>;
  onContextMenu: React.MouseEventHandler<HTMLDivElement>;
}): React.JSX.Element {
  const { cx, classes } = useTopicListStyles();

  const topic = topicResult.item;

  // ドラッグ可能なメッセージパスアイテムの作成
  const item: DraggedMessagePath = useMemo(
    () => ({
      path: quoteTopicNameIfNeeded(topic.name),
      rootSchemaName: topic.schemaName,
      isTopic: true,
      isLeaf: false,
      topicName: topic.name,
    }),
    [topic.name, topic.schemaName],
  );

  // ドラッグ&ドロップ機能の初期化
  const { connectDragSource, connectDragPreview, cursor, isDragging, draggedItemCount } =
    useMessagePathDrag({
      item,
      selected,
    });

  // ドラッグソースとプレビューの両方を同じ要素に接続
  const combinedRef: React.Ref<HTMLDivElement> = useCallback(
    (el) => {
      connectDragSource(el);
      connectDragPreview(el);
    },
    [connectDragPreview, connectDragSource],
  );

  return (
    <div
      ref={combinedRef}
      className={cx(classes.row, {
        [classes.isDragging]: isDragging,
        [classes.selected]: selected,
      })}
      style={{ ...style, cursor }}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {/* 複数選択時のアイテム数バッジ */}
      {draggedItemCount > 1 && (
        <Badge color="primary" className={classes.countBadge} badgeContent={draggedItemCount} />
      )}

      {/* メインコンテンツ領域 */}
      <Stack flex="auto" alignItems="flex-start" overflow="hidden">
        {/* トピック名（ハイライト付き） */}
        <Typography variant="body2" noWrap className={classes.textContent}>
          <HighlightChars str={topic.name} indices={topicResult.positions} />
          {/* エイリアス情報の表示 */}
          {topic.aliasedFromName != undefined && (
            <Typography variant="caption" className={classes.aliasedTopicName}>
              from {topic.aliasedFromName}
            </Typography>
          )}
        </Typography>

        {/* スキーマ名（型情報） */}
        {topic.schemaName != undefined && (
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            className={classes.textContent}
          >
            <HighlightChars
              str={topic.schemaName}
              indices={topicResult.positions}
              offset={topic.name.length + 1}
            />
          </Typography>
        )}
      </Stack>

      {/* 統計情報チップ */}
      <TopicStatsChip selected={selected} topicName={topic.name} />

      {/* ドラッグハンドル */}
      <div data-testid="TopicListDragHandle" className={classes.dragHandle}>
        <ReOrderDotsVertical16Regular />
      </div>
    </div>
  );
}
