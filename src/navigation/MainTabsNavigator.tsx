// src/navigation/MainTabsNavigator.tsx
//
// IMPORTANT:
// This file used to define an older bottom tab setup (Dashboard, AI, Vitals, Records, Meds).
// The app now uses TabNavigator.tsx which contains the correct "Quick Action" footer + nested stacks.
// Keeping two separate tab navigators causes routing confusion (ex: Meds going to AI).
//
// So this file is now a simple wrapper that renders the real TabNavigator.

import React from "react";
import TabNavigator from "./TabNavigator";

const MainTabsNavigator: React.FC = () => {
  return <TabNavigator />;
};

export default MainTabsNavigator;
