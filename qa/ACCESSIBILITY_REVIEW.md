# Accessibility Review

## Verified contracts

- Skip link targets the main content landmark.
- Primary and mobile navigation have accessible labels.
- Headings are present on every deterministic route.
- Interactive icons have labels or are hidden when decorative.
- Dialogs use native `dialog` semantics and labelled titles.
- Cart/status notifications use polite live regions.
- Keyboard focus is visibly styled.
- Reduced-motion and increased-contrast preferences are supported.
- Forms use visible labels and grouped controls.
- Responsive layouts cover mobile, tablet, and desktop breakpoints in CSS.

## Remaining acceptance work

- Test at 200% and 400% zoom on real browsers.
- Test VoiceOver/Safari, NVDA/Firefox or Chrome, and TalkBack/Chrome.
- Validate final third-party payment, map, POS, and verification widgets.
- Confirm contrast after real photography and final offer badges are inserted.
- Run task-based testing with keyboard-only and screen-reader users.

Automated and code-contract checks support—but do not replace—human accessibility testing.
