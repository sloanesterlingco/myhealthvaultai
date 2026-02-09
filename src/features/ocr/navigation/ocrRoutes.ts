// src/features/ocr/navigation/ocrRoutes.ts

export type OCRStackParamList = {
  LabOCRReview: {
    result: any;
    onComplete: () => void;
  };
  MedicationOCRReview: {
    result: any;
    onComplete: () => void;
  };
};
