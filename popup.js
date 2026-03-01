import {
  bytesToGB,
  formatGB,
  formatKgCO2,
  co2ToKmDriven,
  factorToEF
} from "./utils.js";

const factorToggle = document.getElementById("factorToggle");
const cohortToggle = document.getElementById("cohortToggle");
const gbClearedInput = document.getElementById("gbClearedInput");
const refreshButton = document.getElementById("refreshButton");
const tabBar = document.getElementById("tabBar");
const tabStats = document.getElementById("tabStats");
const tabCleanup = document.getElementById("tabCleanup");

const totalStorageValueEl = document.getElementById("totalStorageValue");
const co2RangeValueEl = document.getElementById("co2RangeValue");
const co2SelectedValueEl = document.getElementById("co2SelectedValue");
const whatThisMeansEl = document.getElementById("whatThisMeans");

const gmailBarEl = document.getElementById("gmailBar");
const driveBarEl = document.getElementById("driveBar");
const photosBarEl = document.getElementById("photosBar");
const gmailStorageLabelEl = document.getElementById("gmailStorageLabel");
const driveStorageLabelEl = document.getElementById("driveStorageLabel");
const photosStorageLabelEl = document.getElementById("photosStorageLabel");

const userCleanupValueEl = document.getElementById("userCleanupValue");
const cohortCleanupValueEl = document.getElementById("cohortCleanupValue");

const driveFilesListEl = document.getElementById("driveFilesList");
const gmailTargetsEl = document.getElementById("gmailTargets");

const statusEl = document.getElementById("status");

let currentData = null;
let selectedFactor = "mid";
let selectedCohortSize = 100;
let currentTab = "stats";

function setStatus(text) {
  statusEl.textContent = text || "";
}

function selectSegment(container, attrName, value) {
  const buttons = container.querySelectorAll(".segment");
  buttons.forEach((btn) => {
    if (btn.getAttribute(attrName) === String(value)) {
      btn.classList.add("selected");
    } else {
      btn.classList.remove("selected");
    }
  });
}

function renderStorage() {
  if (!currentData || !currentData.storage) {
    totalStorageValueEl.textContent = "–";
    co2RangeValueEl.textContent = "–";
    co2SelectedValueEl.textContent = "–";
    whatThisMeansEl.textContent = "";
    return;
  }

  const totalGB = currentData.storage.totalGB || 0;
  const { low, mid, high } = currentData.storage.emissions || {
    low: 0,
    mid: 0,
    high: 0
  };

  totalStorageValueEl.textContent = formatGB(totalGB);
  co2RangeValueEl.textContent = `${formatKgCO2(low)} – ${formatKgCO2(high)} / year`;

  let selectedValue = mid;
  if (selectedFactor === "low") selectedValue = low;
  if (selectedFactor === "high") selectedValue = high;

  co2SelectedValueEl.textContent = `${formatKgCO2(
    selectedValue
  )} / year (${selectedFactor})`;

  const km = co2ToKmDriven(selectedValue);
  if (km > 0) {
    whatThisMeansEl.textContent = `That’s roughly like driving about ${km.toFixed(
      0
    )} km in a typical car (very rough equivalent).`;
  } else {
    whatThisMeansEl.textContent = "";
  }
}

function renderBreakdown() {
  if (!currentData || !currentData.drive || !currentData.gmail) {
    gmailBarEl.style.width = "0%";
    driveBarEl.style.width = "0%";
    if (photosBarEl) photosBarEl.style.width = "0%";
    gmailStorageLabelEl.textContent = "–";
    driveStorageLabelEl.textContent = "–";
    if (photosStorageLabelEl) photosStorageLabelEl.textContent = "–";
    return;
  }

  const driveGB = currentData.drive.driveGB || 0;
  const gmailGB = currentData.gmail.gmailGB || 0;
  const photosGB = currentData.photos?.photosGB || 0;
  const totalGB = driveGB + gmailGB + photosGB;
  const efMid = factorToEF("mid");

  const gmailShare = totalGB > 0 ? (gmailGB / totalGB) * 100 : 0;
  const driveShare = totalGB > 0 ? (driveGB / totalGB) * 100 : 0;
  const photosShare = totalGB > 0 ? (photosGB / totalGB) * 100 : 0;

  gmailBarEl.style.width = `${gmailShare}%`;
  driveBarEl.style.width = `${driveShare}%`;
  if (photosBarEl) photosBarEl.style.width = `${photosShare}%`;

  const gmailKgMid = gmailGB * efMid;
  const driveKgMid = driveGB * efMid;
  const photosKgMid = photosGB * efMid;

  gmailStorageLabelEl.textContent = `${formatGB(gmailGB)} • ${formatKgCO2(
    gmailKgMid
  )} / year`;
  driveStorageLabelEl.textContent = `${formatGB(driveGB)} • ${formatKgCO2(
    driveKgMid
  )} / year`;
  if (photosStorageLabelEl) {
    photosStorageLabelEl.textContent = `${formatGB(photosGB)} • ${formatKgCO2(
      photosKgMid
    )} / year (Photos & other)`;
  }
}

function renderCleanupProjection() {
  const gbCleared = parseFloat(gbClearedInput.value || "0");
  const ef = factorToEF(selectedFactor);
  const userKg = gbCleared * ef;
  userCleanupValueEl.textContent = `${formatKgCO2(userKg)} / year (${selectedFactor})`;

  const cohortKg = userKg * selectedCohortSize;
  cohortCleanupValueEl.textContent = `${formatKgCO2(
    cohortKg
  )} / year for ${selectedCohortSize.toLocaleString()} people`;
}

