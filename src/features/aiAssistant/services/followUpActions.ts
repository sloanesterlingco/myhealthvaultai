// src/features/aiAssistant/services/followUpActions.ts

import { patientAggregationService } from "./patientAggregationService";

/**
 * A centralized action handler for applying smart follow-up suggestions
 * selected by the user.
 *
 * Handles:
 *  - Tracking symptoms
 *  - Adding concerns
 *  - Creating goals
 *  - Flagging topics for provider review
 *  - Handling safety warnings (stored as notes or alerts)
 */

export const followUpActions = {
  /**
   * Track a symptom → store in AI memory + optional timeline entry.
   */
  trackSymptom(symptom: string) {
    patientAggregationService.trackSymptom(symptom);

    // Optional: add to timeline for better longitudinal analysis
    patientAggregationService.addTimelineEvent({
      title: `Symptom mentioned: ${symptom}`,
      source: "AI Follow-Up",
    });
  },

  /**
   * Add a concern → stores in AI memory + optional patient note.
   */
  addConcern(concern: string) {
    patientAggregationService.addConcern(concern);

    // Optional: add a note so it appears in provider summaries
    patientAggregationService.addNote(`New concern: ${concern}`);
  },

  /**
   * Suggest a goal → stores in AI memory + creates a goal “task”.
   */
  addGoal(goal: string) {
    patientAggregationService.addGoal(goal);

    // Optional: timeline or note entry
    patientAggregationService.addNote(`Patient goal added: ${goal}`);
  },

  /**
   * Topic worth bringing up with a provider.
   */
  flagProviderTopic(topic: string) {
    patientAggregationService.flagTopic(topic);

    patientAggregationService.addNote(
      `Flagged for provider discussion: ${topic}`
    );
  },

  /**
   * Mild risk warnings → store as notes so they show up in summaries.
   */
  handleRiskWarning(warning: string) {
    patientAggregationService.addNote(`Risk warning: ${warning}`);
  },

  /**
   * Master dispatcher used by FollowUpSuggestionsBar
   */
  handleAction(type: string, value: string) {
    switch (type) {
      case "trackSymptoms":
        return this.trackSymptom(value);

      case "addConcerns":
        return this.addConcern(value);

      case "suggestGoals":
        return this.addGoal(value);

      case "flagProviderTopics":
        return this.flagProviderTopic(value);

      case "riskWarnings":
        return this.handleRiskWarning(value);

      default:
        console.warn("Unknown follow-up action:", type, value);
    }
  },
};
