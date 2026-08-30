

const API_BASE = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=25&page=1&sparkline=false";
const CURRENCY = "usd";
const REFRESH_INTERVAL_MS = 90000; // 90s — stays well under the free-tier limit
const CACHE_KEY = "cryptoTrackerLastSnapshot";

const COINGECKO_API_KEY = "";

function withApiKey(url) {
  if (!COINGECKO_API_KEY) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}x_cg_demo_api_key=${COINGECKO_API_KEY}`;
}

let allCoins = [];
let filteredCoins = null;
let wishlist = loadWishlist();
let activeChart = null;
let activeCoinId = null;
let activeRangeDays = 1;
let requestQueue = Promise.resolve(); // serializes all API calls

// ---------- DOM references ----------
const statusBanner = document.getElementById("statusBanner");
const loadingMsg = document.getElementById("loadingMsg");
const errorMsg = document.getElementById("errorMsg");
const errorText = document.getElementById("errorText");
const retryBtn = document.getElementById("retryBtn");
const coinTable = document.getElementById("coinTable");
const coinTableBody = document.getElementById("coinTableBody");
const searchBox = document.getElementById("searchBox");
const searchResults = document.getElementById("searchResults");
const darkModeBtn = document.getElementById("darkModeBtn");
const chartSection = document.getElementById("chartSection");
const chartCoinName = document.getElementById("chartCoinName");
const chartStatus = document.getElementById("chartStatus");
const closeChartBtn = document.getElementById("closeChartBtn");
const rangeBtns = document.getElementById("rangeBtns");
const priceChartCanvas = document.getElementById("priceChart");
const wishlistEmpty = document.getElementById("wishlistEmpty");
const wishlistTable = document.getElementById("wishlistTable");
const wishlistTableBody = document.getElementById("wishlistTableBody");

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  initDarkMode();
  loadCachedSnapshotIfAny();

  if (!COINGECKO_API_KEY) {
    showStatus(
      "Tip: add a free CoinGecko Demo API key at the top of script.js for reliable data (no key = requests may be throttled)."
    );
  }

  fetchCoins();
  setInterval(fetchCoins, REFRESH_INTERVAL_MS);

  searchBox.addEventListener("input", onSearchInput);
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".toolbar")) {
      searchResults.style.display = "none";
    }
  });

  darkModeBtn.addEventListener("click", toggleDarkMode);
  retryBtn.addEventListener("click", fetchCoins);

  closeChartBtn.addEventListener("click", () => {
    chartSection.style.display = "none";
    activeCoinId = null;
  });

  rangeBtns.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-days]");
    if (!btn || !activeCoinId) return;
    [...rangeBtns.children].forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeRangeDays = Number(btn.dataset.days);
    loadChart(activeCoinId, activeRangeDays);
  });
});

// ---------- Networking helpers (retry + backoff + single-flight queue) ----------

// Runs one fetch at a time so we never fire two CoinGecko calls in parallel
// (a common cause of hitting the free-tier rate limit and getting 429s).
function queuedFetchJson(url, { retries = 3, baseDelayMs = 1000 } = {}) {
  const run = () => fetchJsonWithRetry(url, retries, baseDelayMs);
  const result = requestQueue.then(run, run);
  // keep the queue alive even if this call fails, so later calls still run
  requestQueue = result.catch(() => {});
  return result;
}

async function fetchJsonWithRetry(url, retries, baseDelayMs) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);

      if (res.status === 429) {
        if (attempt === retries) {
          throw new Error("Rate limited by the API (too many requests). Please wait a moment.");
        }
        await sleep(baseDelayMs * Math.pow(2, attempt));
        continue;
      }

      if (!res.ok) {
        throw new Error(`API responded with status ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(baseDelayMs * Math.pow(2, attempt));
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- Dark mode ----------
function initDarkMode() {
  const saved = localStorage.getItem("cryptoTrackerDarkMode");
  if (saved === "true") {
    document.body.classList.add("dark");
    darkModeBtn.textContent = "☀️ Light Mode";
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle("dark");
  darkModeBtn.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  localStorage.setItem("cryptoTrackerDarkMode", isDark);
  if (activeChart) {
    redrawChartTheme();
  }
}

// ---------- Wishlist storage ----------
function loadWishlist() {
  try {
    const raw = localStorage.getItem("cryptoTrackerWishlist");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveWishlist() {
  localStorage.setItem("cryptoTrackerWishlist", JSON.stringify(wishlist));
}

function toggleWishlist(coinId) {
  const idx = wishlist.indexOf(coinId);
  if (idx === -1) {
    wishlist.push(coinId);
  } else {
    wishlist.splice(idx, 1);
  }
  saveWishlist();
  renderTable(filteredCoins || allCoins);
  renderWishlist();
}

// ---------- Snapshot cache (so the table isn't empty if the API is down) ----------
function loadCachedSnapshotIfAny() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const snapshot = JSON.parse(raw);
    if (Array.isArray(snapshot.coins) && snapshot.coins.length) {
      allCoins = snapshot.coins;
      renderTable(allCoins);
      renderWishlist();
      loadingMsg.style.display = "none";
      coinTable.style.display = "table";
      showStatus(`Showing cached prices from ${new Date(snapshot.savedAt).toLocaleTimeString()} while we fetch fresh data...`);
    }
  } catch (e) {
    // ignore corrupt cache
  }
}

function saveSnapshot(coins) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ coins, savedAt: Date.now() }));
  } catch (e) {
    // storage full or unavailable — non-fatal
  }
}

