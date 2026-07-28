"use client";

import { useState, useCallback } from "react";
import { contactSchema, type ContactFormData } from "@/schemas/contact";

export type FormStatus = "idle" | "sending" | "success" | "error";

export interface UseContactFormReturn {
  values: ContactFormData;
  errors: Partial<Record<keyof ContactFormData, string>>;
  status: FormStatus;
  errorMessage: string;
  handleChange: (field: keyof ContactFormData, value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  reset: () => void;
}

const INITIAL_VALUES: ContactFormData = {
  firstName: "",
  lastName: "",
  email: "",
  message: "",
};

export function useContactForm(): UseContactFormReturn {
  const [values, setValues] = useState<ContactFormData>(INITIAL_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = useCallback((field: keyof ContactFormData, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field on change
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setValues(INITIAL_VALUES);
    setErrors({});
    setStatus("idle");
    setErrorMessage("");
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus("sending");
      setErrorMessage("");

      // Client-side validation
      const parsed = contactSchema.safeParse(values);
      if (!parsed.success) {
        const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as keyof ContactFormData | undefined;
          if (field && !fieldErrors[field]) {
            fieldErrors[field] = issue.message;
          }
        }
        setErrors(fieldErrors);
        setStatus("idle");
        return;
      }

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });

        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setErrorMessage(data.error || "Something went wrong. Please try again.");
          return;
        }

        setStatus("success");
        setValues(INITIAL_VALUES);
        setErrors({});
      } catch {
        setStatus("error");
        setErrorMessage("Network error. Please check your connection and try again.");
      }
    },
    [values]
  );

  return { values, errors, status, errorMessage, handleChange, handleSubmit, reset };
}
