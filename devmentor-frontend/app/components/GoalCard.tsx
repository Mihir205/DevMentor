// app/components/GoalCard.tsx
"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react"; // Importing icons for visual interest

type Props = {
  goal: {
    id?: string;
    _id?: string;
    title: string;
    description: string;
    slug?: string;
  };
  onStart?: () => void;
  starting?: boolean;
};

export default function GoalCard({ goal, onStart, starting }: Props) {
  const id = goal.id ?? goal._id;
  
  // Custom Card Styling
  // Using the 'card-border' utility class for professional look
  return (
    <div className="card-border flex flex-col justify-between min-h-[180px] p-5 shadow-lg hover:shadow-xl transition-shadow duration-300">
      
      {/* Goal Content */}
      <div className="flex-grow">
        <h3 className="text-xl font-bold mb-2 text-[--color-primary]">{goal.title}</h3>
        
        {/* Description: Subtle, professional text */}
        <p className="text-sm text-[--color-foreground] opacity-75 mb-3 leading-relaxed">
          {goal.description}
        </p>
        
        {/* Slug/Metadata: Techy, smaller text */}
        {goal.slug && (
          <div className="mt-2 text-xs font-mono tracking-wider text-[--color-accent] opacity-60">
            SLUG: {goal.slug}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-3 justify-end items-center border-t border-[--color-border] pt-3">
        
        {/* Preview Link */}
        <Link 
          href={`/predefined/${id}`} 
          className="flex items-center text-sm font-medium text-[--color-foreground] opacity-60 hover:text-[--color-primary] hover:opacity-100 transition-colors"
        >
          Preview <ArrowRight className="w-4 h-4 ml-1" />
        </Link>

        {/* Main Action Button (Select/Start) */}
        <button
          onClick={() => onStart?.()}
          disabled={starting}
          className={`
            flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md 
            ${starting 
              ? "bg-gray-500 text-white cursor-not-allowed opacity-75" // Disabled state
              : "bg-[--color-accent] text-black hover:bg-[--color-primary] hover:text-white active:scale-[0.98] focus:ring-2 focus:ring-[--color-accent] focus:ring-offset-2" // Active state
            }
          `}
        >
          {starting ? "Starting…" : (
            <>
              <Zap className="w-4 h-4 mr-1" /> Select
            </>
          )}
        </button>
      </div>
    </div>
  );
}