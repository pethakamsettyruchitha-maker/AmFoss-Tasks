## ***How It Works***
- On page load, any cached price snapshot is shown immediately so the user sees data right away.
- The app fetches fresh market data from CoinGecko and re-renders the table, then repeats this every 90 seconds.
- Clicking a coin row opens a chart panel and fetches that coin's historical prices for the selected time range.
- Starring a coin adds it to the wishlist, which is stored in localStorage so it persists between visits.
- All API requests go through a single request queue with retry/backoff logic, so the app never fires multiple CoinGecko calls in parallel and gracefully recovers from rate limiting (HTTP 429).
- Challenges Faced

## ***Based on the patterns handled in the code, this project involved working through a few real issues:***

- API rate limiting (429 errors): CoinGecko's free tier throttles frequent requests. This was solved by serializing all API calls into a single queue and adding retry logic with exponential backoff, instead of firing requests in parallel.
- Chart not rendering on first load: Drawing a Chart.js chart into a canvas that's still display: none results in a 0×0 canvas and a blank chart. This was fixed by unhiding the canvas before drawing, and forcing an extra resize on the next animation frame to handle browsers that report a stale size on first paint.
- Handling API failures without breaking the UI: If a refresh fails but data is already on screen, the app keeps showing the last good data with a status message, rather than clearing the table — this required tracking whether it was an initial load or a background refresh.
- Keeping the app usable when the API is down: Added a local cache of the last successful snapshot so returning users see recent prices instantly instead of a blank loading screen.
- Dark mode + charts: The chart's colors (grid lines, text, legend) don't automatically follow a CSS theme toggle, so switching dark mode required manually redrawing the existing chart with new theme colors rather than just re-fetching data.

 ## Features
- ***Live market table*** — top coins by market cap, with price, 24h change, and market cap, auto-refreshing every 90 seconds
- ***Search*** — filter coins by name or symbol with a live dropdown of matches
- ***Price charts*** — click any coin to see a line chart of its price history, switchable between 24H / 1W / 1M / 1Y
- ***Wishlist*** — star coins to save them to a personal watchlist (persisted in the browser via localStorage)
- ***Dark mode*** — toggleable theme that also re-colors the active chart
- ***Offline***-friendly caching — the last successful snapshot of prices is cached locally, so the table isn't empty if the API is temporarily unreachable
- ***Resilient networking***  — API calls are queued one at a time and automatically retried with exponential backoff if rate-limited
