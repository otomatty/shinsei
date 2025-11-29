// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * @fileoverview MessagePipelineProvider - データ処理パイプラインの中核実装
 *
 * このファイルは、Lichtblickアプリケーションにおけるデータ処理パイプラインの
 * 中核となるProvider実装を提供している。Player、パネル、状態管理システムを
 * 統合し、効率的なデータフローとレンダリング制御を実現する重要なコンポーネント。
 *
 * ## アーキテクチャ概要
 *
 * ### 1. MessagePipelineProvider - 統合管理システム
 * - **Player統合**: 異なるPlayerタイプの統一管理
 * - **状態管理**: Zustandベースの高性能状態管理
 * - **フレーム制御**: 60FPS制限とパフォーマンス最適化
 * - **メモリ管理**: メモリリーク防止とリソース効率化
 *
 * ### 2. データフロー設計
 * ```
 * Player.setListener() → createPlayerListener() → store.dispatch()
 *                                                        ↓
 * useMessagePipeline() ← ContextInternal.Provider ← MessagePipelineContext
 * ```
 *
 * ### 3. パフォーマンス最適化戦略
 * - **デバウンス処理**: サブスクリプション更新の効率化
 * - **フレームレート制御**: 設定可能なメッセージレート制限
 * - **メモリリーク対策**: V8クロージャ問題の解決
 * - **グローバル変数最適化**: 不要な再レンダリング防止
 *
 * ## 主要機能
 *
 * ### Player統合システム
 * - 複数Playerタイプ（bag、MCAP、ライブ等）の統一管理
 * - Player切り替え時の状態クリーンアップ
 * - エラーハンドリングとアラート管理
 * - リソース解放とメモリ管理
 *
 * ### フレーム制御システム
 * - 設定可能なメッセージフレームレート（デフォルト60FPS）
 * - パネル処理時間の動的調整
 * - 非同期処理の適切な待機
 * - レンダリング完了通知システム
 *
 * ### サブスクリプション管理
 * - デバウンス処理による効率的な更新
 * - パネル別サブスクリプションの統合
 * - 重複購読の最適化
 * - 動的サブスクリプション変更対応
 *
 * ## 設計思想
 *
 * ### 1. パフォーマンス重視
 * 大容量データとリアルタイム処理に対応するため、
 * フレームレート制御とメモリ効率を最優先に設計
 *
 * ### 2. メモリリーク対策
 * V8エンジンのクロージャ共有問題を解決するため、
 * createPlayerListener()を独立関数として分離
 *
 * ### 3. 拡張性
 * 新しいPlayerタイプや機能追加に対応可能な
 * 柔軟なアーキテクチャ設計
 *
 * @see {@link ./types.ts} - 型定義の詳細
 * @see {@link ./store.ts} - 状態管理の実装
 * @see {@link ../players/types.ts} - Player型定義
 */

import * as _ from "lodash-es";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { StoreApi, useStore } from "zustand";

import { useGuaranteedContext } from "@lichtblick/hooks";
import { Immutable } from "@lichtblick/suite";
import { AppSetting } from "@lichtblick/suite-base/AppSetting";
import CurrentLayoutContext, {
  LayoutState,
} from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { useAppConfigurationValue } from "@lichtblick/suite-base/hooks/useAppConfigurationValue";
import { GlobalVariables } from "@lichtblick/suite-base/hooks/useGlobalVariables";
import {
  Player,
  PlayerAlert,
  PlayerState,
  SubscribePayload,
} from "@lichtblick/suite-base/players/types";

import MessageOrderTracker from "./MessageOrderTracker";
import { pauseFrameForPromises, FramePromise } from "./pauseFrameForPromise";
import {
  MessagePipelineInternalState,
  createMessagePipelineStore,
  defaultPlayerState,
} from "./store";
import { MessagePipelineContext } from "./types";

export type { MessagePipelineContext };

/**
 * 空のグローバル変数オブジェクト
 * レイアウトでグローバル変数が未定義の場合のフォールバック値
 * Object.freeze()により不変性を保証
 */
const EMPTY_GLOBAL_VARIABLES: GlobalVariables = Object.freeze({});

/**
 * MessagePipeline内部状態用Context
 * MockMessagePipelineProviderでの使用のためexportされている
 * 通常のパネルコンポーネントは直接使用せず、useMessagePipeline()を使用すること
 */
