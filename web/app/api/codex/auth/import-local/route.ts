import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

type LocalCodexAuth = {
  auth_mode?: string;
  tokens?: {
    access_token?: string;
    refresh_token?: string;
  };
};

function getJwtExpiryMs(token?: string): number | undefined {
  if (!token) return undefined;
  const parts = token.split(".");
  if (parts.length < 2) return undefined;

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

export async function POST() {
  try {
    const authPath = path.join(os.homedir(), ".codex", "auth.json");
    const raw = await fs.readFile(authPath, "utf8");
    const parsed = JSON.parse(raw) as LocalCodexAuth;

    if (parsed.auth_mode !== "chatgpt") {
      return NextResponse.json(
        { error: "Local Codex is not signed in with ChatGPT OAuth." },
        { status: 400 },
      );
    }

    const accessToken = parsed.tokens?.access_token;
    const refreshToken = parsed.tokens?.refresh_token;

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: "Local Codex auth tokens were not found." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      api_key: JSON.stringify({
        accessToken,
        refreshToken,
        expiresAt: getJwtExpiryMs(accessToken),
      }),
      base_url: "https://chatgpt.com/backend-api",
      model: "gpt-5.3-codex",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not import local Codex session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
