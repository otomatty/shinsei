// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

/**
 * ユーザー情報の詳細定義
 *
 * 認証されたユーザーの詳細情報を含む型定義
 */
export type User = {
  /** ユーザーの一意識別子 */
  id: string;
  /** アバター画像のURL（オプション） */
  avatarImageUrl?: string | null; // eslint-disable-line no-restricted-syntax
  /** ユーザーのメールアドレス */
  email: string;
  /** 所属組織のID */
  orgId: string;
  /** 所属組織の表示名（オプション） */
  orgDisplayName: string | null; // eslint-disable-line no-restricted-syntax
  /** 所属組織のスラッグ */
  orgSlug: string;
  /** 組織の有料プラン状態（オプション） */
  orgPaid: boolean | null; // eslint-disable-line no-restricted-syntax
  /** 組織の詳細情報 */
  org: {
    /** 組織の一意識別子 */
    id: string;
    /** 組織のスラッグ */
    slug: string;
    /** 組織の表示名 */
    displayName: string;
    /** エンタープライズプランかどうか */
    isEnterprise: boolean;
    /** アップロード機能の許可状態 */
    allowsUploads: boolean;
    /** エッジサイト機能のサポート状態 */
    supportsEdgeSites: boolean;
  };
};

/**
 * 現在のユーザー情報インターフェース
 *
 * ユーザーの詳細情報と認証操作を提供
 */
export interface CurrentUser {
  /** 現在のユーザー詳細情報（未認証時は undefined） */
  currentUser: User | undefined;

  /** サインイン関数（オプション） */
  signIn?: () => void;

  /** サインアウト関数（オプション） */
  signOut?: () => Promise<void>;
}

/**
 * ## CurrentUserContext
 *
 * **詳細なユーザー情報管理のContext**
 *
 * ### 概要
 * - 認証されたユーザーの詳細情報を管理
 * - 組織情報、権限、プラン情報を含む包括的なユーザー管理
 * - BaseUserContextより詳細な情報を提供
 *
 * ### 主な機能
 * - **詳細ユーザー情報**: プロフィール、組織、権限情報
 * - **組織管理**: 組織レベルの権限・機能制御
 * - **プラン管理**: 無料・チーム・エンタープライズプランの判定
 * - **認証操作**: サインイン・サインアウト機能
 *
 * ### 使用例
 * ```typescript
 * import { useCurrentUser, useCurrentUserType } from "./CurrentUserContext";
 *
 * function UserProfile() {
 *   const { currentUser, signOut } = useCurrentUser();
 *   const userType = useCurrentUserType();
 *
 *   if (!currentUser) {
 *     return <div>ログインしてください</div>;
 *   }
 *
 *   const handleSignOut = async () => {
 *     await signOut?.();
 *   };
 *
 *   return (
 *     <div>
 *       <img src={currentUser.avatarImageUrl || "/default-avatar.png"} alt="Avatar" />
 *       <h2>{currentUser.email}</h2>
 *       <p>組織: {currentUser.org.displayName}</p>
 *       <p>プラン: {userType}</p>
 *
 *       {currentUser.org.allowsUploads && (
 *         <button>データをアップロード</button>
 *       )}
 *
 *       {currentUser.org.supportsEdgeSites && (
 *         <button>エッジサイト管理</button>
 *       )}
 *
 *       <button onClick={handleSignOut}>サインアウト</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * ### 組織権限システム
 * - **allowsUploads**: データアップロード機能の許可
 * - **supportsEdgeSites**: エッジサイト機能の利用可能性
 * - **isEnterprise**: エンタープライズ機能の利用可能性
 * - **orgPaid**: 有料プランの利用状態
 *
 * ### 設計パターン
 * - **Context API**: React標準の状態管理
 * - **Null Object**: 未認証時の undefined 状態
 * - **Type Safety**: TypeScript型による情報の保証
 * - **Separation of Concerns**: 認証とユーザー情報の分離
 *
 * @see BaseUserContext - 基本的な認証状態のみのContext
 * @see User - ユーザー情報の型定義
 */
const CurrentUserContext = createContext<CurrentUser>({
  currentUser: undefined,
});
CurrentUserContext.displayName = "CurrentUserContext";

/**
 * 現在のユーザー情報を取得するカスタムフック
 *
 * CurrentUserContextから現在のユーザー詳細情報を取得します。
 *
 * @returns CurrentUser - 現在のユーザー情報
 *
 * @example
 * ```typescript
 * function UserDashboard() {
 *   const { currentUser } = useCurrentUser();
 *
 *   if (!currentUser) {
 *     return <LoginForm />;
 *   }
 *
 *   return (
 *     <div>
 *       <h1>ようこそ、{currentUser.email}さん</h1>
 *       <p>組織: {currentUser.org.displayName}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCurrentUser(): CurrentUser {
  return useContext(CurrentUserContext);
}

/**
 * ユーザー認証タイプ
 *
 * ユーザーの認証状態とプランレベルを表す型定義
 */
export type UserType =
  | "unauthenticated"
  | "authenticated-free"
  | "authenticated-team"
  | "authenticated-enterprise";

/**
 * 現在のユーザー認証タイプを取得するカスタムフック
 *
 * ユーザー情報を基に認証タイプを判定します。
 *
 * @returns UserType - 現在のユーザー認証タイプ
 *
 * @example
 * ```typescript
 * function FeatureGate() {
 *   const userType = useCurrentUserType();
 *
 *   const getAvailableFeatures = () => {
 *     switch (userType) {
 *       case "unauthenticated":
 *         return ["基本機能"];
 *       case "authenticated-free":
 *         return ["基本機能", "データ保存"];
 *       case "authenticated-team":
 *         return ["基本機能", "データ保存", "チーム共有"];
 *       case "authenticated-enterprise":
 *         return ["基本機能", "データ保存", "チーム共有", "エンタープライズ機能"];
 *       default:
 *         return [];
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <h3>利用可能な機能</h3>
 *       <ul>
 *         {getAvailableFeatures().map(feature => (
 *           <li key={feature}>{feature}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCurrentUserType(): UserType {
  const user = useCurrentUser();
  if (user.currentUser == undefined) {
    return "unauthenticated";
  }

  if (user.currentUser.org.isEnterprise) {
    return "authenticated-enterprise";
  }

  if (user.currentUser.orgPaid === true) {
    return "authenticated-team";
  }

  return "authenticated-free";
}

// ts-prune-ignore-next
export default CurrentUserContext;
