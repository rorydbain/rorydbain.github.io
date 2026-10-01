# Personal-site hosting

Vercel project: `rory-personal-site`, personal Hobby team `roryincidentios-projects`.

Jekyll builds `_site`. The asset-copy script places non-HTML output into `public` for CDN delivery. The Node page function bundles HTML and serves it in Frankfurt (`fra1`) with CDN HTML caching disabled, so every server-delivered public page can contribute to the counter. Browser cache restores may avoid the server. Successful production GET HTML requests only; failed requests and previews do not count.

The shared classification helper is mirrored from `../tiny-stats/shared/server-count.js`. The Production sensitive environment variable `STATS_SERVER_KEY` authenticates aggregate writes; never expose it in the page or source repository. Stats use the password-protected dashboard at https://stats.roryba.in/ (also available at https://photos.roryba.in/_stats/). No browser tracker or consent banner.

Vercel is connected to this GitHub repository. Master pushes deploy production; branches deploy previews without collection. Keep Jekyll generated directories and installed gems out of source uploads. `bundle exec jekyll build && node scripts/assets.mjs` reproduces the build.

## Domain cutover

Vercel already has both domains attached and redirects apex to https://www.roryba.in with 308. DNS remains at Hover. The cutover records were saved on 1 October 2026:

- `www` CNAME is `7ee6b0c9668ad1ba.vercel-dns-017.com` (previously `rorydbain.github.io`).
- Apex A records are `216.198.79.1` and `64.29.17.1`. Previous GitHub Pages values: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
- `stats` CNAME is `1c88472940d23f19.vercel-dns-017.com`.
- Mail, photos, other subdomains and nameservers were preserved; no apex AAAA record was present.

These recommendations were fetched from Vercel on 1 October 2026; verify current recommendations before a later cutover. Preserve all mail and unrelated subdomain records. Verify HTTPS, apex redirect, home/post/privacy/asset delivery and `x-site-region: fra1`, then confirm production counts.

Cutover verified on 1 October 2026: valid HTTPS on all three addresses, apex 308 redirect, home/post/privacy/CSS delivery, Frankfurt HTML execution, authenticated dashboard, and one ordinary test page load increasing the personal-site total by exactly one. GitHub Pages publishing source is now None; the repository remains connected to Vercel.

Rollback: re-enable GitHub Pages from master at the repository root and wait for its build, then restore the saved GitHub A/CNAME records. Do not point DNS to an unpublished Pages site. Vercel manages certificate renewal; initial certificate issuance used temporary DNS verification records.
