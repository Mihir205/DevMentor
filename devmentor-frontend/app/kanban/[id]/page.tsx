// app/kanban/[id]/page.tsx
"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import KanbanBoardWrapper from "../../components/KanbanBoardWrapper";
import api from "../../lib/api";
import { getAuth } from "../../lib/auth";
import Link from "next/link";
import { Plus, LayoutGrid, XCircle } from "lucide-react";

export default function KanbanPage() {
  const router = useRouter();
  const params = useParams();
  const upgId = params?.id as string; // userPredefinedGoalId
  const { token, user } = getAuth();
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Simple, modern notification display logic
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Quick-add a simple task for testing or user convenience (using prompt simulation)
  async function quickAdd() {
    if (!token || !user) {
        showNotification("Authentication required. Redirecting to login...", 'error');
        return router.push("/auth/login");
    }

    // In a professional app, this would be a modal. For quick fix, we use basic input simulation.
    const title = prompt("Enter a title for the new task:");

    if (!title) {
        if (title !== null) showNotification("Task title cannot be empty.", 'error');
        return;
    }

    setCreating(true);
    try {
      const userId = user.id ?? user._id;
      // calls your addTask route: POST /api/users/:userId/predefined-goals/:upgId/kanban/tasks
      await api(`/api/users/${userId}/predefined-goals/${upgId}/kanban/tasks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: { title, description: `Quickly added task: ${title}`, difficulty: "beginner", link: null },
      });
      showNotification(`Task "${title}" added successfully!`, 'success');
      
      // OPTIONAL: Instead of location.reload(), you would dispatch an event or mutate local state/cache 
      // to update the Kanban board without a full page refresh.
      // window.location.reload(); 
      
    } catch (err: any) {
      console.error("Failed to add task:", err);
      showNotification(`Failed to add task: ${err?.message || "Server error."}`, 'error');
    } finally {
      setCreating(false);
    }
  }

  if (!upgId) return <div className="p-8 text-center text-red-500">Error: Missing Goal ID.</div>;

  return (
    <div className="p-2 md:p-4 lg:p-6">
        
        {/* Notification Alert */}
        {notification && (
            <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
        )}

        {/* Header & Actions: Professional Flex Layout */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b border-[--color-border] pb-4">
            
            {/* Title & Subtitle */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[--color-primary] mb-1">
                    Goal Kanban Board
                </h1>
                <p className="text-sm text-[--color-foreground] opacity-70">
                    Visualize your roadmap tasks. Drag and drop cards to update status.
                </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4 sm:mt-0">
                {/* View Roadmap Link */}
                <Link 
                    href={`/roadmap/${upgId}`} 
                    className="flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-[--color-card-bg] text-[--color-primary] border border-[--color-primary] hover:bg-[--color-primary] hover:text-white transition-colors duration-200"
                >
                    <LayoutGrid className="w-4 h-4 mr-2" /> View Roadmap
                </Link>

                {/* Add Quick Task Button (Primary Action) */}
                <button 
                    onClick={quickAdd} 
                    disabled={creating} 
                    className={`
                        flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md 
                        ${creating 
                            ? "bg-gray-500 text-white cursor-not-allowed opacity-70"
                            : "bg-[--color-accent] text-black hover:bg-[--color-primary] hover:text-white active:scale-[0.98] focus:ring-2 focus:ring-[--color-accent] focus:ring-offset-2"
                        }
                    `}
                >
                    {creating ? "Creating…" : (
                        <>
                            <Plus className="w-4 h-4 mr-1" /> Add Quick Task
                        </>
                    )}
                </button>
            </div>
        </div>

        {/* Kanban Board Component */}
        <KanbanBoardWrapper userPredefinedGoalId={upgId} />

    </div>
  );
}

// Simple Notification Component (Replaces alert())
const Notification = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
    const isError = type === 'error';
    const bgColor = isError ? 'bg-red-500/10' : 'bg-green-500/10';
    const textColor = isError ? 'text-red-400' : 'text-green-400';
    const borderColor = isError ? 'border-red-500' : 'border-green-500';

    return (
        <div className={`fixed top-20 right-4 p-4 rounded-lg shadow-xl flex items-center justify-between z-[100] ${bgColor} border ${borderColor} ${textColor} transition-opacity duration-300 animate-slideIn`}>
            <p className="text-sm font-medium mr-4">{message}</p>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                <XCircle className="w-5 h-5" />
            </button>
        </div>
    );
};