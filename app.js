(() => {
  "use strict";

  const DAY_MS = 24 * 60 * 60 * 1000;
  const FIRST_PHASE_DAYS = 21;

  const circlesEl = document.getElementById("circles");
  const specialEl = document.getElementById("special");
  const elapsedEl = document.getElementById("elapsed");
  const moneyEl = document.getElementById("money");

  const dtfCache = new Map();

  function getFormatter(timeZone) {
    if (!dtfCache.has(timeZone)) {
      dtfCache.set(
        timeZone,
        new Intl.DateTimeFormat("en-CA", {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23"
        })
      );
    }
    return dtfCache.get(timeZone);
  }

  function zonedParts(epochMs, timeZone = SETTINGS.timezone) {
    const parts = getFormatter(timeZone).formatToParts(new Date(epochMs));
    const out = {};
    for (const part of parts) {
      if (part.type !== "literal") out[part.type] = Number(part.value);
    }

    return {
      year: out.year,
      month: out.month,
      day: out.day,
      hour: out.hour,
      minute: out.minute,
      second: out.second
    };
  }

  function zonedDateTimeToEpoch(parts, timeZone = SETTINGS.timezone) {
    const targetUtcLike = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour || 0,
      parts.minute || 0,
      parts.second || 0
    );

    let guess = targetUtcLike;

    for (let i = 0; i < 5; i += 1) {
      const actual = zonedParts(guess, timeZone);
      const actualUtcLike = Date.UTC(
        actual.year,
        actual.month - 1,
        actual.day,
        actual.hour,
        actual.minute,
        actual.second
      );

      const diff = targetUtcLike - actualUtcLike;
      guess += diff;
      if (diff === 0) break;
    }

    return guess;
  }

  function addCalendarMonths(base, monthsToAdd) {
    const targetMonthIndex = (base.month - 1) + monthsToAdd;
    const year = base.year + Math.floor(targetMonthIndex / 12);
    const month = ((targetMonthIndex % 12) + 12) % 12 + 1;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    return {
      year,
      month,
      day: Math.min(base.day, daysInMonth),
      hour: base.hour,
      minute: base.minute,
      second: base.second || 0
    };
  }

  function addCalendarYears(base, yearsToAdd) {
    const year = base.year + yearsToAdd;
    const daysInMonth = new Date(Date.UTC(year, base.month, 0)).getUTCDate();

    return {
      year,
      month: base.month,
      day: Math.min(base.day, daysInMonth),
      hour: base.hour,
      minute: base.minute,
      second: base.second || 0
    };
  }

  function renderCircles() {
    circlesEl.innerHTML = "";

    for (let i = 0; i < FIRST_PHASE_DAYS; i += 1) {
      const el = document.createElement("div");
      el.className = "day";

      const isCritical = i < 5;
      const size = isCritical ? 46 : Math.max(16, 39 - (i - 5) * 1.45);

      el.style.setProperty("--size", `${size}px`);
      el.style.setProperty("--fill", isCritical ? "var(--red)" : "var(--orange)");
      el.style.setProperty("--empty", isCritical ? "var(--muted-red)" : "var(--muted-orange)");
      el.style.setProperty("--progress", "0deg");

      circlesEl.appendChild(el);
    }
  }

  function setCircleProgress(el, fraction) {
    const clamped = Math.max(0, Math.min(1, fraction));
    el.style.setProperty("--progress", `${clamped * 360}deg`);
    el.classList.toggle("done", clamped >= 1);
    el.classList.toggle("future", clamped <= 0);
  }

  function updateCircleView(nowMs, startMs) {
    const elapsedMs = Math.max(0, nowMs - startMs);

    [...circlesEl.children].forEach((el, index) => {
      const dayStart = index * DAY_MS;
      setCircleProgress(el, (elapsedMs - dayStart) / DAY_MS);
    });
  }

  function priceSegments() {
    return SETTINGS.prices
      .map((entry) => ({
        fromMs: zonedDateTimeToEpoch(entry.from),
        pricePerPack: Number(entry.pricePerPack)
      }))
      .sort((a, b) => a.fromMs - b.fromMs);
  }

  const configuredPriceSegments = priceSegments();

  function moneySaved(nowMs, startMs) {
    if (nowMs <= startMs) return 0;

    let total = 0;

    for (let i = 0; i < configuredPriceSegments.length; i += 1) {
      const current = configuredPriceSegments[i];
      const next = configuredPriceSegments[i + 1];

      const segmentStart = Math.max(startMs, current.fromMs);
      const segmentEnd = Math.min(nowMs, next ? next.fromMs : nowMs);

      if (segmentEnd <= segmentStart) continue;

      total +=
        ((segmentEnd - segmentStart) / DAY_MS) *
        SETTINGS.packsPerDay *
        current.pricePerPack;
    }

    return total;
  }

  function renderMoney(value) {
    const [whole, fraction] = value.toFixed(2).split(".");
    moneyEl.innerHTML =
      `<span class="whole">${whole}</span>` +
      `<span class="fraction"><span class="separator">,</span>${fraction}</span>`;
  }

  function anniversarySpecial(nowMs) {
    const nowLocal = zonedParts(nowMs);
    const start = SETTINGS.start;

    let months = (nowLocal.year - start.year) * 12 + (nowLocal.month - start.month);
    if (months < 1) return null;

    let anniversary = addCalendarMonths(start, months);
    let anniversaryMs = zonedDateTimeToEpoch(anniversary);

    if (anniversaryMs > nowMs) {
      months -= 1;
      if (months < 1) return null;
      anniversary = addCalendarMonths(start, months);
      anniversaryMs = zonedDateTimeToEpoch(anniversary);
    }

    if (nowMs >= anniversaryMs && nowMs < anniversaryMs + DAY_MS) {
      const years = Math.floor(months / 12);
      const remainderMonths = months % 12;

      if (years === 0) {
        return `${months} ${months === 1 ? "Month" : "Months"}`;
      }

      const yearText = `${years} ${years === 1 ? "Year" : "Years"}`;

      if (remainderMonths === 0) return yearText;

      return `${yearText} ${remainderMonths} ${
        remainderMonths === 1 ? "Month" : "Months"
      }`;
    }

    return null;
  }

  function currentSpecial(nowMs, startMs) {
    if (nowMs >= startMs + 5 * DAY_MS && nowMs < startMs + 6 * DAY_MS) {
      return "50%";
    }

    if (nowMs >= startMs + 21 * DAY_MS && nowMs < startMs + 22 * DAY_MS) {
      return "URFree";
    }

    return anniversarySpecial(nowMs);
  }

  function diffCalendar(nowMs) {
    const start = SETTINGS.start;
    const nowLocal = zonedParts(nowMs);

    let years = nowLocal.year - start.year;
    let anchor = addCalendarYears(start, years);
    let anchorMs = zonedDateTimeToEpoch(anchor);

    if (anchorMs > nowMs) {
      years -= 1;
      anchor = addCalendarYears(start, years);
    }

    let months =
      (nowLocal.year - anchor.year) * 12 +
      (nowLocal.month - anchor.month);

    let monthAnchor = addCalendarMonths(anchor, months);
    let monthAnchorMs = zonedDateTimeToEpoch(monthAnchor);

    if (monthAnchorMs > nowMs) {
      months -= 1;
      monthAnchor = addCalendarMonths(anchor, months);
      monthAnchorMs = zonedDateTimeToEpoch(monthAnchor);
    }

    const remainderMs = Math.max(0, nowMs - monthAnchorMs);
    const days = Math.floor(remainderMs / DAY_MS);
    const hours = Math.floor((remainderMs % DAY_MS) / (60 * 60 * 1000));

    return { years, months, days, hours };
  }

  function renderElapsed(nowMs) {
    const d = diffCalendar(nowMs);

    elapsedEl.innerHTML =
      `${d.years}<span class="unit">y.</span>` +
      `${d.months}<span class="unit">m.</span>` +
      `${d.days}<span class="unit">d.</span>` +
      `${d.hours}<span class="unit">h.</span>`;
  }

  function show(mode) {
    circlesEl.hidden = mode !== "circles";
    specialEl.hidden = mode !== "special";
    elapsedEl.hidden = mode !== "elapsed";
  }

  const startMs = zonedDateTimeToEpoch(SETTINGS.start);

  function update() {
    const nowMs = Date.now();

    renderMoney(moneySaved(nowMs, startMs));

    if (nowMs < startMs) {
      show("circles");
      updateCircleView(startMs, startMs);
      return;
    }

    const special = currentSpecial(nowMs, startMs);

    if (special) {
      specialEl.textContent = special;
      show("special");
      return;
    }

    if (nowMs < startMs + FIRST_PHASE_DAYS * DAY_MS) {
      show("circles");
      updateCircleView(nowMs, startMs);
      return;
    }

    renderElapsed(nowMs);
    show("elapsed");
  }

  renderCircles();
  update();
  setInterval(update, 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) update();
  });
})();
