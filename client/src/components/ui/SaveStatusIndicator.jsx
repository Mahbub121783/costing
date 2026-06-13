export default function SaveStatusIndicator({ status, className = '' }) {
  if (status === 'idle') return null;

  const configs = {
    dirty:  { text: '● Unsaved', cls: 'text-amber-500' },
    saving: { text: '⟳ Saving…',  cls: 'text-blue-500' },
    saved:  { text: '✓ Saved',   cls: 'text-emerald-600' },
    error:  { text: '✗ Error',   cls: 'text-red-500' },
  };

  const { text, cls } = configs[status] || {};

  return (
    <span className={`text-xs font-medium ${cls} ${className}`}>{text}</span>
  );
}
