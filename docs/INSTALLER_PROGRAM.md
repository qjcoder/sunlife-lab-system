# Installer Program Portal

Documentation for the Installer Program module: installation verification, cash rewards (PKR), and points-based prizes for installers.

## Overview

- **Installers** submit installation details (name, location, contact, serial number(s), optional short video).
- **Serial numbers** must exist in the company stock database (registered units). Product type (Battery / Inverter / VFD) is read from the product model.
- **Cash rewards** are paid per verified installation (amounts configurable per type).
- **Points** are awarded per verified installation (1 point each). Points unlock **milestone prizes** (e.g. 10 → Mobile, 25 → Bike, 50 → Umrah, 100 → Car). Prizes and amounts can be changed anytime.
- The program runs within a **start and end date**; only submissions in that window are accepted.

## Roles

| Role | Description |
|------|-------------|
| **INSTALLER_PROGRAM_MANAGER** | Creates program dates, reward rules, points milestones, and installer accounts; verifies or rejects submissions; views leaderboard. |
| **INSTALLER** | Submits installations (name, location, contact, serial(s), optional video); views own submissions and stats. |

## Cash rewards (PKR)

Configurable per installation type:

| Type | Default (PKR) | Description |
|------|----------------|-------------|
| Single Battery | 5,000 | One battery serial |
| Single Inverter | 5,000 | One inverter serial |
| Single VFD | 5,000 | One VFD serial |
| Battery + Inverter | 12,000 | Two serials: one battery, one inverter |

Amounts are editable in **Installer Program → Reward Rules (PKR)**. Changes apply to newly verified submissions.

## Points and milestone prizes

- **1 point** per verified installation.
- **Milestone prizes** (examples): 10 points → Mobile Phone, 25 → Bike, 50 → Umrah Package, 100 → Car.
- Milestones are configurable in **Installer Program → Points Prizes** (add, edit, delete). Prizes can be changed anytime.

## Setup

### 1. Seed default reward rules and milestones (optional)

From the backend directory:

```bash
cd backend
npm run seed-installer-rewards
```

This creates/updates:

- Reward rules: SINGLE_BATTERY, SINGLE_INVERTER, SINGLE_VFD = 5,000 PKR; BATTERY_PLUS_INVERTER = 12,000 PKR.
- Milestones: 10 → Mobile Phone, 25 → Bike, 50 → Umrah Package, 100 → Car.

### 2. Create an active program

1. Log in as **Installer Program Manager**.
2. Go to **Installer Program** → **Program**.
3. Create a program: name, **start date**, **end date** (e.g. full year). Only one program is active at a time (current date must be between start and end).

### 3. Create installer accounts

1. As **Installer Program Manager**, open **Installer Program** → **Installers**.
2. Add installers: **Name**, **Username**, **Password** (min 6 characters). Installers use username + password to log in.

### 4. (Optional) Adjust rewards and milestones

- **Reward Rules (PKR):** Edit amounts and save; they apply to future verifications.
- **Points Prizes:** Add, edit, or remove milestones (points required and prize name).

## Flows

### Installer: submit an installation

1. Log in as **Installer**.
2. Go to **Submit Installation**.
3. If no active program is running, the form is disabled and a message is shown.
4. Fill: **Name**, **Location**, **Contact number**, **Serial number** (required). Optionally add a **second serial** for Battery + Inverter combo.
5. Optionally attach a short **video** (mp4/webm, max 50 MB).
6. Submit. Serials are validated against company stock; product type determines reward (single vs Battery+Inverter).

### Manager: verify or reject

1. Go to **Installer Program** → **Submissions**.
2. Open the **video** link if provided.
3. **Verify** to award 1 point and the cash amount (from current reward rule), or **Reject** with an optional reason.

### Leaderboard

- **Installer Program** → **Leaderboard** shows all installers with **total points**, **total cash (PKR)**, and **number of verified installations**, sorted by points then cash.

## API summary

Base path: `/api/installer-program`.

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/program/active` | — | Get current active program (no auth). |
| GET/POST | `/programs`, PUT `/programs/:id` | Manager | List, create, update programs. |
| GET | `/reward-rules`, POST `/reward-rules` | Manager | List, upsert reward rules (type + amountPkr). |
| GET/POST | `/milestones`, PUT/DELETE `/milestones/:id` | Manager | List, create, update, delete milestones. |
| GET/POST | `/installers` | Manager | List installers, create installer user. |
| GET | `/submissions` | Manager | List all submissions (optional ?status=, ?installerId=). |
| POST | `/submissions/:id/verify` | Manager | Mark submission verified (award point + cash). |
| POST | `/submissions/:id/reject` | Manager | Reject submission (optional body: rejectionReason). |
| GET | `/leaderboard` | Manager | Aggregated points and cash per installer. |
| POST | `/submit` | Installer / Manager | Submit installation (multipart: installerName, location, contactNumber, serialNumbers, optional video). |
| GET | `/my-submissions` | Installer / Manager | List current user’s submissions. |
| GET | `/my-stats` | Installer / Manager | Current user’s total points, total cash, count of verified. |

## Serial validation rules

- Each serial must exist in **InverterUnit** (company stock).
- Product type comes from **InverterModel.productType** (Battery, Inverter, or VFD).
- **One serial:** reward type = SINGLE_BATTERY, SINGLE_INVERTER, or SINGLE_VFD (5,000 PKR by default).
- **Two serials:** must be one Battery and one Inverter → BATTERY_PLUS_INVERTER (12,000 PKR by default).
- A serial cannot be used in more than one **verified** submission for the same program; duplicate **pending** submissions for the same serial are also blocked.

## File storage

- Installation videos are stored under `frontend/public/installer-videos/` and served at `/installer-videos/<filename>`.

## Related docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — System overview and data flow.
- [../README.md](../README.md) — Project setup and main features.
