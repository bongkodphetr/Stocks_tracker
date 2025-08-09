"use client";

import React from "react";

export function FooterTrail() {
  const text = "Stockly";
  return (
    <div className="select-none text-center">
      <h2 className="text-6xl font-extrabold tracking-tight">
        {Array.from(text).map((ch, idx) => (
          <span
            key={idx}
            className="inline-block animate-trail opacity-0"
            style={{ animationDelay: `${idx * 90}ms` }}
          >
            {ch}
          </span>
        ))}
      </h2>
    </div>
  );
}


