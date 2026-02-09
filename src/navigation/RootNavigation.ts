// src/navigation/RootNavigation.ts

import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

export const rootNavigationRef =
  createNavigationContainerRef<RootStackParamList>();

export function rootNavigate<RouteName extends keyof RootStackParamList>(
  ...args: undefined extends RootStackParamList[RouteName]
    ? [screen: RouteName] | [screen: RouteName, params: RootStackParamList[RouteName]]
    : [screen: RouteName, params: RootStackParamList[RouteName]]
) {
  if (!rootNavigationRef.isReady()) return;
  // @ts-expect-error react-navigation typing is awkward here; keep call sites clean
  rootNavigationRef.navigate(...args);
}

/**
 * Helper to reset the ROOT navigator (AppNavigator stack).
 *
 * Example:
 *   resetRoot([{ name: AppRoutes.MAIN }]);
 */
export function resetRoot(
  routes: { name: keyof RootStackParamList; params?: any }[],
  index: number = 0
) {
  if (!rootNavigationRef.isReady()) return;

  // Some react-navigation typings require route keys on reset.
  const keyedRoutes = routes.map((r, i) => ({
    key: `${String(r.name)}-${i}`,
    name: r.name as any,
    params: r.params,
  }));

  rootNavigationRef.reset({
    index,
    routes: keyedRoutes as any,
  });
}