export const ContextInternal = createContext<StoreApi<MessagePipelineInternalState> | undefined>(
  undefined,
);

/**
 * MessagePipelineゲッター関数を返すカスタムフック
 *
 * useCallbackフック内で最新のパイプライン値にアクセスしたいが、
 * 変更のたびにコールバック依存関係を無効化したくない場合に使用される。
 *
 * 主な用途：
 * - イベントハンドラー内での最新状態アクセス
 * - 非同期処理内での状態参照
 * - パフォーマンスが重要な処理での状態取得
 *
 * @returns 現在のMessagePipelineContextを返す関数
 *
 * @example
 * ```tsx
 * function MyPanel() {
 *   const getMessagePipeline = useMessagePipelineGetter();
 *
 *   const handleClick = useCallback(() => {
 *     const { playerState } = getMessagePipeline();
 *     console.log("Current player state:", playerState);
 *   }, []); // 依存配列が空でも最新状態にアクセス可能
 * }
 * ```
 */
export function useMessagePipelineGetter(): () => MessagePipelineContext {
  const store = useGuaranteedContext(ContextInternal);
  return useCallback(() => store.getState().public, [store]);
}

/**
 * MessagePipelineセレクター関数を使用するカスタムフック
 *
 * MessagePipelineContextから必要な部分のみを選択的に取得し、
 * 不要な再レンダリングを防止する最適化されたフック。
 * ZustandのuseStore()をベースとした高性能な実装。
 *
 * @param selector - MessagePipelineContextから必要な値を選択する関数
 * @returns セレクター関数が返す値
 *
 * @example
 * ```tsx
 * function MyPanel() {
 *   const { playerState, setSubscriptions } = useMessagePipeline(
 *     useCallback((ctx) => ({
 *       playerState: ctx.playerState,
 *       setSubscriptions: ctx.setSubscriptions,
 *     }), [])
 *   );
 * }
 * ```
 */
export function useMessagePipeline<T>(selector: (arg0: MessagePipelineContext) => T): T {
  const store = useGuaranteedContext(ContextInternal);
  return useStore(
    store,
    useCallback((state) => selector(state.public), [selector]),
  );
}

/**
 * MessagePipeline状態変更購読関数を返すカスタムフック
 *
 * MessagePipelineContextの状態変更を直接監視したい場合に使用。
 * React外部からの状態監視や、カスタムエフェクト処理で活用される。
 *
 * @returns 状態変更監視関数を登録する関数
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const subscribe = useMessagePipelineSubscribe();
 *
 *   useEffect(() => {
 *     const unsubscribe = subscribe((state) => {
 *       console.log("Pipeline state changed:", state);
 *     });
 *     return unsubscribe;
 *   }, [subscribe]);
 * }
 * ```
 */
export function useMessagePipelineSubscribe(): (
  fn: (state: MessagePipelineContext) => void,
) => () => void {
  const store = useGuaranteedContext(ContextInternal);

  return useCallback(
    (fn: (state: MessagePipelineContext) => void) => {
      return store.subscribe((state) => {
        fn(state.public);
      });
    },
    [store],
  );
}

/**
 * MessagePipelineProviderのプロパティ型定義
 */
type ProviderProps = {
  /** 子コンポーネント */
  children: React.ReactNode;

  /**
   * Player インスタンス（オプショナル）
   *
   * 以下の状態を表す：
   * - undefined: Playerが存在しない状態
   * - Player: 構築中または有効なPlayerインスタンス
   *
   * MessagePipelineProviderはPlayerの構築には責任を持たず、
   * 渡されたPlayer状態の情報をコンテキストとして下流に提供する役割を担う。
   */
  player?: Player;
};

/**
 * 内部状態からrenderDone関数を選択するセレクター
 */
const selectRenderDone = (state: MessagePipelineInternalState) => state.renderDone;

/**
 * 内部状態からサブスクリプション配列を選択するセレクター
 */
const selectSubscriptions = (state: MessagePipelineInternalState) => state.public.subscriptions;

