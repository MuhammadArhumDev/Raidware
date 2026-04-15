import React from "react";

export function Skeleton({ className = "" }) {

  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-none ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border-[1.5px] border-gray-200 rounded-none p-6 shadow-sm">
      <Skeleton className="h-6 w-1/3 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <div className="mt-6">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full bg-white border-[1.5px] border-gray-200 rounded-none">
      <div className="border-b-[1.5px] border-gray-200 p-4">
        <Skeleton className="h-6 w-1/4" />
      </div>
      <div className="p-4 space-y-4">
        {Array.from({ length: rows }).map((_, rIndex) => (
          <div key={rIndex} className="flex gap-4">
            {Array.from({ length: cols }).map((_, cIndex) => (
              <Skeleton key={cIndex} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
