# srb1024.github.io

I'm Saurabh Upadhyay, a business analyst finishing an MSc in Business Analytics
at University College Cork, after three and a half years in software delivery at
Sage. This is my portfolio: four projects, each led by the question the brief got
wrong and the number that corrected it. Plain HTML, CSS and about 250 lines of
JavaScript. No framework, no build step, no tracking.

**Live:** [srb1024.github.io](https://srb1024.github.io)

## How it works

1. **Everything visual lives in `assets/css/site.css`.** Colours, spacing and
   shape are CSS variables at the top of the file. Change them there, nowhere else.

2. **The background is one fixed photograph.** The blues throughout are sampled
   from it, so swapping `assets/img/bg.jpg` means retuning the tokens to match.

3. **Click any chart to enlarge it.** It sizes from the file's own pixels and
   stops before it goes soft, so small exports stay small. Re-export bigger instead.