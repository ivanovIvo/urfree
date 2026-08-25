# URFree

Minimal iPhone-friendly static web app.

## Files

- `index.html` — page shell
- `style.css` — layout and visuals
- `app.js` — counters, milestones and circle animation
- `settings.js` — editable start time, packs/day and cigarette price history

## Current start

24.08.2026, 02:10 — Europe/Sofia

## Price changes

Edit `settings.js` and append a new entry in `prices`.

Example:

```js
{
  from: {
    year: 2026,
    month: 10,
    day: 29,
    hour: 0,
    minute: 0,
    second: 0
  },
  pricePerPack: 4.00
}
```

The app preserves the old price for the old period and uses the new price only from the configured date/time onward.

## GitHub Pages

Upload these files to a repository and enable GitHub Pages from the repository settings.
