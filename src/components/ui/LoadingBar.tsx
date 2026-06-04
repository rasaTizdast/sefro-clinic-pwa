import { motion } from "motion/react";
import { startTransition, useEffect, useRef, useState } from "react";
import { useLocation, useNavigation } from "react-router";

export function LoadingBar() {
  const location = useLocation();
  const navigation = useNavigation();
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const mountTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const locationKeyRef = useRef(location.key);
  const navInProgressRef = useRef(false);

  const clearTrickle = () => clearInterval(intervalRef.current);

  useEffect(() => {
    startTransition(() => setProgress(0.3));

    mountTimerRef.current = setTimeout(() => {
      startTransition(() => setProgress(1));
    }, 600);

    return () => clearTimeout(mountTimerRef.current);
  }, []);

  useEffect(() => {
    if (navigation.state !== "loading") return;

    navInProgressRef.current = true;
    clearTimeout(mountTimerRef.current);
    clearTrickle();
    startTransition(() => setProgress(0.3));

    intervalRef.current = setInterval(() => {
      startTransition(() => {
        setProgress((prev) => {
          if (prev >= 0.85) return prev;
          return Math.min(prev + (0.85 - prev) * 0.08 + 0.03, 0.85);
        });
      });
    }, 350);

    return () => clearInterval(intervalRef.current);
  }, [navigation.state]);

  useEffect(() => {
    if (navigation.state !== "idle") return;
    if (!navInProgressRef.current) return;

    navInProgressRef.current = false;
    clearTrickle();
    startTransition(() => setProgress(1));
  }, [navigation.state]);

  useEffect(() => {
    if (location.key === locationKeyRef.current) return;
    locationKeyRef.current = location.key;

    if (navInProgressRef.current) return;

    clearTrickle();
    startTransition(() => setProgress(0.5));

    const flash = setTimeout(() => {
      startTransition(() => setProgress(1));
    }, 200);

    return () => clearTimeout(flash);
  }, [location.key]);

  useEffect(() => {
    if (progress < 1) return;

    const hide = setTimeout(() => {
      startTransition(() => setProgress(0));
    }, 500);

    return () => clearTimeout(hide);
  }, [progress]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]"
      aria-hidden="true"
      initial={false}
      animate={{ opacity: progress > 0 ? 1 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="bg-primary-500 h-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
        style={{ transformOrigin: "right" }}
        animate={{ scaleX: progress }}
        transition={{ type: "spring", stiffness: 150, damping: 25 }}
      />
    </motion.div>
  );
}
