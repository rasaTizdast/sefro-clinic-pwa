import { useCallback, useEffect, useState } from "react";
import { MdSignalWifiOff, MdWifi } from "react-icons/md";

function Banner({
  children,
  show,
  variant,
}: {
  children: React.ReactNode;
  show: boolean;
  variant: "error" | "success";
}) {
  return (
    <div
      className={`fixed top-0 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-br-xl rounded-bl-xl px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-300 ease-out ${
        variant === "error" ? "bg-red-600" : "bg-emerald-600"
      } ${show ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}
    >
      {children}
    </div>
  );
}

export function PwaUpdater() {
  const [online, setOnline] = useState(navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);

  const goOnline = useCallback(() => {
    setOnline(true);
    setJustReconnected(true);
    setTimeout(() => setJustReconnected(false), 4000);
  }, []);

  const goOffline = useCallback(() => {
    setOnline(false);
    setJustReconnected(false);
  }, []);

  useEffect(() => {
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [goOnline, goOffline]);

  const retry = () => {
    window.location.reload();
  };

  return (
    <>
      <Banner show={!online} variant="error">
        <MdSignalWifiOff className="size-5 shrink-0" />
        <span>ارتباط اینترنت برقرار نیست</span>
        <button
          type="button"
          onClick={retry}
          className="mr-3 rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/30"
        >
          تلاش مجدد
        </button>
      </Banner>
      <Banner show={justReconnected} variant="success">
        <MdWifi className="size-5 shrink-0" />
        <span>ارتباط برقرار شد</span>
      </Banner>
    </>
  );
}
