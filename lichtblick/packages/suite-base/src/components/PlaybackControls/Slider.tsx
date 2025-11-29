// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * Slider - 汎用スライダーコンポーネント
 *
 * @overview
 * 0-1 の範囲での値操作を提供する汎用スライダーコンポーネント。
 * Scrubber コンポーネントのベースとして使用され、
 * マウス/ポインターベースの操作とホバーフィードバックを提供。
 * 高度なポインターイベント処理により、デスクトップとモバイルの両方に対応。
 *
 * @features
 * - **値操作**: 0-1 範囲での連続値制御
 * - **ポインター操作**: マウス、タッチ、ペンデバイス対応
 * - **ドラッグ操作**: スムーズなドラッグ＆ドロップ機能
 * - **ホバー管理**: ホバー状態の詳細な追跡と通知
 * - **カスタマイズ**: レンダリング関数による柔軟な表示制御
 * - **無効状態**: 操作無効時の適切な処理
 * - **境界制御**: 値の適切なクランプ処理
 *
 * @architecture
 * - **React Hooks**: useState, useCallback, useLayoutEffect による状態管理
 * - **DOM参照**: useRef による直接的な要素アクセス
 * - **ポインターイベント**: 統一的なポインター操作処理
 * - **数学的変換**: scaleValue による座標変換
 * - **lodash**: clamp 関数による値の境界制御
 * - **tss-react/mui**: Material-UI テーマ統合
 *
 * @interactionBehavior
 * 1. **ホバー検出**: マウス移動時の位置計算と通知
 * 2. **ポインター押下**: ドラッグ開始の検出
 * 3. **ドラッグ処理**: ポインター移動の追跡と値更新
 * 4. **値計算**: 座標から fraction 値への変換
 * 5. **境界制御**: 0-1 範囲への自動クランプ
 * 6. **通知送信**: 変更とホバーイベントのコールバック実行
 *
 * @pointerEventHandling
 * - **PointerDown**: ドラッグ開始、初期値設定
 * - **PointerMove**: ドラッグ中の値更新、ホバー位置更新
 * - **PointerUp**: ドラッグ終了（グローバルリスナーで処理）
 * - **MouseEnter/Leave**: ホバー状態の管理
 *
 * @coordinateTransformation
 * ```
 * clientX → 要素内相対位置 → fraction(0-1) → 値変更通知
 * ```
 *
 * @performanceOptimizations
 * - **useCallback**: イベントハンドラーのメモ化
 * - **useLayoutEffect**: DOM 更新との同期処理
 * - **条件付きイベント**: 不要なイベント処理の回避
 * - **効率的な座標計算**: getBoundingClientRect の最適な使用
 *
 * @customization
 * renderSlider 関数により、スライダーの視覚的表現を完全にカスタマイズ可能：
 * - カスタムマーカー
 * - 複数のインジケーター
 * - アニメーション効果
 * - テーマ対応スタイリング
 *
 * @accessibility
 * - **ポインターデバイス**: マウス、タッチ、ペン対応
 * - **視覚的フィードバック**: ホバー状態の適切な表示
 * - **無効状態**: 操作不可時の明確な表示
 *
 * @errorHandling
 * - **境界チェック**: getBoundingClientRect の安全な使用
 * - **値のクランプ**: 不正な値の自動修正
 * - **null/undefined**: 安全なプロパティアクセス
 *
 * @dependencies
 * - **lodash-es**: clamp 関数による値の境界制御
 * - **@lichtblick/den/math**: scaleValue による数学的変換
 * - **tss-react/mui**: Material-UI テーマ統合
 * - **React**: Hooks による状態管理
 *
 * @usageExample
 * ```tsx
 * <Slider
 *   fraction={currentProgress}
 *   onChange={(value) => setProgress(value)}
 *   onHoverOver={({ fraction, clientX, clientY }) => showTooltip(fraction)}
 *   onHoverOut={() => hideTooltip()}
 *   renderSlider={(fraction) => (
 *     <CustomMarker position={fraction * 100} />
 *   )}
 * />
 * ```
 *
 * @relatedComponents
 * - **Scrubber**: このスライダーを使用するタイムライン操作コンポーネント
 * - **ProgressPlot**: 背景の進捗表示コンポーネント
 * - **EventsOverlay**: イベントマーカー表示コンポーネント
 */

import * as _ from "lodash-es";
import { useCallback, useEffect, useRef, ReactNode, useState, useLayoutEffect } from "react";
import { makeStyles } from "tss-react/mui";

