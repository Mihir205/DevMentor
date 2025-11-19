// app/layout.tsx
import "./globals.css";
import Header from "./components/Header";
import { Inter } from 'next/font/google'; // Import a standard professional font

// Using 'Inter' as a placeholder for a professional, tech-friendly font
const inter = Inter({ subsets: ["latin"] });

export const metadata = { 
  title: "DevMentor | Next-Gen Software Mentorship",
  description: "Structure your development goals and roadmaps.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Apply the chosen font and ensure full viewport height
    <html lang="en" className={`${inter.className} h-full`}>
      {/* The body should also take up full height and use the system background color. 
        antialiased helps text look sharper, fitting the professional aesthetic.
      */}
      <body className="bg-[--color-background] text-[--color-foreground] antialiased min-h-screen flex flex-col">
        
        {/* The Header component will contain the top navigation bar */}
        <Header />

        {/* Main Application Wrapper: This flex container separates the top header 
          from the main content area (which might include a sidebar).
          It takes up the remaining height (flex-1).
        */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Optional Sidebar Placeholder: 
            If you plan to add a sidebar for primary navigation (common in dashboards), 
            it would go here. For now, it's just a placeholder flex item.
          */}
          {/* <aside className="hidden lg:block w-64 bg-slate-800 border-r border-[--color-border]">
            <nav>...</nav>
          </aside> */}

          {/* Main Content Area: 
            This area scrolls independently (overflow-y-auto) and uses consistent padding.
            It uses a clean white/dark background for content contrast.
          */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
          
        </div>
      </body>
    </html>
  );
}