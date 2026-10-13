# Audit artifacts

Mobile Lighthouse JSON/HTML reports from FE-10 are written here during local runs. Large generated files are gitignored (`*.json`, `*.html`); scores and findings are summarized in [`AUDIT.md`](../../AUDIT.md) at the repo root.

To regenerate baseline against production:

```bash
npx lighthouse https://ai-research-workspace-three.vercel.app/ --form-factor=mobile --output=json --output-path=docs/audit/baseline/home-scores.json
```
