import { NextResponse } from 'next/server';
import { getBusiness, getBusinessById } from '@/lib/businesses';
import { SITE_CONFIG } from '@/lib/config/siteConfig';
/* Policy type based fetching removed — policies summarized from the business collection */
import { getProducts, getServices } from '@/lib/items';
import { getSettings } from '@/lib/settings';
import { getDeliveryProviders } from '@/lib/delivery';
import { getPromotions } from '@/lib/promotions';
import { PromotionStatus } from '@/types/promotion';
import { promises as fs } from 'fs';
import path from 'path';

declare global {
  // lightweight global for in-memory rate limiting in dev/small deployments
  var __aiRateLimit: Map<string, { count: number; first: number }> | undefined;
}

// Server-only endpoint to proxy AI support requests to Google Gemini
// Expects POST JSON: { message: string, topic?: string, businessId?: string }

const ALLOWED_TOPICS = ['ordering', 'booking', 'refund', 'cancellation', 'business', 'admin'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, topic = 'business' } = body || {};

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid message' }, { status: 400 });
    }

    // Basic redaction: strip emails and phone numbers to avoid accidental secret leakage
    const redact = (text: string) => {
      return text
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
        .replace(/(\+?\d[\d\s\-\(\)]{6,}\d)/g, '[REDACTED_PHONE]');
    };
    const sanitizedMessage = redact(message);

    // Lightweight in-memory rate limiter (per IP) - approximate, not suitable for horizontal scaling
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    const windowMs = 60_000; // 1 minute
    const maxRequests = 10; // per minute
    global.__aiRateLimit = global.__aiRateLimit || new Map();
    const rateMap: Map<string, { count: number; first: number }> = global.__aiRateLimit!;
    const entry = rateMap.get(ip) || { count: 0, first: now };
    if (now - entry.first > windowMs) {
      entry.count = 0;
      entry.first = now;
    }
    entry.count++;
    rateMap.set(ip, entry);
    if (entry.count > maxRequests) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    if (!ALLOWED_TOPICS.includes(topic)) {
      return NextResponse.json({ error: 'Invalid topic' }, { status: 400 });
    }

    // Use Google Generative Language API (Gemini/text-bison)
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

    // Build prompt with limited system instructions to keep responses helpful, safe, and explicit about uncertainty
    let systemPrompt = '';
    const formatGuidance = `Formatting rules: Output must be valid Markdown. Use ordered lists for step-by-step instructions (1., 2., 3.) and start numbering at 1; avoid using '*' as bullets or inline emphasis. Keep list numbering sequential. Prefer concise numbered steps for instructions. Use **bold** (double asterisks) to highlight important details or warnings. If you need to return structured data, include a compact JSON snippet such as {"summary":"...","steps":["..."]} (inline or inside a code block).

Uncertainty & safety requirements: If you are unsure or lack enough information to give a confident answer, explicitly state "I'm not sure" (or "I don't know") and provide the best next steps the user should take (what to check and who to contact). Do NOT fabricate facts or guesses; when uncertain, set confidence: "low" in the JSON metadata. Always refuse to request secrets, credentials, or to perform actions that require privileged access. Append a JSON code block at the end of your reply with keys: {"summary":"brief summary","confidence":"high|medium|low","sources":["optional source strings"]}. If there are no sources, set sources: [].`;
    if (topic === 'admin') {
      systemPrompt = `You are an AI assistant for the e-commerce admin panel. Help admins navigate the admin panel, manage orders, bookings, refunds, cancellations, promotions, and settings. Give concise step-by-step instructions and sample queries or commands when helpful. Do NOT perform any actions, only provide guidance. Do not request secrets or credentials. If you are unsure about something, explicitly say you are unsure and include suggested next steps and contact options for the admin team.\n\n${formatGuidance}`;
    } else {
      systemPrompt = `You are an AI assistant for an e-commerce store. Help users with ${topic} queries concisely, provide next steps, and link to relevant pages when helpful. Do NOT perform any action (like cancelling orders), only provide instructions and templates for messages to send to support. Do not request secrets or credentials. If you are unsure about something, explicitly say you are unsure and include suggested next steps and contact options for support.\n\n${formatGuidance}`;
    }

    // If GOOGLE_API_KEY is present, try Google's Generative Language API (Gemini/text-bison).
    // Some projects may need different endpoint variants or model names; try a few fallbacks before failing.
    if (GOOGLE_API_KEY) {
      const GOOGLE_GEMINI_MODEL = process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash';

      // Fetch business info (businessId optional). Use SITE_CONFIG defaults when needed.
      let businessObj = null;
      try {
        if (body?.businessId && typeof body.businessId === 'string') {
          businessObj = await getBusinessById(body.businessId).catch(() => null);
        }
        if (!businessObj) {
          businessObj = await getBusiness();
        }
      } catch (err) {
        console.warn('Business lookup error for AI context:', err);
        businessObj = null;
      }

      const businessName = businessObj?.name || SITE_CONFIG.defaultBusinessName || SITE_CONFIG.appTitle;
      const businessDescription = businessObj?.description || SITE_CONFIG.appDescription || '';
      const businessEmail = businessObj?.contactInfo?.email || SITE_CONFIG.defaultContactEmail || '';
      const businessPhone = businessObj?.contactInfo?.phone || SITE_CONFIG.defaultContactPhone || '';

      const policyParts: string[] = [];
      if (businessObj?.returnDuration) policyParts.push(`Return window: ${businessObj.returnDuration} days`);
      if (businessObj?.refundDuration) policyParts.push(`Refund processing: ${businessObj.refundDuration} days`);
      if (businessObj?.cancellationTime) policyParts.push(`Cancellation allowed up to ${businessObj.cancellationTime} hours before booking`);
      if (businessObj?.returnShippingPayer) policyParts.push(`Return shipping payer: ${businessObj.returnShippingPayer}`);

      const opening = (() => {
        try {
          const oh = businessObj?.openingHours;
          if (!oh) return 'Opening hours not specified.';
          if (oh.defaultHours) return `Default hours: ${oh.defaultHours.openTime} - ${oh.defaultHours.closeTime}`;
          const days = Object.entries(oh.days || {}).map(([d, v]) => {
            if (!v) return null;
            if (!v.isOpen) return `${d}: closed`;
            return `${d}: ${v.openTime || 'open'} - ${v.closeTime || 'close'}`;
          }).filter(Boolean).join('; ');
          return days || 'Opening hours not specified.';
        } catch {
          return 'Opening hours not specified.';
        }
      })();

      const businessSummary = `Business: ${businessName}. ${businessDescription ? 'Description: ' + businessDescription + '.' : ''} Contact: ${businessEmail || 'N/A'}${businessPhone ? ' / ' + businessPhone : ''}. ${policyParts.length ? policyParts.join('. ') + '.' : ''} ${opening} Website: ${SITE_CONFIG.appUrl || 'N/A'}`;

      // Build additional context: public pages for customers; admin guides & settings for admin topic only
      const stripHtml = (s: string) => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const stripMarkdown = (s: string) => {
        if (!s) return '';
        return s
          .replace(/```[\s\S]*?```/g, '') // code blocks
          .replace(/(^|\n)```[\s\S]*?```(\n|$)/g, '')
          .replace(/\!\[[^\]]*\]\([^)]*\)/g, '') // images
          .replace(/\[[^\]]+\]\([^)]*\)/g, '$1') // links -> text
          .replace(/[#>*_`~\-]{1,}/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };
      const truncate = (s: string, n = 600) => (s && s.length > n ? s.slice(0, n) + '…' : s || '');

      // Normalize AI output: convert bullets and various numbered formats into canonical ordered lists, support nested lists by indentation, and remove stray single asterisks
      const normalizeAiOutput = (text: string) => {
        if (!text) return text;
        const lines = text.split(/\r?\n/);

        type ListItem = { text: string; children?: ListNode[] };
        type ListNode = { indent: number; items: ListItem[] };

        const isListLine = (ln: string) => /^\s*([*\-•]|\d+[\.)])\s+/.test(ln);
        const parseListLine = (ln: string) => {
          const m = ln.match(/^(\s*)(?:[*\-•]|(\d+)[\.)])\s+(.*)$/);
          if (!m) return null;
          const indent = (m[1] || '').replace(/\t/g, '    ').length; // normalize tabs
          const text = (m[3] || '').trim();
          return { indent, text };
        };

        const roots: ListNode[] = [];

        for (let i = 0; i < lines.length; i++) {
          const ln = lines[i];
          if (isListLine(ln)) {
            const parsed = parseListLine(ln)!;
            // Find where this item belongs in the tree
            if (roots.length === 0) {
              // no lists yet
              roots.push({ indent: parsed.indent, items: [{ text: parsed.text }] });
            } else {
              // find deepest node with indent <= parsed.indent
              let placed = false;
              const stack: ListNode[] = [];

              // Build stack by walking nodes and their children down to deepest
              const walk = (nodeList: ListNode[]) => {
                for (let ni = nodeList.length - 1; ni >= 0; ni--) {
                  let node = nodeList[ni];
                  stack.push(node);
                  // find the deepest child chain
                  while (true) {
                    const lastItem = node.items[node.items.length - 1];
                    if (!lastItem || !lastItem.children || !lastItem.children.length) break;
                    const childNode = lastItem.children[lastItem.children.length - 1];
                    node = childNode;
                    stack.push(node);
                  }
                }
              };

              walk(roots);

              // find first stack entry where node.indent <= parsed.indent
              for (let s = stack.length - 1; s >= 0; s--) {
                const node = stack[s];
                if (parsed.indent > node.indent) {
                  // nested under the last item of this node
                  const lastItem = node.items[node.items.length - 1];
                  if (!lastItem) {
                    node.items.push({ text: parsed.text });
                  } else {
                    // create child node
                    const childNode: ListNode = { indent: parsed.indent, items: [{ text: parsed.text }] };
                    lastItem.children = lastItem.children || [];
                    lastItem.children.push(childNode);
                  }
                  placed = true;
                  break;
                }
                if (parsed.indent === node.indent) {
                  node.items.push({ text: parsed.text });
                  placed = true;
                  break;
                }
              }

              if (!placed) {
                // If not placed, create a sibling top-level list (indent may be smaller than all existing nodes)
                roots.push({ indent: parsed.indent, items: [{ text: parsed.text }] });
              }
            }
          } else {
            // non-list line: will be handled later when reconstructing output
          }
        }

        // Render output by iterating through original lines and replacing list blocks with rendered ordered markdown
        const rendered: string[] = [];
        let linePtr = 0;

        const renderNode = (node: ListNode, level = 0) => {
          for (let i = 0; i < node.items.length; i++) {
            const num = i + 1;
            const prefix = '  '.repeat(level);
            // collapse stray single-star emphasis on item text
            const cleaned = node.items[i].text.replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, '$1').replace(/\s*\*\s*/g, ' ').trim();
            rendered.push(`${prefix}${num}. ${cleaned}`);
            if (node.items[i].children) {
              for (const child of node.items[i].children!) {
                renderNode(child, level + 1);
              }
            }
          }
        };

        // Merge lists and non-list lines by stepping through original lines and consuming lists when encountered
        while (linePtr < lines.length) {
          const ln = lines[linePtr];
          if (isListLine(ln)) {
            // determine contiguous list block start/end in original lines
            const start = linePtr;
            let end = start;
            while (end < lines.length && isListLine(lines[end])) end++;
            // find the first parsed list node that corresponds to this block by matching some item text
            const blockText = lines.slice(start, end).map(l => l.replace(/^\s*(?:[*\-•]|\d+[\.)])\s+/, '').trim()).join('\n').slice(0, 200);
            let printed = false;
            for (const root of roots) {
              const candidate = root.items.map(it => it.text.substring(0, 200)).join('\n');
              if (blockText.startsWith(candidate) || candidate.startsWith(blockText) || blockText.includes(candidate)) {
                renderNode(root, 0);
                printed = true;
                break;
              }
            }
            if (!printed) {
              // Fallback: naive conversion of the contiguous lines into numbered list
              let counter = 1;
              for (let i = start; i < end; i++) {
                const parsed = parseListLine(lines[i]);
                if (!parsed) continue;
                const cleaned = parsed.text.replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, '$1').replace(/\s*\*\s*/g, ' ').trim();
                rendered.push(`${counter}. ${cleaned}`);
                counter++;
              }
            }
            linePtr = end;
            continue;
          }

          // non-list line - just clean stray single asterisks
          const cleanedLine = ln.replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, '$1').replace(/\s*\*\s*/g, ' ');
          rendered.push(cleanedLine);
          linePtr++;
        }

        // collapse multiple blank lines and trim
        return rendered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
      };

      // Minimal markdown -> simple HTML converter to help the UI render when it doesn't parse Markdown
      const markdownToHtml = (md: string) => {
        if (!md) return '';
        const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const renderInline = (s: string) => {
          const escaped = esc(s);
          // Bold: **text** -> <strong>text</strong>
          return escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        };
        const lines = md.split(/\r?\n/);
        let i = 0;
        let html = '';

        // Stack of open ordered lists indent levels (number of spaces)
        const olStack: number[] = [];
        const closeOlsTo = (target: number) => {
          while (olStack.length && olStack[olStack.length - 1] > target) {
            html += '</ol>';
            olStack.pop();
          }
        };

        while (i < lines.length) {
          const ln = lines[i];
          const m = ln.match(/^(\s*)(\d+)\.\s+(.*)/);
          if (m) {
            const indent = (m[1] || '').length;
            // open new nested <ol> if needed
            if (!olStack.length || indent > olStack[olStack.length - 1]) {
              html += '<ol>';
              olStack.push(indent);
            } else if (indent < olStack[olStack.length - 1]) {
              closeOlsTo(indent);
              if (!olStack.length || olStack[olStack.length - 1] !== indent) {
                html += '<ol>';
                olStack.push(indent);
              }
            }
            html += `<li>${renderInline(m[3])}</li>`;
            i++;
            continue;
          }
          // close any open lists
          closeOlsTo(-1);

          const hdr = ln.match(/^(#{1,6})\s+(.*)/);
          if (hdr) {
            const level = hdr[1].length;
            html += `<h${level}>${renderInline(hdr[2])}</h${level}>`;
            i++;
            continue;
          }
          if (ln.trim() === '') {
            html += '<p></p>';
            i++;
            continue;
          }
          html += `<p>${renderInline(ln)}</p>`;
          i++;
        }

        // close any remaining lists
        closeOlsTo(-1);
        return html;
      };



      const publicContextParts: string[] = [];
      const adminContextParts: string[] = [];

      try {
        // Policies (customer-facing): use policy-related fields stored on the business document
        if (policyParts.length) {
          publicContextParts.push(`Policies: ${policyParts.join(' | ')}`);
        }

        // About/Contact snippet
        const aboutSnippet = businessDescription || SITE_CONFIG.appDescription || '';
        if (aboutSnippet) publicContextParts.push(`AboutSnippet: ${truncate(stripMarkdown(stripHtml(aboutSnippet)), 500)}`);

        // Sample products/services (public-facing, non-user-specific)
        try {
          const prods = (await getProducts().catch(() => [])) || [];
          const servs = (await getServices().catch(() => [])) || [];
          const topProducts = prods.slice(0, 6).map(p => `${p.name} (${p.pricing?.currency || 'N/A'} ${p.pricing?.basePrice ?? 'n/a'}) - /products/${p.slug}`);
          const topServices = servs.slice(0, 6).map(s => `${s.name} (${s.pricing?.currency || 'N/A'} ${s.pricing?.basePrice ?? 'n/a'}) - /services/${s.slug}`);
          if (topProducts.length) publicContextParts.push(`ProductsSample: ${topProducts.join(' | ')}`);
          if (topServices.length) publicContextParts.push(`ServicesSample: ${topServices.join(' | ')}`);
        } catch (e) {
          console.warn('Error fetching items for AI context:', e);
        }

        // Include static customer AI guide (if present)
        try {
          const customerGuidePath = path.join(process.cwd(), 'markdown', 'CUSTOMER_AI_SUPPORT.md');
          const custData = await fs.readFile(customerGuidePath, 'utf8').catch(() => null);
          if (custData) {
            const clean = truncate(stripMarkdown(custData).replace(/\n+/g, ' '), 2000);
            publicContextParts.push(`CustomerGuide: ${clean}`);
          }
        } catch (e) {
          console.warn('Error reading customer guide:', e);
        }

        // If admin topic, add admin settings, promotions, delivery providers, and admin-guides (markdown files)
        if (topic === 'admin') {
          try {
            const settings = await getSettings().catch(() => null);
            if (settings) {
              const safeSettings: Record<string, unknown> = {
                storeType: settings.storeType,
                delivery: settings.delivery,
                payment: { methods: settings.payment?.methods, currency: settings.payment?.currency },
                performance: {
                  defaultPageSize: settings.performance?.defaultPageSize,
                  maxPageSize: settings.performance?.maxPageSize,
                  enableCache: settings.performance?.enableCache,
                },
                realtime: { enabled: settings.realtime?.enabled },
                documentCreation: { enableReviews: settings.documentCreation?.enableReviews },
              };
              adminContextParts.push(`Settings: ${JSON.stringify(safeSettings)}`);
            }
          } catch (e) {
            console.warn('Error fetching settings for AI context:', e);
          }

          try {
            const promos = await getPromotions({ status: PromotionStatus.ACTIVE, limit: 10 }).catch(() => []);
            if (promos && promos.length) {
              const promoList = promos.slice(0, 5).map(p => `${p.name} (${p.status})`);
              adminContextParts.push(`Promotions: ${promoList.join(' | ')}`);
            }
          } catch (e) {
            console.warn('Error fetching promotions:', e);
          }

          try {
            const providers = await getDeliveryProviders({ businessId: businessObj?.id, isActive: true, limit: 10 }).catch(() => []);
            if (providers && providers.length) {
              const provs = providers.map(p => `${p.name}${p.contactInfo?.phone ? ' ' + p.contactInfo.phone : ''}`).slice(0, 6);
              adminContextParts.push(`DeliveryProviders: ${provs.join(' | ')}`);
            }
          } catch (e) {
            console.warn('Error fetching delivery providers:', e);
          }

          // Read admin markdown guides from /markdown (files starting with ADMIN_ or containing 'admin' in name)
          // Include static admin AI guide (if present)
          try {
            const adminGuidePath = path.join(process.cwd(), 'markdown', 'ADMIN_AI_SUPPORT.md');
            const adminData = await fs.readFile(adminGuidePath, 'utf8').catch(() => null);
            if (adminData) {
              const clean = truncate(stripMarkdown(adminData).replace(/\n+/g, ' '), 2000);
              adminContextParts.push(`AdminGuide: ${clean}`);
            }
          } catch (e) {
            console.warn('Error reading admin guide:', e);
          }

          // Also read other admin-markdown files (fallback)
          try {
            const mdDir = path.join(process.cwd(), 'markdown');
            const files = (await fs.readdir(mdDir).catch(() => [])) as string[];
            const adminFiles = files.filter(f => /^ADMIN_/i.test(f) || /admin/i.test(f));
            const adminContents: string[] = [];
            for (const f of adminFiles.slice(0, 8)) {
              try {
                const fp = path.join(mdDir, f);
                const data = await fs.readFile(fp, 'utf8');
                const clean = truncate(stripMarkdown(data).replace(/\n+/g, ' '), 1500);
                adminContents.push(`${f}: ${clean}`);
              } catch {
                // ignore read errors per-file
              }
            }
            if (adminContents.length) adminContextParts.push(`AdminGuides: ${adminContents.join(' || ')}`);
          } catch (e) {
            console.warn('Error reading admin markdown guides:', e);
          }
        }
      } catch (e) {
        console.warn('Error building AI context:', e);
      }

      const publicContext = publicContextParts.join('\n');
      const adminContext = adminContextParts.join('\n');

      // Expand system prompt to include business context and usage guidance
      const promptText = `${systemPrompt}\n\nBusinessContext: ${businessSummary}\n\nPublicPagesContext:\n${publicContext}\n\nAdminContext:\n${adminContext}\n\nUser: ${sanitizedMessage}`;

      const requestBody = {
        contents: [
          {
            parts: [
              { text: promptText }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 600
        }
      };

      const tryUrls = [
        `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_GEMINI_MODEL}:generateContent`,
        `https://generativelanguage.googleapis.com/v1/models/${GOOGLE_GEMINI_MODEL}:generateContent`
      ];

      const maskUrl = (u: string) => u.replace(/(key=)[^&]+/, '$1[REDACTED]').replace(/(x-goog-api-key: )[^\s]+/i, '$1[REDACTED]');

      let lastError: { status?: number; body?: string; url?: string } | null = null;
      let gRes: Response | null = null;

      for (const url of tryUrls) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);

          gRes = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': GOOGLE_API_KEY
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (gRes.ok) {
            break; // success
          }

          const bodyText = await gRes.text();
          console.warn(`Google Generative Language API call failed (${gRes.status}) for ${maskUrl(url)}: ${bodyText}`);
          lastError = { status: gRes.status, body: bodyText, url: maskUrl(url) };

        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          console.warn(`Google Generative Language API request error for ${maskUrl(url)}:`, err);
          lastError = { body: err, url: maskUrl(url) };
        }
      }

      if (gRes && gRes.ok) {
        const gJson = await gRes.json();
        // Use the canonical response shape: candidates[].content.parts[].text
        const aiReply = (gJson?.candidates?.[0]?.content?.parts?.[0]?.text || '') as string;

        // Server-side safety check: if the model asks for secrets/credentials, refuse and respond with a safe refusal
        const secretPatterns = /password|api ?key|secret|private ?key|credentials|ssn|social ?security/i;
        if (secretPatterns.test(aiReply)) {
          const safeMessage = 'I cannot request or accept secrets, credentials, or private data. Please contact support directly via the admin panel or official channels.';
          const replyHtml = markdownToHtml(safeMessage);
          return NextResponse.json({ reply: safeMessage, html: replyHtml, confidence: 'low', sources: [], uncertain: true });
        }

        // Try extracting a trailing JSON metadata block such as ```json {"summary":"...","confidence":"low","sources":[]} ```
        const metadata: { summary?: string; confidence?: string; sources?: string[] } = {};
        // declare jsonText in outer scope so we can reference it after the try/catch
        let jsonText: string | null = null;
        try {
          const jsonBlockMatch = aiReply.match(/```(?:json)?\s*({[\s\S]*?})\s*```/i);
          const inlineJsonMatch = aiReply.match(/({\s*"summary"[\s\S]*?})/i);
          jsonText = (jsonBlockMatch && jsonBlockMatch[1]) || (inlineJsonMatch && inlineJsonMatch[1]) || null;
          if (jsonText) {
            try {
              const parsed = JSON.parse(jsonText);
              if (parsed && typeof parsed === 'object') {
                metadata.summary = String(parsed.summary || '');
                metadata.confidence = String(parsed.confidence || parsed.conf || 'unknown');
                metadata.sources = Array.isArray(parsed.sources) ? parsed.sources : (parsed.sources ? [String(parsed.sources)] : []);
              }
            } catch {
              // ignore JSON parse errors; metadata will remain empty
            }
          }
        } catch {
          // ignore
        }

        // Remove any JSON code block from the reply for display purposes (support both fenced JSON and inline JSON objects)
        let displayText = aiReply.replace(/```(?:json)?[\s\S]*?```/ig, '').trim();
        // If we detected an inline JSON metadata snippet earlier (jsonText), strip it as well to avoid sending raw JSON to clients
        if (jsonText) {
          try {
            displayText = displayText.replace(jsonText, '').trim();
          } catch {
            // ignore replace errors
          }
        }

        // If, after stripping metadata, there is no human-readable content, build a friendly fallback message
        let uncertain = (metadata.confidence && /low/i.test(String(metadata.confidence))) || /i'?m not sure|i do not know|i don't know|unsure|may be mistaken/i.test(aiReply);

        if (!displayText || displayText.trim().length === 0) {
          const summaryLine = metadata.summary ? `**Summary:** ${metadata.summary}` : "**I'm not sure** — I don't have enough information to provide a confident answer.";
          let fallback = `${summaryLine}\n\n1. **Try rephrasing the question** with more details (order number, date, or exact product/service).\n2. **Click \"Request human support\"** next to this message so an admin can review and follow up.\n3. **If urgent**, contact support directly via the listed channels (email or phone).`;

          // If admin topic and we have a configured developer contact, append a developer escalation suggestion
          if (topic === 'admin' && SITE_CONFIG.developerSupportEmail) {
            fallback += `\n4. **If this appears to be a bug or requires developer intervention, email developers at ${SITE_CONFIG.developerSupportEmail}** with steps to reproduce, logs, and screenshots.`;
          }

          // If confidence is explicitly high but no displayable content, still include the summary but mark uncertain=false
          if (metadata.confidence && /high/i.test(String(metadata.confidence))) {
            uncertain = false;
          } else {
            uncertain = true;
          }

          displayText = fallback;
          // Populate metadata.summary if empty so client can show a summary card if desired
          if (!metadata.summary && summaryLine) metadata.summary = metadata.summary || '';
        }

        // Normalize formatting (convert unordered bullets to ordered lists, remove stray asterisks)
        const cleanedReply = normalizeAiOutput(displayText);

        // If the reply contains multiple short lines but no numbered list, automatically add numbering
        let finalReply = cleanedReply;
        const hasNumberedList = /(^|\n)\s*\d+\./m.test(cleanedReply);
        if (!hasNumberedList) {
          const lines = cleanedReply.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !/^\s*[*`>-]/.test(l));
          // Heuristic: if there are 2-10 lines and each is reasonably short, treat as steps and number them
          if (lines.length >= 2 && lines.length <= 10 && lines.every(l => l.length < 240)) {
            finalReply = lines.map((l, i) => `${i + 1}. ${l}`).join('\n\n');
          }
        }

        // Provide a simple HTML fallback so the UI can render when it doesn't parse Markdown
        const replyHtml = markdownToHtml(finalReply);

        return NextResponse.json({ reply: finalReply, html: replyHtml, confidence: (metadata.confidence || 'unknown'), sources: (metadata.sources || []), uncertain: Boolean(uncertain) });
      }

      // Log detailed last error and return diagnostic (no fallback to other providers)
      console.error('Google Generative Language API all attempts failed:', lastError);
      return NextResponse.json({ error: 'AI service error: Generative Language API failed. Verify that the API is enabled for your project, credentials permit this request, and the configured model name is correct.' }, { status: 500 });
    }

    // No AI provider configured (Google required)
    return NextResponse.json({ error: 'AI not configured. Configure cloud credentials and enable the Generative Language API in your project.' }, { status: 500 });
  } catch (err) {
    console.error('AI support endpoint error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
