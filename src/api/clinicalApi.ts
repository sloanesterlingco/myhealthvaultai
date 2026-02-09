// src/api/clinicalApi.ts

/** Temporary mock API that allows the app to compile and run */

export async function buildCheckInBundleFn(_: any) {
  await new Promise((r) => setTimeout(r, 300));
  return {
    resourceType: "Bundle",
    type: "collection",
    entry: [],
  };
}

export async function generateCheckInPdf(_: any) {
  await new Promise((r) => setTimeout(r, 300));
  return {
    publicUrl: "https://example.com/checkin.pdf",
  };
}

export async function sendToClinic(_: any) {
  await new Promise((r) => setTimeout(r, 300));
  return {
    ok: true,
  };
}
