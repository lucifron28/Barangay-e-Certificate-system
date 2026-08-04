"use server";

import { redirect } from "next/navigation";
import { isSqliteProvider } from "@/lib/db/provider";
import { createProfile, profileExists } from "@/lib/db/sqlite/queries";
import {
  authenticateLocalUser,
  clearLocalSession,
  createLocalSession,
  hashPassword,
  hasLocalDemoSecret,
} from "@/lib/auth/sqlite-auth";
import { roleHome } from "@/lib/auth/roles";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { firstZodError, redirectWithError } from "@/lib/actions/helpers";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { clearRateLimit, consumeRateLimit } from "@/lib/security/rate-limit";

const LOGIN_PATH = "/login";
const REGISTER_PATH = "/register";

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    login: formData.get("login"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError(LOGIN_PATH, firstZodError(parsed.error));
  }

  if (isSqliteProvider()) {
    if (!hasLocalDemoSecret()) {
      redirectWithError(
        LOGIN_PATH,
        "Local demo security setup is incomplete. Set LOCAL_DEMO_SECRET and restart the app.",
      );
    }

    const rateLimit = await consumeRateLimit("login", parsed.data.login);
    if (!rateLimit.allowed) {
      redirectWithError(LOGIN_PATH, "Too many attempts. Please try again later.");
    }

    const profile = authenticateLocalUser(parsed.data.login, parsed.data.password);

    if (!profile) {
      redirectWithError(LOGIN_PATH, "Invalid username or password.");
    }

    await clearRateLimit("login", parsed.data.login);
    await createLocalSession(profile);
    redirect(roleHome(profile.role));
  }

  const supabase = await createClient();

  if (!supabase) {
    redirectWithError(LOGIN_PATH, "Supabase is not configured yet.");
  }

  let email = parsed.data.login.trim();

  if (!email.includes("@")) {
    const serviceRole = createServiceRoleClient();
    if (!serviceRole) {
      redirectWithError(
        LOGIN_PATH,
        "Username login requires the server service key. Please use email login for now.",
      );
    }

    const { data: profile } = await serviceRole
      .from("profiles")
      .select("email")
      .eq("username", email)
      .maybeSingle();

    if (!profile?.email) {
      redirectWithError(LOGIN_PATH, "Invalid username or password.");
    }

    email = profile.email;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    redirectWithError(LOGIN_PATH, "Invalid username or password.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    redirectWithError(LOGIN_PATH, "Unable to sign in. Please contact the administrator.");
  }

  redirect(roleHome(profile.role));
}

export async function registerResidentAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    full_name: formData.get("full_name"),
    age: formData.get("age"),
    address_sitio: formData.get("address_sitio"),
    date_of_birth: formData.get("date_of_birth"),
    civil_status: formData.get("civil_status"),
    contact_number: formData.get("contact_number"),
    gender: formData.get("gender"),
    occupation: formData.get("occupation"),
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    redirectWithError(REGISTER_PATH, firstZodError(parsed.error));
  }

  if (isSqliteProvider()) {
    if (!hasLocalDemoSecret()) {
      redirectWithError(
        REGISTER_PATH,
        "Local demo security setup is incomplete. Set LOCAL_DEMO_SECRET and restart the app.",
      );
    }

    const rateLimit = await consumeRateLimit("registration", parsed.data.email);
    if (!rateLimit.allowed) {
      redirectWithError(REGISTER_PATH, "Too many attempts. Please try again later.");
    }

    const username = parsed.data.username?.trim() || null;

    if (profileExists(parsed.data.email, username)) {
      redirectWithError(
        REGISTER_PATH,
        "Unable to create account. Please review your details and try again.",
      );
    }

    createProfile({
      address_sitio: parsed.data.address_sitio,
      age: parsed.data.age,
      civil_status: parsed.data.civil_status || null,
      contact_number: parsed.data.contact_number,
      date_of_birth: parsed.data.date_of_birth || null,
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      gender: parsed.data.gender || null,
      occupation: parsed.data.occupation || null,
      password_hash: hashPassword(parsed.data.password),
      role: "resident",
      username,
    });

    await clearRateLimit("registration", parsed.data.email);

    redirect(
      "/login?message=" +
        encodeURIComponent("Registration complete. Please log in to continue."),
    );
  }

  const supabase = await createClient();

  if (!supabase) {
    redirectWithError(REGISTER_PATH, "Supabase is not configured yet.");
  }

  const serviceRole = createServiceRoleClient();
  const username = parsed.data.username?.trim() || null;

  if (serviceRole && username) {
    const { data: existingUsername } = await serviceRole
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUsername) {
      redirectWithError(
        REGISTER_PATH,
        "Unable to create account. Please review your details and try again.",
      );
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        address_sitio: parsed.data.address_sitio,
        age: parsed.data.age,
        civil_status: parsed.data.civil_status ?? null,
        contact_number: parsed.data.contact_number,
        date_of_birth: parsed.data.date_of_birth || null,
        full_name: parsed.data.full_name,
        gender: parsed.data.gender ?? null,
        occupation: parsed.data.occupation ?? null,
        username,
      },
    },
  });

  if (error || !data.user) {
    redirectWithError(REGISTER_PATH, "Unable to register account. Please try again.");
  }

  if (serviceRole) {
    await serviceRole.from("profiles").upsert(
      {
        address_sitio: parsed.data.address_sitio,
        age: parsed.data.age,
        auth_user_id: data.user.id,
        civil_status: parsed.data.civil_status || null,
        contact_number: parsed.data.contact_number,
        date_of_birth: parsed.data.date_of_birth || null,
        email: parsed.data.email,
        full_name: parsed.data.full_name,
        gender: parsed.data.gender || null,
        occupation: parsed.data.occupation || null,
        role: "resident",
        username,
      },
      {
        onConflict: "auth_user_id",
      },
    );
  }

  redirect(
    "/login?message=" +
      encodeURIComponent("Registration submitted. Please log in to continue."),
  );
}

export async function logoutAction() {
  if (isSqliteProvider()) {
    await clearLocalSession();
    redirect("/login?message=" + encodeURIComponent("You have been logged out."));
  }

  const supabase = await createClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/login?message=" + encodeURIComponent("You have been logged out."));
}
