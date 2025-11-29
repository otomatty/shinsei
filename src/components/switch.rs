// Switch Component
// MUI SwitchのLeptos実装

use leptos::prelude::*;

#[derive(Clone, PartialEq)]
#[allow(dead_code)] // 将来使用予定のバリアント
pub enum SwitchColor {
    Primary,
    Secondary,
    Success,
    Warning,
    Error,
    Info,
    Default,
}

#[component]
pub fn Switch(
    checked: ReadSignal<bool>,
    set_checked: WriteSignal<bool>,
    #[prop(optional, into)] label: Option<String>,
    #[prop(optional)] disabled: Option<bool>,
    #[prop(optional)] color: Option<SwitchColor>,
    #[prop(optional, into)] class: Option<String>,
) -> impl IntoView {
    let disabled = disabled.unwrap_or(false);
    let color = color.unwrap_or(SwitchColor::Primary);

    // カラー別のクラス
    let color_class = match color {
        SwitchColor::Primary => "checked:bg-primary-500",
        SwitchColor::Secondary => "checked:bg-secondary-DEFAULT",
        SwitchColor::Success => "checked:bg-success-500",
        SwitchColor::Warning => "checked:bg-warning-500",
        SwitchColor::Error => "checked:bg-error-500",
        SwitchColor::Info => "checked:bg-info-500",
        SwitchColor::Default => "checked:bg-grey-600",
    };

    let switch_class = format!(
        "relative inline-flex h-6 w-11 items-center rounded-full bg-grey-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer {} {}",
        color_class,
        class.unwrap_or_default()
    );

    let thumb_class = format!(
        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform {}",
        if checked.get() { "translate-x-6" } else { "translate-x-1" }
    );

    view! {
        <div class="flex items-center gap-2">
            <button
                type="button"
                class=switch_class
                role="switch"
                aria-checked=move || checked.get()
                disabled=disabled
                on:click=move |_| {
                    if !disabled {
                        set_checked.set(!checked.get());
                    }
                }
            >
                <span class=thumb_class></span>
            </button>
            {label.map(|l| {
                view! {
                    <label class="text-sm text-text-primary cursor-pointer">
                        {l}
                    </label>
                }
            })}
        </div>
    }
}

