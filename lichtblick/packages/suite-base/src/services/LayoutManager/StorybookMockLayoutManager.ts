// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { LayoutID } from "@lichtblick/suite-base/context/CurrentLayoutContext";
import { LayoutData } from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
import { ILayoutManager } from "@lichtblick/suite-base/services/ILayoutManager";
import {
  Layout,
  LayoutPermission,
  ISO8601Timestamp,
} from "@lichtblick/suite-base/services/ILayoutStorage";

/**
 * Storybook 用の MockLayoutManager
 * Jest に依存しない実装で、Storybook 環境でも動作する
 */
export default class StorybookMockLayoutManager implements ILayoutManager {
  // Mock用のデフォルトLayoutDataを作成するヘルパー関数
  private createMockLayoutData(data?: Partial<LayoutData>): LayoutData {
    return {
      configById: {},
      globalVariables: {},
      playbackConfig: {
        speed: 1.0,
      },
      userNodes: {},
      ...data,
    };
  }
  public supportsSharing = false;
  public isBusy = false;
  public isOnline = false;
  public error: Error | undefined = undefined;

  public on = (): void => {
    // no-op
  };

  public off = (): void => {
    // no-op
  };

  public setError = (): void => {
    // no-op
  };

  public setOnline = (): void => {
    // no-op
  };

  public getLayouts = async (): Promise<readonly Layout[]> => {
    return [];
  };

  public getLayout = async (): Promise<Layout | undefined> => {
    return undefined;
  };

  public saveNewLayout = async (params: {
    name: string;
    data: LayoutData;
    permission: LayoutPermission;
  }): Promise<Layout> => {
    const now = new Date().toISOString() as ISO8601Timestamp;
    return {
      id: "mock-layout-id" as LayoutID,
      name: params.name,
      permission: params.permission,
      baseline: {
        data: params.data,
        savedAt: now,
      },
      working: undefined,
      syncInfo: undefined,
    };
  };

  public updateLayout = async (params: {
    id: LayoutID;
    name?: string;
    data?: LayoutData;
  }): Promise<Layout> => {
    const now = new Date().toISOString() as ISO8601Timestamp;
    const mockData = params.data ?? this.createMockLayoutData();
    return {
      id: params.id,
      name: params.name ?? "Mock Layout",
      permission: "CREATOR_WRITE",
      baseline: {
        data: mockData,
        savedAt: now,
      },
      working: undefined,
      syncInfo: undefined,
    };
  };

  public deleteLayout = async (): Promise<void> => {
    // no-op
  };

  public overwriteLayout = async (params: { id: LayoutID }): Promise<Layout> => {
    const now = new Date().toISOString() as ISO8601Timestamp;
    return {
      id: params.id,
      name: "Mock Layout",
      permission: "CREATOR_WRITE",
      baseline: {
        data: this.createMockLayoutData(),
        savedAt: now,
      },
      working: undefined,
      syncInfo: undefined,
    };
  };

  public revertLayout = async (params: { id: LayoutID }): Promise<Layout> => {
    const now = new Date().toISOString() as ISO8601Timestamp;
    return {
      id: params.id,
      name: "Mock Layout",
      permission: "CREATOR_WRITE",
      baseline: {
        data: this.createMockLayoutData(),
        savedAt: now,
      },
      working: undefined,
      syncInfo: undefined,
    };
  };

  public makePersonalCopy = async (params: { id: LayoutID }): Promise<Layout> => {
    const now = new Date().toISOString() as ISO8601Timestamp;
    return {
      id: `${params.id}-copy` as LayoutID,
      name: "Mock Layout Copy",
      permission: "CREATOR_WRITE",
      baseline: {
        data: this.createMockLayoutData(),
        savedAt: now,
      },
      working: undefined,
      syncInfo: undefined,
    };
  };

  public syncWithRemote = async (): Promise<void> => {
    // no-op
  };
}
