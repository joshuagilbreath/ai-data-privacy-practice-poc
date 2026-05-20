# AI Data Privacy Practice POC

Static proof-of-concept for an AI Academy data privacy practice activity.

## Run Locally

Open `index.html` in a browser, or serve the folder with:

```powershell
python -m http.server 8777 --bind 127.0.0.1
```

Then visit:

```text
http://127.0.0.1:8777/index.html
```

## Publish With GitHub Pages

1. Create a new GitHub repository.
2. Push these files to the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `.nojekyll`
3. In GitHub, go to `Settings` -> `Pages`.
4. Under `Build and deployment`, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Save.

GitHub will provide a public URL like:

```text
https://your-org-or-username.github.io/your-repo-name/
```

That URL can be shared with a client as the hosted POC.

## Notes

This prototype has no server-side code and does not store learner responses anywhere. The LMS record preview is generated locally in the browser for demonstration purposes only.
