import "driver.js/dist/driver.css";

import { driver } from "driver.js";
import { useCallback, useRef } from "react";
import { useLocation } from "react-router";

import { walkthroughSteps } from "../data/walkthroughSteps";

const isWalkthroughEnabled = (): boolean => {
  try {
    return import.meta.env.VITE_WALKTHROUGH_ENABLED !== "false";
  } catch {
    return true;
  }
};

export function useWalkthrough() {
  const location = useLocation();
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const getDriver = useCallback(() => {
    if (!driverRef.current) {
      driverRef.current = driver({
        popoverClass: "walkthrough-popover",
        showProgress: true,
        showButtons: ["next", "previous", "close"],
        progressText: "مرحله {{current}} از {{total}}",
        nextBtnText: "بعدی",
        prevBtnText: "قبلی",
        doneBtnText: "پایان",
        overlayColor: "rgba(15, 23, 42, 0.55)",
      });
    }
    return driverRef.current;
  }, []);

  const startWalkthrough = useCallback(() => {
    if (!isWalkthroughEnabled()) return;

    const basePath = import.meta.env.DEV ? "" : "/dashboard";
    const routePath = basePath ? location.pathname.replace(basePath, "") : location.pathname;
    const steps = walkthroughSteps[routePath];
    if (!steps || steps.length === 0) return;

    const visibleSteps = steps.filter((step) => {
      if (!step.element) return true;
      if (typeof step.element === "string") {
        return document.querySelector(step.element) !== null;
      }
      if (typeof step.element === "function") {
        try {
          const el = step.element();
          return el !== null;
        } catch {
          return false;
        }
      }
      return true;
    });

    if (visibleSteps.length === 0) return;

    const d = getDriver();
    d.setSteps(visibleSteps);
    d.drive();
  }, [location.pathname, getDriver]);

  const isEnabled = isWalkthroughEnabled();

  return { startWalkthrough, isEnabled };
}
