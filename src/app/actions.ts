"use server";

import { encodedRedirect } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("full_name")?.toString() || "";
  const siteUrl = formData.get("site_url")?.toString();
  const supabase = await createClient();
  const origin = siteUrl || headers().get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        email: email,
      },
    },
  });

  console.log("After signUp", error);

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  }

  if (user) {
    try {
      const { error: updateError } = await supabase.from("users").insert({
        id: user.id,
        name: fullName,
        full_name: fullName,
        email: email,
        user_id: user.id,
        token_identifier: user.id,
        created_at: new Date().toISOString(),
      });

      if (updateError) {
        console.error("Error updating user profile:", updateError);
      }
    } catch (err) {
      console.error("Error in user profile creation:", err);
    }
  }

  return encodedRedirect(
    "success",
    "/sign-up",
    "Thanks for signing up! Please check your email for a verification link.",
  );
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/dashboard");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = headers().get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

export const uploadScreenshotAction = async (formData: FormData) => {
  try {
    // Create client for authentication check
    const supabase = await createClient();

    // Get the current session to ensure proper authentication context
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      console.error("Authentication error:", sessionError);
      return { success: false, error: "User not authenticated" };
    }

    const user = session.user;

    // Create service role client for database operations to bypass RLS
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const file = formData.get("file") as File;
    const project = formData.get("project") as string;
    const tagsString = formData.get("tags") as string;

    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    // Upload file to Supabase Storage using service client
    const { data: uploadData, error: uploadError } =
      await serviceSupabase.storage.from("screenshots").upload(fileName, file);

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = serviceSupabase.storage.from("screenshots").getPublicUrl(fileName);

    // Generate SHA256 hash
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256Hash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Get client IP and browser info from headers
    const headersList = headers();
    const ipAddress =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Parse tags
    const tags = tagsString
      ? tagsString
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    // Save metadata to database using service client (bypasses RLS)
    console.log("Inserting screenshot for user:", user.id);
    const { data: insertData, error: dbError } = await serviceSupabase
      .from("screenshots")
      .insert({
        user_id: user.id,
        filename: fileName,
        original_filename: file.name,
        file_size: file.size,
        file_type: file.type,
        file_url: publicUrl,
        sha256_hash: sha256Hash,
        ip_address: ipAddress,
        browser_info: userAgent,
        project: project || null,
        tags: tags,
        verification_status: "verified",
      })
      .select();

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Clean up uploaded file if database insert fails
      await serviceSupabase.storage.from("screenshots").remove([fileName]);
      return { success: false, error: `Database error: ${dbError.message}` };
    }

    console.log("Screenshot inserted successfully:", insertData);

    return { success: true };
  } catch (error) {
    console.error("Upload error:", error);
    return { success: false, error: "Upload failed" };
  }
};

export const generateShareableLinkAction = async (screenshotId: string) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Verify user owns the screenshot
    const { data: screenshot, error: screenshotError } = await supabase
      .from("screenshots")
      .select("id")
      .eq("id", screenshotId)
      .eq("user_id", user.id)
      .single();

    if (screenshotError || !screenshot) {
      return { success: false, error: "Screenshot not found" };
    }

    // Generate unique share token
    const shareToken = crypto.randomUUID();

    // Create shareable link record
    const { error: linkError } = await supabase.from("shareable_links").insert({
      screenshot_id: screenshotId,
      user_id: user.id,
      share_token: shareToken,
      expires_at: null, // No expiration for now
    });

    if (linkError) {
      return { success: false, error: linkError.message };
    }

    const origin = headers().get("origin") || "https://proofsnap.vercel.app";
    const shareUrl = `${origin}/share/${shareToken}`;

    return { success: true, shareUrl };
  } catch (error) {
    console.error("Share link generation error:", error);
    return { success: false, error: "Failed to generate share link" };
  }
};

export const generatePDFReportAction = async (screenshotId: string) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Get screenshot data
    const { data: screenshot, error: screenshotError } = await supabase
      .from("screenshots")
      .select("*")
      .eq("id", screenshotId)
      .eq("user_id", user.id)
      .single();

    if (screenshotError || !screenshot) {
      return { success: false, error: "Screenshot not found" };
    }

    // Return screenshot data for client-side PDF generation
    const pdfData = {
      screenshot,
      generatedAt: new Date().toISOString(),
      reportId: crypto.randomUUID(),
    };

    return { success: true, pdfData };
  } catch (error) {
    console.error("PDF generation error:", error);
    return { success: false, error: "Failed to generate PDF report" };
  }
};

export const deleteScreenshotAction = async (screenshotId: string) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    // Create service role client for database and storage operations
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Get screenshot data to verify ownership and get filename
    const { data: screenshot, error: screenshotError } = await supabase
      .from("screenshots")
      .select("id, filename, user_id")
      .eq("id", screenshotId)
      .eq("user_id", user.id)
      .single();

    if (screenshotError || !screenshot) {
      return { success: false, error: "Screenshot not found" };
    }

    // Delete from storage first
    const { error: storageError } = await serviceSupabase.storage
      .from("screenshots")
      .remove([screenshot.filename]);

    if (storageError) {
      console.error("Storage deletion error:", storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete shareable links associated with this screenshot
    await serviceSupabase
      .from("shareable_links")
      .delete()
      .eq("screenshot_id", screenshotId);

    // Delete from database
    const { error: dbError } = await serviceSupabase
      .from("screenshots")
      .delete()
      .eq("id", screenshotId)
      .eq("user_id", user.id);

    if (dbError) {
      console.error("Database deletion error:", dbError);
      return { success: false, error: "Failed to delete screenshot" };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete screenshot error:", error);
    return { success: false, error: "Failed to delete screenshot" };
  }
};
