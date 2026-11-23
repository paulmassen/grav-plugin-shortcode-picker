/*
 * Shortcode picker modal for the Admin Next Markdown editor.
 *
 * Properties set by the toolbar button:
 * - `shortcodes`: array of tag names;
 * - `previews`: object keyed by tag name, each with optional `image` (URL),
 *   `description` and `example` (full shortcode to insert);
 * - `labels`: translated strings.
 *
 * Resolves with `{ insertContent }`, which the editor inserts at the cursor,
 * or emits `cancel`.
 */

const TAG = window.__GRAV_MODAL_TAG || 'grav-shortcode-picker--modal-shortcode-picker';

// English fallbacks, used only if the server sends no translated labels.
const DEFAULT_LABELS = {
	search: 'Search a shortcode',
	list: 'Available shortcodes',
	empty: 'No shortcode matches.',
	paired: 'Wraps content ([name]…[/name])',
	params: 'Attributes (optional)',
	paramsHelp: 'Example: style="info" or class="my-style"',
	content: 'content',
	preview: 'Preview',
	code: 'Code to insert',
	hasPreview: 'has a preview',
	noPreview: 'No preview for this shortcode.',
	previewAlt: 'Example of the rendered shortcode',
	example: 'The example below is inserted as is.',
	insert: 'Insert',
	cancel: 'Cancel',
};

// Shared styling; colors follow the Admin Next theme (light and dark).
const FIELD = 'width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--border, #d4d4d8);border-radius:8px;background:var(--background, transparent);color:inherit;font:inherit;font-size:14px;';
const MONO = 'font-family:ui-monospace,monospace;font-size:13px;';
const LABEL = 'display:flex;flex-direction:column;gap:8px;font-size:14px;';
const HEADING = 'font-weight:500;';
const NOTE = 'margin:0;font-size:13px;line-height:1.5;color:var(--muted-foreground, #71717a);';
const BUTTON = 'padding:0 14px;height:36px;border-radius:8px;font:inherit;font-size:14px;font-weight:500;cursor:pointer;';

// Two columns (list | preview) when the modal is wide enough, one otherwise.
const STYLESHEET = `
${TAG} [hidden] { display:none !important; }
${TAG} .sp-body { display:flex; flex-direction:column; gap:20px; padding:20px 24px 24px; min-width:320px; }
${TAG} .sp-body.has-previews { display:grid; grid-template-columns:minmax(0, 5fr) minmax(0, 6fr); gap:24px; align-items:start; }
${TAG} .sp-column { display:flex; flex-direction:column; gap:20px; min-width:0; }
${TAG} .sp-figure { margin:0; display:flex; align-items:center; justify-content:center; min-height:160px; max-height:320px; overflow:hidden; border:1px solid var(--border, #e4e4e7); border-radius:8px; background:var(--muted, #f4f4f5); }
${TAG} .sp-figure img { display:block; max-width:100%; max-height:320px; object-fit:contain; }
${TAG} .sp-figure.is-empty { min-height:120px; }
${TAG} .sp-list option { padding:2px 6px; border-radius:4px; }
@media (max-width: 640px) {
	${TAG} .sp-body.has-previews { display:flex; }
}
`;

function el(tag, props = {}, children = []) {
	const node = document.createElement(tag);
	for (const [key, value] of Object.entries(props)) {
		if (key === 'text') node.textContent = value;
		// Attributes such as aria-label have no matching DOM property.
		else if (key === 'style' || key.includes('-')) node.setAttribute(key, value);
		else node[key] = value;
	}
	for (const child of children) node.append(child);
	return node;
}

// Accept only same-site paths and http(s) URLs as image sources.
function safeImageUrl(value) {
	if (typeof value !== 'string' || value === '') return '';
	try {
		const url = new URL(value, window.location.href);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
	} catch {
		return '';
	}
}

