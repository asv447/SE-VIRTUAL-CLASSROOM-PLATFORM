'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '../sidebar/page';

export default function ClassroomLayout({ children }) {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default width
  const pathname = usePathname();

  // Listen for sidebar width changes
  useEffect(() => {
    const handleSidebarWidthChange = (e) => {
      if (e.detail && e.detail.width) {
        setSidebarWidth(e.detail.width);
      }
    };

    // Listen for custom event from sidebar
    window.addEventListener('sidebarWidthChange', handleSidebarWidthChange);

    // Initial check
    const sidebar = document.querySelector('.fixed.left-0.bg-gray-50');
    if (sidebar) {
      setSidebarWidth(sidebar.offsetWidth);
    }

    // Check if mobile
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('sidebarWidthChange', handleSidebarWidthChange);
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div 
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{
          marginLeft: `${sidebarWidth}px`,
          width: `calc(100% - ${sidebarWidth}px)`,
          minWidth: '0' // Prevents flex-shrink issues
        }}
      >
        {/* Mobile Header */}
        {isMobile && (
          <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 sticky top-0 z-10">
            <h1 className="text-xl font-semibold text-gray-800">
              Classroom
            </h1>
          </header>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
