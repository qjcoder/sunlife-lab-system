import { useForm } from "react-hook-form";
import { login as loginApi, checkRole as checkRoleApi } from "@/api/auth-api";
import { useAuth } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorPopup } from "@/components/ui/error-popup";
import { useNavigate } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { Mail, Lock, Building2, Users, Wrench, User, ClipboardList, FileEdit } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type FormData = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

type RoleType = "FACTORY_ADMIN" | "DEALER" | "SUB_DEALER" | "SERVICE_CENTER" | "INSTALLER_PROGRAM_MANAGER" | "DATA_ENTRY_OPERATOR" | "";

const getRoleConfig = (role: RoleType) => {
  switch (role) {
    case "FACTORY_ADMIN":
      return {
        accentColor: "bg-red-600",
        accentHover: "hover:bg-red-700",
        accentLight: "bg-red-50",
        accentBorder: "border-red-200",
        accentText: "text-red-600",
        bgGradient: "from-red-900 via-red-800 to-red-900",
        bgPattern: "bg-red-600",
        icon: Building2,
        title: "Factory Admin",
        description: "Manage factory operations, inventory, and dealer network",
        rightBg: "bg-gradient-to-br from-red-900 via-red-800 to-red-900",
      };
    case "DEALER":
      return {
        accentColor: "bg-blue-600",
        accentHover: "hover:bg-blue-700",
        accentLight: "bg-blue-50",
        accentBorder: "border-blue-200",
        accentText: "text-blue-600",
        bgGradient: "from-blue-900 via-blue-800 to-blue-900",
        bgPattern: "bg-blue-600",
        icon: Users,
        title: "Dealer",
        description: "Manage your inventory, sub-dealers, and sales",
        rightBg: "bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900",
      };
    case "SUB_DEALER":
      return {
        accentColor: "bg-green-600",
        accentHover: "hover:bg-green-700",
        accentLight: "bg-green-50",
        accentBorder: "border-green-200",
        accentText: "text-green-600",
        bgGradient: "from-green-900 via-green-800 to-green-900",
        bgPattern: "bg-green-600",
        icon: User,
        title: "Sub-Dealer",
        description: "Manage your stock and record sales",
        rightBg: "bg-gradient-to-br from-green-900 via-green-800 to-green-900",
      };
    case "SERVICE_CENTER":
      return {
        accentColor: "bg-orange-600",
        accentHover: "hover:bg-orange-700",
        accentLight: "bg-orange-50",
        accentBorder: "border-orange-200",
        accentText: "text-orange-600",
        bgGradient: "from-orange-900 via-orange-800 to-orange-900",
        bgPattern: "bg-orange-600",
        icon: Wrench,
        title: "Service Center",
        description: "Manage service jobs and parts inventory",
        rightBg: "bg-gradient-to-br from-orange-900 via-orange-800 to-orange-900",
      };
    case "INSTALLER_PROGRAM_MANAGER":
      return {
        accentColor: "bg-violet-600",
        accentHover: "hover:bg-violet-700",
        accentLight: "bg-violet-50",
        accentBorder: "border-violet-200",
        accentText: "text-violet-600",
        bgGradient: "from-violet-900 via-violet-800 to-violet-900",
        bgPattern: "bg-violet-600",
        icon: ClipboardList,
        title: "Installer Program Manager",
        description: "Manage installer program and product lifecycle",
        rightBg: "bg-gradient-to-br from-violet-900 via-violet-800 to-violet-900",
      };
    case "DATA_ENTRY_OPERATOR":
      return {
        accentColor: "bg-teal-600",
        accentHover: "hover:bg-teal-700",
        accentLight: "bg-teal-50",
        accentBorder: "border-teal-200",
        accentText: "text-teal-600",
        bgGradient: "from-teal-900 via-teal-800 to-teal-900",
        bgPattern: "bg-teal-600",
        icon: FileEdit,
        title: "Data Entry Operator",
        description: "Enter and manage product and warranty data",
        rightBg: "bg-gradient-to-br from-teal-900 via-teal-800 to-teal-900",
      };
    default:
      return {
        accentColor: "bg-red-600",
        accentHover: "hover:bg-red-700",
        accentLight: "bg-red-50",
        accentBorder: "border-red-200",
        accentText: "text-red-600",
        bgGradient: "from-gray-900 via-gray-800 to-black",
        bgPattern: "bg-red-600",
        icon: Building2,
        title: "Sunlife Solar",
        description: "Solar warranty and inventory management system",
        rightBg: "bg-gradient-to-br from-gray-900 via-gray-800 to-black",
      };
  }
};

