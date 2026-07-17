import fs from "node:fs";
import { createECDH } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const raw = fs.readFileSync(".env.local", "utf8");
const env = {};

for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    env[line.slice(0, separator).trim()] = line
        .slice(separator + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");
}

const requiredVariables = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT",
];
const missingVariables = requiredVariables.filter((name) => !env[name]);

if (missingVariables.length > 0) {
    console.error(
        JSON.stringify({
            vapidConfigured: false,
            tableAvailable: false,
            missingVariables,
        })
    );
    process.exit(1);
}

try {
    webpush.setVapidDetails(
        env.VAPID_SUBJECT,
        env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        env.VAPID_PRIVATE_KEY
    );

    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(env.VAPID_PRIVATE_KEY, "base64url"));
    const derivedPublicKey = ecdh.getPublicKey();
    const configuredPublicKey = Buffer.from(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, "base64url");
    if (!derivedPublicKey.equals(configuredPublicKey)) {
        throw new Error("Public dan private VAPID key bukan satu pasangan.");
    }
} catch (error) {
    console.error(
        JSON.stringify({
            vapidConfigured: false,
            vapidKeyPairMatches: false,
            tableAvailable: false,
            error: error instanceof Error ? error.message : String(error),
        })
    );
    process.exit(1);
}

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

const { data, error, count } = await supabase
    .from("push_subscriptions")
    .select(
        "id, user_id, created_at, updated_at, expiration_time, last_success_at, last_failure_at",
        { count: "exact" }
    );

if (error) {
    console.error(
        JSON.stringify({
            vapidConfigured: true,
            vapidKeyPairMatches: true,
            tableAvailable: false,
            error: error.message,
        })
    );
    process.exit(1);
}

const rows = data ?? [];
const uniqueUsers = new Set(rows.map((row) => row.user_id));
const staleOver90Days = rows.filter(
    (row) => Date.now() - new Date(row.updated_at).getTime() > 90 * 24 * 60 * 60 * 1000
).length;

console.log(
    JSON.stringify({
        tableAvailable: true,
        vapidConfigured: true,
        vapidKeyPairMatches: true,
        subscriptions: count ?? rows.length,
        uniqueUsers: uniqueUsers.size,
        staleOver90Days,
    })
);