/**
 * MessagePipelineProvider - データ処理パイプラインの中核Provider
 *
 * このコンポーネントは、Lichtblickアプリケーションにおけるデータ処理の中枢として機能し、
 * Player、パネル、状態管理システムを統合した統一的なデータアクセス層を提供する。
 *
 * ## 主要責任
 *
 * ### 1. Player統合管理
 * - Player変更時の状態クリーンアップ
 * - リスナー登録とリソース解放
 * - エラーハンドリングとアラート管理
 *
 * ### 2. サブスクリプション管理
 * - パネル別サブスクリプションの統合
 * - デバウンス処理による効率的な更新
 * - Player設定の動的更新
 *
 * ### 3. フレーム制御
 * - 設定可能なメッセージフレームレート
 * - レンダリング完了通知
 * - 非同期処理の適切な待機
 *
 * ### 4. グローバル変数管理
 * - レイアウトコンテキストとの連携
 * - 変更検出による効率的な更新
 * - Player設定の自動同期
 *
 * ## パフォーマンス最適化
 *
 * ### デバウンス処理
 * サブスクリプション更新は0msのデバウンスにより、
 * 複数の変更を1回の更新にまとめて効率化している。
 *
 * ### フレームレート制御
 * APP_SETTING.MESSAGE_RATEによりフレームレートを制御し、
 * 高頻度データの処理負荷を調整している。
 *
 * ### メモリリーク対策
 * Player変更時にストアを完全に再作成することで、
 * 前のPlayerの状態やメモリリークを防止している。
 *
 * @param props - Provider設定プロパティ
 * @returns MessagePipelineContext を提供するProvider要素
 *
 * @example
 * ```tsx
 * function App() {
 *   const [player, setPlayer] = useState<Player>();
 *
 *   return (
 *     <MessagePipelineProvider player={player}>
 *       <Workspace />
 *     </MessagePipelineProvider>
 *   );
 * }
 * ```
 */