function renderDriveTargets() {
  driveFilesListEl.innerHTML = "";
  if (!currentData || !currentData.drive || !currentData.drive.topFiles) {
    return;
  }

  currentData.drive.topFiles.forEach((file) => {
    const li = document.createElement("li");
    li.className = "file-item";

    const nameEl = document.createElement("div");
    nameEl.className = "file-name";
    nameEl.textContent = file.name || "(no name)";
    li.appendChild(nameEl);

    const metaEl = document.createElement("div");
    metaEl.className = "file-meta";
    const sizeGB = formatGB(bytesToGB(file.sizeBytes || 0));
    const dateStr = file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : "";
    metaEl.textContent = `${sizeGB} • ${file.mimeType || "file"}${
      dateStr ? ` • Updated ${dateStr}` : ""
    }`;
    li.appendChild(metaEl);

    const actionsEl = document.createElement("div");
    actionsEl.className = "file-actions";
    const openLink = document.createElement("a");
    openLink.className = "file-link";
    openLink.textContent = "Open";
    openLink.href = file.webViewLink || "#";
    openLink.target = "_blank";
    actionsEl.appendChild(openLink);

    li.appendChild(actionsEl);
    driveFilesListEl.appendChild(li);
  });
}

function renderGmailTargets() {
  if (!currentData || !currentData.gmail) {
    gmailTargetsEl.textContent = "–";
    return;
  }

  const count = currentData.gmail.largeOldAttachmentsCount || 0;
  if (!count) {
    gmailTargetsEl.textContent =
      "We didn’t detect many old heavy emails. Nice job keeping things tidy.";
    return;
  }

  gmailTargetsEl.innerHTML = `
    <div>${count.toLocaleString()} emails with large attachments (&gt;10 MB) older than 1 year.</div>
    <div class="hint">
      Try searching in Gmail for <code>has:attachment larger:10M older_than:1y</code> and
      deleting what you no longer need.
    </div>
  `;
}

function renderAll() {
  renderStorage();
  renderBreakdown();
  renderCleanupProjection();
  renderDriveTargets();
  renderGmailTargets();
}

function setTab(tab) {
  currentTab = tab;
  if (tabStats && tabCleanup) {
    tabStats.classList.toggle("active", tab === "stats");
    tabCleanup.classList.toggle("active", tab === "cleanup");
  }
  if (tabBar) {
    const buttons = tabBar.querySelectorAll(".tab-button");
    buttons.forEach((btn) => {
      const btnTab = btn.getAttribute("data-tab");
      btn.classList.toggle("active", btnTab === tab);
    });
  }
}

function attachEvents() {
  if (factorToggle) {
    factorToggle.addEventListener("click", (e) => {
      const btn = e.target.closest(".segment");
      if (!btn) return;
      const factor = btn.getAttribute("data-factor");
      if (!factor) return;
      selectedFactor = factor;
      selectSegment(factorToggle, "data-factor", selectedFactor);
      renderStorage();
      renderCleanupProjection();
    });
  }

  if (cohortToggle) {
    cohortToggle.addEventListener("click", (e) => {
      const btn = e.target.closest(".segment");
      if (!btn) return;
      const users = parseInt(btn.getAttribute("data-users") || "0", 10);
      if (!users) return;
      selectedCohortSize = users;
      selectSegment(cohortToggle, "data-users", String(selectedCohortSize));
      renderCleanupProjection();
    });
  }

  if (gbClearedInput) {
    gbClearedInput.addEventListener("input", () => {
      renderCleanupProjection();
    });
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      setStatus("Recomputing…");
      chrome.runtime.sendMessage({ type: "computeCarbon" }, (resp) => {
        if (chrome.runtime.lastError) {
          setStatus("Error recomputing data.");
          return;
        }
        if (resp?.error) {
          setStatus(resp.error);
          return;
        }
        currentData = resp;
        setStatus("Updated just now.");
        renderAll();
      });
    });
  }

  if (tabBar) {
    tabBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab-button");
      if (!btn) return;
      const tab = btn.getAttribute("data-tab");
      if (!tab) return;
      setTab(tab);
    });
  }
}

function init() {
  attachEvents();
  setStatus("Loading…");
  selectSegment(factorToggle, "data-factor", selectedFactor);
  selectSegment(cohortToggle, "data-users", String(selectedCohortSize));
  setTab(currentTab);

  chrome.runtime.sendMessage({ type: "getCachedData" }, (resp) => {
    if (chrome.runtime.lastError) {
      setStatus("Sign in and try again.");
      return;
    }

    if (!resp || !resp.data) {
      chrome.runtime.sendMessage({ type: "computeCarbon" }, (resp2) => {
        if (chrome.runtime.lastError) {
          setStatus("Error fetching data.");
          return;
        }
        if (resp2?.error) {
          setStatus(resp2.error);
          return;
        }
        currentData = resp2;
        setStatus("Calculated from your account.");
        renderAll();
      });
      return;
    }

    currentData = resp.data;
    if (resp.stale) {
      setStatus("Showing cached data (tap ↻ to refresh).");
    } else {
      setStatus("Using recent data.");
    }
    renderAll();
  });
}

document.addEventListener("DOMContentLoaded", init);

