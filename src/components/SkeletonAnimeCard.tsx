import React from 'react';
import { motion } from 'motion/react';

export default function SkeletonAnimeCard() {
  return (
    <div className="block space-y-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-800 animate-pulse">
        {/* Placeholder for badges */}
        <div className="absolute top-2 right-2 w-8 h-4 bg-slate-700 rounded-md"></div>
        <div className="absolute top-2 left-2 w-16 h-4 bg-slate-700 rounded-md"></div>
      </div>
      <div className="space-y-1.5 px-1 pb-1">
        <div className="h-4 bg-slate-800 rounded animate-pulse w-full"></div>
        <div className="h-4 bg-slate-800 rounded animate-pulse w-2/3"></div>
      </div>
    </div>
  );
}