import { scaleValue } from "@lichtblick/den/math";

/**
 * ホバーイベントの情報
 *
 * @interface HoverOverEvent
 * @description
 * ホバー時に発生するイベントの詳細情報。
 * クライアント座標系での位置と、fraction値を含む。
 */
export type HoverOverEvent = {
  /** ホバー位置の fraction 値（0-1） */
  fraction: number;
  /** 現在のマウス X 座標（クライアント座標系） */
  clientX: number;
  /** 現在のマウス Y 座標（クライアント座標系） */
  clientY: number;
};

/**
 * Slider のプロパティ
 *
 * @interface Props
 * @description
 * スライダーコンポーネントの動作を制御するプロパティ定義。
 * 値の管理、イベント処理、カスタマイズ機能を包含。
 */
type Props = {
  /** 現在の値（0-1 の範囲）*/
  fraction: number | undefined;
  /** 無効状態かどうか */
  disabled?: boolean;
  /** 値変更時のコールバック関数 */
  onChange: (value: number) => void;
  /** ホバー開始時のコールバック関数 */
  onHoverOver?: (event: HoverOverEvent) => void;
  /** ホバー終了時のコールバック関数 */
  onHoverOut?: () => void;
  /** カスタムスライダーレンダラー */
  renderSlider?: (value?: number) => ReactNode;
};

/**
 * Slider のスタイル定義
 *
 * @returns スタイルクラス
 */
const useStyles = makeStyles()((theme) => ({
  /**
   * スライダーのルートコンテナ
   *
   * @style
   * - レイアウト: flex で中央配置
   * - サイズ: 幅・高さ 100%
   * - 位置: relative（子要素の絶対位置の基準）
   * - カーソル: pointer（操作可能であることを示す）
   */
  root: {
    label: "Slider-root",
    display: "flex",
    width: "100%",
    height: "100%",
    position: "relative",
    alignItems: "center",
    cursor: "pointer",
  },
  /**
   * 無効状態のスライダー
   *
   * @style
   * - カーソル: not-allowed（操作不可を示す）
   * - 不透明度: テーマの disabled opacity
   */
  rootDisabled: {
    label: "Slider-rootDisabled",
    cursor: "not-allowed",
    opacity: theme.palette.action.disabledOpacity,
  },
  /**
   * スライダーの範囲表示
   *
   * @style
   * - 背景色: テーマの active カラー
   * - 位置: 絶対位置
   * - 高さ: 親要素の 100%
   */
  range: {
    label: "Slider-range",
    backgroundColor: theme.palette.action.active,
    position: "absolute",
    height: "100%",
  },
}));

/**
 * デフォルトのスライダーレンダラー
 *
 * @param value - 表示する値（0-1）
 * @param className - 適用する CSS クラス名
 * @returns スライダー要素または null
 */
function defaultRenderSlider(value: number | undefined, className: string): ReactNode {
  if (value == undefined || isNaN(value)) {
    return ReactNull;
  }
  return <div className={className} style={{ width: `${value * 100}%` }} />;
}

/**
 * Slider コンポーネント
 *
 * @param props - コンポーネントのプロパティ
 * @returns スライダーコンポーネント
 */
