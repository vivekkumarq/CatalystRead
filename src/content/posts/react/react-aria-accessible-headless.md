---
title: "React Aria: Accessible Headless Components Without Restyling a Monster Theme"
slug: "react-aria-accessible-headless"
description: "Adobe React Aria: behavior and ARIA, your CSS, and why headless is more than 'unstyled buttons' when keyboard and screen readers matter."
publishedAt: "2026-08-28"
category: "React"
tags:
  - React
  - Accessibility
  - Design Systems
  - UI
sources:
  - title: "React Aria"
    publisher: "Adobe"
    url: "https://react-spectrum.adobe.com/react-aria/"
  - title: "WAI-ARIA Authoring Practices"
    publisher: "W3C"
    url: "https://www.w3.org/WAI/ARIA/apg/"
---

A `<div onClick>` is not a button. A custom listbox that ignores `aria-activedescendant` is not a select. **React Aria** (Adobe) is a set of **headless** hooks and components that implement keyboard interaction, focus management, and ARIA from the APG, while you supply markup and CSS. React Spectrum is the styled cousin. If you already fight a huge CSS-in-JS theme to change a border, headless is the point.

## What you still have to do

You must put the hooks on the right DOM (`useButton` on a real `<button>` when you can). You must not break focus by wrapping in a div that eats clicks. You must test with a keyboard and a screen reader; the library reduces the chance you skip `role` and `tabIndex`, it does not certify your layout.

```jsx
const ref = useRef(null);
const { buttonProps } = useButton({ onPress: submit }, ref);
return <button {...buttonProps} ref={ref} className={css.primary} />;
```

Combobox, DatePicker, GridList, Overlay: these are where homemade implementations fail (focus traps, typeahead, disabled items). Use them instead of npm roulette of outdated a11y mixins.

## Headless versus copy-paste ARIA

Headless UI (Tailwind), Radix, Ark, React Aria overlap. React Aria's strength is completeness of collections and i18n (Adobe's internationalized date/number). Radix's strength is often composition and docs for styling. Pick one **focus primitive** set per app. Mixing two modal stacks is how focus restores to the wrong place.

Styling: data attributes (`data-focused`, `data-pressed`) are the usual hook. Do not restyle by targeting `[role=button]` globally.

## Testing

Testing Library plus `userEvent.keyboard`. axe-core in CI. A screenshot of a pretty dropdown is not a test of Escape to close. React Aria's docs include interaction notes — treat them as spec.

If the design system is "Bootstrap with extra steps," you may not need headless. If the design system is custom and legal cares about WCAG, React Aria is cheaper than a second year of ARIA bugs.

Read the React Aria getting started and the APG pattern for the widget you are shipping. Then unplug the mouse. Headless means you own the pixels and they own the contract with assistive tech. That split is the design system.