export function MessagePipelineProvider({ children, player }: ProviderProps): React.ReactElement {
  /**
   * フレーム一時停止Promise配列への参照
   * pauseFrame()機能で使用される非同期処理制御用
   */
  const promisesToWaitForRef = useRef<FramePromise[]>([]);

  /**
   * MessagePipelineストアの作成
   *
   * Playerが変更されるたびに新しいストアを作成する。
   * これにより前のストアの状態を破棄し、パイプライン関数と参照を再作成する。
   * 前のストアの状態を保持しないことで、メモリリークを防止している。
   *
   * 注意: この処理により、パネルが登録したpublisher、subscriberなどは破棄される。
   * これは意図的な動作で、<Workspace>がPlayer変更時に全パネルを再マウントするため、
   * 再マウントされたパネルが新しいpublisherとsubscriberを再初期化する。
   */
  const store = useMemo(() => {
    return createMessagePipelineStore({ promisesToWaitForRef, initialPlayer: player });
  }, [player]);

  const subscriptions = useStore(store, selectSubscriptions);

  /**
   * Playerサブスクリプション更新のデバウンス処理
   *
   * 複数のsubscribe呼び出しを1回の更新にまとめ、
   * 即座に破棄されるデータの取得を回避する。
   *
   * 0msの遅延は意図的で、1タイムアウトサイクルで更新をバッチ処理するため。
   */
  const debouncedPlayerSetSubscriptions = useMemo(() => {
    return _.debounce((subs: Immutable<SubscribePayload[]>) => {
      player?.setSubscriptions(subs);
    });
  }, [player]);

  /**
   * アンマウント時またはデバウンス関数変更時のクリーンアップ
   */
  useEffect(() => {
    return () => {
      debouncedPlayerSetSubscriptions.cancel();
    };
  }, [debouncedPlayerSetSubscriptions]);

  /**
   * サブスクリプション変更時のPlayer更新
   */
  useEffect(
    () => debouncedPlayerSetSubscriptions(subscriptions),
    [debouncedPlayerSetSubscriptions, subscriptions],
  );

  /**
   * メッセージフレームレート制御
   * 設定値が60未満の場合、メッセージパイプラインのフレームレートを制限
   */
  const [messageRate] = useAppConfigurationValue<number>(AppSetting.MESSAGE_RATE);

  /**
   * レイアウト完了通知
   * レンダリング完了をリスナーに通知する
   */
  const renderDone = useStore(store, selectRenderDone);
  useLayoutEffect(() => {
    renderDone?.();
  }, [renderDone]);

  /**
   * フレーム時間計算用参照
   * メッセージレート設定に基づいてフレーム時間を動的に計算
   */
  const msPerFrameRef = useRef<number>(16);
  msPerFrameRef.current = 1000 / (messageRate ?? 60);

  /**
   * グローバル変数変更時の再レンダリング回避
   *
   * グローバル変数変更時にMessagePipelineProviderと全子要素の再レンダリングを避けるため、
   * コンテキストに直接リスナーを登録してグローバル変数の更新を追跡する。
   *
   * このコンポーネント内でReact状態更新が不要なため、再レンダリングは必要ない。
   */
  const currentLayoutContext = useContext(CurrentLayoutContext);

  useEffect(() => {
    /**
     * 最後に受信したグローバル変数のインスタンス追跡
     * 変更されていない場合のPlayer通知を避け、不要な処理を防止
     */
    let lastGlobalVariablesInstance: GlobalVariables | undefined =
      currentLayoutContext?.actions.getCurrentLayoutState().selectedLayout?.data?.globalVariables ??
      EMPTY_GLOBAL_VARIABLES;

    player?.setGlobalVariables(lastGlobalVariablesInstance);

    /**
     * レイアウト状態更新時のグローバル変数同期
     */
    const onLayoutStateUpdate = (state: LayoutState) => {
      const globalVariables = state.selectedLayout?.data?.globalVariables ?? EMPTY_GLOBAL_VARIABLES;
      if (globalVariables !== lastGlobalVariablesInstance) {
        lastGlobalVariablesInstance = globalVariables;
        player?.setGlobalVariables(globalVariables);
      }
    };

    currentLayoutContext?.addLayoutStateListener(onLayoutStateUpdate);
    return () => {
      currentLayoutContext?.removeLayoutStateListener(onLayoutStateUpdate);
    };
  }, [currentLayoutContext, player]);

  /**
   * Player変更時の状態管理とリスナー設定
   */
  useEffect(() => {
    const dispatch = store.getState().dispatch;
    if (!player) {
      /**
       * Playerが存在しない場合、デフォルト状態に戻して
       * Playerが存在しないことを示す
       */
      dispatch({
        type: "update-player-state",
        playerState: defaultPlayerState(),
        renderDone: undefined,
      });
      return;
    }

    /**
     * Playerリスナーの作成と設定
     * メモリリーク対策のため独立関数として実装
     */
    const { listener, cleanupListener } = createPlayerListener({
      msPerFrameRef,
      promisesToWaitForRef,
      store,
    });
    player.setListener(listener);

    /**
     * Player変更時のクリーンアップ処理
     */
    return () => {
      cleanupListener();
      player.close();
      dispatch({
        type: "update-player-state",
        playerState: defaultPlayerState(),
        renderDone: undefined,
      });
    };
  }, [player, store]);

  return <ContextInternal.Provider value={store}>{children}</ContextInternal.Provider>;
}

/**
 * PlayerStateとPlayerAlert配列を結合する関数
 *
 * 既存のPlayerアラートに新しいアラートを追加する。
 * アラートが空の場合は元の状態をそのまま返す。
 *
 * @param origState - 元のPlayerState
 * @param alerts - 追加するPlayerAlert配列
 * @returns アラートが結合された新しいPlayerState
 */
function concatAlerts(origState: PlayerState, alerts: PlayerAlert[]): PlayerState {
  if (alerts.length === 0) {
    return origState;
  }

  return {
    ...origState,
    alerts: alerts.concat(origState.alerts ?? []),
  };
}

