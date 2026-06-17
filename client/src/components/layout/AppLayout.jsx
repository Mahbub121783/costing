import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Menu, Shirt } from 'lucide-react';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';

export default function AppLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* Mobile backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <div className="lg:ml-60 flex flex-col min-h-screen">
        {/* Mobile top bar with hamburger */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 bg-[#0b1120] px-4 h-14">
          <button onClick={() => setOpen(true)} className="text-slate-200 p-1 -ml-1" aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Shirt size={15} className="text-white" />
            </div>
            <span className="text-white font-bold text-sm">GCS</span>
          </div>
        </header>

        <main className="flex-1 min-w-0">
          <div className="max-w-screen-2xl mx-auto p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </div>
  );
}
