"use client";

import { useState } from "react";
import { Plus, X, ArrowRight, ArrowLeft, Mail, CheckCircle2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StepIndicator } from "@/components/step-indicator";
import { registerCoordinators } from "@/lib/actions/auth";
import {
  BSINDT_TRACKS,
  DEPARTMENTS,
  UNITS_BY_DEPARTMENT,
  buildUnitValue,
} from "@/lib/departments";

interface CoordinatorRegistrationProps {
  userType: "college_coordinator" | "unit_coordinator";
  title: string;
  description: string;
  department?: string;
}

interface RegistrationResult {
  email: string;
  success: boolean;
  error?: string;
  tempPassword?: string | null;
}

export function CoordinatorRegistration({ userType, title, description, department: fixedDepartment }: CoordinatorRegistrationProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [emails, setEmails] = useState<string[]>([""]);
  const [departments, setDepartments] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, string>>({});
  const [dietTracks, setDietTracks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<RegistrationResult[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const handleAddEmail = () => setEmails([...emails, ""]);
  const handleRemoveEmail = (index: number) => {
    const newEmails = [...emails];
    newEmails.splice(index, 1);
    setEmails(newEmails);
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (emails.some(e => !e || !e.includes("@"))) {
        setError("Please enter valid emails for all fields.");
        return;
      }
      setError("");
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!fixedDepartment && emails.some(e => !departments[e])) {
        setError("Please select departments for all coordinators.");
        return;
      }
      if (userType === "unit_coordinator" && emails.some(e => !units[e])) {
        setError("Please select units for all coordinators.");
        return;
      }
      if (
        userType === "unit_coordinator" &&
        emails.some((e) => {
          const selectedDepartment = fixedDepartment || departments[e];
          return (
            selectedDepartment === "DIET" &&
            units[e] === "BSINDT" &&
            !dietTracks[e]
          );
        })
      ) {
        setError("Please select BSINDT track for all BSINDT coordinators.");
        return;
      }
      setError("");
      setCurrentStep(3);
    } else if (currentStep === 3) {
      handleRegister();
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = emails.map(email => ({
        email,
        department: fixedDepartment || departments[email],
        unit:
          userType === "unit_coordinator"
            ? buildUnitValue(units[email], dietTracks[email])
            : undefined,
        userType
      }));

      const response = await registerCoordinators(payload);
      
      if (response && 'error' in response) {
        setError(response.error as string);
        return;
      }

      if (response && 'results' in response) {
        setResults(response.results as RegistrationResult[]);
        setCurrentStep(4);
      } else {
        setError("Invalid response from server");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to register coordinators");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const steps = ["Emails", "Details", "Preview", "Success"];

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) {
        // Reset state on close
        setCurrentStep(1);
        setEmails([""]);
        setDepartments({});
        setUnits({});
        setDietTracks({});
        setError("");
        setResults([]);
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 text-xs bg-[#159E44] hover:bg-[#128A3B] text-white">
          <Plus className="h-3 w-3 mr-1" />
          Add {title}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-sm font-semibold">Add {title}</DialogTitle>
          <DialogDescription className="text-[10px]">{description}</DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={currentStep} totalSteps={4} labels={steps} />

        <div className="py-2 space-y-4">
          {currentStep === 1 && (
            <div className="space-y-3">
              <Label className="text-[11px] font-semibold">Coordinator Emails</Label>
              {emails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <div className="relative flex-grow">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                    <Input
                      placeholder="email@cvsu.edu.ph"
                      value={email}
                      onChange={(e) => handleEmailChange(index, e.target.value)}
                      className="pl-8 h-9 text-[11px]"
                    />
                  </div>
                  {emails.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleRemoveEmail(index)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full h-8 text-[11px]" onClick={handleAddEmail}>
                <Plus className="h-3 w-3 mr-1" /> Add Another Email
              </Button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {emails.map((email) => (
                <div key={email} className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/5">
                  <p className="text-[11px] font-bold truncate">{email}</p>
                  
                  {!fixedDepartment && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold">Department</Label>
                      <select
                        value={departments[email] || ""}
                        onChange={(e) => {
                          setDepartments({ ...departments, [email]: e.target.value });
                          setUnits({ ...units, [email]: "" });
                          setDietTracks({ ...dietTracks, [email]: "" });
                        }}
                        className="flex h-8 w-full rounded-md border border-border/80 bg-background px-3 py-1 text-[11px] shadow-sm focus:outline-none"
                      >
                        <option value="" disabled>Select Department</option>
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {userType === "unit_coordinator" && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-semibold">Unit</Label>
                      <select
                        value={units[email] || ""}
                        onChange={(e) => {
                          setUnits({ ...units, [email]: e.target.value });
                          setDietTracks({ ...dietTracks, [email]: "" });
                        }}
                        className="flex h-8 w-full rounded-md border border-border/80 bg-background px-3 py-1 text-[11px] shadow-sm focus:outline-none"
                      >
                        <option value="" disabled>Select Unit</option>
                        {(UNITS_BY_DEPARTMENT[(fixedDepartment || departments[email]) as keyof typeof UNITS_BY_DEPARTMENT] || []).map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {userType === "unit_coordinator" &&
                    (fixedDepartment || departments[email]) === "DIET" &&
                    units[email] === "BSINDT" && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold">BSINDT Track</Label>
                        <select
                          value={dietTracks[email] || ""}
                          onChange={(e) =>
                            setDietTracks({ ...dietTracks, [email]: e.target.value })
                          }
                          className="flex h-8 w-full rounded-md border border-border/80 bg-background px-3 py-1 text-[11px] shadow-sm focus:outline-none"
                        >
                          <option value="" disabled>Select Track</option>
                          {BSINDT_TRACKS.map((track) => (
                            <option key={track} value={track}>
                              {track}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-[#159E44]/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6 text-[#159E44]" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold">Ready to register {emails.length} coordinators</p>
                <p className="text-[10px] text-muted-foreground px-4">
                  Temporary passwords will be generated and sent via email.
                </p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="text-center space-y-1 pb-2">
                <p className="text-[11px] font-semibold text-[#159E44]">Registration Successful</p>
                <div className="px-6">
                   <p className="text-[10px] text-muted-foreground">Share the temporary passwords below with each coordinator.</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {results.map((result, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border/50 bg-muted/10 space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold truncate flex-grow mr-2">{result.email}</p>
                      {result.success ? (
                         <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-bold uppercase">Created</span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold uppercase">Error</span>
                      )}
                    </div>
                    {result.success && result.tempPassword && (
                      <div className="bg-muted/30 border border-border rounded p-2 space-y-1">
                        <p className="text-[9px] text-muted-foreground font-semibold uppercase">Temporary Password</p>
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-[11px] font-mono text-foreground font-bold break-all">{result.tempPassword}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => copyToClipboard(result.tempPassword || "", result.email)}
                          >
                            {copied === result.email ? (
                              <Check className="h-3 w-3 text-[#159E44]" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    {!result.success && (
                      <p className="text-[10px] text-destructive">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Note: Copy each password and send it to the coordinator via email or messaging.
                </p>
              </div>
              <Button className="w-full h-9 text-[11px] font-bold bg-[#159E44] hover:bg-[#128A3B]" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          )}

          {error && <p className="text-[10px] text-destructive font-semibold">{error}</p>}
        </div>

        {currentStep < 4 && (
          <div className="flex justify-between mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] h-8"
              onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
              disabled={currentStep === 1 || loading}
            >
              <ArrowLeft className="h-3 w-3 mr-1" /> Back
            </Button>
            <Button
              size="sm"
              className="text-[11px] h-8 bg-[#159E44] hover:bg-[#128A3B] text-white"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? "Registering..." : currentStep === 3 ? "Register Now" : "Continue"}
              {!loading && currentStep < 3 && <ArrowRight className="h-3 w-3 ml-1" />}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