export default function Slider(props: Props): React.JSX.Element {
  const {
    fraction,
    disabled = false,
    renderSlider = defaultRenderSlider,
    onHoverOver,
    onHoverOut,
    onChange,
  } = props;
  const { classes, cx } = useStyles();

  /**
   * スライダー要素への参照
   *
   * @description
   * DOM要素への直接アクセスが必要な操作（getBoundingClientRect等）のための参照。
   * マウス位置から値への変換計算で要素の境界情報を取得するために使用。
   */
  const elRef = useRef<HTMLDivElement | ReactNull>(ReactNull);

  /**
   * マウス位置から値を計算
   *
   * @description
   * マウスのクライアント座標をスライダーの0-1範囲の値に変換する関数。
   * getBoundingClientRectで要素の境界を取得し、scaleValueで座標変換を実行。
   * 最終的にclampで0-1の範囲に制限して安全な値を返す。
   *
   * @algorithm
   * 1. 要素の存在確認
   * 2. getBoundingClientRect()で要素の境界座標を取得
   * 3. scaleValue()でclientXを left-right 範囲から 0-1 範囲に線形変換
   * 4. clamp()で結果を0-1の範囲に制限
   *
   * @coordinateTransformation
   * ```
   * clientX ∈ [left, right] → fraction ∈ [0, 1]
   * fraction = (clientX - left) / (right - left)
   * ```
   *
   * @param ev - マウスイベント（React.MouseEvent または MouseEvent）
   * @returns 0-1 の範囲の値（要素が存在しない場合は0）
   */
  const getValueAtMouse = useCallback((ev: React.MouseEvent | MouseEvent): number => {
    if (!elRef.current) {
      return 0;
    }
    const { left, right } = elRef.current.getBoundingClientRect();
    const scaled = scaleValue(ev.clientX, left, right, 0, 1);
    return _.clamp(scaled, 0, 1);
  }, []);

  /**
   * マウスダウン状態の管理
   *
   * @state
   * @description
   * マウスボタンが押下されている状態を管理する。
   * - true: ドラッグ操作中
   * - false: 通常状態
   * ドラッグ中はグローバルイベントリスナーが有効になり、
   * 要素外でのマウス移動にも追従する。
   */
  const [mouseDown, setMouseDown] = useState(false);

  /**
   * マウスダウン状態への参照
   *
   * @description
   * useLayoutEffectにより常に最新のmouseDown状態を参照可能。
   * イベントハンドラー内でのクロージャ問題を解決し、
   * 正確な状態判定を保証する。
   */
  const mouseDownRef = useRef(mouseDown);
  useLayoutEffect(() => {
    mouseDownRef.current = mouseDown;
  }, [mouseDown]);

  /**
   * マウスホバー状態の管理
   *
   * @state
   * @description
   * マウスがスライダー要素内にあるかどうかを管理する。
   * - true: 要素内にマウスが存在
   * - false: 要素外にマウスが存在
   * ホバー終了時の適切なタイミング判定に使用。
   */
  const [mouseInside, setMouseInside] = useState(false);

  /**
   * マウスホバー状態への参照
   *
   * @description
   * useLayoutEffectにより常に最新のmouseInside状態を参照可能。
   * イベントハンドラー内でのクロージャ問題を解決し、
   * ホバー状態の正確な判定を保証する。
   */
  const mouseInsideRef = useRef(mouseInside);
  useLayoutEffect(() => {
    mouseInsideRef.current = mouseInside;
  }, [mouseInside]);

  /**
   * マウス進入時の処理
   *
   * @description
   * マウスがスライダー要素に進入した際の処理。
   * mouseInside状態をtrueに設定し、ホバー状態を開始する。
   *
   * @eventBinding
   * onMouseEnterイベントにバインドされ、要素進入時に自動実行。
   */
  const onMouseEnter = useCallback(() => {
    setMouseInside(true);
  }, []);

  /**
   * マウス退出時の処理
   *
   * @description
   * マウスがスライダー要素から退出した際の処理。
   * mouseInside状態をfalseに設定し、ドラッグ中でない場合はホバー状態を終了。
   *
   * @conditionalHoverOut
   * ドラッグ中（mouseDownRef.current === true）の場合はホバー状態を維持し、
   * 通常時のみonHoverOut()を呼び出す。これにより、ドラッグ中に要素外に
   * マウスが移動してもホバー状態が継続される。
   *
   * @eventBinding
   * onMouseLeaveイベントにバインドされ、要素退出時に自動実行。
   */
  const onMouseLeave = useCallback(() => {
    setMouseInside(false);
    if (!mouseDownRef.current) {
      onHoverOut?.();
    }
  }, [onHoverOut]);

  /**
   * ポインターアップ時の処理
   *
   * @description
   * ポインター操作（マウス、タッチ、ペン）の終了時処理。
   * ドラッグ状態を解除し、要素外の場合はホバー状態も終了。
   *
   * @conditionalHoverOut
   * 要素内（mouseInsideRef.current === true）の場合はホバー状態を維持し、
   * 要素外の場合のみonHoverOut()を呼び出す。これにより、ドラッグ終了後も
   * マウスが要素内にある場合はホバー状態が継続される。
   *
   * @globalEventHandler
   * windowレベルのグローバルイベントハンドラーとして機能し、
   * 要素外でのポインターアップも検出する。
   */
  const onPointerUp = useCallback((): void => {
    setMouseDown(false);
    if (!mouseInsideRef.current) {
      onHoverOut?.();
    }
  }, [onHoverOut]);

  /**
   * ポインター移動時の処理
   *
   * @description
   * ポインター移動時の値計算とホバー処理を実行。
   * 要素ホバー時とドラッグ時の両方で使用される多目的ハンドラー。
   *
   * @dualPurpose
   * この関数は2つの異なるコンテキストで使用：
   * 1. **要素ホバー時**: div要素のonPointerMoveイベント
   * 2. **ドラッグ時**: windowのグローバルイベントリスナー
   *
   * @eventDeduplication
   * ドラッグ中（mouseDownRef.current === true）かつイベントソースが
   * div要素（ev.currentTarget !== window）の場合は処理をスキップ。
   * これにより、ドラッグ中の重複イベント処理を防ぐ。
   *
   * @disabledCheck
   * disabled状態の場合は全ての処理をスキップし、
   * 操作不可状態を保証する。
   *
   * @valueCalculationAndNotification
   * 1. getValueAtMouse()で現在位置の値を計算
   * 2. 要素の境界情報を取得してホバー座標を決定
   * 3. onHoverOver()でホバーイベントを通知
   * 4. ドラッグ中の場合はonChange()で値変更を通知
   *
   * @param ev - ポインターイベント（React.PointerEvent または PointerEvent）
   */
  const onPointerMove = useCallback(
    (ev: React.PointerEvent | PointerEvent): void => {
      if (mouseDownRef.current && ev.currentTarget !== window) {
        // onPointerMove は div 要素（ホバー用）と window（ドラッグ用）で使用される。
        // ドラッグ中は window イベントのみを処理する（重複イベント処理を避けるため）。
        return;
      }
      if (disabled) {
        return;
      }

      const val = getValueAtMouse(ev);
      if (elRef.current) {
        const elRect = elRef.current.getBoundingClientRect();
        onHoverOver?.({
          fraction: val,
          clientX: ev.clientX,
          clientY: elRect.y + elRect.height / 2,
        });
      }
      if (!mouseDownRef.current) {
        return;
      }
      onChange(val);
    },
    [disabled, getValueAtMouse, onChange, onHoverOver],
  );

  /**
   * ポインターダウン時の処理
   *
   * @description
   * ポインター操作（マウス、タッチ、ペン）の開始時処理。
   * ドラッグ状態を開始し、初期値を設定する。
   *
   * @disabledCheck
   * disabled状態の場合は全ての処理をスキップし、
   * 操作不可状態を保証する。
   *
   * @focusManagement
   * アクティブな要素（フォーカス中の要素）からフォーカスを外し、
   * スライダー操作に集中できる環境を作る。特にテキストフィールドの
   * 編集中にスライダーをクリックした場合の適切な処理を保証。
   *
   * @preventDefaultAndSetValue
   * 1. preventDefault()でデフォルトのブラウザ動作を無効化
   * 2. getValueAtMouse()で現在位置の値を計算
   * 3. onChange()で初期値を即座に設定
   * 4. setMouseDown(true)でドラッグ状態を開始
   *
   * @param ev - ポインターダウンイベント
   */
  const onPointerDown = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>): void => {
      if (disabled) {
        return;
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      ev.preventDefault();
      onChange(getValueAtMouse(ev));
      setMouseDown(true);
    },
    [disabled, getValueAtMouse, onChange],
  );

  /**
   * ドラッグ操作のためのグローバルイベントリスナー
   *
   * @description
   * マウスダウン中は window レベルでイベントを監視し、
   * スライダー要素外でのドラッグ操作にも対応。
   *
   * @globalEventManagement
   * ドラッグ状態（mouseDown === true）の間のみグローバルリスナーを設定：
   * - **pointerup**: ドラッグ終了の検出
   * - **pointermove**: 要素外でのドラッグ追従
   *
   * @memoryLeakPrevention
   * useEffectのクリーンアップ関数でイベントリスナーを確実に削除し、
   * メモリリークを防止。依存配列によりmouseDown状態の変化時のみ実行。
   *
   * @crossBoundaryDragging
   * この仕組みにより、ユーザーがスライダー要素外にマウスを移動しても
   * ドラッグ操作を継続でき、より直感的な操作性を実現。
   */
  useEffect(() => {
    if (mouseDown) {
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointermove", onPointerMove);
      return () => {
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointermove", onPointerMove);
      };
    }
    return undefined;
  }, [mouseDown, onPointerMove, onPointerUp]);

  return (
    <div
      ref={elRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cx(classes.root, {
        [classes.rootDisabled]: disabled,
      })}
    >
      {renderSlider(fraction, classes.range)}
    </div>
  );
}
