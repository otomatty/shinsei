// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

import { create } from "zustand";

export type InstallingProgress = {
  installed: number;
  total: number;
  inProgress: boolean;
};

export type InstallingLayoutsState = {
  installingProgress: InstallingProgress;
  setInstallingProgress: (progress: (lastState: InstallingProgress) => InstallingProgress) => void;
  startInstallingProgress: (layoutsNumber: number) => void;
  resetInstallingProgress: () => void;
};

export const useInstallingLayoutsStore = create<InstallingLayoutsState>((set) => ({
  installingProgress: { installed: 0, total: 0, inProgress: false },
  setInstallingProgress: (progress) => {
    set((state) => ({
      installingProgress: progress(state.installingProgress),
    }));
  },
  startInstallingProgress: (layoutsToBeInstalled: number) => {
    set((state) => ({
      installingProgress: {
        ...state.installingProgress,
        total: layoutsToBeInstalled,
        installed: 0,
        inProgress: true,
      },
    }));
  },
  resetInstallingProgress: () => {
    set(() => ({
      installingProgress: {
        total: 0,
        installed: 0,
        inProgress: false,
      },
    }));
  },
}));
