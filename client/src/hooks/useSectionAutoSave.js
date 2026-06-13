import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

export function useSectionAutoSave(saveFn, deps, delay = 1500) {
  const [status, setStatus] = useState('idle'); // idle | dirty | saving | saved | error
  const initialized = useRef(false);
  const timerRef = useRef(null);
  const savedRef = useRef(null);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }

    setStatus('dirty');

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await saveFn();
        setStatus('saved');
        if (savedRef.current) clearTimeout(savedRef.current);
        savedRef.current = setTimeout(() => setStatus('idle'), 2500);
      } catch {
        setStatus('error');
        toast.error('Auto-save failed — check your connection');
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return status;
}
