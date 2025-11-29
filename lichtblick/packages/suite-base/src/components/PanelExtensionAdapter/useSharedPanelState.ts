// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { useCallback, useMemo } from "react";

import { Immutable } from "@lichtblick/suite";
import { usePanelContext } from "@lichtblick/suite-base/components/PanelContext";
import {
  LayoutState,
  SharedPanelState,
  useCurrentLayoutActions,
  useCurrentLayoutSelector,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { getPanelTypeFromId } from "@lichtblick/suite-base/util/layout";

/**
 * 空の共有パネル状態
 *
 * @description デフォルト値として使用される空の共有パネル状態オブジェクト。
 * Object.freeze()によって不変性が保証されています。
 *
 * @constant
 */
const EmptySharedPanelState: Record<string, SharedPanelState> = Object.freeze({});

/**
 * レイアウト状態から共有パネル状態を選択するセレクター関数
 *
 * @param state - 現在のレイアウト状態
 * @returns 共有パネル状態、または利用できない場合は空のオブジェクト
 */
const selectSharedState = (state: LayoutState) => state.sharedPanelState ?? EmptySharedPanelState;

/**
 * 共有パネル状態管理フック
 *
 * @description 同じタイプのパネル間で状態を共有するためのReactフックです。
 * 一時的なパネル状態の読み取りと更新を行うための[state, setState]ペアを返します。
 *
 * ### 主要な機能
 * - **型安全性**: パネルタイプごとに独立した状態を管理
 * - **自動同期**: 同じタイプのパネル間で状態が自動的に同期される
 * - **パフォーマンス最適化**: useMemoとuseCallbackによる不要な再レンダリングを防止
 * - **一時的状態**: レイアウトの保存時には永続化されない一時的な状態のみを管理
 *
 * ### 使用例
 * ```typescript
 * function MyPanel() {
 *   const [sharedState, setSharedState] = useSharedPanelState();
 *
 *   // 共有状態の読み取り
 *   const currentSelection = sharedState?.selectedItem;
 *
 *   // 共有状態の更新
 *   const handleSelect = useCallback((item: string) => {
 *     setSharedState({ selectedItem: item });
 *   }, [setSharedState]);
 *
 *   return (
 *     <div>
 *       Current: {currentSelection}
 *       <button onClick={() => handleSelect("item1")}>
 *         Select Item 1
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * ### 注意点
 * - 共有状態は一時的なもので、レイアウト保存時には永続化されません
 * - 同じタイプのパネルでのみ状態が共有されます
 * - 大きなオブジェクトの格納は避け、必要最小限の状態のみを共有してください
 *
 * @returns 共有パネル状態とその更新関数のタプル
 * - `[0]`: 現在の共有状態（Immutable<SharedPanelState>）
 * - `[1]`: 状態更新関数（(data: Immutable<SharedPanelState>) => void）
 *
 * @example
 * ```typescript
 * // カメラ設定を共有するパネル
 * function CameraPanel() {
 *   const [sharedState, setSharedState] = useSharedPanelState();
 *
 *   const cameraPosition = sharedState?.cameraPosition ?? { x: 0, y: 0, z: 10 };
 *
 *   const updateCamera = useCallback((position: Vector3) => {
 *     setSharedState({ cameraPosition: position });
 *   }, [setSharedState]);
 *
 *   return <Camera position={cameraPosition} onMove={updateCamera} />;
 * }
 *
 * // 選択状態を共有するパネル
 * function SelectionPanel() {
 *   const [sharedState, setSharedState] = useSharedPanelState();
 *
 *   const selectedIds = sharedState?.selectedIds ?? [];
 *
 *   const toggleSelection = useCallback((id: string) => {
 *     const newSelection = selectedIds.includes(id)
 *       ? selectedIds.filter(item => item !== id)
 *       : [...selectedIds, id];
 *
 *     setSharedState({ selectedIds: newSelection });
 *   }, [selectedIds, setSharedState]);
 *
 *   return <ObjectList items={objects} selectedIds={selectedIds} onToggle={toggleSelection} />;
 * }
 * ```
 */
export function useSharedPanelState(): [
  Immutable<SharedPanelState>,
  (data: Immutable<SharedPanelState>) => void,
] {
  const sharedState = useCurrentLayoutSelector(selectSharedState);
  const { updateSharedPanelState } = useCurrentLayoutActions();

  const panelId = usePanelContext().id;
  const panelType = useMemo(() => getPanelTypeFromId(panelId), [panelId]);

  const sharedData = useMemo(() => sharedState[panelType], [panelType, sharedState]);

  const update = useCallback(
    (data: Immutable<SharedPanelState>) => {
      updateSharedPanelState(panelType, data);
    },
    [panelType, updateSharedPanelState],
  );

  return [sharedData, update];
}