if (!customElements.get(TAG)) {
	customElements.define(TAG, class extends HTMLElement {
		connectedCallback() {
			if (this._rendered) return;
			this._rendered = true;
			this.render();
		}

		get labels() {
			return { ...DEFAULT_LABELS, ...(this._labels || {}) };
		}

		set labels(value) {
			this._labels = value;
		}

		get shortcodes() {
			return Array.isArray(this._shortcodes) ? this._shortcodes : [];
		}

		set shortcodes(value) {
			this._shortcodes = value;
		}

		get previews() {
			const value = this._previews;
			return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
		}

		set previews(value) {
			this._previews = value;
		}

		render() {
			const labels = this.labels;
			const previews = this.previews;
			const hasPreviews = Object.keys(previews).length > 0;
			const previewFor = (name) => previews[name] || null;

			const search = el('input', {
				type: 'search',
				placeholder: labels.search,
				'aria-label': labels.search,
				style: FIELD,
			});
			const list = el('select', {
				size: hasPreviews ? 12 : 10,
				className: 'sp-list',
				'aria-label': labels.list,
				style: FIELD + MONO + 'padding:6px;line-height:1.6;',
			});
			const empty = el('p', { text: labels.empty, hidden: true, role: 'status', style: NOTE });
			const paired = el('input', { type: 'checkbox', checked: true });
			const pairedLabel = el('label', { style: 'display:flex;gap:10px;align-items:center;font-size:14px;cursor:pointer;' }, [
				paired,
				el('span', { text: labels.paired }),
			]);
			const params = el('input', {
				type: 'text',
				placeholder: labels.paramsHelp,
				'aria-label': labels.params,
				style: FIELD + MONO,
			});
			const paramsGroup = el('label', { style: LABEL }, [
				el('span', { text: labels.params, style: HEADING }),
				params,
			]);
			const exampleNote = el('p', { text: labels.example, hidden: true, style: NOTE });
			const code = el('code', {
				'aria-live': 'polite',
				style: MONO + 'display:block;padding:10px 12px;border-radius:8px;background:var(--muted, #f4f4f5);white-space:pre-wrap;word-break:break-word;min-height:1.5em;max-height:160px;overflow:auto;',
			});

			// Visual preview: image, description. Only built when the site has
			// at least one preview configured.
			const image = el('img', { alt: labels.previewAlt, loading: 'lazy', decoding: 'async' });
			const noPreview = el('p', { text: labels.noPreview, style: NOTE + 'padding:16px;text-align:center;' });
			const figure = el('figure', { className: 'sp-figure' });
			const description = el('p', { hidden: true, style: 'margin:0;font-size:14px;line-height:1.5;white-space:pre-line;' });
			image.addEventListener('error', () => {
				image.removeAttribute('src');
				figure.replaceChildren(noPreview);
				figure.classList.add('is-empty');
			});

			const insert = el('button', {
				type: 'button',
				text: labels.insert,
				disabled: true,
				style: BUTTON + 'border:0;background:var(--primary, #2563eb);color:var(--primary-foreground, #fff);',
			});
			const cancel = el('button', {
				type: 'button',
				text: labels.cancel,
				style: BUTTON + 'border:1px solid var(--border, #d4d4d8);background:transparent;color:inherit;',
			});

			const all = this.shortcodes;
			const selected = () => list.value || '';

			const fill = (filter) => {
				const needle = filter.trim().toLowerCase();
				const matches = all.filter((name) => name.toLowerCase().includes(needle));
				list.replaceChildren(...matches.map((name) => {
					const withPreview = !!previewFor(name);
					return el('option', {
						value: name,
						// A small marker flags shortcodes that have a preview.
						text: withPreview ? `[${name}]  ◆` : `[${name}]`,
						title: withPreview ? `[${name}] (${labels.hasPreview})` : `[${name}]`,
					});
				}));
				empty.hidden = matches.length > 0;
				list.hidden = matches.length === 0;
				if (matches.length > 0) list.value = matches[0];
				update();
			};

			const build = () => {
				const name = selected();
				if (!name) return '';
				const example = previewFor(name)?.example;
				if (example) return example;
				const attrs = params.value.trim();
				const open = `[${name}${attrs ? ' ' + attrs : ''}]`;
				return paired.checked ? `${open}${labels.content}[/${name}]` : open;
			};

			const updateVisual = (name) => {
				if (!hasPreviews) return;
				const data = previewFor(name);
				const src = safeImageUrl(data?.image);
				if (src) {
					if (image.getAttribute('src') !== src) image.src = src;
					figure.replaceChildren(image);
					figure.classList.remove('is-empty');
				} else {
					image.removeAttribute('src');
					figure.replaceChildren(noPreview);
					figure.classList.add('is-empty');
				}
				description.textContent = data?.description || '';
				description.hidden = !data?.description;
			};

			const update = () => {
				const name = selected();
				const hasExample = !!previewFor(name)?.example;
				// A configured example is inserted as is: the builder options
				// would not apply to it.
				pairedLabel.hidden = hasExample;
				paramsGroup.hidden = hasExample;
				exampleNote.hidden = !hasExample;
				const text = build();
				code.textContent = text || '—';
				insert.disabled = !text;
				updateVisual(name);
			};

			const submit = () => {
				const insertContent = build();
				if (!insertContent) return;
				this.dispatchEvent(new CustomEvent('resolve', { detail: { insertContent } }));
			};

			search.addEventListener('input', () => fill(search.value));
			list.addEventListener('change', update);
			list.addEventListener('dblclick', submit);
			params.addEventListener('input', update);
			paired.addEventListener('change', update);
			insert.addEventListener('click', submit);
			cancel.addEventListener('click', () => this.dispatchEvent(new CustomEvent('cancel')));
			search.addEventListener('keydown', (event) => {
				// Arrow down moves from the search box into the list.
				if (event.key === 'ArrowDown' && !list.hidden) {
					event.preventDefault();
					list.focus();
				}
			});
			this.addEventListener('keydown', (event) => {
				// Enter in the list or on the checkbox inserts; buttons and text
				// inputs keep their native Enter behaviour.
				if (event.key === 'Enter' && (event.target === list || event.target === paired)) {
					event.preventDefault();
					submit();
				}
			});

			const codeGroup = el('div', { style: LABEL }, [
				el('span', { text: labels.code, style: HEADING }),
				exampleNote,
				code,
			]);
			const listGroup = el('div', { style: 'display:flex;flex-direction:column;gap:8px;' }, [search, list, empty]);

			// Admin2 gives custom modal components no inner padding. Body and
			// footer reproduce the spacing of its built-in modals (24px sides,
			// footer separated by a border).
			const body = hasPreviews
				? el('div', { className: 'sp-body has-previews' }, [
					el('div', { className: 'sp-column' }, [listGroup, pairedLabel, paramsGroup]),
					el('div', { className: 'sp-column' }, [
						el('div', { style: LABEL }, [
							el('span', { text: labels.preview, style: HEADING }),
							figure,
							description,
						]),
						codeGroup,
					]),
				])
				: el('div', { className: 'sp-body' }, [listGroup, pairedLabel, paramsGroup, codeGroup]);

			const actions = el('div', { style: 'display:flex;justify-content:flex-end;gap:8px;padding:16px 24px;border-top:1px solid var(--border, #e4e4e7);' }, [cancel, insert]);
			this.style.display = 'block';
			this.replaceChildren(el('style', { text: STYLESHEET }), body, actions);

			fill('');
			search.focus();
		}
	});
}
