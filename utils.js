// Shared utility functions for Carbon Cache

export function bytesToGB(bytes) {
  if (!bytes || bytes < 0) return 0;
  return bytes / (1024 * 1024 * 1024);
}

export function formatGB(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0 GB";
  return `${value.toFixed(2)} GB`;
}

export function formatKgCO2(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0 kg CO₂e";
  return `${value.toFixed(2)} kg CO₂e`;
}

export function formatDate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export function computeStorageEmissions(totalGB) {
  const gb = totalGB || 0;
  const low = gb * 0.01;
  const mid = gb * 0.025;
  const high = gb * 0.04;
  return { low, mid, high };
}

export function computeEmailActivityEmissions({ N_normal = 0, N_attach = 0, N_spam = 0 }) {
  const spamKg = N_spam * 0.0003;
  const normalKg = N_normal * 0.004;
  const attachKg = N_attach * 0.05;
  return spamKg + normalKg + attachKg;
}

// Approximate equivalence: 0.2 kg CO₂e per km driven (very rough)
export function co2ToKmDriven(kg) {
  if (!kg || kg <= 0) return 0;
  return kg / 0.2;
}

// Map factor key to storage emission factor (kg CO₂e per GB-year)
export function factorToEF(factorKey) {
  switch (factorKey) {
    case "low":
      return 0.01;
    case "high":
      return 0.04;
    case "mid":
    default:
      return 0.025;
  }
}

