// src/features/patient/services/providerVisitPdfService.ts

import * as Print from "expo-print";

/**
 * Generates a clean PDF provider visit summary.
 * The caller passes a single "visitData" object.
 */
export async function generateProviderVisitPDF(visitData: any) {
  try {
    const {
      patient,
      conditions,
      hpiNarrative,
      vitals,
      medications,
      symptomsSummary,
      providerNotes,
    } = visitData;

    const html = `
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, Helvetica, Arial, sans-serif;
            padding: 24px;
            color: #111;
          }
          h1 { font-size: 24px; margin-bottom: 8px; }
          h2 { font-size: 18px; margin-top: 28px; margin-bottom: 6px; }
          .card { margin-bottom: 16px; }
          .row { margin-bottom: 4px; }
          .label { font-weight: 600; }
          .section { margin-bottom: 18px; }
        </style>
      </head>
      <body>

        <h1>Provider Visit Packet</h1>

        <div class="section">
          <h2>Patient Information</h2>
          <div class="row"><span class="label">Name:</span> ${patient?.name ?? "—"}</div>
          <div class="row"><span class="label">DOB:</span> ${patient?.dob ?? patient?.dateOfBirth ?? "—"}</div>
          <div class="row"><span class="label">Phone:</span> ${patient?.phone ?? "—"}</div>
          <div class="row"><span class="label">Email:</span> ${patient?.email ?? "—"}</div>
        </div>

        <div class="section">
          <h2>Conditions</h2>
          ${
            Array.isArray(conditions) && conditions.length
              ? conditions
                  .map(
                    (c: any) =>
                      `<div class="row">• ${c.name ?? "Condition"} ${
                        c.status ? `(Status: ${c.status})` : ""
                      }</div>`
                  )
                  .join("")
              : "<div>No conditions recorded.</div>"
          }
        </div>

        <div class="section">
          <h2>AI HPI Narrative</h2>
          <div>${hpiNarrative ?? "No HPI narrative available."}</div>
        </div>

        <div class="section">
          <h2>Vitals Summary</h2>
          ${
            vitals
              ? `
            <div class="row"><span class="label">Blood Pressure:</span> ${vitals.bp ?? vitals.bloodPressure ?? "—"}</div>
            <div class="row"><span class="label">Heart Rate:</span> ${
              vitals.heartRate ?? vitals.hr ?? "—"
            }</div>
            <div class="row"><span class="label">SpO₂:</span> ${
              vitals.spo2 ?? vitals.oxygen ?? "—"
            }</div>
            <div class="row"><span class="label">Temperature:</span> ${
              vitals.temperature ?? vitals.temp ?? "—"
            }</div>
            <div class="row"><span class="label">Weight:</span> ${
              vitals.weight ?? vitals.wt ?? "—"
            }</div>
            <div class="row"><span class="label">Glucose:</span> ${
              vitals.glucose ?? vitals.bg ?? "—"
            }</div>
          `
              : "<div>No vitals available.</div>"
          }
        </div>

        <div class="section">
          <h2>Medications</h2>
          ${
            Array.isArray(medications) && medications.length
              ? medications
                  .map(
                    (m: any) => `
              <div class="row">• <strong>${m.name ?? m.genericName ?? "Medication"}</strong></div>
              <div class="row">Dose: ${m.dose ?? m.dosage ?? "—"}</div>
              <div class="row">Frequency: ${m.frequency ?? "—"}</div>
              <div class="row">Route: ${m.route ?? "—"}</div>
              <div class="row">Started: ${m.startDate ?? "—"}</div>
              <br />
            `
                  )
                  .join("")
              : "<div>No medications on file.</div>"
          }
        </div>

        <div class="section">
          <h2>Symptoms Summary</h2>
          <div>${symptomsSummary ?? "No symptom details."}</div>
        </div>

        <div class="section">
          <h2>Provider Notes</h2>
          <div>${providerNotes ?? "No provider notes added."}</div>
        </div>

      </body>
      </html>
    `;

    const file = await Print.printToFileAsync({ html });

    return file.uri;
  } catch (err) {
    console.error("Error generating PDF:", err);
    throw err;
  }
}
