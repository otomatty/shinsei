// Alert Component
// MUI AlertのLeptos実装

use leptos::prelude::*;

#[derive(Clone, PartialEq)]
pub enum AlertSeverity {
    Error,
    Warning,
    Info,
    Success,
}

#[component]
pub fn Alert(
    children: Children,
    #[prop(optional)] severity: Option<AlertSeverity>,
    #[prop(optional, into)] title: Option<String>,
    // on_closeは後で実装（Callbackの問題を解決後に追加）
    #[prop(optional, into)] class: Option<String>,
) -> impl IntoView {
    let severity = severity.unwrap_or(AlertSeverity::Info);

    // 深刻度別のクラス
    let (bg_class, border_class, text_class, icon_class) = match severity {
        AlertSeverity::Error => (
            "bg-error-500/10",
            "border-error-500/20",
            "text-error-500",
            "text-error-500",
        ),
        AlertSeverity::Warning => (
            "bg-warning-500/10",
            "border-warning-500/20",
            "text-warning-500",
            "text-warning-500",
        ),
        AlertSeverity::Info => (
            "bg-info-500/10",
            "border-info-500/20",
            "text-info-500",
            "text-info-500",
        ),
        AlertSeverity::Success => (
            "bg-success-500/10",
            "border-success-500/20",
            "text-success-500",
            "text-success-500",
        ),
    };

    let alert_class = format!(
        "rounded-lg border p-4 {} {} {} {}",
        bg_class,
        border_class,
        text_class,
        class.unwrap_or_default()
    );

    view! {
        <div class=alert_class>
            <div class="flex items-start gap-3">
                <div class="flex-1">
                    {title.map(|t| {
                        view! {
                            <h4 class="font-semibold mb-1">{t}</h4>
                        }
                    })}
                    <div class="text-sm">
                        {children()}
                    </div>
                </div>
                // 閉じるボタンは後で実装
            </div>
        </div>
    }
}

