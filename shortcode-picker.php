<?php
declare(strict_types=1);

namespace Grav\Plugin;

use Grav\Common\Plugin;
use RocketTheme\Toolbox\Event\Event;

/**
 * Adds a toolbar button to the Admin Next default (CodeMirror) Markdown editor.
 *
 * The button opens a modal listing every shortcode registered through
 * Shortcode Core: built-in shortcodes, Shortcode Builder shortcodes and
 * shortcodes shipped by other plugins. The chosen shortcode is inserted at the
 * cursor.
 */
class ShortcodePickerPlugin extends Plugin
{
    public static function getSubscribedEvents(): array
    {
        return [
            'onApiMarkdownEditorButtons' => ['onApiMarkdownEditorButtons', 0],
        ];
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

        $manager = $this->grav['shortcode'];
        $names = $manager->getHandlers()->getNames();
        // Raw shortcodes (processed before Markdown, such as [raw]) are kept
        // in a separate container.
        if (method_exists($manager, 'getRawHandlers')) {
            $names = array_merge($names, $manager->getRawHandlers()->getNames());
        }
        $names = array_values(array_unique(array_map('strval', $names)));
        sort($names, SORT_NATURAL | SORT_FLAG_CASE);

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
                'size' => 'md',
                'props' => [
                    'shortcodes' => $names,
                    'labels' => [
                        'search' => $t('SEARCH'),
                        'list' => $t('LIST'),
                        'empty' => $t('EMPTY'),
                        'paired' => $t('PAIRED'),
                        'params' => $t('PARAMS'),
                        'paramsHelp' => $t('PARAMS_HELP'),
                        'content' => $t('CONTENT'),
                        'preview' => $t('PREVIEW'),
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
