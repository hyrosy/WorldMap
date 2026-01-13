import { useState, useEffect } from 'react';
import Image from 'next/image';

// This component no longer needs to signal completion.
export default function WelcomeOverlay() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress with an interval.
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 1.5); // This interval will complete the bar in about 2.5 seconds.

    // Cleanup function to clear the interval if the component unmounts.
    return () => clearInterval(interval);
  }, []); // Empty dependency array means this runs once.

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center pointer-events-auto transition-opacity duration-500">
      <div className="w-full max-w-md px-8 text-center">
        {/* The flying character */}
        <div className="relative h-24 mb-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 animate-float">
            <Image
              src="/pin-icons/flying.png"
              alt="Flying Character"
              width={80}
              height={80}
            />
          </div>
        </div>

        {/* The progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden shadow-lg">
          <div
            className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300 ease-linear"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* The text below the bar */}
        <p className="text-white text-lg mt-4 font-semibold tracking-wider">
          Entering Hyrosy Interactive Map... {progress}%
        </p>
      </div>
    </div>
  );
}

