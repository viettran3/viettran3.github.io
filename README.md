# Viet Tran: personal site

This is the public website at **https://viettran3.github.io**.

It's plain static HTML, CSS and a little JavaScript (no framework). The pages here are the
*built output*: they're generated from Viet's content and published here automatically, so
editing these files by hand will be overwritten by the next publish.

- **Pages:** Home, Resume (web + PDF), Projects (one case study each), Photos, Music, Ask my assistant
- **⌘K / Ctrl+K:** command menu to jump anywhere
- **~ :** terminal mode (`help`, `whoami`, `ls projects`, `open <project>`, `exit`)
- **Ask my assistant:** answers questions about Viet from his own resume and projects (it runs in your
  browser), and lets you request a 30-minute call
- **Booking a call:** handled by a small helper on `viethtran.sites.tab.bot`, which this site calls behind the scenes

## How updates get here
Viet edits the site in his private editor. Each publish rebuilds the pages and pushes this repo,
and GitHub Pages redeploys within a minute or two. A copy of the same site also lives at
https://viethtran.sites.tab.bot.

`.nojekyll` tells GitHub Pages to serve the files exactly as they are.
