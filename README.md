# Finance – Bookings

Implementation of the Finance → Bookings page: the ledger pills, the filter bar,
the three tabs, the approval workflow, and the booking timeline.

Built full-stack rather than as a static screen — the filtering, sorting,
pagination and permission checks all execute on the server, because that is
where they would have to live once the table is longer than one page.

---

## Running it

```bash
cp .env.example .env
npm install
npm run setup     # prisma generate + db push + seed
npm run dev       # http://localhost:3000/finance/bookings
```

Requires Node 18.18+. The database is SQLite and is created on the spot — no
Docker, no connection string to configure.

To reseed at any point: `npm run db:reset`.

---

## Stack, and why

| Choice | Reason |
| --- | --- |
| **Next.js 15 (App Router)** | The JD asks for Next.js + Node. Route handlers *are* the Node backend — they run server-side and hold all the business logic. A separate Express service would add CORS, a second process and a second deploy to ship one page. |
| **Prisma + SQLite** | The reviewer clones and runs, with zero infrastructure. Swapping to PostgreSQL is a two-line datasource change. |
| **zod** | One schema validates the query string and types it. Bad input is a 422, not a crash. |
| **Tailwind** | Fastest route to matching a Figma closely without inventing a design system. |

The backend is layered so it stays framework-agnostic:

```
app/api/**/route.ts       parse → validate → delegate → respond   (thin)
server/services/          business rules, permission decisions
server/repositories/      Prisma queries, where/orderBy building
server/validation/        zod schemas — the API contract
```

Nothing in `services/` imports from Next. If these ever need to move into a
standalone service, the files lift across unchanged.

---

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/bookings` | List. All filtering/sorting/pagination in SQL. |
| `GET` | `/api/bookings/summary` | Net / You Give / You Get. |
| `DELETE` | `/api/bookings/:id` | Soft delete → Deleted tab. |
| `POST` | `/api/bookings/:id/restore` | Restore. |
| `POST` | `/api/bookings/:id/duplicate` | Duplicate (starts a fresh approval cycle). |
| `POST` | `/api/bookings/:id/approval` | `{ action: approve \| reject \| resubmit }` |
| `GET` | `/api/owners` | Owner search for the multi-select. |
| `GET` | `/api/session` | Current user + whether the approval tab is visible. |

Query params: `tab`, `approvalState`, `bookingDateFrom/To`, `travelDateFrom/To`,
`owners`, `primaryOwners`, `secondaryOwners`, `bookingType`, `services`, `q`,
`includeIncomplete`, `sortBy`, `sortDir`, `page`, `perPage`.

```bash
curl 'localhost:3000/api/bookings?tab=approval&approvalState=PENDING&perPage=6'
```

---

## Decisions worth flagging

**The Net formula in the spec contradicts itself.** The spec states
`You Give - You Get = Net`, but the colour rule immediately below says Net is
green when You Get is greater — and the Figma shows `75,450 − 70,580 = 4,870`
in green. Two of the three sources agree, so this is implemented as
**Net = You Get − You Give**. Worth a confirmation.

**Tabs are queries, not a column.** An approved booking that required approval
appears in *both* Bookings and Waiting for Approval. Modelling `tab` as a stored
field would have made that impossible, so the tab is a `where` clause over one
table.

**Payment status is derived, never stored.** It is computed from the settled and
unsettled payment rows that the pills are summed from, so the badge and the
totals cannot drift apart.

**Money is integer minor units.** Never a float. Currency is per-booking rather
than a hardcoded `₹`, since the spec writes "<Default Currency Sign>".

**Permissions are resolved server-side.** Every row carries a `can` object
(`approve`, `edit`, `delete`, `restore`, `recordPayment`, `resubmit`) computed
against the caller. The UI renders the tick/cross from `row.can.approve` — it
never decides eligibility itself, so the buttons can't disagree with the API.

Try it: set `CURRENT_USER_ID` in `.env`, or send `x-user-id`.

| User | Sees |
| --- | --- |
| `u-yash` | ADMIN — approval tab, can approve everything |
| `u-ajay` | Approver for Harshit + Anjali only |
| `u-rohan` | Plain member — no approval tab at all |

```bash
curl -H 'x-user-id: u-rohan' localhost:3000/api/session
```

---

## Open questions

1. **Net formula** — as above. The strongest candidate for a spec typo.
2. **Do the pills summarise the workspace or the active tab?** They sit above
   the tab strip, so they currently reflect the filters but ignore which tab is
   open. Easy to flip.
3. **Tab order.** The spec lists Waiting for Approval second; the Figma shows it
   third. Followed the Figma.
4. **Rows per page.** The spec says default 10; the Figma shows 6. Defaulted to
   6, kept 10 in the dropdown.
5. **Vouchers on rejected bookings** are hidden per the spec — but the underlying
   documents still exist. Assumed hidden, not deleted.
6. **Cross-currency totals.** With mixed-currency bookings the pills need a rate
   source and a display currency. Out of scope here; the schema is ready for it.

---

## What's stubbed

Deliberately, and marked as such in the code:

- **Auth** — `server/auth.ts` resolves the caller from an env var/header. Every
  downstream function already takes an `actor`, so a real session swaps in here
  and nowhere else.
- **Edit / Record Payment / Upload / Merge / Link** — these open flows that the
  spec marks TBD or scopes to other screens. They fire a toast rather than
  shipping a half-built modal. The `BookingLink` table is modelled in the schema
  so the Link flow has somewhere to land.
- **Booking timeline hour placement** — bookings are placed by travel date; the
  hour slot is derived deterministically from the id, since the data model has
  no time-of-day field yet.

## Notes

- Keyboard accessible: every control is a real button with a label, focus rings
  are visible, dropdowns close on Escape and outside click.
- The search box is debounced (300ms) so typing doesn't fire a query per key.
- Changing any filter resets to page 1.
- Empty and error states both offer a way out rather than showing a blank table.
