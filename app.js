(() => {
  "use strict";

  const DAY_MS = 24 * 60 * 60 * 1000;
  const HOUR_MS = 60 * 60 * 1000;
  const FIRST_PHASE_DAYS = 21;

  const circlesEl = document.getElementById("circles");
  const specialEl = document.getElementById("special");
  const elapsedEl = document.getElementById("elapsed");
  const lifetimeMoneyEl = document.getElementById("lifetimeMoney");
  const moneyEl = document.getElementById("money");
  const projectMoneyEl = document.getElementById("projectMoney");
  const transferControlsEl = document.getElementById("transferControls");
  const digitWheelsEl = document.getElementById("digitWheels");
  const confirmTransferEl = document.getElementById("confirmTransfer");
  const syncStatusEl = document.getElementById("syncStatus");
  const sceneEl = document.getElementById("scene");

  const authOverlayEl = document.getElementById("authOverlay");
  const authCallbackPanelEl = document.getElementById("authCallbackPanel");
  const authCallbackMessageEl = document.getElementById("authCallbackMessage");
  const authCallbackLoginEl = document.getElementById("authCallbackLogin");
  const passwordSetupFormEl = document.getElementById("passwordSetupForm");
  const passwordSetupTitleEl = document.getElementById("passwordSetupTitle");
  const passwordSetupCopyEl = document.getElementById("passwordSetupCopy");
  const passwordSetupSubmitEl = document.getElementById("passwordSetupSubmit");
  const passwordSetupErrorEl = document.getElementById("passwordSetupError");
  const newPasswordEl = document.getElementById("newPassword");
  const confirmPasswordEl = document.getElementById("confirmPassword");
  const loginFormEl = document.getElementById("loginForm");
  const loginEmailEl = document.getElementById("loginEmail");
  const loginPasswordEl = document.getElementById("loginPassword");
  const loginErrorEl = document.getElementById("loginError");
  const maintenanceOverlayEl = document.getElementById("maintenanceOverlay");
  const historyListEl = document.getElementById("historyList");
  const undoTransferEl = document.getElementById("undoTransfer");
  const logoutButtonEl = document.getElementById("logoutButton");
  const closeMaintenanceEl = document.getElementById("closeMaintenance");
  const maintenanceErrorEl = document.getElementById("maintenanceError");

  const yearStackEl = document.getElementById("yearStack");
  const monthIndicatorEl = document.getElementById("monthIndicator");
  const dayIndicatorEl = document.getElementById("dayIndicator");
  const hourIndicatorEl = document.getElementById("hourIndicator");

  const yearsValueEl = document.getElementById("yearsValue");
  const monthsValueEl = document.getElementById("monthsValue");
  const daysValueEl = document.getElementById("daysValue");
  const hoursValueEl = document.getElementById("hoursValue");

  const dtfCache = new Map();

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function ease(t) {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function easeOut(t) {
    const x = clamp(t, 0, 1);
    return 1 - Math.pow(1 - x, 3);
  }

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
      if (part.type !== "literal") {
        out[part.type] = Number(part.value);
      }
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
    const clamped = clamp(fraction, 0, 1);
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

  function toCents(value) {
    return Math.round(Number(value) * 100);
  }

  function moneySavedCents(nowMs, startMs) {
    return toCents(moneySaved(nowMs, startMs));
  }

  function renderMoneyElement(element, cents) {
    if (!Number.isSafeInteger(cents)) {
      element.innerHTML = '<span class="whole">&mdash;</span>';
      return;
    }

    const sign = cents < 0 ? "−" : "";
    const absolute = Math.abs(cents);
    const whole = Math.floor(absolute / 100).toString();
    const fraction = (absolute % 100).toString().padStart(2, "0");
    element.innerHTML =
      `<span class="whole">${sign}${whole}</span>` +
      `<span class="fraction"><span class="separator">,</span>${fraction}</span>`;
  }

  function renderMoney(cents) {
    renderMoneyElement(moneyEl, cents);
  }

  function formatCents(cents) {
    const sign = cents < 0 ? "−" : "";
    const absolute = Math.abs(cents);
    return `${sign}${Math.floor(absolute / 100)},${(absolute % 100)
      .toString()
      .padStart(2, "0")}`;
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

      if (remainderMonths === 0) {
        return yearText;
      }

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

  function calendarState(nowMs) {
    const start = SETTINGS.start;
    const nowLocal = zonedParts(nowMs);

    let years = nowLocal.year - start.year;
    let yearAnchor = addCalendarYears(start, years);
    let yearAnchorMs = zonedDateTimeToEpoch(yearAnchor);

    if (yearAnchorMs > nowMs) {
      years -= 1;
      yearAnchor = addCalendarYears(start, years);
      yearAnchorMs = zonedDateTimeToEpoch(yearAnchor);
    }

    const nextYearAnchor = addCalendarYears(start, years + 1);
    const nextYearAnchorMs = zonedDateTimeToEpoch(nextYearAnchor);

    let months =
      (nowLocal.year - yearAnchor.year) * 12 +
      (nowLocal.month - yearAnchor.month);

    let monthAnchor = addCalendarMonths(yearAnchor, months);
    let monthAnchorMs = zonedDateTimeToEpoch(monthAnchor);

    if (monthAnchorMs > nowMs) {
      months -= 1;
      monthAnchor = addCalendarMonths(yearAnchor, months);
      monthAnchorMs = zonedDateTimeToEpoch(monthAnchor);
    }

    const nextMonthAnchor = addCalendarMonths(monthAnchor, 1);
    const nextMonthAnchorMs = zonedDateTimeToEpoch(nextMonthAnchor);

    const elapsedSinceMonthAnchor = Math.max(0, nowMs - monthAnchorMs);
    const days = Math.floor(elapsedSinceMonthAnchor / DAY_MS);
    const dayAnchorMs = monthAnchorMs + days * DAY_MS;
    const hours = Math.floor((nowMs - dayAnchorMs) / HOUR_MS);
    const hourAnchorMs = dayAnchorMs + hours * HOUR_MS;

    const monthProgress = clamp(
      (nowMs - monthAnchorMs) / Math.max(1, nextMonthAnchorMs - monthAnchorMs),
      0,
      1
    );

    return {
      years,
      months,
      days,
      hours,
      yearProgress: clamp(
        (nowMs - yearAnchorMs) / Math.max(1, nextYearAnchorMs - yearAnchorMs),
        0,
        1
      ),
      monthProgress,
      dayProgress: clamp((nowMs - dayAnchorMs) / DAY_MS, 0, 1),
      hourProgress: clamp((nowMs - hourAnchorMs) / HOUR_MS, 0, 1),
      totalMonthsFloat: years * 12 + months + monthProgress
    };
  }

  function setIndicatorProgress(el, fraction) {
    const clamped = clamp(fraction, 0, 1);
    el.style.setProperty("--progress", `${clamped * 360}deg`);
  }

  function renderYearStack(completedYears, progress) {
    yearStackEl.innerHTML = "";

    const overlap = 12;
    const size = 52;
    const totalCircles = completedYears + 1;

    const neededHeight = size + Math.max(0, totalCircles - 1) * overlap;
    yearStackEl.style.height = `${Math.max(86, neededHeight)}px`;

    for (let i = 0; i < completedYears; i += 1) {
      const dot = document.createElement("div");
      dot.className = "year-dot";
      dot.style.bottom = `${(completedYears - i) * overlap}px`;
      dot.style.zIndex = `${i + 1}`;
      yearStackEl.appendChild(dot);
    }

    const current = document.createElement("div");
    current.className = "year-dot current";
    current.style.setProperty("--progress", `${clamp(progress, 0, 1) * 360}deg`);
    current.style.bottom = "0px";
    current.style.zIndex = `${completedYears + 2}`;
    yearStackEl.appendChild(current);
  }

  function renderElapsed(nowMs) {
    const state = calendarState(nowMs);

    yearsValueEl.textContent = state.years;
    monthsValueEl.textContent = state.months;
    daysValueEl.textContent = state.days;
    hoursValueEl.textContent = state.hours;

    renderYearStack(state.years, state.yearProgress);
    setIndicatorProgress(monthIndicatorEl, state.monthProgress);
    setIndicatorProgress(dayIndicatorEl, state.dayProgress);
    setIndicatorProgress(hourIndicatorEl, state.hourProgress);
  }

  function flamePath(cx, baseY, width, height, lean) {
    const half = width / 2;
    const topX = cx + lean * width * 0.28;
    const tipY = baseY - height;
    const shoulderY = baseY - height * 0.48;

    return [
      `M ${cx - half} ${baseY}`,
      `C ${cx - half * 0.85} ${baseY - height * 0.28}, ${cx - half * 0.42} ${shoulderY}, ${topX} ${tipY}`,
      `C ${cx + half * 0.28} ${baseY - height * 0.62}, ${cx + half * 0.88} ${baseY - height * 0.26}, ${cx + half} ${baseY}`,
      `Q ${cx} ${baseY - height * 0.12} ${cx - half} ${baseY}`,
      "Z"
    ].join(" ");
  }

  function makeGrassBlades(progress) {
    const t = ease(progress);
    const blades = [];
    const baseY = 194;
    const colorA = "rgba(64, 112, 66, 0.88)";
    const colorB = "rgba(92, 144, 88, 0.68)";
    const colorC = "rgba(52, 96, 58, 0.78)";

    const ground = `
      <path d="M 22 ${baseY}
               C 78 ${baseY - 3}, 126 ${baseY + 2}, 186 ${baseY - 2}
               C 252 ${baseY - 6}, 316 ${baseY + 1}, 378 ${baseY - 3}
               L 378 220 L 22 220 Z"
            fill="rgba(36,70,38,${0.10 + t * 0.30})"/>
      <path d="M 24 ${baseY + 1}
               C 82 ${baseY - 4}, 148 ${baseY + 3}, 216 ${baseY - 1}
               C 286 ${baseY - 5}, 332 ${baseY + 2}, 376 ${baseY - 2}"
            stroke="rgba(78,126,72,${0.12 + t * 0.22})" stroke-width="2" fill="none"/>
    `;

    for (let i = 0; i < 34; i += 1) {
      const x = 24 + i * 10.4;
      const h = lerp(2, 13 + (i % 5) * 3.2, t);
      const sway = (i % 2 === 0 ? -1 : 1) * (2.6 + (i % 4) * 1.2);
      const color = i % 3 === 0 ? colorA : i % 3 === 1 ? colorB : colorC;
      const opacity = 0.18 + t * (0.42 + (i % 4) * 0.04);

      blades.push(
        `<path d="M ${x} ${baseY}
                 Q ${x + sway * 0.24} ${baseY - h * 0.42}
                   ${x + sway * 0.6} ${baseY - h}
                 Q ${x + sway * 0.18} ${baseY - h * 0.38}
                   ${x} ${baseY}"
               fill="${color.replace(/0\.\d+\)/, `${opacity.toFixed(2)})`)}"/>`
      );
    }

    for (let i = 0; i < 16; i += 1) {
      const x = 34 + i * 21.5;
      const h = lerp(3, 18 + (i % 3) * 5, t);
      const sway = (i % 2 === 0 ? -1 : 1) * (4 + (i % 4));
      const color = i % 2 === 0 ? colorA : colorB;
      blades.push(
        `<path d="M ${x} ${baseY} Q ${x + sway * 0.35} ${baseY - h * 0.65} ${x + sway} ${baseY - h} Q ${x + sway * 0.15} ${baseY - h * 0.45} ${x} ${baseY}" fill="${color}" opacity="${0.26 + t * 0.46}"/>`
      );
    }

    return ground + blades.join("");
  }

  function renderFireScene(daysSinceQuit) {
    const d = clamp(daysSinceQuit, 0, FIRST_PHASE_DAYS);
    let width;
    let height;
    let emberOpacity;
    let smokeOpacity;
    let ashOpacity;

    if (d < 5) {
      const t = ease(d / 5);
      width = lerp(220, 150, t);
      height = lerp(118, 82, t);
      emberOpacity = lerp(1, 0.82, t);
      smokeOpacity = 0.02;
      ashOpacity = 0.1;
    } else if (d < 17) {
      const t = ease((d - 5) / 12);
      width = lerp(150, 72, t);
      height = lerp(82, 18, t);
      emberOpacity = lerp(0.82, 0.3, t);
      smokeOpacity = 0.04;
      ashOpacity = lerp(0.16, 0.55, t);
    } else {
      const t = ease((d - 17) / 4);
      width = lerp(72, 40, t);
      height = lerp(18, 0, t);
      emberOpacity = lerp(0.3, 0, t);
      smokeOpacity = lerp(0.16, 0.6, t);
      ashOpacity = lerp(0.55, 1, t);
    }

    const baseY = 190;
    const centerX = 200;

    const flames = [];
    if (height > 2) {
      const configs = [
        { x: centerX - width * 0.28, w: width * 0.26, h: height * 0.72, lean: -0.35, fill: "rgba(255,88,28,0.50)" },
        { x: centerX - width * 0.08, w: width * 0.22, h: height * 0.92, lean: 0.12, fill: "rgba(255,120,32,0.66)" },
        { x: centerX + width * 0.12, w: width * 0.25, h: height * 1.00, lean: 0.28, fill: "rgba(255,148,42,0.78)" },
        { x: centerX + width * 0.32, w: width * 0.18, h: height * 0.58, lean: 0.18, fill: "rgba(255,82,22,0.42)" }
      ];

      for (const cfg of configs) {
        flames.push(
          `<path d="${flamePath(cfg.x, baseY, cfg.w, cfg.h, cfg.lean)}" fill="${cfg.fill}"/>`
        );
      }
    }

    const emberDots = [];
    for (let i = 0; i < 11; i += 1) {
      const x = 152 + i * 10;
      const r = i % 3 === 0 ? 4.5 : 3.2;
      const opacity = clamp(emberOpacity * (0.35 + (i % 4) * 0.12), 0, 0.9);
      const color = i % 2 === 0 ? "rgba(255,105,35," : "rgba(255,155,65,";
      emberDots.push(
        `<circle cx="${x}" cy="${188 + (i % 2) * 2}" r="${r}" fill="${color}${opacity})"/>`
      );
    }

    const smoke = [];
    const smokeBase = clamp(smokeOpacity, 0, 1);
    for (let i = 0; i < 4; i += 1) {
      const y = 162 - i * 22;
      const x = 195 + (i % 2 === 0 ? -1 : 1) * (8 + i * 7);
      const rx = 18 + i * 4;
      const ry = 8 + i * 3;
      smoke.push(
        `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="rgba(180,180,180,${smokeBase * (0.22 - i * 0.03)})"/>`
      );
    }

    return `
      <svg viewBox="0 0 400 220" role="img" aria-hidden="true">
        <ellipse cx="200" cy="208" rx="150" ry="16" fill="rgba(40,40,40,0.28)"/>
        <ellipse cx="${centerX}" cy="${baseY + 2}" rx="${Math.max(44, width * 0.62)}" ry="${11 + ashOpacity * 4}" fill="rgba(88,88,88,${0.18 + ashOpacity * 0.26})"/>
        <ellipse cx="${centerX}" cy="${baseY}" rx="${Math.max(40, width * 0.52)}" ry="${8 + emberOpacity * 6}" fill="rgba(116,38,18,${0.16 + emberOpacity * 0.34})"/>
        ${emberDots.join("")}
        ${flames.join("")}
        ${smoke.join("")}
      </svg>
    `;
  }

  function renderGrowthScene(totalMonthsFloat) {
    const months = Math.max(0, totalMonthsFloat);
    const baseY = 192;

    const ashFade = 1 - ease(clamp(months / 0.23, 0, 1));
    const smokeFade = 1 - ease(clamp(months / 0.18, 0, 1));
    const grassGrowth = ease(clamp(months / 0.23, 0, 1));

    const overallTreeGrowth = easeOut(clamp((months - 0.25) / 24, 0, 1));
    const trunkHeight = lerp(10, 168, overallTreeGrowth);
    const trunkWidth = lerp(2.5, 12.5, overallTreeGrowth);
    const trunkBaseX = lerp(206, 284, overallTreeGrowth);

    const topX = trunkBaseX + lerp(0, 8, overallTreeGrowth);
    const topY = baseY - trunkHeight;

    const earlyStemHeight = lerp(10, 26, ease(clamp(months / 1.2, 0, 1)));
    const stemVisible = months < 1.4;
    const firstLeafScale = ease(clamp((months - 1.7) / 1.1, 0, 1));
    const branchGrowth = ease(clamp((months - 3.2) / 8, 0, 1));
    const crownGrowth = easeOut(clamp((months - 4) / 20, 0, 1));
    const matureBoost = easeOut(clamp((months - 24) / 36, 0, 1));

    const ash = `
      <ellipse cx="192" cy="194" rx="${lerp(54, 36, ease(clamp(months / 1, 0, 1)))}" ry="11" fill="rgba(115,115,115,${0.18 + ashFade * 0.38})"/>
      <ellipse cx="192" cy="191" rx="${lerp(46, 20, ease(clamp(months / 1, 0, 1)))}" ry="6" fill="rgba(58,58,58,${ashFade * 0.48})"/>
    `;

    const smoke = [];
    for (let i = 0; i < 3; i += 1) {
      smoke.push(
        `<ellipse cx="${195 + i * 10}" cy="${170 - i * 22}" rx="${14 + i * 4}" ry="${7 + i * 2}" fill="rgba(190,190,190,${smokeFade * (0.22 - i * 0.04)})"/>`
      );
    }

    const grass = makeGrassBlades(grassGrowth);

    let stem = "";
    if (stemVisible) {
      stem = `
        <path d="M 208 ${baseY} Q 210 ${baseY - earlyStemHeight * 0.5} 209 ${baseY - earlyStemHeight}" stroke="rgba(86,122,78,${0.4 + grassGrowth * 0.4})" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      `;
    }

    let firstLeaf = "";
    if (firstLeafScale > 0.01) {
      const lx = 215;
      const ly = baseY - 24;
      const w = lerp(1, 13, firstLeafScale);
      const h = lerp(1, 8, firstLeafScale);
      firstLeaf = `
        <ellipse cx="${lx}" cy="${ly}" rx="${w}" ry="${h}" fill="rgba(102,145,90,${0.32 + firstLeafScale * 0.44})" transform="rotate(-28 ${lx} ${ly})"/>
      `;
    }

    let trunk = "";
    let branches = "";
    if (months >= 0.8) {
      const path = `M ${trunkBaseX} ${baseY}
                    C ${trunkBaseX - 2} ${baseY - trunkHeight * 0.28},
                      ${trunkBaseX + 8} ${baseY - trunkHeight * 0.62},
                      ${topX} ${topY}`;
      trunk = `<path d="${path}" stroke="rgba(82,62,44,${0.24 + overallTreeGrowth * 0.62})" stroke-width="${trunkWidth}" fill="none" stroke-linecap="round"/>`;

      const branchSet = [
        { sx: trunkBaseX + 2, sy: baseY - trunkHeight * 0.34, ex: trunkBaseX + 28, ey: baseY - trunkHeight * 0.46, w: 4.5 },
        { sx: trunkBaseX + 4, sy: baseY - trunkHeight * 0.50, ex: trunkBaseX + 40, ey: baseY - trunkHeight * 0.64, w: 3.8 },
        { sx: trunkBaseX + 1, sy: baseY - trunkHeight * 0.58, ex: trunkBaseX - 24, ey: baseY - trunkHeight * 0.72, w: 3.2 },
        { sx: trunkBaseX + 5, sy: baseY - trunkHeight * 0.70, ex: trunkBaseX + 24, ey: baseY - trunkHeight * 0.86, w: 2.8 },
        { sx: trunkBaseX - 1, sy: baseY - trunkHeight * 0.42, ex: trunkBaseX - 18, ey: baseY - trunkHeight * 0.54, w: 2.6 }
      ];

      branches = branchSet
        .map((b, i) => {
          const grow = clamp((branchGrowth - i * 0.1) / 0.85, 0, 1);
          if (grow <= 0) return "";
          const ex = lerp(b.sx, b.ex, grow);
          const ey = lerp(b.sy, b.ey, grow);
          const sw = Math.max(1.2, b.w * grow);
          return `<path d="M ${b.sx} ${b.sy} Q ${(b.sx + ex) / 2} ${(b.sy + ey) / 2 - 3} ${ex} ${ey}" stroke="rgba(86,66,48,${0.18 + grow * 0.48})" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
        })
        .join("");
    }

    const leafDefs = [
      { dx: 24, dy: -8, r: 9, threshold: 2.2, fill: "rgba(92,138,88,0.72)" },
      { dx: 34, dy: -18, r: 12, threshold: 4.0, fill: "rgba(96,146,88,0.70)" },
      { dx: 18, dy: -24, r: 10, threshold: 4.8, fill: "rgba(86,130,80,0.66)" },
      { dx: 44, dy: -34, r: 13, threshold: 6.0, fill: "rgba(108,156,94,0.72)" },
      { dx: 56, dy: -16, r: 10, threshold: 7.5, fill: "rgba(96,146,88,0.66)" },
      { dx: 10, dy: -38, r: 11, threshold: 8.2, fill: "rgba(86,138,82,0.62)" },
      { dx: -8, dy: -24, r: 9, threshold: 9.5, fill: "rgba(82,126,78,0.56)" },
      { dx: 30, dy: -46, r: 15, threshold: 10.2, fill: "rgba(104,152,90,0.64)" },
      { dx: 62, dy: -42, r: 12, threshold: 12.0, fill: "rgba(112,160,96,0.68)" },
      { dx: 72, dy: -24, r: 11, threshold: 13.2, fill: "rgba(96,144,88,0.60)" },
      { dx: -18, dy: -34, r: 9, threshold: 14.5, fill: "rgba(84,128,78,0.52)" },
      { dx: 16, dy: -60, r: 14, threshold: 16.0, fill: "rgba(106,154,92,0.58)" },
      { dx: 48, dy: -58, r: 14, threshold: 18.0, fill: "rgba(96,148,86,0.58)" },
      { dx: 82, dy: -38, r: 10, threshold: 20.0, fill: "rgba(92,140,84,0.50)" }
    ];

    const leaves = leafDefs
      .map((leaf, index) => {
        const local = clamp((months - leaf.threshold) / 2.4, 0, 1);
        if (local <= 0) return "";
        const g = ease(local);
        const cx = topX + leaf.dx * (0.4 + crownGrowth * 0.65 + matureBoost * 0.08);
        const cy = topY + leaf.dy * (0.32 + crownGrowth * 0.72 + matureBoost * 0.08);
        const r = leaf.r * (0.25 + g * 0.9);
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${leaf.fill.replace(/0\.\d+\)/, `${(0.18 + g * 0.55).toFixed(2)})`)}"/>`;
      })
      .join("");

    const subtleCanopyShadow =
      crownGrowth > 0
        ? `<ellipse cx="${topX + 34 * crownGrowth}" cy="${topY - 18 * crownGrowth}" rx="${26 + crownGrowth * 42 + matureBoost * 8}" ry="${18 + crownGrowth * 28 + matureBoost * 6}" fill="rgba(24,40,24,${0.04 + crownGrowth * 0.12})"/>`
        : "";

    return `
      <svg viewBox="0 0 400 220" role="img" aria-hidden="true">
        <ellipse cx="200" cy="208" rx="164" ry="16" fill="rgba(40,40,40,0.18)"/>
        ${ash}
        ${smoke.join("")}
        ${grass}
        ${stem}
        ${firstLeaf}
        ${subtleCanopyShadow}
        ${trunk}
        ${branches}
        ${leaves}
      </svg>
    `;
  }

  function renderScene(nowMs, startMs) {
    const elapsedDays = Math.max(0, (nowMs - startMs) / DAY_MS);

    if (elapsedDays < FIRST_PHASE_DAYS) {
      sceneEl.innerHTML = renderFireScene(elapsedDays);
      return;
    }

    const state = calendarState(nowMs);
    sceneEl.innerHTML = renderGrowthScene(state.totalMonthsFloat);
  }

  function show(mode) {
    circlesEl.hidden = mode !== "circles";
    specialEl.hidden = mode !== "special";
    elapsedEl.hidden = mode !== "elapsed";
  }

  let financeReady = false;
  let financeBusy = false;
  let allocatedCents = 0;
  let transfers = [];
  let pickerWholeDigits = 0;
  let latestLifetimeCents = 0;
  let transferPickerOpen = false;
  let moneyHoldTimer = null;
  let moneyHoldStart = null;
  let pendingAuthFlow = null;

  const identityClient = window.URFreeIdentity || null;
  const PENDING_AUTH_KEY = "urfree.pending-auth-flow";
  const AUTH_CALLBACK_KEYS = [
    "access_token",
    "confirmation_token",
    "recovery_token",
    "invite_token",
    "email_change_token"
  ];

  function hasAuthCallbackHash() {
    if (!window.location.hash) return false;
    const params = new URLSearchParams(window.location.hash.slice(1));
    return AUTH_CALLBACK_KEYS.some((key) => params.has(key));
  }

  function showAuthView(view) {
    const visible = view !== null;
    authOverlayEl.hidden = !visible;
    authCallbackPanelEl.hidden = view !== "callback";
    passwordSetupFormEl.hidden = view !== "password";
    loginFormEl.hidden = view !== "login";
  }

  function savePendingAuth(flow) {
    pendingAuthFlow = flow;
    try {
      sessionStorage.setItem(PENDING_AUTH_KEY, JSON.stringify(flow));
    } catch {
      // The in-memory copy still supports the current Safari/PWA session.
    }
  }

  function readPendingAuth() {
    try {
      const value = JSON.parse(sessionStorage.getItem(PENDING_AUTH_KEY) || "null");
      if (value?.type === "recovery") return { type: "recovery" };
      if (value?.type === "invite" && typeof value.token === "string") {
        return { type: "invite", token: value.token };
      }
    } catch {
      // Ignore unavailable or malformed session state.
    }
    return null;
  }

  function clearPendingAuth() {
    pendingAuthFlow = null;
    try {
      sessionStorage.removeItem(PENDING_AUTH_KEY);
    } catch {
      // No persistent ledger data is stored in the browser.
    }
  }

  function clearAuthHash() {
    if (!hasAuthCallbackHash()) return;
    history.replaceState(history.state, "", `${location.pathname}${location.search}`);
  }

  function showCallbackStatus(message, allowLogin = false) {
    authCallbackMessageEl.textContent = message;
    authCallbackLoginEl.hidden = !allowLogin;
    showAuthView("callback");
  }

  function showPasswordSetup(flow) {
    pendingAuthFlow = flow;
    const invite = flow.type === "invite";
    passwordSetupTitleEl.textContent = invite ? "Set password" : "Reset password";
    passwordSetupCopyEl.textContent = invite
      ? "Choose a password to activate your account."
      : "Choose a new password for your account.";
    passwordSetupSubmitEl.textContent = invite ? "Activate account" : "Save password";
    passwordSetupErrorEl.textContent = "";
    newPasswordEl.value = "";
    confirmPasswordEl.value = "";
    showAuthView("password");
    window.setTimeout(() => newPasswordEl.focus(), 0);
  }

  async function hydrateBrowserSession() {
    if (!identityClient?.hydrateSession) return null;
    try {
      return await identityClient.hydrateSession();
    } catch {
      return null;
    }
  }

  async function bootstrapAuthentication() {
    const callbackInUrl = hasAuthCallbackHash();
    if (callbackInUrl) showCallbackStatus("Completing authentication…");

    if (!identityClient?.handleAuthCallback) {
      if (callbackInUrl) {
        showCallbackStatus("Authentication support did not load. Please reload the page.", true);
        return;
      }
      await loadFinanceState();
      return;
    }

    try {
      const callback = await identityClient.handleAuthCallback();

      if (callback?.type === "invite" && callback.token) {
        const flow = { type: "invite", token: callback.token };
        savePendingAuth(flow);
        showPasswordSetup(flow);
        return;
      }

      if (callback?.type === "recovery") {
        const flow = { type: "recovery" };
        savePendingAuth(flow);
        showPasswordSetup(flow);
        return;
      }

      if (callback) clearPendingAuth();

      const savedFlow = readPendingAuth();
      if (savedFlow) {
        showPasswordSetup(savedFlow);
        return;
      }

      await hydrateBrowserSession();
      await loadFinanceState();
    } catch (error) {
      showCallbackStatus(
        error instanceof Error
          ? error.message
          : "The authentication link is invalid or has expired.",
        true
      );
    }
  }

  function setTransferPickerOpen(open) {
    transferPickerOpen = Boolean(open && financeReady);
    transferControlsEl.hidden = !transferPickerOpen;
    moneyEl.setAttribute("aria-expanded", String(transferPickerOpen));

    if (!transferPickerOpen) resetPicker();
  }

  function cancelMoneyHold() {
    if (moneyHoldTimer !== null) {
      clearTimeout(moneyHoldTimer);
      moneyHoldTimer = null;
    }
    moneyHoldStart = null;
  }

  function beginMoneyHold(event) {
    if (!financeReady || financeBusy || event.button !== 0) return;
    cancelMoneyHold();
    moneyHoldStart = { x: event.clientX, y: event.clientY };
    moneyHoldTimer = window.setTimeout(() => {
      moneyHoldTimer = null;
      moneyHoldStart = null;
      setTransferPickerOpen(true);
    }, 550);
  }

  function projectAdjustmentCents(nowMs) {
    const project = SETTINGS.project || {};
    const adjustments = Array.isArray(project.adjustments) ? project.adjustments : [];

    return adjustments.reduce((sum, adjustment) => {
      if (!adjustment || typeof adjustment.date !== "string") return sum;
      const match = adjustment.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return sum;

      const effectiveMs = zonedDateTimeToEpoch({
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        hour: 0,
        minute: 0,
        second: 0
      });

      return effectiveMs <= nowMs ? sum + toCents(adjustment.amount) : sum;
    }, 0);
  }

  function projectBalanceCents(nowMs) {
    return toCents(SETTINGS.project?.initialBalance || 0) +
      projectAdjustmentCents(nowMs) +
      allocatedCents;
  }

  function selectedAmountCents() {
    const digits = [...digitWheelsEl.querySelectorAll("select")]
      .map((select) => select.value)
      .join("");
    return Number(digits || 0);
  }

  function resetPicker() {
    digitWheelsEl.querySelectorAll("select").forEach((select) => {
      select.value = "0";
    });
    updateConfirmState();
  }

  function updateConfirmState() {
    const available = Math.max(0, latestLifetimeCents - allocatedCents);
    const amount = selectedAmountCents();
    confirmTransferEl.disabled =
      !financeReady || financeBusy || amount <= 0 || amount > available;
  }

  function buildPicker(availableCents) {
    const wholeDigits = Math.max(3, Math.floor(availableCents / 100).toString().length);
    if (wholeDigits === pickerWholeDigits) {
      updateConfirmState();
      return;
    }

    pickerWholeDigits = wholeDigits;
    digitWheelsEl.innerHTML = "";
    const totalDigits = wholeDigits + 2;

    for (let index = 0; index < totalDigits; index += 1) {
      if (index === wholeDigits) {
        const separator = document.createElement("span");
        separator.className = "wheel-separator";
        separator.textContent = ",";
        digitWheelsEl.appendChild(separator);
      }

      const select = document.createElement("select");
      select.className = "digit-wheel";
      select.setAttribute(
        "aria-label",
        index < wholeDigits
          ? `Whole digit ${index + 1}`
          : `Decimal digit ${index - wholeDigits + 1}`
      );

      for (let digit = 0; digit <= 9; digit += 1) {
        const option = document.createElement("option");
        option.value = String(digit);
        option.textContent = String(digit);
        select.appendChild(option);
      }

      select.addEventListener("change", updateConfirmState);
      digitWheelsEl.appendChild(select);
    }

    updateConfirmState();
  }

  function renderHistory() {
    historyListEl.innerHTML = "";

    if (transfers.length === 0) {
      historyListEl.textContent = "No transfers yet";
    } else {
      [...transfers].reverse().forEach((transfer) => {
        const row = document.createElement("div");
        row.className = "history-row";

        const amount = document.createElement("span");
        amount.textContent = `+${formatCents(transfer.amountCents)}`;
        const date = document.createElement("time");
        const instant = new Date(transfer.createdAt);
        date.dateTime = transfer.createdAt;
        date.textContent = Number.isNaN(instant.getTime())
          ? ""
          : instant.toLocaleDateString("en-GB", {
              timeZone: SETTINGS.timezone,
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            });

        row.append(amount, date);
        historyListEl.appendChild(row);
      });
    }

    undoTransferEl.disabled = financeBusy || transfers.length === 0;
  }

  function applyFinanceState(state) {
    transfers = Array.isArray(state.transfers) ? state.transfers : [];
    allocatedCents = Number.isSafeInteger(state.allocatedCents)
      ? state.allocatedCents
      : transfers.reduce((sum, item) => sum + Number(item.amountCents || 0), 0);
    financeReady = true;
    authOverlayEl.hidden = true;
    syncStatusEl.textContent = "";
    renderHistory();
    update();
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.error || "Request failed");
      error.status = response.status;
      throw error;
    }

    return data;
  }

  async function loadFinanceState() {
    syncStatusEl.textContent = "syncing";
    try {
      applyFinanceState(await api("/api/finance"));
    } catch (error) {
      financeReady = false;
      setTransferPickerOpen(false);
      renderMoney(Number.NaN);
      renderMoneyElement(projectMoneyEl, Number.NaN);
      syncStatusEl.textContent = "";
      if (error.status === 401) {
        loginErrorEl.textContent = "";
        showAuthView("login");
      } else {
        loginErrorEl.textContent = "Netlify connection is not ready";
        showAuthView("login");
      }
    }
  }

  async function saveFinanceAction(body) {
    financeBusy = true;
    syncStatusEl.textContent = "saving";
    updateConfirmState();
    renderHistory();

    try {
      const state = await api("/api/finance", {
        method: "POST",
        body: JSON.stringify(body)
      });
      applyFinanceState(state);
      resetPicker();
      return true;
    } catch (error) {
      syncStatusEl.textContent = "not saved";
      maintenanceErrorEl.textContent = error.message;
      if (error.status === 401) authOverlayEl.hidden = false;
      return false;
    } finally {
      financeBusy = false;
      updateConfirmState();
      renderHistory();
    }
  }

  confirmTransferEl.addEventListener("click", async () => {
    const amountCents = selectedAmountCents();
    const availableCents = latestLifetimeCents - allocatedCents;
    if (amountCents <= 0 || amountCents > availableCents || financeBusy) return;

    const id = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `transfer-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const saved = await saveFinanceAction({
      action: "transfer",
      id,
      amountCents,
      lifetimeCents: latestLifetimeCents
    });
    if (saved) setTransferPickerOpen(false);
  });

  moneyEl.addEventListener("pointerdown", beginMoneyHold);
  moneyEl.addEventListener("pointerup", cancelMoneyHold);
  moneyEl.addEventListener("pointercancel", cancelMoneyHold);
  moneyEl.addEventListener("pointerleave", cancelMoneyHold);
  moneyEl.addEventListener("pointermove", (event) => {
    if (!moneyHoldStart) return;
    const distance = Math.hypot(
      event.clientX - moneyHoldStart.x,
      event.clientY - moneyHoldStart.y
    );
    if (distance > 12) cancelMoneyHold();
  });
  moneyEl.addEventListener("contextmenu", (event) => event.preventDefault());
  moneyEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setTransferPickerOpen(!transferPickerOpen);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      transferPickerOpen &&
      !moneyEl.contains(event.target) &&
      !transferControlsEl.contains(event.target)
    ) {
      setTransferPickerOpen(false);
    }
  });

  passwordSetupFormEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    passwordSetupErrorEl.textContent = "";

    const password = newPasswordEl.value;
    const confirmation = confirmPasswordEl.value;

    if (password.length < 8) {
      passwordSetupErrorEl.textContent = "Password must be at least 8 characters";
      return;
    }

    if (password !== confirmation) {
      passwordSetupErrorEl.textContent = "Passwords do not match";
      return;
    }

    const flow = pendingAuthFlow || readPendingAuth();
    if (!flow) {
      passwordSetupErrorEl.textContent = "The authentication link has expired. Request a new invitation.";
      return;
    }

    const submit = passwordSetupSubmitEl;
    submit.disabled = true;

    try {
      if (flow.type === "invite") {
        if (!identityClient?.acceptInvite || !flow.token) {
          throw new Error("Invitation support did not load");
        }
        await identityClient.acceptInvite(flow.token, password);
      } else if (flow.type === "recovery") {
        if (!identityClient?.updateUser) {
          throw new Error("Password recovery support did not load");
        }
        await identityClient.updateUser({ password });
      } else {
        throw new Error("Unknown authentication flow");
      }

      clearPendingAuth();
      clearAuthHash();
      newPasswordEl.value = "";
      confirmPasswordEl.value = "";

      await hydrateBrowserSession();
      await loadFinanceState();

      if (!financeReady) {
        showAuthView("login");
      } else {
        showAuthView(null);
      }
    } catch (error) {
      passwordSetupErrorEl.textContent =
        error instanceof Error ? error.message : "Unable to activate account";
    } finally {
      submit.disabled = false;
    }
  });

  authCallbackLoginEl.addEventListener("click", () => {
    clearPendingAuth();
    clearAuthHash();
    loginErrorEl.textContent = "";
    showAuthView("login");
  });

  loginFormEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginErrorEl.textContent = "";
    const submit = loginFormEl.querySelector('button[type="submit"]');
    submit.disabled = true;

    try {
      await api("/api/auth", {
        method: "POST",
        body: JSON.stringify({
          action: "login",
          email: loginEmailEl.value,
          password: loginPasswordEl.value
        })
      });
      loginPasswordEl.value = "";
      await hydrateBrowserSession();
      await loadFinanceState();
      if (financeReady) showAuthView(null);
    } catch (error) {
      loginErrorEl.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  projectMoneyEl.addEventListener("click", () => {
    if (!financeReady) {
      authOverlayEl.hidden = false;
      return;
    }
    maintenanceErrorEl.textContent = "";
    renderHistory();
    maintenanceOverlayEl.hidden = false;
  });

  closeMaintenanceEl.addEventListener("click", () => {
    maintenanceOverlayEl.hidden = true;
  });

  maintenanceOverlayEl.addEventListener("click", (event) => {
    if (event.target === maintenanceOverlayEl) maintenanceOverlayEl.hidden = true;
  });

  undoTransferEl.addEventListener("click", async () => {
    if (transfers.length === 0 || financeBusy) return;
    if (await saveFinanceAction({ action: "undo" })) {
      maintenanceOverlayEl.hidden = true;
    }
  });

  logoutButtonEl.addEventListener("click", async () => {
    if (financeBusy) return;
    try {
      await api("/api/auth", {
        method: "POST",
        body: JSON.stringify({ action: "logout" })
      });
    } finally {
      financeReady = false;
      allocatedCents = 0;
      transfers = [];
      maintenanceOverlayEl.hidden = true;
      setTransferPickerOpen(false);
      showAuthView("login");
      update();
    }
  });

  const startMs = zonedDateTimeToEpoch(SETTINGS.start);

  function update() {
    const nowMs = Date.now();

    latestLifetimeCents = moneySavedCents(nowMs, startMs);
    renderMoneyElement(lifetimeMoneyEl, latestLifetimeCents);

    if (financeReady) {
      const availableCents = Math.max(0, latestLifetimeCents - allocatedCents);
      renderMoney(availableCents);
      renderMoneyElement(projectMoneyEl, projectBalanceCents(nowMs));
      buildPicker(availableCents);
    } else {
      renderMoney(Number.NaN);
      renderMoneyElement(projectMoneyEl, Number.NaN);
    }

    renderScene(nowMs, startMs);

    if (nowMs < startMs) {
      show("circles");
      updateCircleView(startMs, startMs);
      return;
    }

    const special = currentSpecial(nowMs, startMs);

    if (special) {
      specialEl.textContent = special;
      show("special");
    } else if (nowMs < startMs + FIRST_PHASE_DAYS * DAY_MS) {
      show("circles");
      updateCircleView(nowMs, startMs);
    } else {
      renderElapsed(nowMs);
      show("elapsed");
    }
  }

  renderCircles();
  update();
  bootstrapAuthentication();

  setInterval(update, 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) update();
  });
})();
