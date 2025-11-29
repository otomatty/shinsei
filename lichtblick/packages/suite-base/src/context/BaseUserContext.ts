// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

/**
 * ユーザー認証タイプ
 *
 * アプリケーションでサポートされるユーザー認証レベルを定義
 *
 * @example
 * ```typescript
 * // 認証タイプの分類
 * "unauthenticated"        // 未認証ユーザー
 * "authenticated-free"     // 認証済み無料ユーザー
 * "authenticated-team"     // 認証済みチームユーザー
 * "authenticated-enterprise" // 認証済みエンタープライズユーザー
 * ```
 */
export type UserType =
  | "unauthenticated"
  | "authenticated-free"
  | "authenticated-team"
  | "authenticated-enterprise";

/**
 * 現在のユーザー情報インターフェース
 *
 * ユーザーの認証状態と基本的な認証操作を提供
 * CurrentUserContextとの違いは、詳細なユーザー情報を含まない点
 */
export interface CurrentUser {
  /** 現在のユーザー認証タイプ */
  currentUserType: UserType;

  /** サインイン関数（オプション） */
  signIn?: () => void;

  /** サインアウト関数（オプション） */
  signOut?: () => Promise<void>;
}

/**
 * ## BaseUserContext
 *
 * **基本的なユーザー認証状態管理のContext**
 *
 * ### 概要
 * - ユーザーの認証状態を管理する軽量なContext
 * - 詳細なユーザー情報を含まない基本的な認証状態のみ
 * - CurrentUserContextのより軽量な代替手段
 *
 * ### 主な機能
 * - **認証状態管理**: 4つの認証レベルをサポート
 * - **認証操作**: サインイン・サインアウト機能
 * - **軽量実装**: 最小限のユーザー情報のみ保持
 * - **デフォルト値**: 未認証状態でのフォールバック
 *
 * ### 使用例
 * ```typescript
 * import { useCurrentUser } from "./BaseUserContext";
 *
 * function AuthenticationStatus() {
 *   const { currentUserType, signIn, signOut } = useCurrentUser();
 *
 *   const handleSignIn = () => {
 *     signIn?.();
 *   };
 *
 *   const handleSignOut = async () => {
 *     await signOut?.();
 *   };
 *
 *   return (
 *     <div>
 *       <p>認証状態: {currentUserType}</p>
 *       {currentUserType === "unauthenticated" ? (
 *         <button onClick={handleSignIn}>サインイン</button>
 *       ) : (
 *         <button onClick={handleSignOut}>サインアウト</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * ### 認証レベル
 * - **unauthenticated**: 未認証（デフォルト）
 * - **authenticated-free**: 無料プラン
 * - **authenticated-team**: チームプラン
 * - **authenticated-enterprise**: エンタープライズプラン
 *
 * ### 設計パターン
 * - **Context API**: React標準の状態管理
 * - **Default Value**: 未認証状態でのフォールバック
 * - **Optional Methods**: プラットフォーム固有の認証機能
 * - **Type Safety**: TypeScript型による認証状態の保証
 *
 * ### CurrentUserContextとの違い
 * - **BaseUserContext**: 認証状態のみ（軽量）
 * - **CurrentUserContext**: 詳細なユーザー情報を含む（高機能）
 *
 * ### 使用場面
 * - 認証状態の表示のみが必要な場合
 * - パフォーマンスを重視する場合
 * - 詳細なユーザー情報が不要な場合
 * - 軽量なコンポーネントでの使用
 *
 * @see CurrentUserContext - 詳細なユーザー情報を含むContext
 * @see UserType - 認証タイプの定義
 */
const BaseUserContext = createContext<CurrentUser>({
  currentUserType: "unauthenticated",
});
BaseUserContext.displayName = "BaseUserContext";

/**
 * 現在のユーザー情報を取得するカスタムフック
 *
 * BaseUserContextから現在のユーザー情報を取得します。
 *
 * @returns CurrentUser - 現在のユーザー情報
 *
 * @example
 * ```typescript
 * function UserStatus() {
 *   const { currentUserType } = useCurrentUser();
 *
 *   const getStatusMessage = () => {
 *     switch (currentUserType) {
 *       case "unauthenticated":
 *         return "ログインしてください";
 *       case "authenticated-free":
 *         return "無料プランをご利用中";
 *       case "authenticated-team":
 *         return "チームプランをご利用中";
 *       case "authenticated-enterprise":
 *         return "エンタープライズプランをご利用中";
 *       default:
 *         return "不明な認証状態";
 *     }
 *   };
 *
 *   return <div>{getStatusMessage()}</div>;
 * }
 * ```
 */
export function useCurrentUser(): CurrentUser {
  return useContext(BaseUserContext);
}

export default BaseUserContext;
