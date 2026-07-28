"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/i18n/context";
import { useContactForm, type FormStatus } from "@/hooks/useContactForm";
import type { ContactFormData } from "@/schemas/contact";

/* ─── Animation Variants ─── */

const formContainer = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const, staggerChildren: 0.08 },
  },
};

const fieldVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const messageVariant = {
  initial: { opacity: 0, y: -10, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" as const } },
  exit: { opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.25 } },
};

/* ─── Spinner ─── */

function Spinner() {
  return (
    <motion.svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity={0.25} strokeWidth={3} />
      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </motion.svg>
  );
}

/* ─── Check Icon ─── */

function CheckIcon() {
  return (
    <motion.svg
      className="w-12 h-12 text-emerald-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <motion.circle cx="12" cy="12" r="10" strokeOpacity={0.3} />
      <motion.path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12.5l2.5 2.5 5.5-5.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      />
    </motion.svg>
  );
}

/* ─── Field Config ─── */

interface FieldConfig {
  key: keyof ContactFormData;
  labelKey: string;
  placeholderKey: string;
  type?: "text" | "email" | "textarea";
}

const FIELDS: FieldConfig[] = [
  { key: "firstName", labelKey: "label_first", placeholderKey: "placeholder_first" },
  { key: "lastName", labelKey: "label_last", placeholderKey: "placeholder_last" },
  { key: "email", labelKey: "label_email", placeholderKey: "placeholder_email", type: "email" },
  { key: "message", labelKey: "label_message", placeholderKey: "placeholder_message", type: "textarea" },
];

/* ─── Contact Form Component ─── */

export function ContactForm() {
  const { t } = useI18n();
  const { values, errors, status, errorMessage, handleChange, handleSubmit, reset } = useContactForm();
  const sending = status === "sending";

  const charCount = values.message.length;

  return (
    <motion.div
      variants={formContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className="w-full"
    >
      <AnimatePresence mode="wait">
        {status === "success" ? (
          /* ─── Success State ─── */
          <motion.div
            key="success"
            variants={messageVariant}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center py-12 sm:py-16"
            role="status"
            aria-live="polite"
          >
            <motion.div
              className="mx-auto mb-6 w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            >
              <CheckIcon />
            </motion.div>
            <motion.h3
              className="text-xl sm:text-2xl font-bold text-white mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {t("landing.contact.form.success_title")}
            </motion.h3>
            <motion.p
              className="text-sm text-gray-400 mb-8 max-w-sm mx-auto"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {t("landing.contact.form.success_message")}
            </motion.p>
            <motion.button
              onClick={reset}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t("landing.contact.form.send_another")}
            </motion.button>
          </motion.div>
        ) : (
          /* ─── Form ─── */
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            noValidate
            variants={formContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
            className="space-y-5"
            aria-label={t("landing.contact.form.aria_label")}
          >
            {/* Name fields — side by side on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField config={FIELDS[0]} value={values.firstName} error={errors.firstName} t={t} onChange={handleChange} disabled={sending} />
              <FormField config={FIELDS[1]} value={values.lastName} error={errors.lastName} t={t} onChange={handleChange} disabled={sending} />
            </div>

            <FormField config={FIELDS[2]} value={values.email} error={errors.email} t={t} onChange={handleChange} disabled={sending} />

            {/* Message textarea */}
            <motion.div variants={fieldVariant}>
              <label
                htmlFor="contact-message"
                className="block text-sm font-medium text-gray-300 mb-1.5 text-start"
              >
                {t(`landing.contact.form.${FIELDS[3].labelKey}`)}
                <span className="text-red-400 ms-0.5" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  maxLength={2000}
                  disabled={sending}
                  value={values.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                  placeholder={t(`landing.contact.form.${FIELDS[3].placeholderKey}`)}
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? "contact-message-error" : "contact-message-count"}
                  className={`w-full px-4 py-3 text-sm text-white text-start bg-gray-900/50 border rounded-xl resize-none transition-all duration-200 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 placeholder:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.message ? "border-red-500/50" : "border-gray-800"
                  }`}
                />
                <span
                  id="contact-message-count"
                  className="absolute bottom-2 end-3 text-[10px] text-gray-600 font-mono"
                  aria-live="polite"
                >
                  {charCount}/2000
                </span>
              </div>
              {errors.message && (
                <motion.p
                  id="contact-message-error"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs text-red-400"
                  role="alert"
                >
                  {errors.message}
                </motion.p>
              )}
            </motion.div>

            {/* Error banner */}
            <AnimatePresence>
              {status === "error" && errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                  role="alert"
                >
                  <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-xs text-red-400">{errorMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.div variants={fieldVariant}>
              <motion.button
                type="submit"
                disabled={sending}
                whileHover={!sending ? { scale: 1.01 } : undefined}
                whileTap={!sending ? { scale: 0.98 } : undefined}
                className={`relative w-full flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                  sending
                    ? "bg-emerald-600/70 text-white/80 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                }`}
                aria-busy={sending}
                aria-live="polite"
              >
                <AnimatePresence mode="wait">
                  {sending ? (
                    <motion.span
                      key="sending"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Spinner />
                      {t("landing.contact.form.sending")}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      {t("landing.contact.form.submit")}
                      <svg className="w-4 h-4 rtl:-scale-x-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Form Field (reusable for text/email inputs) ─── */

function FormField({
  config,
  value,
  error,
  t,
  onChange,
  disabled,
}: {
  config: FieldConfig;
  value: string;
  error: string | undefined;
  t: (key: string) => string;
  onChange: (field: keyof ContactFormData, value: string) => void;
  disabled: boolean;
}) {
  const inputId = `contact-${config.key}`;
  const errorId = `${inputId}-error`;

  return (
    <motion.div variants={fieldVariant}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-300 mb-1.5 text-start"
      >
        {t(`landing.contact.form.${config.labelKey}`)}
        <span className="text-red-400 ms-0.5" aria-hidden="true">*</span>
      </label>
      <input
        id={inputId}
        name={config.key}
        type={config.type ?? "text"}
        required
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(config.key, e.target.value)}
        placeholder={t(`landing.contact.form.${config.placeholderKey}`)}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`w-full px-4 py-2.5 text-sm text-white text-start bg-gray-900/50 border rounded-xl transition-all duration-200 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 placeholder:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? "border-red-500/50" : "border-gray-800"
        }`}
      />
      <AnimatePresence>
        {error && (
          <motion.p
            id={errorId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1.5 text-xs text-red-400"
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