function showStatus(text) {
  statusBanner.textContent = text;
  statusBanner.style.display = "block";
}

function hideStatus() {
  statusBanner.style.display = "none";
}

// ---------- Fetch coin market data ----------
async function fetchCoins() {
  retryBtn.disabled = true;
  try {
    const url = withApiKey(`${API_BASE}/coins/markets?vs_currency=${CURRENCY}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`);
    const data = await queuedFetchJson(url);

    allCoins = data;
    saveSnapshot(data);

    loadingMsg.style.display = "none";
    errorMsg.style.display = "none";
    coinTable.style.display = "table";
    hideStatus();

    renderTable(filteredCoins || allCoins);
    renderWishlist();
  } catch (err) {
    console.error("fetchCoins error:", err);
    loadingMsg.style.display = "none";

    if (allCoins.length) {
      // We already have data on screen (live or cached) — don't blow it away,
      // just let the user know the latest refresh failed.
      showStatus("Couldn't refresh prices just now — showing the last data we have.");
    } else {
      coinTable.style.display = "none";
      errorMsg.style.display = "block";
      errorText.textContent = friendlyErrorText(err);
    }
  } finally {
    retryBtn.disabled = false;
  }
}

function friendlyErrorText(err) {
  const msg = String(err && err.message ? err.message : err);
  if (msg.includes("401") || msg.includes("403")) {
    return "The API rejected the request (missing/invalid key). Add a free CoinGecko Demo API key at the top of script.js.";
  }
  if (msg.includes("Rate limited") || msg.includes("429")) {
    return "The price API is rate-limiting requests right now. Click Retry in a few seconds, or add a free CoinGecko Demo API key at the top of script.js for higher limits.";
  }
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return "Couldn't reach the price API. Check your internet connection (and that this page is being served over http/https, not opened directly as a file) and try again.";
  }
  return "Couldn't load market data right now. Click Retry to try again.";
}

