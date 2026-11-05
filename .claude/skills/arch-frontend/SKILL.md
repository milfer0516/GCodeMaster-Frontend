---
name: arch-frontend
description: Architecture rules for the React frontend. Use when designing or reviewing frontend code.
---

# Frontend architecture

- The frontend never calculates manufacturing values: it displays what the backend and engine return and sends the operator's choices.
- Components are decoupled: data fetching in services, state in the store, presentation in components.
- Every engine warning and error that reaches the response is shown to the operator with its setup and operation.
- Works on any screen size, from phone to desktop; colors and states contrast in light and dark mode.
- Evidence for a UI change: screenshots at phone, tablet and desktop widths, and the exact JSON sent to the backend.
