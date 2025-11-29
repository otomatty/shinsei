// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * VerticalBarWrapper - 垂直線表示ラッパーコンポーネント
 *
 * このコンポーネントは、チャート上に垂直線を表示するための
 * 低レベルコンポーネントです。チャートスケールとX値を受け取り、
 * 適切なピクセル位置に垂直線を配置します。
 * ホバーバーやプレイバックカーソルなどの表示に使用されます。
 *
 * ## 主要な機能
 *
 * ### 1. 位置計算
 * - **スケール変換**: データ値からピクセル位置への変換
 * - **境界チェック**: 表示領域外の場合の非表示処理
 * - **精密計算**: 浮動小数点による正確な位置決定
 *
 * ### 2. 表示制御
 * - **条件付き表示**: 有効な位置の場合のみ表示
 * - **スムーズ移動**: CSS transformによる高性能アニメーション
 * - **レイヤー管理**: absolute positioningによる重ね合わせ
 *
 * ### 3. パフォーマンス最適化
 * - **useMemo**: 位置計算の最適化
 * - **will-change**: ブラウザ最適化ヒント
 * - **pointer-events: none**: マウスイベントの透過
 *
 * ## 使用例
 *
 * ### ホバーバー表示
 * ```tsx
 * <VerticalBarWrapper scales={chartScales} xValue={hoverX}>
 *   <div style={{
 *     width: 1,
 *     height: '100%',
 *     backgroundColor: 'rgba(255, 255, 255, 0.8)'
 *   }} />
 * </VerticalBarWrapper>
 * ```
 *
 * ### プレイバックカーソル
 * ```tsx
 * <VerticalBarWrapper scales={chartScales} xValue={currentTime}>
 *   <div style={{
 *     width: 2,
 *     height: '100%',
 *     backgroundColor: '#ff0000'
 *   }} />
 * </VerticalBarWrapper>
 * ```
 *
 * ### 複数の垂直線
 * ```tsx
 * {markers.map((marker, index) => (
 *   <VerticalBarWrapper key={index} scales={scales} xValue={marker.x}>
 *     <MarkerLine color={marker.color} />
 *   </VerticalBarWrapper>
 * ))}
 * ```
 *
 * ## Props仕様
 *
 * ### scales?: RpcScales
 * - チャートの現在のスケール情報
 * - X軸の範囲とピクセル情報が必要
 * - 未定義の場合は非表示
 *
 * ### xValue?: number
 * - 垂直線を表示するX軸上の値
 * - データ座標系での値
 * - 未定義の場合は非表示
 *
 * ## 位置計算アルゴリズム
 *
 * ### スケール変換
 * ```typescript
 * const pixels = xScale.pixelMax - xScale.pixelMin;  // ピクセル幅
 * const range = xScale.max - xScale.min;             // データ範囲
 * const pos = (xValue - xScale.min) / (range / pixels) + xScale.pixelMin;
 * ```
 *
 * ### 境界チェック
 * ```typescript
 * if (pos < xScale.pixelMin || pos > xScale.pixelMax) {
 *   return; // 表示領域外の場合は非表示
 * }
 * ```
 *
 * ### CSS変換
 * ```typescript
 * const style = {
 *   visibility: 'visible',
 *   transform: `translateX(${positionX}px)`
 * };
 * ```
 *
 * ## スタイリング
 *
 * ### ベーススタイル
 * - **position: absolute**: 絶対位置指定
 * - **top: 0, bottom: 0**: 垂直方向フル高
 * - **pointer-events: none**: マウスイベント透過
 * - **will-change: transform**: パフォーマンス最適化
 *
 * ### 動的スタイル
 * - **visibility**: 表示/非表示の制御
 * - **transform**: X軸位置の指定
 * - **NaN処理**: 無効な値での非表示
 *
 * ## パフォーマンス特性
 *
 * ### 計算最適化
 * - useMemoによる位置計算のキャッシュ
 * - 依存関係の最小化
 * - 不要な再計算の回避
 *
 * ### レンダリング最適化
 * - CSS transformによるGPU加速
 * - will-changeによるブラウザヒント
 * - 条件付きレンダリングによる負荷軽減
 *
 * ## 関連コンポーネント
 *
 * - `HoverBar`: このコンポーネントを使用する上位コンポーネント
 * - `TimeBasedChart`: 最終的な使用先
 * - `RpcScales`: スケール情報の型定義
 *
 * ## 注意事項
 *
 * - スケール情報が不完全な場合は非表示
 * - X値が範囲外の場合は自動的に非表示
 * - 子要素は適切な垂直線スタイルを持つ必要がある
 * - pointer-eventsが無効化されているため、マウスイベントは透過
 * - transformアニメーションは60fpsでの滑らかな動作を前提
 */

import { CSSProperties, useMemo } from "react";
import { makeStyles } from "tss-react/mui";

import { RpcScales } from "@lichtblick/suite-base/components/Chart/types";

const useStyles = makeStyles()(() => ({
  root: {
    top: 0,
    bottom: 0,
    position: "absolute",
    pointerEvents: "none",
    willChange: "transform",
    visibility: "hidden",
  },
}));

/**
 * VerticalBarWrapperProps - VerticalBarWrapperのプロパティ型定義
 */
type VerticalBarWrapperProps = {
  /** チャートの現在のスケール情報 */
  scales?: RpcScales;
  /** 垂直線を表示するX軸上の値 */
  xValue?: number;
};

/**
 * VerticalBarWrapper - 垂直線表示ラッパーコンポーネント
 *
 * チャート上に垂直線を表示するための低レベルコンポーネント。
 * スケール変換とピクセル位置計算を行い、子要素を適切な位置に配置します。
 * ホバーバーやプレイバックカーソルなどの実装に使用されます。
 *
 * @param children - 垂直線として表示する子要素
 * @param scales - チャートスケール情報
 * @param xValue - 表示位置のX軸値
 */
export function VerticalBarWrapper({
  children,
  scales,
  xValue,
}: React.PropsWithChildren<VerticalBarWrapperProps>): React.JSX.Element {
  const { classes } = useStyles();

  /**
   * positionX - ピクセル位置の計算
   *
   * データ座標系のX値をピクセル座標に変換し、
   * 表示領域内かどうかをチェックします。
   */
  const positionX = useMemo(() => {
    const xScale = scales?.x;
    if (!xScale || xValue == undefined) {
      return;
    }

    const pixels = xScale.pixelMax - xScale.pixelMin;
    const range = xScale.max - xScale.min;

    if (pixels === 0 || range === 0) {
      return;
    }

    const pos = (xValue - xScale.min) / (range / pixels) + xScale.pixelMin;
    // don't show hoverbar if it falls outsize our boundary
    if (pos < xScale.pixelMin || pos > xScale.pixelMax) {
      return;
    }
    return pos;
  }, [scales?.x, xValue]);

  /**
   * style - 動的スタイルの生成
   *
   * 計算されたピクセル位置に基づいて、
   * 表示状態とtransform値を決定します。
   */
  const style = useMemo((): CSSProperties => {
    if (positionX == undefined || isNaN(positionX)) {
      return { visibility: "hidden", transform: undefined };
    }
    return { visibility: "visible", transform: `translateX(${positionX}px)` };
  }, [positionX]);

  return (
    <div className={classes.root} style={style}>
      {children}
    </div>
  );
}
