# v1.1.0
## mm/dd/yyyy

1. [](#new)
    * Shortcode previews: attach a screenshot or animated GIF, a description and a ready-made example to any shortcode from the plugin settings. The picker widens to show the preview next to the list, marks shortcodes that have one, and inserts the example as is.
    * Hidden shortcodes: choose shortcodes to leave out of the picker list, such as the `#` alias registered by Page TOC.
2. [](#improved)
    * The settings form lists the registered shortcodes through an allowlisted `data-options@` provider.
    * On Grav versions with the dynamic-provider allowlist, the provider is registered with `Blueprint::addAllowedDynamicCallable()`.

# v1.0.1
## 11/23/2026

1. [](#improved)
    * The modal now has the same inner spacing as Admin2's own modals: 24px side margins, a footer separated by a border, and more room between fields. The shortcode list and code fields use a smaller monospace size.

# v1.0.0
## 11/23/2026

1. [](#new)
    * Initial release.
    * Adds an Insert shortcode button to the Admin2 Markdown editor toolbar, through the `onApiMarkdownEditorButtons` extension point.
    * Searchable list of every shortcode registered with Shortcode Core, including raw shortcodes, with optional attributes, a paired or single tag choice, and a live preview.
    * Interface follows the user's admin language; English and French translations.
    * Shown only to users with the `api.pages.write` permission.
