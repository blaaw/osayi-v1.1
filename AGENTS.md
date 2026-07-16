# Osayi project context

## Purpose

Osayi — local databases & notes is a local-first, browser-only note and task workspace for students, tech-savvy people, productivity enthusiasts, and anyone who enjoys the flexibility of Notion or Obsidian.

## Product requirements

- Use only HTML, CSS, and vanilla JavaScript. Keep dependencies and build tooling out.
- Provide CRUD for multiple user-created databases.
- Each database contains Markdown notes and tasks, with create, edit, delete, completion, tags, and dates.
- Include practical querying through quick-view buttons, search, filters, sorting, and a dashboard.
- Persist every change locally in the browser.
- Export all data as a JSON file and restore it through JSON import.
- Keep the interface minimal, fast, accessible, responsive, and monospace-led.

## Development notes

- Main entry points: `index.html` and `entry.html`; styles: `styles.css`; behavior is split between `js/core.js`, `js/index.js`, and `js/entry.js`.
- Browser storage key: `osayi-local-workspace-v1`.
- Preserve the export schema's `version` field and validate imports before replacing current state.
- Avoid frameworks, remote assets, and network calls.

## Code organization

- Keep using vanilla JavaScript, but split behavior into focused files and folders when it improves debugging and maintenance.
- Choose the structure that best fits the feature: separate shared utilities and storage from page- or feature-specific behavior.
- Make deliberate implementation decisions, especially in JavaScript; prioritize clear, modular, easy-to-debug code over unnecessary abstraction.
