import { useLayoutEffect, useRef } from "react";

export function useModalDialog() {
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const trigger = document.activeElement;
    dialog.showModal();

    return () => {
      dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  return ref;
}
