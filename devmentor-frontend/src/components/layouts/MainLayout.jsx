import React from 'react';
import { Outlet, useLocation } from 'react-router-dom'; // Import useLocation
import Navbar from '../Navbar';

const MainLayout = () => {
  const location = useLocation(); // Get the current page's path
  const isGoalSetupPage = location.pathname === '/goal-setup';

  // Conditionally set the class names based on the page
  const mainContainerClass = isGoalSetupPage 
    ? "flex-grow" 
    : "flex-grow flex justify-center items-center";
  
  const contentWrapperClass = isGoalSetupPage 
    ? "h-full" 
    : "w-full max-w-6xl p-6";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <main className={mainContainerClass}>
        <div className={contentWrapperClass}>
          <Outlet /> {/* Child pages will render here */}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;