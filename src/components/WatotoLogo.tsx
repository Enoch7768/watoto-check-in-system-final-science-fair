import React from 'react';

export default function WatotoLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
      <path id="top-curve" d="M 20 100 A 80 80 0 0 1 180 100" fill="none" />
      <text fill="currentColor" fontSize="16" fontWeight="900" letterSpacing="2">
        <textPath href="#top-curve" startOffset="50%" textAnchor="middle">WATOTO CHRISTIAN</textPath>
      </text>
      
      <path id="bottom-curve" d="M 180 100 A 80 80 0 0 1 20 100" fill="none" />
      <text fill="currentColor" fontSize="16" fontWeight="900" letterSpacing="2">
        <textPath href="#bottom-curve" startOffset="50%" textAnchor="middle">INTERNATIONAL SCHOOL</textPath>
      </text>

      {/* Circle gaps */}
      <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="100 40 100 40" strokeDashoffset="70" />
      
      {/* The W */}
      <path d="M 45 140 C 60 100, 70 70, 85 55 C 90 80, 95 100, 100 120 C 115 80, 135 60, 160 45 C 140 80, 120 110, 110 140 C 100 110, 90 80, 80 110 C 70 140, 60 150, 45 140 Z" fill="currentColor" />
    </svg>
  );
}
