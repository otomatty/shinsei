/**
 * @fileoverview 翻訳フック
 * 拡張機能用のカスタム翻訳システム
 */

import { useEffect, useState } from "react";
import { getTranslation, detectLanguage, type SupportedLanguage } from "../i18n";
import type { TranslationKeys } from "../i18n";

/**
 * 翻訳フックの戻り値型
 */
interface UseTranslationReturn {
  /** 翻訳関数 */
  t: TranslationFunction;
  /** 現在の言語 */
  language: SupportedLanguage;
  /** 言語変更関数 */
  changeLanguage: (lang: SupportedLanguage) => void;
  /** 利用可能な言語一覧 */
  availableLanguages: SupportedLanguage[];
}

/**
 * 翻訳関数の型定義
 */
type TranslationFunction = {
  (namespace: "ui", key: keyof TranslationKeys["ui"]): string;
  (namespace: "usageGuide", key: keyof TranslationKeys["usageGuide"]): string;
  (namespace: "messages", key: keyof TranslationKeys["messages"]): string;
  (namespace: keyof TranslationKeys, key: string): string;
};

/**
 * 拡張機能用翻訳フック
 *
 * Lichtblick本体のi18nシステムと独立した、
 * 軽量な翻訳システムを提供する。
 *
 * @returns 翻訳関数と言語管理機能
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { t } = useTranslation();
 *   return <h1>{t("ui", "title")}</h1>;
 * }
 * ```
 */
export function useTranslation(): UseTranslationReturn {
  const [language, setLanguage] = useState<SupportedLanguage>(detectLanguage);
  const [translations, setTranslations] = useState(() => getTranslation(language));

  // 言語変更時に翻訳を更新
  useEffect(() => {
    setTranslations(getTranslation(language));
  }, [language]);

  // Lichtblick本体の言語変更を監視
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "i18nextLng" && e.newValue) {
        const newLang = e.newValue as SupportedLanguage;
        if (newLang === "en" || newLang === "ja") {
          setLanguage(newLang);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  /**
   * 翻訳関数
   *
   * @param namespace 翻訳名前空間
   * @param key 翻訳キー
   * @returns 翻訳済み文字列
   */
  const t: TranslationFunction = (namespace: keyof TranslationKeys, key: string): string => {
    try {
      const namespaceTranslations = translations[namespace];
      if (namespaceTranslations && typeof namespaceTranslations === "object") {
        const value = (namespaceTranslations as any)[key];
        if (typeof value === "string") {
          return value;
        }
        if (Array.isArray(value)) {
          return value.join("\n");
        }
        if (typeof value === "object" && value !== null) {
          // キーボードショートカットなどのオブジェクト型の場合
          return JSON.stringify(value);
        }
      }

      // フォールバック: 英語版から取得
      const fallbackTranslations = getTranslation("en");
      const fallbackNamespace = fallbackTranslations[namespace];
      if (fallbackNamespace && typeof fallbackNamespace === "object") {
        const fallbackValue = (fallbackNamespace as any)[key];
        if (typeof fallbackValue === "string") {
          return fallbackValue;
        }
      }

      // 最終フォールバック: キー名を返す
      return `${namespace}.${key}`;
    } catch (error) {
      console.warn(`Translation error for ${namespace}.${key}:`, error);
      return `${namespace}.${key}`;
    }
  };

  /**
   * 言語変更関数
   *
   * @param newLanguage 新しい言語
   */
  const changeLanguage = (newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage);
    // Lichtblick本体の言語設定も更新（可能であれば）
    try {
      localStorage.setItem("i18nextLng", newLanguage);
    } catch {
      // LocalStorage アクセスエラーは無視
    }
  };

  return {
    t,
    language,
    changeLanguage,
    availableLanguages: ["en", "ja"],
  };
}

/**
 * 翻訳値の取得（非React環境用）
 *
 * @param namespace 翻訳名前空間
 * @param key 翻訳キー
 * @param language 言語（省略時は自動検出）
 * @returns 翻訳済み文字列
 */
export function getTranslationValue(
  namespace: keyof TranslationKeys,
  key: string,
  language?: SupportedLanguage,
): string {
  const translations = getTranslation(language);
  try {
    const namespaceTranslations = translations[namespace];
    if (namespaceTranslations && typeof namespaceTranslations === "object") {
      const value = (namespaceTranslations as any)[key];
      if (typeof value === "string") {
        return value;
      }
    }
    return `${namespace}.${key}`;
  } catch {
    return `${namespace}.${key}`;
  }
}
