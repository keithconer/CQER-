import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getBaseSecret() {
  const secret =
    process.env.COMMUNITY_CHAT_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!secret) {
    throw new Error("Missing community chat encryption secret.");
  }

  return secret;
}

function getKey() {
  return createHash("sha256")
    .update(`cqer-community-messenger:${getBaseSecret()}`)
    .digest();
}

export function encryptCommunityMessage(value: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptCommunityMessage(value: string | null) {
  if (!value) return "";

  const [ivB64, authTagB64, encryptedB64] = value.split(".");
  if (!ivB64 || !authTagB64 || !encryptedB64) {
    return "";
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedB64, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}
