<?php
declare(strict_types=1);

namespace Grav\Plugin;

use Grav\Common\Data\Blueprint;
use Grav\Common\Grav;
use Grav\Common\Plugin;
use RocketTheme\Toolbox\Event\Event;

/**
 * Adds a toolbar button to the Admin Next default (CodeMirror) Markdown editor.
 *
 * The button opens a modal listing every shortcode registered through
 * Shortcode Core: built-in shortcodes, Shortcode Builder shortcodes and
 * shortcodes shipped by other plugins. The chosen shortcode is inserted at the
 * cursor. Site administrators can hide shortcodes from the list and attach a
 * preview image (screenshot or GIF), a description and a ready-made example
 * to any shortcode.
 */
class ShortcodePickerPlugin extends Plugin
{
    /** Image types accepted as previews. */
    private const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif'];

    public static function getSubscribedEvents(): array
    {
        return [
            'onPluginsInitialized' => ['onPluginsInitialized', 0],
            'onApiMarkdownEditorButtons' => ['onApiMarkdownEditorButtons', 0],
        ];
    }

    /**
     * Allows the plugin blueprint to list the registered shortcodes through
     * `data-options@`. Recent Grav versions only run dynamic option
     * providers that are on an allowlist; older ones need no registration.
     */
    public function onPluginsInitialized(): void
    {
        if (method_exists(Blueprint::class, 'addAllowedDynamicCallable')) {
            Blueprint::addAllowedDynamicCallable(self::class . '::shortcodeOptions');
        }
    }

    /**
     * Options provider for the settings form: every registered shortcode.
     *
     * @return array<string, string>
     */
    public static function shortcodeOptions(): array
    {
        $grav = Grav::instance();
        if (!isset($grav['shortcode'])) {
            return [];
        }

        $options = [];
        foreach (self::registeredNames($grav['shortcode']) as $name) {
            $options[$name] = '[' . $name . ']';
        }

        return $options;
    }

    /**
     * Appends the shortcode picker button through Admin Next's editor-toolbar API.
     */
    public function onApiMarkdownEditorButtons(Event $event): void
    {
        // Without Shortcode Core there is no shortcode registry to list.
        if (!isset($this->grav['shortcode'])) {
            return;
        }

        $hidden = array_map('strval', (array) $this->config->get('plugins.shortcode-picker.hidden', []));
        $names = array_values(array_diff(self::registeredNames($this->grav['shortcode']), $hidden));
        $previews = $this->previews($names);

        $languages = $this->adminLanguages($event['user'] ?? null);
        $t = fn (string $key): string => (string) $this->grav['language']->translate('PLUGIN_SHORTCODE_PICKER.' . $key, $languages);

        $buttons = $event['buttons'] ?? [];
        $buttons[] = [
            'id' => 'shortcode-picker',
            'plugin' => 'shortcode-picker',
            'label' => $t('BUTTON_LABEL'),
            'icon' => 'fa fa-code',
            'modal' => [
                'component' => 'shortcode-picker',
                'title' => $t('MODAL_TITLE'),
                // Room for the preview panel only when there is something to show.
                'size' => $previews ? 'lg' : 'md',
                'props' => [
                    'shortcodes' => $names,
                    'previews' => (object) $previews,
                    'labels' => [
                        'search' => $t('SEARCH'),
                        'list' => $t('LIST'),
                        'empty' => $t('EMPTY'),
                        'paired' => $t('PAIRED'),
                        'params' => $t('PARAMS'),
                        'paramsHelp' => $t('PARAMS_HELP'),
                        'content' => $t('CONTENT'),
                        'preview' => $t('PREVIEW'),
                        'code' => $t('CODE'),
                        'hasPreview' => $t('HAS_PREVIEW'),
                        'noPreview' => $t('NO_PREVIEW'),
                        'previewAlt' => $t('PREVIEW_ALT'),
                        'example' => $t('EXAMPLE_NOTE'),
                        'insert' => $t('INSERT'),
                        'cancel' => $t('CANCEL'),
                    ],
                ],
            ],
            'authorize' => 'api.pages.write',
        ];
        $event['buttons'] = $buttons;
    }

