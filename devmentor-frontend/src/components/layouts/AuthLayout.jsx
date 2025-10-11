import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    // This component just provides an outlet for the full-screen pages
    <Outlet />
  );
};

export default AuthLayout;