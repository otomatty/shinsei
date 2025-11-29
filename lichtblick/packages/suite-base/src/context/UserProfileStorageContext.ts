// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

import { LayoutID } from "@lichtblick/suite-base/context/CurrentLayoutContext";

/**
 * ユーザープロファイル情報の型定義
 *
 * ユーザーの個人設定、使用状況、オンボーディング状態を管理
 */
export type UserProfile = {
  /** ユーザーが現在作業中のレイアウトID */
  currentLayoutId?: LayoutID;

  /** ユーザーが初回アプリを読み込んだ時刻のタイムスタンプ */
  firstSeenTime?: string;

  /**
   * firstSeenTimeを割り当てた時点で、それがユーザーの初回アプリ読み込みだったかどうか
   *
   * 初回ユーザー体験の分析に使用
   */
  firstSeenTimeIsFirstLoad?: boolean;

  /** オンボーディングフローの状態 */
  onboarding?: {
    /** 設定ツールチップが表示されたパネルタイプのリスト */
    settingsTooltipShownForPanelTypes?: string[];
  };
};

/**
 * ユーザープロファイルストレージインターフェース
 *
 * ユーザープロファイル情報の永続化と取得を管理
 */
export type UserProfileStorage = {
  /**
   * ユーザープロファイル情報を取得
   *
   * @returns Promise<UserProfile> - ユーザープロファイル情報
   */
  getUserProfile: () => Promise<UserProfile>;

  /**
   * ユーザープロファイル情報を設定
   *
   * @param data - 設定するプロファイル情報または更新関数
   * @returns Promise<void>
   */
  setUserProfile: (data: UserProfile | ((profile: UserProfile) => UserProfile)) => Promise<void>;
};

/**
 * ## UserProfileStorageContext
 *
 * **ユーザープロファイル永続化管理のContext**
 *
 * ### 概要
 * - ユーザーの個人設定と使用状況の永続化を管理
 * - オンボーディング状態の追跡
 * - レイアウト使用履歴の管理
 * - 初回ユーザー体験の分析データ収集
 *
 * ### 主な機能
 * - **プロファイル永続化**: ユーザー設定の保存・読み込み
 * - **レイアウト履歴**: 最後に使用したレイアウトの記録
 * - **オンボーディング追跡**: ツールチップ表示状態の管理
 * - **初回体験分析**: 初回ユーザーの行動分析
 *
 * ### 使用例
 * ```typescript
 * import { useUserProfileStorage } from "./UserProfileStorageContext";
 *
 * function UserSettings() {
 *   const userProfileStorage = useUserProfileStorage();
 *   const [profile, setProfile] = useState<UserProfile>({});
 *
 *   // プロファイル読み込み
 *   useEffect(() => {
 *     const loadProfile = async () => {
 *       const userProfile = await userProfileStorage.getUserProfile();
 *       setProfile(userProfile);
 *     };
 *     loadProfile();
 *   }, [userProfileStorage]);
 *
 *   // レイアウト変更時の保存
 *   const handleLayoutChange = async (layoutId: LayoutID) => {
 *     await userProfileStorage.setUserProfile({
 *       ...profile,
 *       currentLayoutId: layoutId
 *     });
 *   };
 *
 *   // オンボーディング完了時の記録
 *   const handleTooltipShown = async (panelType: string) => {
 *     await userProfileStorage.setUserProfile(prevProfile => ({
 *       ...prevProfile,
 *       onboarding: {
 *         ...prevProfile.onboarding,
 *         settingsTooltipShownForPanelTypes: [
 *           ...(prevProfile.onboarding?.settingsTooltipShownForPanelTypes || []),
 *           panelType
 *         ]
 *       }
 *     }));
 *   };
 *
 *   return (
 *     <div>
 *       <h2>ユーザー設定</h2>
 *       <p>現在のレイアウト: {profile.currentLayoutId}</p>
 *       <p>初回利用: {profile.firstSeenTime}</p>
 *       <p>完了したオンボーディング: {profile.onboarding?.settingsTooltipShownForPanelTypes?.length || 0}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * ### データ構造
 * - **currentLayoutId**: 最後に使用したレイアウトの復元
 * - **firstSeenTime**: 初回ユーザー分析用のタイムスタンプ
 * - **firstSeenTimeIsFirstLoad**: 初回体験の正確性検証
 * - **onboarding**: オンボーディング進捗の追跡
 *
 * ### 設計パターン
 * - **Repository パターン**: データ永続化の抽象化
 * - **Context API**: グローバルなプロファイル管理
 * - **Async/Await**: 非同期データ操作
 * - **Function Update**: 関数型更新による安全な状態変更
 *
 * ### 永続化先
 * - **Web**: LocalStorage、IndexedDB
 * - **Desktop**: ファイルシステム、設定ファイル
 * - **Mobile**: Native Storage API
 *
 * ### プライバシー考慮事項
 * - 個人識別情報は含まない
 * - ローカルストレージのみで管理
 * - ユーザーの同意に基づく分析データ収集
 * - データの削除・リセット機能
 *
 * ### パフォーマンス考慮事項
 * - 非同期操作による UI のブロック回避
 * - 必要時のみデータ読み込み
 * - 変更時のみデータ保存
 * - メモリ効率的なデータ構造
 *
 * @see UserProfile - プロファイル情報の型定義
 * @see LayoutID - レイアウト識別子の型定義
 */
export const UserProfileStorageContext = createContext<UserProfileStorage | undefined>(undefined);
UserProfileStorageContext.displayName = "UserProfileStorageContext";

/**
 * ユーザープロファイルストレージを取得するカスタムフック
 *
 * UserProfileStorageContextからストレージインスタンスを取得します。
 * プロバイダーが設定されていない場合はエラーを投げます。
 *
 * @returns UserProfileStorage - ユーザープロファイルストレージインスタンス
 * @throws Error - プロバイダーが設定されていない場合
 *
 * @example
 * ```typescript
 * function ProfileManager() {
 *   const storage = useUserProfileStorage();
 *
 *   const saveCurrentLayout = async (layoutId: LayoutID) => {
 *     try {
 *       await storage.setUserProfile(profile => ({
 *         ...profile,
 *         currentLayoutId: layoutId
 *       }));
 *       console.log("レイアウトが保存されました");
 *     } catch (error) {
 *       console.error("レイアウト保存エラー:", error);
 *     }
 *   };
 *
 *   const loadUserProfile = async () => {
 *     try {
 *       const profile = await storage.getUserProfile();
 *       return profile;
 *     } catch (error) {
 *       console.error("プロファイル読み込みエラー:", error);
 *       return {};
 *     }
 *   };
 *
 *   return null;
 * }
 * ```
 */
export function useUserProfileStorage(): UserProfileStorage {
  const storage = useContext(UserProfileStorageContext);
  if (storage == undefined) {
    throw new Error("A UserProfileStorage provider is required to useUserProfileStorage");
  }

  return storage;
}
