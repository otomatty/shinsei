// Select Component
// MUI SelectのLeptos実装

use leptos::prelude::*;

#[derive(Clone, PartialEq)]
#[allow(dead_code)] // 将来使用予定のバリアント
pub enum SelectVariant {
    Outlined,
    Filled,
    Standard,
}

#[component]
pub fn Select(
    value: ReadSignal<Option<String>>,
    set_value: WriteSignal<Option<String>>,
    children: Children,
    #[prop(optional, into)] label: Option<String>,
    #[prop(optional)] variant: Option<SelectVariant>,
    #[prop(optional)] disabled: Option<bool>,
    #[prop(optional)] error: Option<bool>,
    #[prop(optional, into)] helper_text: Option<String>,
    #[prop(optional, into)] class: Option<String>,
) -> impl IntoView {
    let variant = variant.unwrap_or(SelectVariant::Outlined);
    let disabled = disabled.unwrap_or(false);
    let error = error.unwrap_or(false);

    // ベースクラス
    let mut base_classes = vec![
        "w-full".to_string(),
        "px-3".to_string(),
        "py-2".to_string(),
        "rounded-md".to_string(),
        "bg-background-default".to_string(),
        "text-text-primary".to_string(),
        "transition-colors".to_string(),
        "focus:outline-none".to_string(),
        "focus:ring-2".to_string(),
        "disabled:opacity-50".to_string(),
        "disabled:cursor-not-allowed".to_string(),
        "appearance-none".to_string(),
        "cursor-pointer".to_string(),
    ];

    // バリアント別のクラス
    match variant {
        SelectVariant::Outlined => {
            base_classes.push("border".to_string());
            if error {
                base_classes.push("border-error-500".to_string());
                base_classes.push("focus:border-error-500".to_string());
                base_classes.push("focus:ring-error-500".to_string());
            } else {
                base_classes.push("border-grey-600".to_string());
                base_classes.push("focus:border-primary-500".to_string());
                base_classes.push("focus:ring-primary-500".to_string());
            }
        }
        SelectVariant::Filled => {
            base_classes.push("border-0".to_string());
            base_classes.push("bg-background-paper".to_string());
            if error {
                base_classes.push("focus:ring-error-500".to_string());
            } else {
                base_classes.push("focus:ring-primary-500".to_string());
            }
        }
        SelectVariant::Standard => {
            base_classes.push("border-0".to_string());
            base_classes.push("border-b-2".to_string());
            if error {
                base_classes.push("border-error-500".to_string());
                base_classes.push("focus:border-error-500".to_string());
                base_classes.push("focus:ring-error-500".to_string());
            } else {
                base_classes.push("border-grey-600".to_string());
                base_classes.push("focus:border-primary-500".to_string());
                base_classes.push("focus:ring-primary-500".to_string());
            }
        }
    }

    // カスタムクラスの追加
    if let Some(custom_class) = class.clone() {
        base_classes.push(custom_class);
    }

    let select_class = base_classes.join(" ");

    view! {
        <div class="flex flex-col gap-1">
            {label.map(|l| {
                view! {
                    <label class="text-sm font-medium text-text-primary">
                        {l}
                    </label>
                }
            })}
            <select
                class=select_class
                disabled=disabled
                on:change=move |ev| {
                    let new_value = event_target_value(&ev);
                    set_value.set(Some(new_value));
                }
            >
                {children()}
            </select>
            {helper_text.map(|text| {
                let helper_class = if error {
                    "text-sm text-error-500"
                } else {
                    "text-sm text-text-secondary"
                };
                view! {
                    <span class=helper_class>
                        {text}
                    </span>
                }
            })}
        </div>
    }
}

#[component]
pub fn SelectOption(
    value: String,
    children: Children,
    #[prop(optional)] disabled: Option<bool>,
) -> impl IntoView {
    let disabled = disabled.unwrap_or(false);
    view! {
        <option value=value.clone() disabled=disabled>
            {children()}
        </option>
    }
}

