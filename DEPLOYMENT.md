# Personal-site hosting

Vercel project: `rory-personal-site`, personal Hobby team `roryincidentios-projects`.

Jekyll builds `_site`. The asset-copy script places non-HTML output into `public` for CDN delivery. The Node page function bundles HTML and serves it in Frankfurt (`fra1`) with CDN HTML caching disabled, so every server-delivered public page can contribute to the counter. Browser cache restores may avoid the server. Successful production GET HTML requests only; failed requests and previews do not count.

The shared classification helper is mirrored from `../tiny-stats/shared/server-count.js`. The Production sensitive environment variable `STATS_SERVER_KEY` authenticates aggregate writes; never expose it in the page or source repository. Stats use the existing password-protected dashboard at https://photos.roryba.in/_stats/. No browser tracker or consent banner.

Vercel is connected to this GitHub repository. Master pushes deploy production; branches deploy previews without collection. Keep Jekyll generated directories and installed gems out of source uploads. `bundle exec jekyll build && node scripts/assets.mjs` reproduces the build.

## Domain cutover

Vercel already has both domains attached and redirects apex to https://www.roryba.in with 308. DNS remains at Hover. Before changing records, save their existing values for rollback:

- `www` CNAME currently `rorydbain.github.io`; replace with `7ee6b0c9668ad1ba.vercel-dns-017.com`.
- Apex currently has four GitHub Pages A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; replace with Vercel’s recommended `216.198.79.1` and `64.29.17.1`.

These recommendations were fetched from Vercel on 1 October 2026; verify current recommendations before a later cutover. Preserve all mail and unrelated subdomain records. Verify HTTPS, apex redirect, home/post/privacy/asset delivery and `x-site-region: fra1`, then confirm production counts.

Keep GitHub Pages available for rollback until DNS cutover is verified. Reverting the saved A/CNAME records returns traffic to it. If any AAAA record points to GitHub Pages, it must also be addressed at cutover so IPv6 traffic does not bypass Vercel.
