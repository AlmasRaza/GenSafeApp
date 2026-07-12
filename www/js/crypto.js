// crypto.js - سیکیورٹی اور انکرپشن کے فنکشنز

async function generateHash(account, pass, pin) {
    const data = new TextEncoder().encode(account + pass + pin);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function deriveAESKey(pass, pin) {
    const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass + pin), { name: "PBKDF2" }, false, ["deriveKey"]);
    return await crypto.subtle.deriveKey({ name: "PBKDF2", salt: new TextEncoder().encode("SecureSalt_786"), iterations: 100000, hash: "SHA-256" }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encryptData(jsonData, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, new TextEncoder().encode(jsonData));
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0); combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
}

async function decryptData(encryptedBase64, key) {
    try {
        const combinedStr = atob(encryptedBase64);
        const combined = new Uint8Array(combinedStr.length);
        for (let i = 0; i < combinedStr.length; i++) combined[i] = combinedStr.charCodeAt(i);
        const iv = combined.slice(0, 12); const data = combined.slice(12);
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
        return new TextDecoder().decode(decrypted);
    } catch (e) { return null; }
}
