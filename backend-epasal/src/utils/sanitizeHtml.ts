import { FilterXSS } from 'xss';

// No tags allowed at all; strip disallowed tags' markup but keep their text
// content -- except script/style, whose bodies are discarded entirely (a
// user-supplied name of "<script>alert(1)</script>Alex" becomes "Alex", not
// "alert(1)Alex"). This is server-side input sanitization, defense-in-depth
// alongside React's default output escaping and the CSP headers in
// config/helmet.config.ts.
const filter = new FilterXSS({
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
});

/**
 * Strips HTML markup down to plain text -- e.g. "<b>hi</b>" -> "hi".
 * Applied via Mongoose schema `set:` transforms so it's guaranteed on every
 * write path, not just specific controllers.
 */
export function stripHtml(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return filter.process(value);
}
