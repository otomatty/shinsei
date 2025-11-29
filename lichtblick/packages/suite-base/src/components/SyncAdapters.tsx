// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * SyncAdapters: マルチインスタンス間の同期処理
 *
 * 主な機能:
 * - 複数のLichtblickインスタンス間でのタイムライン同期
 * - ブロードキャストメッセージによる再生状態同期
 * - URLStateSyncAdapter: URL状態同期 (ブラウザ履歴と連携)
 * - CurrentLayoutLocalStorageSyncAdapter: レイアウトのローカルストレージ同期
 * - AppContextからのカスタム同期アダプター対応
 */

import { useMemo } from "react";

import { CurrentLayoutLocalStorageSyncAdapter } from "@lichtblick/suite-base/components/CurrentLayoutLocalStorageSyncAdapter";
import { URLStateSyncAdapter } from "@lichtblick/suite-base/components/URLStateSyncAdapter";
import { useAppContext } from "@lichtblick/suite-base/context/AppContext";

export function SyncAdapters(): React.JSX.Element {
  // Sync adapters from app context override any local sync adapters
  const { syncAdapters } = useAppContext();

  return useMemo(() => {
    if (syncAdapters) {
      return <>{...syncAdapters}</>;
    }

    return (
      <>
        <URLStateSyncAdapter />
        <CurrentLayoutLocalStorageSyncAdapter />
      </>
    );
  }, [syncAdapters]);
}
