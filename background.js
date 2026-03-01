import { bytesToGB, computeStorageEmissions } from "./utils.js";

const STORAGE_KEY = "carbonCacheData";
const CACHE_TTL_MS = 60 * 60 * 1000; 

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "getCachedData") {
    getCachedData().then(sendResponse);
    return true;
  }

  if (message?.type === "computeCarbon") {
    computeAndCacheCarbonData()
      .then(sendResponse)
      .catch((err) => {
        console.error("computeAndCacheCarbonData error", err);
        sendResponse({ error: "Failed to compute carbon data." });
      });
    return true;
  }

  return false;
});

async function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        console.error("getAuthToken error", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      if (!token) {
        reject(new Error("No auth token"));
        return;
      }
      resolve(token);
    });
  });
}

async function apiFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function fetchDriveSummary(token) {
  // Storage usage
  const aboutUrl =
    "https://www.googleapis.com/drive/v3/about?fields=storageQuota(usage,usageInDrive,limit)";
  const about = await apiFetch(aboutUrl, token);
  const quota = about.storageQuota || {};
  const totalBytes = Number(quota.usage || 0);
  const driveBytes = Number(quota.usageInDrive || 0);
  const driveGB = bytesToGB(driveBytes);

  const filesUrl =
    "https://www.googleapis.com/drive/v3/files" +
    "?orderBy=quotaBytesUsed%20desc" +
    "&pageSize=10" +
    "&fields=files(id,name,mimeType,modifiedTime,quotaBytesUsed,webViewLink,size)";
  const filesRes = await apiFetch(filesUrl, token);
  const topFiles = (filesRes.files || []).map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    sizeBytes: Number(f.quotaBytesUsed || f.size || 0),
    webViewLink: f.webViewLink
  }));

  return {
    totalBytes,
    driveBytes,
    driveGB,
    topFiles
  };
}

async function fetchGmailProfile(token) {
  const url = "https://gmail.googleapis.com/gmail/v1/users/me/profile";
  const profile = await apiFetch(url, token);
  return {
    emailAddress: profile.emailAddress,
    messagesTotal: Number(profile.messagesTotal || 0),
    threadsTotal: Number(profile.threadsTotal || 0),
    historyId: profile.historyId
  };
}

async function fetchGmailSampleSizes(token, maxSamples = 200) {
  // Get list of message IDs
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxSamples}`;
  const listRes = await apiFetch(listUrl, token);
  const messages = listRes.messages || [];
  if (!messages.length) {
    return { sampleCount: 0, avgSizeBytes: 0 };
  }

  const toSample = messages.slice(0, maxSamples);
  const details = await Promise.all(
    toSample.map((m) =>
      apiFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(
          m.id
        )}?format=metadata`,
        token
      ).catch(() => null)
    )
  );

  let totalSize = 0;
  let count = 0;
  for (const d of details) {
    if (!d || d.sizeEstimate === undefined) continue;
    totalSize += Number(d.sizeEstimate);
    count += 1;
  }

  const avgSizeBytes = count ? totalSize / count : 0;
  return { sampleCount: count, avgSizeBytes };
}

async function fetchGmailLargeOldAttachmentsCount(token) {
  // Count emails with attachments >10MB and older than 1 year
  // We cap the work for hackathon performance.
  let total = 0;
  let pageToken = "";
  const maxPages = 3;
  let pagesFetched = 0;

  while (pagesFetched < maxPages) {
    const url =
      "https://gmail.googleapis.com/gmail/v1/users/me/messages" +
      "?q=" +
      encodeURIComponent("has:attachment larger:10M older_than:1y") +
      "&maxResults=500" +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

    const res = await apiFetch(url, token);
    const messages = res.messages || [];
    total += messages.length;
    pageToken = res.nextPageToken;
    pagesFetched += 1;
    if (!pageToken) break;
  }

  return total;
}

async function fetchGmailSummary(token) {
  const profile = await fetchGmailProfile(token);
  const { sampleCount, avgSizeBytes } = await fetchGmailSampleSizes(token, 200);

  let estimatedBytes = 0;
  if (sampleCount && avgSizeBytes) {
    estimatedBytes = avgSizeBytes * profile.messagesTotal;
  }

  const gmailGB = bytesToGB(estimatedBytes);

  const largeOldAttachmentsCount = await fetchGmailLargeOldAttachmentsCount(token);

  return {
    profile,
    sampleCount,
    avgSizeBytes,
    estimatedBytes,
    gmailGB,
    largeOldAttachmentsCount
  };
}

async function computeAndCacheCarbonData() {
  const token = await getAuthToken(true);

  const [drive, gmail] = await Promise.all([
    fetchDriveSummary(token),
    fetchGmailSummary(token)
  ]);

  // Approximate Google Photos & other Google services as the residual:
  // total account storage minus Drive and estimated Gmail bytes.
  let photosBytes = 0;
  if (drive.totalBytes && drive.driveBytes !== undefined && gmail.estimatedBytes !== undefined) {
    const residual = drive.totalBytes - drive.driveBytes - gmail.estimatedBytes;
    photosBytes = residual > 0 ? residual : 0;
  }
  const photosGB = bytesToGB(photosBytes);

  const totalGB = (drive.driveGB || 0) + (gmail.gmailGB || 0) + photosGB;
  const storageEmissions = computeStorageEmissions(totalGB);

  const data = {
    generatedAt: Date.now(),
    drive,
    gmail,
    photos: {
      photosBytes,
      photosGB
    },
    storage: {
      totalGB,
      emissions: storageEmissions
    },
    notes: {
      gmailStorageEstimated: true,
      gmailStorageExplanation:
        "Gmail storage is estimated using average message size from a sample of recent messages multiplied by total message count.",
      largeAttachmentDefinition:
        "Large Gmail attachments are counted using search: has:attachment larger:10M older_than:1y.",
      photosStorageExplanation:
        "Google Photos and other Google services are approximated as the residual between total account storage and Drive + estimated Gmail usage."
    }
  };

  await new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: data }, resolve);
  });

  return data;
}

async function getCachedData() {
  const data = await new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (items) => {
      resolve(items[STORAGE_KEY]);
    });
  });

  if (!data || !data.generatedAt) {
    return { cached: false };
  }

  const age = Date.now() - data.generatedAt;
  if (age > CACHE_TTL_MS) {
    return { cached: false, stale: true, data };
  }

  return { cached: true, data };
}

