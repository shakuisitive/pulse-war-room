"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { mfaVerifySchema } from "@/schemas/auth";

export type MfaActionState = {
  error?: string;
  success?: string;
  qrCode?: string;
  secret?: string;
  factorId?: string;
};

export async function enrollMfaAction(): Promise<MfaActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Pulse Authenticator",
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "Scan the QR code with your authenticator app.",
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    factorId: data.id,
  };
}

export async function verifyMfaEnrollmentAction(
  _prevState: MfaActionState,
  formData: FormData,
): Promise<MfaActionState> {
  const factorId = formData.get("factorId")?.toString();
  const parsed = mfaVerifySchema.safeParse({ code: formData.get("code") });

  if (!factorId || !parsed.success) {
    return { error: "Enter a valid 6-digit code." };
  }

  const supabase = await createClient();
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError) {
    return { error: challengeError.message };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: parsed.data.code,
  });

  if (verifyError) {
    return { error: verifyError.message };
  }

  redirect("/profile?mfa=enabled");
}

export async function verifyMfaLoginAction(
  _prevState: MfaActionState,
  formData: FormData,
): Promise<MfaActionState> {
  const parsed = mfaVerifySchema.safeParse({ code: formData.get("code") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid code" };
  }

  const supabase = await createClient();
  const { data: factors, error: factorsError } =
    await supabase.auth.mfa.listFactors();

  if (factorsError) {
    return { error: factorsError.message };
  }

  const totpFactor = factors.totp[0];

  if (!totpFactor) {
    return { error: "No MFA factor found. Set up MFA in your profile first." };
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

  if (challengeError) {
    return { error: challengeError.message };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: totpFactor.id,
    challengeId: challenge.id,
    code: parsed.data.code,
  });

  if (verifyError) {
    return { error: verifyError.message };
  }

  redirect("/dashboard");
}
