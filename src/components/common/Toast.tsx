import { useToastStore } from '@/stores/useToastStore';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`
            px-4 py-3 rounded-lg shadow-lg cursor-pointer
            animate-slide-down backdrop-blur-sm
            ${toast.type === 'success' ? 'bg-success/90 text-white' : ''}
            ${toast.type === 'warning' ? 'bg-accent/90 text-bg-main' : ''}
            ${toast.type === 'info' ? 'bg-primary/90 text-bg-main' : ''}
          `}
        >
          <span className="font-medium">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
