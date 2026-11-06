# Pulse 0.3.0 / V2 implementation

Implemented and installed on 2026-10-10.

- English UI: rail, detail cards, settings, tooltips, usage labels, status messages and date formatting. V2 concept previews were also converted to English.
- Smoked graphite surfaces with jade accents, inset session panels and restrained edge highlights.
- Provider order: ChatGPT / Codex, Antigravity, Claude Code, OpenRouter (Claude Code), DeepSeek, Kimi, MiMo.
- Immediate rail readouts: highest reported usage window for allowance providers; currency amounts for balance providers; explicit unavailable states.
- Hover to preview, click to pin, pin button to unpin, close button or Escape to dismiss. Details remain always on top.
- Primary allowance is followed by the latest active session; additional quota windows remain available below it. Longer cards scroll.
- Session labels distinguish Codex's latest turn from Antigravity's latest generation. Missing values remain unreported, not synthetic zeroes.
- Open details receive refreshed readings. Popup bounds are constrained to the current display work area.

## Evidence

The Electron renderer produced the `implemented-*.png` images from production HTML/CSS/JS with synthetic data. Rail, quota, session, balance and unavailable layouts were visually inspected. Modified JavaScript entry points passed syntax checks. Both NSIS installer and portable builds completed. The installer returned exit code 0, the installed executable reports version 0.3.0, and the installed `app.asar` SHA-256 matches the packaged build. Processes were confirmed running from the installed Pulse directory.

These checks do not constitute a full interactive or multi-monitor accessibility evaluation. Rendered images use synthetic readings, not real account observations. The V2 surface uses CSS gradients and opacity; native Windows Acrylic/Mica has not been introduced.

Installer: `Pulse Setup 0.3.0.exe` (build output).

Installed application: `%LOCALAPPDATA%\Programs\Pulse\Pulse.exe`.

Preview gallery: `implemented-preview.html`.

## 0.3.1 interaction update

Details now open only when a provider button is clicked. Clicking that button again closes them; clicking another provider switches the content. Hover, focus and refresh no longer open details. The pin control and hover-close timers have been removed. The close button and Escape remain available, and closing clears the selected provider indicator.

Detail height follows rendered content up to 1000 CSS pixels, limited to the display work area with 12px vertical margins. Short balance and unavailable cards stay compact. Scrolling remains as a fallback when content exceeds the available screen height. The production-render previews have been regenerated with synthetic values; the Antigravity example fits all content without scrolling at its natural height.

## 0.3.2 — Glass and motion
- Rail, detail card, and settings use translucent graphite surfaces with 22px backdrop blur.
- Native Windows acrylic is enabled on supported Windows 11 versions unless transparency reduction or high contrast is active.
- Detail window fades in over 420ms and out over 320ms. Rapid toggles reverse from the current opacity; closing releases pointer input immediately.
- Reduced motion skips the fade. Reduced transparency uses an opaque surface.
- Production renderer snapshots were regenerated. Native desktop acrylic and motion require visual observation on Windows.


## 0.4.0 — Edge reveal
- Starts collapsed at the left or right screen edge, exposing a 6px trigger.
- Hover continuously for 1000ms or click the trigger to expand. Dragging snaps to the nearest edge.
- Provider icons retain click-to-toggle details. Focus leaving the rail/detail group collapses the rail and closes details.
- Rail reveal uses 420ms; dismissal uses 320ms, respecting reduced motion.
- All main glass surfaces use 75% background opacity. Text remains fully opaque.
- Removed the native acrylic rectangle and applied native rounded window regions; collapsed hit testing is limited to the visible 6px edge.
- Renderer captures are visual artifacts with synthetic values; they do not validate OS input or desktop compositing.


## 0.4.1 — Interaction and surfaces
- Re-anchor to the nearest screen edge when collapsing, including dismissals caused by focus leaving the app.
- Ignore stale blur timers after a new expand action, so a quick reopen does not collapse immediately.
- Use native acrylic on supported Windows surfaces, with 75%-opaque rail and settings surfaces.
- Let CSS antialias expanded rounded corners; native region clipping applies only to the collapsed 6px edge.
- The detail popup keeps its native backdrop clear to prevent gray flashes. It is shown only after the selected provider is rendered and its content height is applied.
- Add system window shadows and rendered shadows to the rail and detail surfaces.


## 0.4.2 — Window bounds and translucency
- The collapsed rail is now a real 6px-wide native window; expanding restores the 84px width. This avoids a shadow or backdrop from the hidden part of a full-size window.
- Removed native shape masks, which produced hard, jagged edges. Expanded panel corners are antialiased by CSS.
- Use 85% native window opacity over 88% surface tint (about 75% effective surface opacity); remove CSS backdrop filters that appeared dark but cannot blur other desktop applications.
- Keep the details window's native backdrop disabled. Render its selected content and fit its height before the fade-in.
- System shadows are disabled to avoid rectangular shadow artifacts. Surfaces use inset depth shadows.