/**
 * Playerリスナー作成関数 - メモリリーク対策のための独立実装
 *
 * この関数は、メモリリークを防ぐために独立した関数として抽出されている。
 * 外部関数内で複数のクロージャが作成される場合、V8は内部クロージャ間で
 * 共有する「context」オブジェクトを1つ割り当て、アクセスする共有変数を保持する。
 * 内部クロージャの1つでも生きている限り、contextと**すべて**の共有変数が生き続ける。
 *
 * MessagePipelineProviderの場合、`listener`クロージャが上記のuseEffect内で
 * 直接作成されると、`usePlayerState()`が返すplayer `state`変数も保持する
 * 共有contextを保持することになる。特に、listenerクロージャは実際には
 * それを使用していないにも関わらず。特に、useEffect内で新しいplayerが
 * 作成されるたびに、（listenerクロージャを介して）古いplayerの状態を
 * 保持することになり、新しいデータソースが交換されるにつれて各playerが
 * 生成した最後の状態（したがってプリロードされたメッセージブロックも）が
 * 無期限に保持される「連結リスト」効果を引き起こす。
 *
 * この問題を回避するため、他のクロージャでの使用により共有contextに
 * 保持される可能性がある外部スコープの変数を参照しないモジュールレベルの
 * 関数にクロージャ作成を抽出している。
 *
 * このタイプのリークについては以下で議論されている：
 * - https://bugs.chromium.org/p/chromium/issues/detail?id=315190
 * - http://point.davidglasser.net/2013/06/27/surprising-javascript-memory-leak.html
 * - https://stackoverflow.com/questions/53985411/understanding-javascript-closure-variable-capture-in-v8
 *
 * @param args - リスナー作成に必要な引数
 * @returns リスナー関数とクリーンアップ関数のペア
 */
function createPlayerListener(args: {
  msPerFrameRef: React.MutableRefObject<number>;
  promisesToWaitForRef: React.MutableRefObject<FramePromise[]>;
  store: StoreApi<MessagePipelineInternalState>;
}): {
  listener: (state: PlayerState) => Promise<void>;
  cleanupListener: () => void;
} {
  const { msPerFrameRef, promisesToWaitForRef, store } = args;
  const updateState = store.getState().dispatch;
  const messageOrderTracker = new MessageOrderTracker();
  let closed = false;
  let prevPlayerId: string | undefined;
  let resolveFn: undefined | (() => void);

  /**
   * Playerリスナー関数
   *
   * Player状態変更時に呼び出され、以下の処理を実行：
   * 1. メッセージ順序チェック
   * 2. アラート結合
   * 3. フレーム制御
   * 4. 状態更新
   */
  const listener = async (listenerPlayerState: PlayerState) => {
    if (closed) {
      return;
    }

    if (resolveFn) {
      throw new Error("New playerState was emitted before last playerState was rendered.");
    }

    /**
     * 順序不正やシンク外れメッセージのチェック
     */
    const alerts = messageOrderTracker.update(listenerPlayerState);
    const newPlayerState = concatAlerts(listenerPlayerState, alerts);

    /**
     * レンダリング完了待機用Promise
     */
    const promise = new Promise<void>((resolve) => {
      resolveFn = () => {
        resolveFn = undefined;
        resolve();
      };
    });

    /**
     * 状態更新開始時刻の記録
     * レイアウトエフェクトがrenderDoneを呼び出すタイミングとペアになる
     */
    const start = Date.now();

    /**
     * レンダリング完了処理
     *
     * コンポーネントレンダリング後にレイアウトエフェクトによって呼び出される。
     * コンポーネントレンダリング後、パネルがpauseを呼び出すための
     * アニメーションフレームを1つ開始する。
     */
    let called = false;
    function renderDone() {
      if (called) {
        return;
      }
      called = true;

      /**
       * このフレームが完了するまでの残り時間を計算
       */
      const delta = Date.now() - start;
      const frameTime = Math.max(0, msPerFrameRef.current - delta);

      /**
       * パネルは残りフレーム時間内でpauseを呼び出す
       */
      setTimeout(async () => {
        if (closed) {
          return;
        }

        const promisesToWaitFor = promisesToWaitForRef.current;
        if (promisesToWaitFor.length > 0) {
          promisesToWaitForRef.current = [];
          await pauseFrameForPromises(promisesToWaitFor);
        }

        if (!resolveFn) {
          return;
        }
        resolveFn();
      }, frameTime);
    }

    /**
     * Player変更時の状態リセット
     */
    if (prevPlayerId != undefined && listenerPlayerState.playerId !== prevPlayerId) {
      store.getState().reset();
    }
    prevPlayerId = listenerPlayerState.playerId;

    /**
     * 状態更新の実行
     */
    updateState({
      type: "update-player-state",
      playerState: newPlayerState,
      renderDone,
    });

    await promise;
  };

  return {
    listener,
    /**
     * リスナークリーンアップ関数
     */
    cleanupListener() {
      closed = true;
      resolveFn = undefined;
    },
  };
}
