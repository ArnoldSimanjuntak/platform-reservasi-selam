import crypto from "node:crypto";
import fs from "node:fs";
import webpush from "web-push";

const envPath = new URL("../.env.local", import.meta.url);
const current = fs.readFileSync(envPath, "utf8");
const generated = webpush.generateVAPIDKeys();

function replaceRequired(name, value, source) {
    const pattern = new RegExp(`^${name}=.*$`, "m");
    if (!pattern.test(source)) {
        throw new Error(`${name} tidak ditemukan pada .env.local`);
    }
    return source.replace(pattern, `${name}=${value}`);
}

let updated = replaceRequired(
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    generated.publicKey,
    current
);
updated = replaceRequired("VAPID_PRIVATE_KEY", generated.privateKey, updated);
fs.writeFileSync(envPath, updated, "utf8");

const fingerprint = crypto
    .createHash("sha256")
    .update(generated.publicKey)
    .digest("hex")
    .slice(0, 12);

console.log(
    JSON.stringify({
        rotated: true,
        publicKeyLength: generated.publicKey.length,
        privateKeyLength: generated.privateKey.length,
        publicKeyFingerprint: fingerprint,
    })
);
