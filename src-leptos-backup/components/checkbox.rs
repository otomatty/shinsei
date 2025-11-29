// Checkbox Component
// MUI CheckboxのLeptos実装

use leptos::prelude::*;

#[component]
pub fn Checkbox(
    checked: ReadSignal<bool>,
    set_checked: WriteSignal<bool>,
    #[prop(optional, into)] label: Option<String>,
    #[prop(optional)] disabled: Option<bool>,
    #[prop(optional)] indeterminate: Option<bool>,
    #[prop(optional, into)] class: Option<String>,
) -> impl IntoView {
    let disabled = disabled.unwrap_or(false);
    let indeterminate = indeterminate.unwrap_or(false);

    let checkbox_class = format!(
        "w-4 h-4 text-primary-500 bg-background-default border-grey-600 rounded focus:ring-primary-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer {}",
        class.unwrap_or_default()
    );

    view! {
        <div class="flex items-center gap-2">
            <input
                type="checkbox"
                class=checkbox_class
                checked=move || checked.get()
                disabled=disabled
                on:change=move |ev| {
                    let checked = event_target_checked(&ev);
                    set_checked.set(checked);
                }
            />
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

