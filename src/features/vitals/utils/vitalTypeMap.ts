import type { VitalType } from "../types";

export type VitalSchemaType =
  | "bloodPressure"
  | "heartRate"
  | "weight"
  | "height"
  | "oxygenSaturation"
  | "bloodSugar"
  | "temperature"
  | "other";

export function schemaTypeToVitalType(t: VitalSchemaType): VitalType | null {
  switch (t) {
    case "bloodPressure":
      return "bp";
    case "heartRate":
      return "hr";
    case "oxygenSaturation":
      return "spo2";
    case "temperature":
      return "temp";
    case "weight":
      return "weight";
    case "height":
      return "height";
    // not supported by Vitals V1
    case "bloodSugar":
    case "other":
    default:
      return null;
  }
}