// ---------- Render main table ----------
function renderTable(coins) {
  coinTableBody.innerHTML = "";

  if (!coins.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" class="emptyMsg">No coins match your search.</td>`;
    coinTableBody.appendChild(tr);
    return;
  }

  coins.forEach((coin, index) => {
    const tr = document.createElement("tr");
    const change = coin.price_change_percentage_24h;
    const changeClass = (change ?? 0) >= 0 ? "green" : "red";
    const changeSign = (change ?? 0) >= 0 ? "+" : "";
    const isStarred = wishlist.includes(coin.id);

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>
        <img class="coinIcon" src="${coin.image}" alt="${coin.name} icon" />
        ${coin.name} <span style="color:#888;">(${coin.symbol.toUpperCase()})</span>
      </td>
      <td class="priceCell">${formatCurrency(coin.current_price)}</td>
      <td class="${changeClass}">${changeSign}${(change ?? 0).toFixed(2)}%</td>
      <td>${formatCurrency(coin.market_cap, true)}</td>
      <td><button class="${isStarred ? "unstarBtn" : "starBtn"}" data-action="star" data-id="${coin.id}">${isStarred ? "★ Remove" : "☆ Add"}</button></td>
    `;

    tr.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='star']")) return;
      openChart(coin.id, coin.name);
    });

    tr.querySelector("[data-action='star']").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleWishlist(coin.id);
    });

    coinTableBody.appendChild(tr);
  });
}

function renderWishlist() {
  const starredCoins = allCoins.filter((c) => wishlist.includes(c.id));

  if (!starredCoins.length) {
    wishlistEmpty.style.display = "block";
    wishlistTable.style.display = "none";
    return;
  }

  wishlistEmpty.style.display = "none";
  wishlistTable.style.display = "table";
  wishlistTableBody.innerHTML = "";

  starredCoins.forEach((coin) => {
    const tr = document.createElement("tr");
    const change = coin.price_change_percentage_24h;
    const changeClass = (change ?? 0) >= 0 ? "green" : "red";
    const changeSign = (change ?? 0) >= 0 ? "+" : "";

    tr.innerHTML = `
      <td>
        <img class="coinIcon" src="${coin.image}" alt="${coin.name} icon" />
        ${coin.name} <span style="color:#888;">(${coin.symbol.toUpperCase()})</span>
      </td>
      <td class="priceCell">${formatCurrency(coin.current_price)}</td>
      <td class="${changeClass}">${changeSign}${(change ?? 0).toFixed(2)}%</td>
      <td><button class="unstarBtn" data-action="unstar" data-id="${coin.id}">Remove</button></td>
    `;

    tr.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='unstar']")) return;
      openChart(coin.id, coin.name);
    });

    tr.querySelector("[data-action='unstar']").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleWishlist(coin.id);
    });

    wishlistTableBody.appendChild(tr);
  });
}

// ---------- Search ----------
function onSearchInput() {
  const query = searchBox.value.trim().toLowerCase();

  if (!query) {
    searchResults.style.display = "none";
    filteredCoins = null;
    renderTable(allCoins);
    return;
  }

  const matches = allCoins.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.symbol.toLowerCase().includes(query)
  );

  filteredCoins = matches;
  renderTable(matches);

  searchResults.innerHTML = "";
  if (matches.length) {
    matches.slice(0, 8).forEach((coin) => {
      const div = document.createElement("div");
      div.innerHTML = `<img class="coinIcon" src="${coin.image}" alt="" /> ${coin.name} (${coin.symbol.toUpperCase()})`;
      div.addEventListener("click", () => {
        searchBox.value = coin.name;
        searchResults.style.display = "none";
        filteredCoins = [coin];
        renderTable(filteredCoins);
        openChart(coin.id, coin.name);
      });
      searchResults.appendChild(div);
    });
    searchResults.style.display = "block";
  } else {
    searchResults.style.display = "none";
  }
}

// ---------- Chart ----------
function openChart(coinId, coinName) {
  activeCoinId = coinId;
  chartCoinName.textContent = coinName;
  chartSection.style.display = "block";
  chartSection.scrollIntoView({ behavior: "smooth", block: "nearest" });

  [...rangeBtns.children].forEach((b) => b.classList.remove("active"));
  const defaultBtn = [...rangeBtns.children].find(
    (b) => Number(b.dataset.days) === activeRangeDays
  );
  if (defaultBtn) defaultBtn.classList.add("active");

  loadChart(coinId, activeRangeDays);
}

async function loadChart(coinId, days) {
  chartStatus.className = "chartLoading";
  chartStatus.textContent = "Loading chart...";
  // Keep the canvas hidden only while we don't have data yet — but never
  // draw into it while it's hidden, since a display:none canvas measures
  // as 0x0 and Chart.js will render nothing (and often stay blank even
  // after being shown again).
  priceChartCanvas.style.visibility = "hidden";

  try {
    if (typeof Chart === "undefined") {
      throw new Error("Chart.js failed to load from the CDN. Check your connection and reload the page.");
    }

    const url = withApiKey(`${API_BASE}/coins/${coinId}/market_chart?vs_currency=${CURRENCY}&days=${days}`);
    const data = await queuedFetchJson(url);

    const prices = data.prices || [];
    if (!prices.length) {
      throw new Error("No chart data returned for this range.");
    }

    const labels = prices.map(([timestamp]) => formatChartLabel(timestamp, days));
    const values = prices.map(([, price]) => price);

    // Make the canvas visible FIRST so it has real dimensions,
    // then draw — order matters for Chart.js sizing.
    chartStatus.textContent = "";
    chartStatus.className = "";
    priceChartCanvas.style.visibility = "visible";

    drawChart(labels, values);

    // Some browsers still report a stale size on the very first paint
    // after unhiding; force one resize pass on the next frame to be safe.
    requestAnimationFrame(() => {
      if (activeChart) activeChart.resize();
    });
  } catch (err) {
    console.error("loadChart error:", err);
    chartStatus.className = "chartError";
    chartStatus.textContent = friendlyErrorText(err);
  }
}

function drawChart(labels, values) {
  if (activeChart) {
    activeChart.destroy();
  }

  const isDark = document.body.classList.contains("dark");
  const gridColor = isDark ? "#444444" : "#dddddd";
  const textColor = isDark ? "#eeeeee" : "#222222";

  activeChart = new Chart(priceChartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `Price (${CURRENCY.toUpperCase()})`,
          data: values,
          borderColor: "#2e7d32",
          backgroundColor: "rgba(46, 125, 50, 0.15)",
          fill: true,
          tension: 0.2,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } },
      },
      scales: {
        x: {
          ticks: { color: textColor, maxTicksLimit: 8 },
          grid: { color: gridColor },
        },
        y: {
          ticks: { color: textColor },
          grid: { color: gridColor },
        },
      },
    },
  });
}

function redrawChartTheme() {
  // re-render the existing chart with updated theme colors without refetching
  if (!activeChart) return;
  const labels = activeChart.data.labels;
  const values = activeChart.data.datasets[0].data;
  drawChart(labels, values);
}

// ---------- Formatting helpers ----------
function formatCurrency(value, compact = false) {
  if (value === null || value === undefined) return "—";
  if (compact) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value);
}

function formatChartLabel(timestamp, days) {
  const date = new Date(timestamp);
  if (days <= 1) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (days <= 30) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString([], { month: "short", year: "2-digit" });
}