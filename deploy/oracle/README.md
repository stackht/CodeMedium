# Deploy Code Medium on Oracle Cloud Always Free

Everything runs on **one always-free Oracle VM** (no cost, never sleeps):

- **nginx** serves the static frontend (`out/`)
- **Express backend** on `127.0.0.1:8080` (systemd service)
- **PostgreSQL** on the same VM

The frontend is built with `NEXT_PUBLIC_API_BASE_URL=/api`, so all API calls are
same-origin and nginx routes `/api/*` to the backend. No CORS, no extra ports.

---

## 1. Prerequisites

- An Oracle Cloud account (see step 2).
- Your repo pushed to GitHub **including the new `deploy/oracle/` files**.
  ```powershell
  git add deploy/oracle
  git commit -m "Add Oracle Always Free deployment scripts"
  git push
  ```
- (Optional but recommended) A domain name for HTTPS.

## 2. Create the Oracle account

1. Go to https://signup.cloud.oracle.com and sign up for a **Free** account.
2. It asks for a credit/debit card — this is **identity verification only**. Oracle
   may do a temporary ~$1 authorization hold that is refunded; you are never charged.
3. After signup, you land in the Oracle Cloud Console.

## 3. Create the VM (Compute → Instances → Create instance)

- **Name:** `codemedium`
- **Image:** Ubuntu 24.04 (current default)
- **Shape** (pick in order of preference):
  - `VM.Standard.A1.Flex` (Ampere ARM, **4 OCPU / 24GB**, always free) — best.
    If you get *"out of capacity"*, retry later or pick the fallback.
  - `VM.Standard.E2.1.Micro` (AMD, **1 OCPU / 1GB**, always free) — fine for low traffic.
  - Set A1.Flex to 4 OCPU / 24GB RAM; E2.1.Micro has no options.
- **Networking:** accept the default new VCN (private subnet + public subnet).
- **SSH keys:** upload a public key. Generate one first in PowerShell:
  ```powershell
  ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\codemedium
  ```
  Then upload `codemedium.pub` in the console (or paste its contents).
- Click **Create**.

Wait ~1 minute for the instance to reach *Running*. Copy its **public IP**.

## 4. Open ports 80 and 443 (firewall)

By default the VCN security list only allows SSH (22).

1. Console → Networking → Virtual Cloud Networks → your VCN → **Security Lists** → default list → **Add Ingress Rules**.
2. Add these two rules (both: source `0.0.0.0/0`, **TCP**):
   - Destination port **80**
   - Destination port **443**

**(Important)** Do NOT open port 8080 — the backend must only be reachable via nginx.

(Recommended) Reserve a permanent public IP: Networking → Reserved Public IPs →
Reserve → attach to the VM. Otherwise your IP can change on reboot.

## 5. Deploy everything

Connect over SSH from PowerShell:

```powershell
ssh -i $env:USERPROFILE\.ssh\codemedium ubuntu@<PUBLIC_IP>
```

On the VM, clone the repo (just to get the scripts), then run the setup:

```bash
git clone https://github.com/stackht/CodeMedium.git
cd CodeMedium
sudo bash deploy/oracle/setup.sh /home/ubuntu/CodeMedium
```

The script (idempotent, re-runnable) does everything:

- installs nginx, PostgreSQL, Node.js 22, git, build tools
- creates a 4G swap file (so `next build` succeeds on the 1GB micro)
- creates a `codemedium` database + role
- installs backend deps, runs `prisma generate` + `prisma migrate deploy`
- builds the frontend with `NEXT_PUBLIC_API_BASE_URL=/api` and copies it to `/var/www/codemedium`
- installs the nginx site and the `codemedium-backend` systemd service

Verify:

```bash
curl http://127.0.0.1:8080/health      # -> {"ok":true}
```

Open `http://<PUBLIC_IP>` in a browser. If the page loads, the deploy works.

## 6. Configure secrets

Edit `/opt/codemedium/backend/.env` and set real values:

- `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` (Gmail app password) **or** `BREVO_API_KEY`
- `ADMIN_USERNAME` / `ADMIN_PASSWORD`
- `JWT_SECRET` (already random, can keep)

Then:

```bash
sudo systemctl restart codemedium-backend
```

## 7. HTTPS (recommended)

1. In your DNS provider, point an **A record** (`@` and `www`) at the VM's public IP.
2. On the VM:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```
3. certbot edits the nginx config and sets up auto-renewal.

## 8. Updating the site

Commit and push to GitHub, then on the VM re-run the same command:

```bash
cd CodeMedium && git pull
sudo bash deploy/oracle/setup.sh /home/ubuntu/CodeMedium
```

It pulls the code, re-runs migrations, rebuilds the frontend, and restarts the backend.

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `curl http://127.0.0.1:8080/health` fails | `sudo systemctl status codemedium-backend`, `sudo journalctl -u codemedium-backend -n 50` |
| Port 80 not reachable | Security list ingress rule for TCP 80 missing (step 4) |
| `next build` crashes / OOM | Make sure `/swapfile` exists (`swapon --show`); retry |
| OTP emails don't send | Set real SMTP/Brevo values in `/opt/codemedium/backend/.env` and restart |
| A1.Flex "out of capacity" | Use `VM.Standard.E2.1.Micro`, or try a different region/availability domain |

## Cost

$0/month. Always-free resources used: one VM (A1.Flex 4 OCPU/24GB or E2.1.Micro),
1 reserved public IPv4, up to 200GB block storage, and local PostgreSQL.
