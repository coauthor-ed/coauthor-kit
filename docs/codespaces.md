# Work in the browser (GitHub Codespaces)

Nothing to install. Needs a free GitHub account and a browser.

## First time
1. Sign in at github.com.
2. Open the template link you were given. Click "Use this template", then "Create a new repository".
3. Name it (for example my-physics-course), keep it Private, click "Create repository".
4. In your new repository click the green "Code" button, tab "Codespaces", then "Create codespace on main".
5. Wait 2 to 4 minutes. A VS Code page opens in the browser. Do not close the tab.
6. A second tab opens with the dashboard. If your browser blocked it, open the "Ports" tab at the bottom of VS Code and click the globe next to "Dashboard (open this)".
7. If asked, click "Open" or "Continue" to allow the forwarded port.
8. In the dashboard, pick your course, then press the "Next step" button.
9. Press "Copy prompt" next to the step it shows. Paste it into the Claude chat in the left side panel. Press Enter.
10. When the agent is done, press "Show" again for the next step. Open a lesson from the dashboard to preview it.

The dashboard fills in the pairing code for you, so Approve and Note work at once.

Your owner creates the course (the "bundle") before your first session. You do not need to do that step yet.

## Coming back later
1. Go to github.com/codespaces.
2. Click your codespace. The dashboard starts again by itself.

## Stop to save free hours
Free accounts get a fixed number of hours per month. A running codespace uses them even when idle.
1. Go to github.com/codespaces.
2. Click the three dots next to your codespace, then "Stop codespace".
3. It also stops by itself after 30 minutes idle. Your files are kept.
4. Commit your work first: left bar, "Source Control", type a message, "Commit", then "Sync Changes".

## If something fails
- Dashboard tab is blank: Terminal tab, run `bash .devcontainer/post-start.sh`, then reload.
- Lesson preview is blank: ask the owner to check `.devcontainer/engine-repo.txt`.
- Log: /tmp/coauthor-logs/dashboard.log.

Safety: never set port 9050 to Public in the Ports tab. Private keeps the dashboard and its pairing code behind your GitHub login.
