interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const containerSize = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-28 h-28",
  };

  const imageSize = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24",
  };

  const borderWidth = {
    sm: "border-2",
    md: "border-3",
    lg: "border-4",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Container with Round Border */}
      <div className={`${containerSize[size]} ${borderWidth[size]} border-red-600 dark:border-red-500 rounded-full bg-transparent flex items-center justify-center p-1 shadow-lg`}>
        {/* Logo PNG Image with transparent background */}
        <img 
          src="/logo.png" 
          alt="SunLife Solar Logo" 
          className={`${imageSize[size]} rounded-full object-contain bg-transparent`}
          style={{ backgroundColor: 'transparent' }}
          onError={(e) => {
            // Fallback: hide image if it fails to load
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
      {showText && (
        <div>
          <h1 className={`font-bold text-red-600 dark:text-red-500 ${textSizeClasses[size]}`}>
            SunLife Solar
          </h1>
          <p className={`${size === "sm" ? "text-[10px]" : size === "md" ? "text-xs" : "text-sm"} text-black dark:text-gray-300 font-medium`}>
            Co.(Pvt).Ltd
          </p>
        </div>
      )}
    </div>
  );
}
