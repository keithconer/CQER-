"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StepIndicator } from "@/components/step-indicator";
import { getBaseURL } from "@/lib/utils";
import {
  BSINDT_TRACKS,
  BS_INDUSTRIAL_TECHNOLOGY,
  DEPARTMENT_OF_INDUSTRIAL_ENGINEERING_AND_TECHNOLOGY,
  buildUnitValue,
  getDepartmentNames,
  getUnitsByDepartment,
  isIndustrialEngineeringAndTechnologyDepartment,
} from "@/lib/departments";
import { useDepartmentDirectory } from "@/lib/use-department-directory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  EyeOff,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Users,
} from "lucide-react";

const STEP_LABELS = ["Email", "Role", "Department", "Password", "Confirm"];
const EMAIL_REGEX = /^main\.[a-zA-Z]+\.[a-zA-Z]+@cvsu\.edu\.ph$/;

function validatePassword(password: string) {
  const errors: string[] = [];
  if (password.length < 6) errors.push("At least 6 characters");
  if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    errors.push("One special character");
  return errors;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [department, setDepartment] = useState("");
  const [unit, setUnit] = useState("");
  const [dietTrack, setDietTrack] = useState("");
  const [googleVerified, setGoogleVerified] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const { directory } = useDepartmentDirectory();
  const departmentOptions = getDepartmentNames(directory);
  const unitOptions = getUnitsByDepartment(department, directory);

  const supabase = createClient();

  useEffect(() => {
    const step = searchParams.get("step");
    const emailParam = searchParams.get("email");
    if (step) setCurrentStep(parseInt(step));
    if (emailParam) setEmail(emailParam);
    
    // If we're coming from OAuth, we might already have a user but no profile
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const isGoogle =
        user.app_metadata?.provider === "google" ||
        (user.identities || []).some((identity) => identity.provider === "google");
      if (!isGoogle) {
        await supabase.auth.signOut();
        setError("Please verify your account using Google Sign-in.");
        return;
      }
      if (user.email) {
        setEmail(user.email);
        setGoogleEmail(user.email);
        setGoogleVerified(true);
        // If we are on step 1 but have a user, we should move to step 2
        if (!step || step === "1") {
          setCurrentStep(2);
        }
      }
    };
    checkUser();
  }, [searchParams, supabase.auth]);

  const handleGoogleVerify = async () => {
    setError("");
    setOauthLoading(true);
    const redirectBase =
      typeof window !== "undefined" ? window.location.origin : "";

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${redirectBase}/auth/callback?next=${encodeURIComponent("/register?step=2")}`,
        queryParams: {
          hd: "cvsu.edu.ph",
          prompt: "select_account",
        },
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setOauthLoading(false);
    }
  };

  const handleNextStep = () => {
    setError("");

    if (currentStep === 1) {
      if (!googleVerified) {
        setError("Please verify your CvSU Google account to continue.");
        return;
      }
      if (!email) {
        setError("Please enter your CvSU email.");
        return;
      }
      if (!EMAIL_REGEX.test(email)) {
        setError(
          "Please enter a valid CvSU email (main.firstname.lastname@cvsu.edu.ph)"
        );
        return;
      }
      if (googleEmail && email.toLowerCase() !== googleEmail.toLowerCase()) {
        setError("Use the same email as your verified Google account.");
        return;
      }
    }

    if (currentStep === 2) {
      if (!userType) {
        setError("Please select your role.");
        return;
      }
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      if (!department) {
        setError("Please select your department.");
        return;
      }
      if (userType === "unit_coordinator" && !unit) {
        setError("Please select your unit.");
        return;
      }
      if (
        userType === "unit_coordinator" &&
        isIndustrialEngineeringAndTechnologyDepartment(department) &&
        unit === BS_INDUSTRIAL_TECHNOLOGY &&
        !dietTrack
      ) {
        setError("Please select BS Industrial Technology major.");
        return;
      }

      // If user is already authenticated (e.g., from Google or forced redirect), 
      // they don't need Step 4 (Password). Go straight to handleRegister.
      const checkQuickSubmit = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          handleRegister();
          return;
        }
        setCurrentStep(4);
      };
      checkQuickSubmit();
      return;
    }

    if (currentStep === 4) {
      const passwordErrors = validatePassword(password);
      if (passwordErrors.length > 0) {
        setError(passwordErrors.join(", "));
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      // Submit registration
      handleRegister();
      return;
    }

    setCurrentStep((prev) => prev + 1);
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");

    try {
      // Extract first name and last name from email
      // Format: main.firstname.lastname@cvsu.edu.ph
      const emailNamePart = email.split("@")[0]; // main.firstname.lastname
      const parts = emailNamePart.split(".");
      
      let firstName = "";
      let lastName = "";
      
      if (parts.length >= 3) {
        // parts[0] is "main", parts[1] is firstname, parts[2] is lastname
        firstName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        lastName = parts[2].charAt(0).toUpperCase() + parts[2].slice(1);
      } else if (parts.length === 2) {
        firstName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      }

      const finalUnitValue =
        userType === "unit_coordinator"
          ? buildUnitValue(unit, dietTrack)
          : null;

      // Check if user is already authenticated (OAuth flow)
      const { data: { user } } = await supabase.auth.getUser();
      const isGoogle =
        user?.app_metadata?.provider === "google" ||
        (user?.identities || []).some((identity) => identity.provider === "google");

      if (!isGoogle) {
        setError("Google verification is required before registration.");
        setLoading(false);
        return;
      }

      if (user) {
        // User exists (OAuth), just create/update the profile
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          user_type: userType,
          department: department,
          unit: finalUnitValue,
        });

        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }

        // IMPORTANT: Sync metadata to Auth for role consistency
        await supabase.auth.updateUser({
          data: {
            first_name: firstName,
            last_name: lastName,
            user_type: userType,
            department: department,
            unit: finalUnitValue,
          },
        });

        // Redirect to dashboard as they are already confirmed
        router.push("/dashboard");
        router.refresh();
        return;
      }

      // Traditional sign up flow
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getBaseURL()}/auth/callback`,
          data: {
            first_name: firstName,
            last_name: lastName,
            user_type: userType,
            department: department,
            unit: finalUnitValue,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Move to confirmation step
      setCurrentStep(5);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3 pt-5 px-6">
        <CardTitle className="text-base font-bold">
          Create an account
        </CardTitle>
        <CardDescription className="text-[10px] text-muted-foreground/90">
          Join CQER with your CvSU email
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <StepIndicator
          currentStep={currentStep}
          totalSteps={5}
          labels={STEP_LABELS}
        />

        {/* Step 1: Email */}
        {currentStep === 1 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-foreground/90">
                Verify with Google
              </p>
              <p className="text-[10px] text-muted-foreground">
                Registration requires a valid CvSU Google Workspace account.
              </p>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2">
                <p className="text-[10px] text-amber-800">
                  Non-existent emails cannot be verified. Use your real CvSU Google account.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[11px] h-8"
                onClick={handleGoogleVerify}
                disabled={oauthLoading}
              >
                {oauthLoading ? "Verifying..." : "Verify with Google"}
              </Button>
              {googleVerified && (
                <p className="text-[10px] text-[#159E44] font-medium">
                  Google account verified.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-semibold text-foreground/90 ml-0.5">
                CvSU Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="main.firstname.lastname@cvsu.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  className="pl-8 h-9 text-[11px] bg-muted/10 border-border/80 placeholder:text-[11px] placeholder:text-muted-foreground/70"
                  disabled={googleVerified}
                />
              </div>
              <p className="text-[10px] text-muted-foreground/70 ml-0.5">
                Format: main.firstname.lastname@cvsu.edu.ph
              </p>
            </div>
          </div>
        )}

        {/* Step 2: User Type */}
        {currentStep === 2 && (
          <div className="space-y-3">
            <Label className="text-[11px] font-semibold text-foreground/90 ml-0.5">Select your role</Label>
            <RadioGroup
              value={userType}
              onValueChange={setUserType}
              className="grid gap-2"
            >
              <Label
                htmlFor="college_coordinator"
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-[#159E44] has-[:checked]:bg-[#159E44]/5 [&:has(:checked)]:border-[#159E44] [&:has(:checked)]:bg-[#159E44]/5"
              >
                <RadioGroupItem
                  value="college_coordinator"
                  id="college_coordinator"
                  className="data-[state=checked]:border-[#159E44] data-[state=checked]:text-[#159E44]"
                />
                <Building2 className="h-3.5 w-3.5 text-muted-foreground/60" />
                <div>
                  <p className="text-[11px] font-semibold">College Coordinator</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Manage and create projects for the college
                  </p>
                </div>
              </Label>
              <Label
                htmlFor="unit_coordinator"
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-[#159E44] has-[:checked]:bg-[#159E44]/5 [&:has(:checked)]:border-[#159E44] [&:has(:checked)]:bg-[#159E44]/5"
              >
                <RadioGroupItem
                  value="unit_coordinator"
                  id="unit_coordinator"
                  className="data-[state=checked]:border-[#159E44] data-[state=checked]:text-[#159E44]"
                />
                <Users className="h-3.5 w-3.5 text-muted-foreground/60" />
                <div>
                  <p className="text-[11px] font-semibold">Unit Coordinator</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Coordinate activities within your unit
                  </p>
                </div>
              </Label>
            </RadioGroup>
          </div>
        )}

        {/* Step 3: Department and Unit */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="department" className="text-[11px] font-semibold text-foreground/90 ml-0.5">
                Department
              </Label>
              <Select
                value={department}
                onValueChange={(value) => {
                  setDepartment(value);
                  setUnit("");
                  setDietTrack("");
                }}
              >
                <SelectTrigger id="department" className="h-9 text-[11px]">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((dept) => (
                    <SelectItem key={dept} value={dept} className="text-[11px]">
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {userType === "unit_coordinator" && department && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label htmlFor="unit" className="text-[11px] font-semibold text-foreground/90 ml-0.5">
                  Unit
                </Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger id="unit" className="h-9 text-[11px]">
                    <SelectValue placeholder="Select Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-[11px]">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {userType === "unit_coordinator" &&
              department === DEPARTMENT_OF_INDUSTRIAL_ENGINEERING_AND_TECHNOLOGY &&
              unit === BS_INDUSTRIAL_TECHNOLOGY && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label htmlFor="diet-track" className="text-[11px] font-semibold text-foreground/90 ml-0.5">
                  BS Industrial Technology Major
                </Label>
                <Select value={dietTrack} onValueChange={setDietTrack}>
                  <SelectTrigger id="diet-track" className="h-9 text-[11px]">
                    <SelectValue placeholder="Select Major" />
                  </SelectTrigger>
                  <SelectContent>
                    {BSINDT_TRACKS.map((track) => (
                      <SelectItem key={track} value={track} className="text-[11px]">
                        {track}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Password */}
        {currentStep === 4 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] font-semibold text-foreground/90 ml-0.5">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-8 h-9 text-[11px] bg-muted/10 border-border/80 placeholder:text-[11px] placeholder:text-muted-foreground/70"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {[
                  { label: "6+ characters", test: password.length >= 6 },
                  { label: "Uppercase", test: /[A-Z]/.test(password) },
                  { label: "Lowercase", test: /[a-z]/.test(password) },
                  {
                    label: "Special char",
                    test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
                      password
                    ),
                  },
                ].map((req) => (
                  <p
                    key={req.label}
                    className={`text-[10px] flex items-center gap-1 ${
                      req.test
                        ? "text-[#159E44]"
                        : "text-muted-foreground"
                    }`}
                  >
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {req.label}
                  </p>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-[11px] font-semibold text-foreground/90 ml-0.5"
              >
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-8 h-9 text-[11px] bg-muted/10 border-border/80 placeholder:text-[11px] placeholder:text-muted-foreground/70"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-destructive">
                  Passwords do not match
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {currentStep === 5 && (
          <div className="flex flex-col items-center text-center py-4 space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#159E44]/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-[#159E44]" />
            </div>
            <div>
              <p className="text-sm font-medium">Check your email</p>
              <p className="text-xs text-muted-foreground mt-1">
                We sent a verification link to
              </p>
              <p className="text-xs font-medium mt-0.5">{email}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Click the link in your email to verify your account and get
              started.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-[11px] h-8 mt-2"
              onClick={() => router.push("/login")}
            >
              Back to login
            </Button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-[11px] text-destructive mt-2">{error}</p>
        )}

        {/* Navigation buttons */}
        {currentStep < 5 && (
          <div className="flex items-center justify-between mt-4">
            {currentStep > 1 ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setError("");
                  setCurrentStep((prev) => prev - 1);
                }}
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back
              </Button>
            ) : (
              <div />
            )}
            <Button
              size="sm"
              className="text-[11px] h-8 bg-[#159E44] hover:bg-[#128A3B] text-white"
              onClick={handleNextStep}
              disabled={loading || oauthLoading}
            >
              {loading
                ? "Creating..."
                : currentStep === 4
                  ? "Create Account"
                  : "Continue"}
              {!loading && currentStep < 4 && (
                <ArrowRight className="h-3 w-3 ml-1" />
              )}
            </Button>
          </div>
        )}

        {/* Login link */}
        {currentStep < 5 && (
          <p className="text-center text-[11px] text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#159E44] hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8 text-xs text-muted-foreground">Loading registration...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
