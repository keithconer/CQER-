"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { StepIndicator } from "@/components/step-indicator";
import { getBaseURL } from "@/lib/utils";
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
  Eye,
  EyeOff,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Users,
} from "lucide-react";

const STEP_LABELS = ["Email", "Role", "Password", "Confirm"];
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

  const supabase = createClient();

  useEffect(() => {
    const step = searchParams.get("step");
    const emailParam = searchParams.get("email");
    if (step) setCurrentStep(parseInt(step));
    if (emailParam) setEmail(emailParam);
    
    // If we're coming from OAuth, we might already have a user but no profile
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        setEmail(user.email);
        // If we are on step 1 but have a user, we should move to step 2
        if (!step || step === "1") {
          setCurrentStep(2);
        }
      }
    };
    checkUser();
  }, [searchParams, supabase.auth]);

  const handleNextStep = () => {
    setError("");

    if (currentStep === 1) {
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
    }

    if (currentStep === 2) {
      if (!userType) {
        setError("Please select your role.");
        return;
      }
    }

    if (currentStep === 3) {
      // Step 3 is typically password. For OAuth, it might be optional, 
      // but according to user prompt "it will start on number 2 process up to 4",
      // we'll keep the password setup step.
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
      const emailParts = email.split("@")[0].split(".");
      let firstName = "";
      let lastName = "";
      
      if (emailParts.length >= 3) {
        firstName = emailParts[1].charAt(0).toUpperCase() + emailParts[1].slice(1);
        lastName = emailParts[2].charAt(0).toUpperCase() + emailParts[2].slice(1);
      }

      // Check if user is already authenticated (OAuth flow)
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // User exists (OAuth), just create/update the profile
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          user_type: userType,
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
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Move to confirmation step
      setCurrentStep(4);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="text-sm font-bold">
          Create an account
        </CardTitle>
        <CardDescription className="text-[10px] text-muted-foreground/90">
          Join CQER with your CvSU email
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <StepIndicator
          currentStep={currentStep}
          totalSteps={4}
          labels={STEP_LABELS}
        />

        {/* Step 1: Email */}
        {currentStep === 1 && (
          <div className="space-y-3">
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

        {/* Step 3: Password */}
        {currentStep === 3 && (
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

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
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
        {currentStep < 4 && (
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
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : currentStep === 3
                  ? "Create Account"
                  : "Continue"}
              {!loading && currentStep < 3 && (
                <ArrowRight className="h-3 w-3 ml-1" />
              )}
            </Button>
          </div>
        )}

        {/* Login link */}
        {currentStep < 4 && (
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