const Login = () => {
  const { register, handleSubmit, formState: { isSubmitting, errors }, watch } = useForm<FormData>({
    mode: 'onBlur',
  });
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<RoleType>("");
  const [errorPopup, setErrorPopup] = useState<{ title?: string; message: string } | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  const checkRoleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const emailValue = watch("email");

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Auto-check role when email is entered
  useEffect(() => {
    // Clear previous timeout
    if (checkRoleTimeoutRef.current) {
      clearTimeout(checkRoleTimeoutRef.current);
    }

    // Only check if email is valid and not empty
    if (!emailValue || !emailValue.includes('@')) {
      return;
    }

    // Debounce the API call
    checkRoleTimeoutRef.current = setTimeout(async () => {
      try {
        setIsCheckingRole(true);
        const result = await checkRoleApi({ email: emailValue });
        if (result.role && result.active) {
          setSelectedRole(result.role as RoleType);
        }
      } catch (error) {
        // Silently fail - user might not exist yet or email might be invalid
        // Don't show error, just don't auto-select role
      } finally {
        setIsCheckingRole(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (checkRoleTimeoutRef.current) {
        clearTimeout(checkRoleTimeoutRef.current);
      }
    };
  }, [emailValue]);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await loginApi(data);
      const role = res.user.role as RoleType;
      
      // Auto-select the correct role if it doesn't match (silently)
      if (role !== selectedRole) {
        setSelectedRole(role);
      }
      
      // Proceed with login regardless of selected role
      login(res.token, res.user);
      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      console.error("Login error:", error);
      
      let errorMessage = "Login failed. Please check your credentials.";
      let errorTitle = "Error!";
      let detectedRole: RoleType | null = null;
      
      // Handle Axios errors
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { 
          response?: { 
            data?: { message?: string }; 
            status?: number;
          }; 
          message?: string;
        };
        
        const status = axiosError.response?.status;
        const backendMessage = axiosError.response?.data?.message || "";
        const errorText = backendMessage || axiosError.message || errorMessage;
        
        // Try to detect role from error message
        if (errorText.includes("Factory Admin") || errorText.includes("FACTORY_ADMIN")) {
          detectedRole = "FACTORY_ADMIN";
        } else if (errorText.includes("Dealer") && !errorText.includes("Sub")) {
          detectedRole = "DEALER";
        } else if (errorText.includes("Sub-Dealer") || errorText.includes("SUB_DEALER")) {
          detectedRole = "SUB_DEALER";
        } else if (errorText.includes("Service Center") || errorText.includes("SERVICE_CENTER")) {
          detectedRole = "SERVICE_CENTER";
        } else if (errorText.includes("Installer Program") || errorText.includes("INSTALLER_PROGRAM_MANAGER")) {
          detectedRole = "INSTALLER_PROGRAM_MANAGER";
        } else if (errorText.includes("Data Entry") || errorText.includes("DATA_ENTRY_OPERATOR")) {
          detectedRole = "DATA_ENTRY_OPERATOR";
        }
        
        if (status === 400) {
          errorTitle = "Missing Information";
          errorMessage = backendMessage || "Email and password are required. Please fill in all fields and try again.";
        } else if (status === 401) {
          // Generic message for all auth failures (security: don't reveal email vs password)
          errorTitle = "Invalid Credentials";
          errorMessage = "The email or password you entered is incorrect. Please try again.";
          
          // If we detected a role, auto-select it silently
          if (detectedRole) {
            setSelectedRole(detectedRole);
          }
        } else if (status === 403) {
          errorTitle = "Access Denied";
          errorMessage = backendMessage || "Your account may be inactive or you don't have permission to access this system. Please contact your administrator.";
        } else if (status === 404) {
          errorTitle = "Account Not Found";
          errorMessage = backendMessage || "No account found with this email address. Please check your email and try again.";
        } else if (status === 500) {
          errorTitle = "Server Error";
          errorMessage = backendMessage || "We're sorry! Something went wrong, and we were unable to complete your request. Please try again later.";
        } else if (backendMessage) {
          // Handle other backend error messages
          errorTitle = "Login Failed";
          errorMessage = backendMessage;
          // If we detected a role from error message, auto-select it silently
          if (detectedRole) {
            setSelectedRole(detectedRole);
          }
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        // Handle network errors or other errors
        const err = error as { message?: string };
        if (err.message === "Network Error" || err.message?.includes("Network")) {
          errorTitle = "Connection Error";
          errorMessage = "Cannot connect to server. Please make sure the backend is running and try again.";
        } else if (err.message) {
          errorTitle = "Login Failed";
          errorMessage = err.message;
        }
      } else {
        // Generic error fallback
        errorTitle = "Login Failed";
        errorMessage = "We're sorry! Something went wrong, and we were unable to complete your login. Please check your credentials and try again.";
      }
      
      // Always show error popup
      setErrorPopup({
        title: errorTitle,
        message: errorMessage
      });
    }
  };

  const config = getRoleConfig(selectedRole);

  // Show loading or redirect if already logged in
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const roles: { type: RoleType; label: string; icon: typeof Building2 }[] = [
    { type: "FACTORY_ADMIN", label: "Factory Admin", icon: Building2 },
    { type: "DEALER", label: "Dealer", icon: Users },
    { type: "SUB_DEALER", label: "Sub-Dealer", icon: User },
    { type: "SERVICE_CENTER", label: "Service Center", icon: Wrench },
    { type: "INSTALLER_PROGRAM_MANAGER", label: "Installer Program", icon: ClipboardList },
    { type: "DATA_ENTRY_OPERATOR", label: "Data Entry Operator", icon: FileEdit },
  ];

  return (
    <>
      {/* Error Popup */}
      {errorPopup && (
        <ErrorPopup
          title={errorPopup.title}
          message={errorPopup.message}
          onClose={() => setErrorPopup(null)}
          onTryAgain={() => setErrorPopup(null)}
          showTryAgain={true}
        />
      )}
      
      <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Column - Login Form */}
      <div className={`flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 transition-all duration-500 relative overflow-hidden ${
        selectedRole === "FACTORY_ADMIN" ? "bg-gradient-to-br from-red-50 via-white to-red-100" :
        selectedRole === "DEALER" ? "bg-gradient-to-br from-blue-50 via-white to-blue-100" :
        selectedRole === "SUB_DEALER" ? "bg-gradient-to-br from-green-50 via-white to-green-100" :
        selectedRole === "SERVICE_CENTER" ? "bg-gradient-to-br from-orange-50 via-white to-orange-100" :
        selectedRole === "INSTALLER_PROGRAM_MANAGER" ? "bg-gradient-to-br from-violet-50 via-white to-violet-100" :
        selectedRole === "DATA_ENTRY_OPERATOR" ? "bg-gradient-to-br from-teal-50 via-white to-teal-100" :
        "bg-gradient-to-br from-gray-50 via-white to-gray-100"
      }`}>
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className={`absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl ${
            selectedRole === "FACTORY_ADMIN" ? "bg-red-200" :
            selectedRole === "DEALER" ? "bg-blue-200" :
            selectedRole === "SUB_DEALER" ? "bg-green-200" :
            selectedRole === "SERVICE_CENTER" ? "bg-orange-200" :
            selectedRole === "INSTALLER_PROGRAM_MANAGER" ? "bg-violet-200" :
            selectedRole === "DATA_ENTRY_OPERATOR" ? "bg-teal-200" :
            "bg-gray-200"
          } animate-pulse`}></div>
          <div className={`absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl ${
            selectedRole === "FACTORY_ADMIN" ? "bg-red-300" :
            selectedRole === "DEALER" ? "bg-blue-300" :
            selectedRole === "SUB_DEALER" ? "bg-green-300" :
            selectedRole === "SERVICE_CENTER" ? "bg-orange-300" :
            selectedRole === "INSTALLER_PROGRAM_MANAGER" ? "bg-violet-300" :
            selectedRole === "DATA_ENTRY_OPERATOR" ? "bg-teal-300" :
            "bg-gray-300"
          } animate-pulse delay-1000`}></div>
        </div>
        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="mb-8 flex justify-center items-center gap-4">
            <div className="w-24 h-24 border-4 border-red-600 rounded-full bg-transparent flex items-center justify-center p-2 shadow-lg">
              <img 
                src="/logo.png" 
                alt="SunLife Solar Logo" 
                className="h-20 w-20 rounded-full object-contain bg-transparent"
                style={{ backgroundColor: 'transparent' }}
                onError={(e) => {
                  // Fallback if logo doesn't exist
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-red-600">SunLife Solar</h1>
              <p className="text-sm text-gray-600">Co.(Pvt).Ltd</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign in</h2>
          <p className="text-gray-600 mb-6">Enter your credentials to access your account</p>
          
          {/* Role Selection Buttons */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            {roles.map((role) => {
              const RoleIcon = role.icon;
              const roleConfig = getRoleConfig(role.type);
              const isSelected = selectedRole === role.type;
              
              return (
                <button
                  key={role.type}
                  type="button"
                  onClick={() => setSelectedRole(role.type)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 flex items-center gap-3 ${
                    isSelected
                      ? `${roleConfig.accentBorder} ${roleConfig.accentLight} border-2`
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <RoleIcon className={`h-5 w-5 ${isSelected ? roleConfig.accentText : "text-gray-400"}`} />
                  <span className={`text-sm font-medium ${isSelected ? roleConfig.accentText : "text-gray-600"}`}>
                    {role.label}
                  </span>
                </button>
              );
            })}
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit(onSubmit)(e);
            }} 
            className="space-y-6"
          >
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...register("email", { 
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address"
                    }
                  })}
                  className={`pl-10 h-12 border-gray-300 bg-white text-gray-900 ${
                    errors.email ? "border-red-500" : ""
                  } ${
                    selectedRole === "FACTORY_ADMIN" ? "focus:border-red-500 focus:ring-red-500" :
                    selectedRole === "DEALER" ? "focus:border-blue-500 focus:ring-blue-500" :
                    selectedRole === "SUB_DEALER" ? "focus:border-green-500 focus:ring-green-500" :
                    selectedRole === "SERVICE_CENTER" ? "focus:border-orange-500 focus:ring-orange-500" :
                    selectedRole === "INSTALLER_PROGRAM_MANAGER" ? "focus:border-violet-500 focus:ring-violet-500" :
                    selectedRole === "DATA_ENTRY_OPERATOR" ? "focus:border-teal-500 focus:ring-teal-500" :
                    "focus:border-red-500 focus:ring-red-500"
                  }`}
                />
                {isCheckingRole && (
                  <p className="text-xs text-muted-foreground mt-1">Checking role...</p>
                )}
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...register("password", { 
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters"
                    }
                  })}
                  className={`pl-10 h-12 border-gray-300 bg-white text-gray-900 ${
                    errors.password ? "border-red-500" : ""
                  } ${
                    selectedRole === "FACTORY_ADMIN" ? "focus:border-red-500 focus:ring-red-500" :
                    selectedRole === "DEALER" ? "focus:border-blue-500 focus:ring-blue-500" :
                    selectedRole === "SUB_DEALER" ? "focus:border-green-500 focus:ring-green-500" :
                    selectedRole === "SERVICE_CENTER" ? "focus:border-orange-500 focus:ring-orange-500" :
                    selectedRole === "INSTALLER_PROGRAM_MANAGER" ? "focus:border-violet-500 focus:ring-violet-500" :
                    selectedRole === "DATA_ENTRY_OPERATOR" ? "focus:border-teal-500 focus:ring-teal-500" :
                    "focus:border-red-500 focus:ring-red-500"
                  }`}
                />
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  {...register("rememberMe")}
                  className={`h-4 w-4 rounded border-gray-300 ${
                    selectedRole === "FACTORY_ADMIN" ? "text-red-600 focus:ring-red-500" :
                    selectedRole === "DEALER" ? "text-blue-600 focus:ring-blue-500" :
                    selectedRole === "SUB_DEALER" ? "text-green-600 focus:ring-green-500" :
                    selectedRole === "SERVICE_CENTER" ? "text-orange-600 focus:ring-orange-500" :
                    selectedRole === "INSTALLER_PROGRAM_MANAGER" ? "text-violet-600 focus:ring-violet-500" :
                    selectedRole === "DATA_ENTRY_OPERATOR" ? "text-teal-600 focus:ring-teal-500" :
                    "text-red-600 focus:ring-red-500"
                  }`}
                />
                <Label htmlFor="rememberMe" className="text-sm text-gray-700 cursor-pointer">
                  Remember me
                </Label>
              </div>
              <a href="#" className={`text-sm ${config.accentText} hover:opacity-80 font-medium`}>
                Forgot Password?
              </a>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className={`w-full h-12 ${config.accentColor} ${config.accentHover} text-white font-semibold text-base`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-gray-700">
              Don't have an account?{" "}
              <a href="#" className={`${config.accentText} hover:opacity-80 font-medium`}>
                Sign up
              </a>
            </p>
          </form>
        </div>
      </div>

      {/* Right Column - Promotional Section */}
      <div className={`hidden lg:flex flex-1 ${config.rightBg} relative overflow-hidden transition-all duration-500`}>
        {/* Enhanced Background Pattern with Gradient */}
        <div className="absolute inset-0">
          {/* Animated gradient orbs */}
          <div className={`absolute top-0 right-0 w-[500px] h-[500px] ${config.bgPattern} rounded-full blur-3xl opacity-40 animate-pulse`}></div>
          <div className={`absolute bottom-0 left-0 w-[500px] h-[500px] ${config.bgPattern} rounded-full blur-3xl opacity-30 animate-pulse delay-1000`}></div>
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] ${config.bgPattern} rounded-full blur-3xl opacity-20 animate-pulse delay-500`}></div>
          
          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/10 to-black/20"></div>
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white h-full">
          <div>
            <h2 className="text-5xl font-bold mb-6 leading-tight">
              {selectedRole === "FACTORY_ADMIN" 
                ? "Complete Factory Control" 
                : selectedRole === "DEALER"
                ? "Powerful Dealer Management"
                : selectedRole === "SUB_DEALER"
                ? "Streamlined Operations"
                : selectedRole === "SERVICE_CENTER"
                ? "Professional Service Hub"
                : selectedRole === "INSTALLER_PROGRAM_MANAGER"
                ? "Installer Program Management"
                : selectedRole === "DATA_ENTRY_OPERATOR"
                ? "Efficient Data Entry"
                : "Welcome to Sunlife Solar"}
            </h2>
            <p className="text-xl text-gray-100 mb-6 leading-relaxed font-medium">
              {selectedRole === "FACTORY_ADMIN" 
                ? "Centralized control for inventory, dispatch, dealer networks, and warranty management. Everything you need in one platform."
                : selectedRole === "DEALER"
                ? "Manage inventory, track sales, and grow your sub-dealer network with powerful tools designed for efficiency."
                : selectedRole === "SUB_DEALER"
                ? "Simple, intuitive tools for inventory management, sales tracking, and warranty activation."
                : selectedRole === "SERVICE_CENTER"
                ? "Streamline service jobs, parts inventory, and warranty tracking with professional-grade tools."
                : selectedRole === "INSTALLER_PROGRAM_MANAGER"
                ? "Manage installer program, product lifecycle, and full history view in one place."
                : selectedRole === "DATA_ENTRY_OPERATOR"
                ? "Enter and manage product data, warranty information, and records with ease."
                : "Comprehensive solar warranty and inventory management system trusted by industry leaders."}
            </p>
            <div className="flex flex-wrap gap-3 mb-12">
              {selectedRole === "FACTORY_ADMIN" && (
                <>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Inventory Control</span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Dealer Network</span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Warranty Management</span>
                </>
              )}
              {selectedRole === "DEALER" && (
                <>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Stock Management</span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Sales Tracking</span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Network Growth</span>
                </>
              )}
              {selectedRole === "SUB_DEALER" && (
                <>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Quick Access</span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Easy Sales</span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Warranty Tools</span>
                </>
              )}
              {selectedRole === "SERVICE_CENTER" && (
                <>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Service Jobs</span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Parts Inventory</span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Warranty Tracking</span>
                </>
              )}
              {selectedRole === "INSTALLER_PROGRAM_MANAGER" && (
                <>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Product Lifecycle</span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Full History</span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Installer Program</span>
                </>
              )}
              {selectedRole === "DATA_ENTRY_OPERATOR" && (
                <>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Data Entry</span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Records</span>
                  <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">Warranty Data</span>
                </>
              )}
            </div>
          </div>

          {/* CTA Card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold mb-2">
                  {selectedRole === "FACTORY_ADMIN"
                    ? "Everything in One Place"
                    : selectedRole === "DEALER"
                    ? "Grow Your Business"
                    : selectedRole === "SUB_DEALER"
                    ? "Simple & Fast"
                    : selectedRole === "SERVICE_CENTER"
                    ? "Professional Tools"
                    : selectedRole === "INSTALLER_PROGRAM_MANAGER"
                    ? "Lifecycle & History"
                    : selectedRole === "DATA_ENTRY_OPERATOR"
                    ? "Accurate Data"
                    : "Get Started Today"}
                </h3>
                <p className="text-gray-200 text-sm">
                  {selectedRole === "FACTORY_ADMIN"
                    ? "Real-time insights and complete control"
                    : selectedRole === "DEALER"
                    ? "Scale your operations effortlessly"
                    : selectedRole === "SUB_DEALER"
                    ? "Designed for speed and simplicity"
                    : selectedRole === "SERVICE_CENTER"
                    ? "Trusted by service professionals"
                    : selectedRole === "INSTALLER_PROGRAM_MANAGER"
                    ? "Full product lifecycle at your fingertips"
                    : selectedRole === "DATA_ENTRY_OPERATOR"
                    ? "Keep records accurate and up to date"
                    : "Join thousands of satisfied users"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <div className="flex -space-x-2">
                <div className={`h-10 w-10 rounded-full ${config.accentColor} border-2 border-white/30`}></div>
                <div className={`h-10 w-10 rounded-full ${config.accentColor} border-2 border-white/30 opacity-80`}></div>
                <div className={`h-10 w-10 rounded-full ${config.accentColor} border-2 border-white/30 opacity-60`}></div>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">1,000+ Active Users</p>
                <p className="text-xs text-gray-300">Trusted by industry leaders</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
    </>
  );
};

export default Login;
