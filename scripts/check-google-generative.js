/*
  Local diagnostic script for Google Generative Language API (Gemini/text-bison).
  - Run locally with your GOOGLE_API_KEY in env (do NOT commit it).
  - It will try a few endpoint variants and print masked results (it will NOT print your key).

  Usage:
    set GOOGLE_API_KEY=your_key_here
    node scripts/check-google-generative.js

  Or on PowerShell:
    $env:GOOGLE_API_KEY="your_key_here"; node scripts/check-google-generative.js
*/

const model = process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash';
const key = process.env.GOOGLE_API_KEY;

if (!key) {
  console.error('No GOOGLE_API_KEY found in environment. Set your API key and run again.');
  process.exit(1);
}

const tryUrls = [
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,
];

const maskUrl = (u) => u.replace(/(key=)[^&]+/, '$1[REDACTED]');

const requestBody = {
  contents: [ { parts: [ { text: 'Diagnostic check: Hello' } ] } ],
  generationConfig: { maxOutputTokens: 200 }
};

(async () => {
for (const url of tryUrls) {
        console.log('Trying', maskUrl(url));
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      console.log('Status:', res.status);
      const text = await res.text();
      const preview = text.length > 1000 ? text.slice(0, 1000) + '...[truncated]' : text;
      console.log('Body preview:', preview);

      if (res.ok) {
        console.log('Success on', maskUrl(url));
        process.exit(0);
      }

    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      console.warn('Request error:', err);
    }

    console.log('---');
  }

  console.error('All endpoints failed. Check model name, API key validity, API enablement, and key restrictions (IP/referrer).');
  process.exit(2);
})();