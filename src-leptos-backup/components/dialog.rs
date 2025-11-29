// Dialog Component
// MUI DialogのLeptos実装

use leptos::prelude::*;

#[component]
pub fn Dialog(
    children: Children,
    #[prop(into)] open: Signal<bool>,
    #[prop(optional, into)] on_close: Option<WriteSignal<bool>>,
    #[prop(optional, into)] class: Option<String>,
) -> impl IntoView {
    let open_signal = open.clone();
    let on_close_signal = on_close.clone();
    let children_view = children();
    view! {
        <Show when=move || open_signal.get()>
            <div
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                on:click=move |ev| {
                    // バックドロップクリックで閉じる
                    if ev.target() == ev.current_target() {
                        if let Some(set_open) = &on_close_signal {
                            set_open.set(false);
                        }
                    }
                }
            >
                <div
                    class=format!(
                        "bg-background-paper rounded-lg shadow-lg max-w-lg w-full mx-4 {}",
                        class.unwrap_or_default()
                    )
                    on:click=|ev| {
                        ev.stop_propagation();
                    }
                >
                    {children_view}
                </div>
            </div>
        </Show>
    }
}

#[component]
pub fn DialogTitle(
    children: Children,
    #[prop(optional, into)] class: Option<String>,
) -> impl IntoView {
    view! {
        <div class=format!("px-6 py-4 border-b border-grey-600 {}", class.unwrap_or_default())>
            <h2 class="text-xl font-semibold text-text-primary">
                {children()}
            </h2>
        </div>
    }
}

#[component]
pub fn DialogContent(
    children: Children,
    #[prop(optional, into)] class: Option<String>,
) -> impl IntoView {
    view! {
        <div class=format!("px-6 py-4 {}", class.unwrap_or_default())>
            {children()}
        </div>
    }
}

#[component]
pub fn DialogActions(
    children: Children,
    #[prop(optional, into)] class: Option<String>,
) -> impl IntoView {
    view! {
        <div class=format!("px-6 py-4 border-t border-grey-600 flex justify-end gap-2 {}", class.unwrap_or_default())>
            {children()}
        </div>
    }
}

