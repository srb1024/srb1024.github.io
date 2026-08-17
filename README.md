# srb1024.github.io

Personal portfolio for Saurabh Upadhyay. Business analyst, Cork, Ireland.

Plain HTML, CSS and a few lines of JavaScript. No framework, no build step, no
tracking. Hosted on GitHub Pages at [srb1024.github.io](https://srb1024.github.io).

## Structure

```
srb1024.github.io/
├── index.html                  Home: hero, selected work, background, contact
├── 404.html                    Served by GitHub Pages for any missing route
├── Saurabh_Upadhyay_CV.pdf     The CV linked from the hero button (you add this)
├── robots.txt
├── sitemap.xml
├── .nojekyll                   Tells Pages to serve files as-is, skipping Jekyll
├── .gitignore
├── assets/
│   ├── css/site.css            All styling. Tokens at the top.
│   ├── js/site.js              Scroll reveal, hides optional images if missing
│   └── img/                    Portrait, screenshots, OG card. See img/README.md
└── projects/
    └── churn/index.html        Case study written up because the data cannot be shared
```

Paths are root-absolute (`/assets/css/site.css`), which is correct for a user
site served at the domain root. It also means opening `index.html` straight
from disk will not load the stylesheet. Preview with a local server instead
(see below).

## First publish

Do these in order. Nothing later works if step 1 is wrong.

1. **Create the repository.** On GitHub, new repository, name it exactly
   `srb1024.github.io`, public, no README (this one is coming). The name must
   match your username or Pages will not serve it at the root.

2. **Clone and copy.** Clone the empty repo, copy every file from this folder
   into it, including the dotfiles `.nojekyll` and `.gitignore`.

3. **Add the CV.** Drop the final PDF at the root as `Saurabh_Upadhyay_CV.pdf`.
   The hero button links to that exact filename.

4. **Add the portrait.** `assets/img/portrait.jpg`, specs in `assets/img/README.md`.
   The other images can wait.

5. **Preview locally.**
   ```
   python3 -m http.server 8000
   ```
   Open http://localhost:8000. Check the home page, `/projects/churn/`, and a
   nonsense URL to see the 404. Try it at phone width.

6. **Commit and push to `main`.**

7. **Turn on Pages.** Repository → Settings → Pages → Build and deployment →
   Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save.
   First deploy takes one to three minutes.

8. **Verify live.** Open https://srb1024.github.io in a private window. Click
   every external link. Confirm the CV downloads. Paste the URL into a LinkedIn
   post draft (do not publish) to see what the link preview looks like.

## Before it goes on the CV: checklist

- [ ] `Saurabh_Upadhyay_CV.pdf` at root and it is the final version
- [ ] `assets/img/portrait.jpg` present
- [ ] Supply chain entry in `index.html`: confirm your part on the project,
      then uncomment and edit the `entry__role` line. It is the only card
      without one and a reader will notice.
- [ ] Every external link opens: Streamlit app, GitHub repo, Figma prototype,
      LinkedIn, GitHub profile
- [ ] Streamlit app is awake. Community Cloud sleeps inactive apps. If it shows
      a wake screen, open it once so it is warm before you send the link anywhere.
- [ ] Footer "Last updated" and `sitemap.xml` `lastmod` match today
- [ ] Nothing in the repo contains a student ID number

## Distribute

Once live, put the URL in the places a recruiter actually looks:

- **CV header**, alongside LinkedIn and GitHub: `srb1024.github.io`
- **LinkedIn**: Contact info → Website, and pin it first in Featured
- **GitHub profile README** (repository named `srb1024`, file `README.md`):
  one line linking here
- **Email signature**, if you use one for applications

## Maintaining

**Text edits.** Open the file on GitHub, click the pencil, edit, commit. Pages
redeploys automatically. No local setup needed for a typo.

**Adding a project.** Copy an existing `<article class="entry">` block in
`index.html` and edit it. Keep the reframe (Asked / Found) and the role line;
they are the whole point of the format. Four projects on the front page is
plenty. Retire the weakest before adding a fifth.

**Adding a case study.** Copy `projects/churn/index.html` into a new folder,
add the URL to `sitemap.xml`, link it from the project card.

**Every time you change content:** update `Last updated` in both footers and
`lastmod` in `sitemap.xml`. A stale date reads as an abandoned site.

**When you land a role:** change the footer heading and the hero eyebrow, drop
the Stamp 1G line, and change the LinkedIn headline the same day.

## Design notes

Fonts: Bricolage Grotesque for display, Source Serif 4 for body, IBM Plex Mono
for labels and figures. Loaded from Google Fonts. If you ever want zero
third-party requests, download the WOFF2 files, put them in `assets/fonts/`,
and swap the `<link>` for `@font-face` rules at the top of `site.css`.

Colours are CSS custom properties at the top of `site.css`. Change them there
and nothing else.

The reveal animation and the hero underline both respect
`prefers-reduced-motion`.

## Licence

Content is © Saurabh Upadhyay. The site code (HTML, CSS, JS) may be reused
freely with attribution.
