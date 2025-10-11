import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar'; // Adjust path if Navbar is elsewhere

const MainLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-grow flex justify-center items-center">
        <div className="w-full max-w-6xl p-6">
          <Outlet /> {/* Child pages will render here */}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;