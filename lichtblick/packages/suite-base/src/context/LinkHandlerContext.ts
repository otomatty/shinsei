// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
import { createContext } from "react";

/**
 * ## LinkHandlerContext
 *
 * **リンククリック処理のContext**
 *
 * ### 概要
 * - リンククリック時のカスタム処理を提供
 * - アプリ内リンクのモーダル表示などに使用
 * - 外部ナビゲーションの代替手段
 *
 * ### 使用例
 * ```typescript
 * const linkHandler = useContext(LinkHandlerContext);
 *
 * const handleClick = (event: React.MouseEvent) => {
 *   linkHandler(event, "https://example.com");
 * };
 * ```
 *
 * @param event - マウスクリックイベント
 * @param href - リンクURL
 */
const LinkHandlerContext = createContext<(event: React.MouseEvent, href: string) => void>(() => {});
LinkHandlerContext.displayName = "LinkHandlerContext";

export default LinkHandlerContext;