    /**
     * Sorted, unique names from both Shortcode Core containers. Raw shortcodes
     * (processed before Markdown, such as [raw]) are kept in a separate one.
     *
     * @param object $manager
     * @return array<int, string>
     */
    private static function registeredNames($manager): array
    {
        $names = $manager->getHandlers()->getNames();
        if (method_exists($manager, 'getRawHandlers')) {
            $names = array_merge($names, $manager->getRawHandlers()->getNames());
        }
        $names = array_values(array_unique(array_map('strval', $names)));
        sort($names, SORT_NATURAL | SORT_FLAG_CASE);

        return $names;
    }

    /**
     * Preview data for the listed shortcodes, keyed by shortcode name.
     *
     * @param array<int, string> $names
     * @return array<string, array<string, string>>
     */
    private function previews(array $names): array
    {
        $entries = $this->config->get('plugins.shortcode-picker.previews', []);
        if (!is_array($entries)) {
            return [];
        }

        $previews = [];
        foreach ($entries as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $name = trim((string) ($entry['shortcode'] ?? ''));
            if ($name === '' || !in_array($name, $names, true)) {
                continue;
            }

            $preview = array_filter([
                'image' => $this->imageUrl($entry['image'] ?? null),
                'description' => trim((string) ($entry['description'] ?? '')),
                'example' => trim((string) ($entry['example'] ?? '')),
            ], static fn (string $value): bool => $value !== '');

            if ($preview) {
                $previews[$name] = $preview;
            }
        }

        return $previews;
    }

    /**
     * Public URL of an uploaded preview image.
     *
     * A `file` field stores `{ "<path>": { name, type, size, path } }`; a plain
     * string path relative to the site root is accepted too. Only existing
     * image files inside the `user/` folder are returned.
     *
     * @param mixed $value
     */
    private function imageUrl($value): string
    {
        $path = null;
        if (is_string($value)) {
            $path = $value;
        } elseif (is_array($value)) {
            $file = reset($value);
            if (is_array($file) && is_string($file['path'] ?? null)) {
                $path = $file['path'];
            } elseif (is_string(key($value))) {
                $path = key($value);
            }
        }

        $path = ltrim(str_replace('\\', '/', trim((string) $path)), '/');
        if ($path === '' || !str_starts_with($path, 'user/') || str_contains($path, '..')) {
            return '';
        }

        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if (!in_array($extension, self::IMAGE_EXTENSIONS, true) || !is_file(GRAV_ROOT . '/' . $path)) {
            return '';
        }

        $encoded = implode('/', array_map('rawurlencode', explode('/', $path)));

        return rtrim((string) $this->grav['uri']->rootUrl(false), '/') . '/' . $encoded;
    }

    /**
     * Language chain for the current user's admin interface language.
     *
     * Without an explicit chain, Grav translates into the site's content
     * language (English on a single-language site), not the language the user
     * picked for the admin. Admin Next stores that choice in
     * `admin_next.preferences.adminLanguage`; accounts migrated from the
     * classic admin keep it in `language`.
     *
     * @param mixed $user
     * @return array<int, string>
     */
    private function adminLanguages($user): array
    {
        $lang = null;
        if (is_object($user) && method_exists($user, 'get')) {
            foreach (['admin_next.preferences.adminLanguage', 'language'] as $key) {
                $value = $user->get($key);
                if (is_string($value) && trim($value) !== '') {
                    $lang = trim($value);
                    break;
                }
            }
        }

        $chain = [];
        if ($lang !== null) {
            $chain[] = $lang;
            $chain[] = explode('-', $lang)[0];
        }
        $chain[] = 'en';

        return array_values(array_unique($chain));
    }
}
