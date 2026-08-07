# Samuday Setu — Strategy, Legal Guardrails & Launch Plan

**Version:** 1.0 · **Date:** 6 August 2026
**Decisions locked in:** Multi-tenant SaaS sold to leaders across parties · Build community base first, politics later · Start in UP / Bihar

---

## 0. The one-paragraph version

You are **not** building a political app. You are building **party-neutral community infrastructure** — a "Samaj OS" that any organisation (samaj, trust, RWA, business association, party unit) can run on. The political power is a **second-order effect** of owning a verified, hierarchy-mapped, booth-tagged member base. That effect is enormous and completely legal *if* you build it in the right order. Your deck already says this. Your verbal pitch drifts away from it. **Stay on the deck.**

> Read Section 1 before you write a single line of code. Three things in your current idea carry criminal liability, not just business risk.

---

## 1. Three things that will kill this — fix them first

### 1.1 🔴 Aadhaar collection — do not do this. Ever.

**What you said:** "we will be taking the aadhar of the user, from there we can get the address and know the Vidhan Sabha."

**Why this is a hard stop:**

- Under the **Aadhaar Act 2016**, a private company cannot collect or store Aadhaar numbers unless it is a UIDAI-authorised requesting entity for a permitted purpose. A community/political app is not one.
- **Section 38** — unauthorised acts carry **imprisonment up to 3 years and fine of not less than ₹10 lakh**.
- **Section 29** restricts sharing of identity information. **Section 40** penalises using collected information for a purpose other than the one disclosed.
- Layer on the **DPDP Rules 2025** (notified 13 Nov 2025, full compliance due **13 May 2027**): penalties up to **₹250 crore per violation category**, and they stack.
- Storing lakhs of Aadhaar numbers alongside **caste + political affiliation** is the single most attractive breach target in India. One leak ends the company and lands directors in court.

**The killer practical argument (forget the law for a second):**

> **Aadhaar gives you the WRONG answer anyway.** Aadhaar address is often a permanent/ancestral address. Constituency is determined by **where the person is enrolled on the electoral roll**, not where Aadhaar says they live. A migrant worker from Gorakhpur living in Noida votes in Gorakhpur. Aadhaar will mislead you on exactly the people you care about most.

**✅ Five legal ways to get Vidhan Sabha + booth — all more accurate than Aadhaar:**

| # | Method | Accuracy | Effort | Notes |
|---|---|---|---|---|
| 1 | **Ask directly** — dropdown: State → Zila → Vidhan Sabha | ~85% | Trivial | Do this on day 1. Most people know their VS. |
| 2 | **EPIC number (Voter ID)**, self-entered | ~99% | Low | The 3-letter prefix of an EPIC maps to the AC/functional unit. Best single field you can ask for. |
| 3 | **Booth self-selection** — "Which school/building do you vote at?" | ~95% | Low | People remember their polling station even when they forget the AC name. |
| 4 | **PIN code + locality → AC mapping table** | ~75% | Medium | Build the table once. Good fallback, imperfect (PIN ≠ AC boundaries). |
| 5 | **Consented GPS at registration** → point-in-polygon on AC boundary shapefiles | ~90% | Medium | Public boundary data exists. Only with explicit consent, only at signup. |

**Recommended stack:** Method 1 as mandatory → Method 2 as optional-but-incentivised ("verify to unlock matrimony/verified badge") → Method 3 as confirmation → Method 4/5 as silent fallback.

**Verification without Aadhaar numbers:**

- **Phone OTP** — your primary identity anchor. Cheap, universal, legal.
- **DigiLocker consent-based fetch** — user-initiated, gives you a *verified name and address* without you ever storing an Aadhaar number. If you use this, store the **derived attributes only**, never the number or the XML.
- **Social verification** — two existing verified members vouch for a new member. This is the strongest trust signal in samaj context and costs you nothing.

**Rule to put in your engineering handbook:**
> *No Aadhaar number, no Aadhaar image, no Aadhaar XML, no biometric ever enters our database, logs, S3, backups, or support tickets. Reject at the input layer, not the storage layer.*

---

### 1.2 🟠 The "MLM" framing — you are one design decision away from a criminal offence

**The line is very simple:**

| ✅ Legal | ❌ Illegal (Prize Chits & Money Circulation Schemes (Banning) Act 1978, s.3) |
|---|---|
| Leader pays **you** a subscription for software | Member pays to join, and that money flows **up** the chain as commission |
| Earnings come from a **real product/service** | Earnings come from **recruitment** |
| Members join **free** | Members pay an entry/registration fee to be enrolled under someone |
| Hierarchy gives **status, badges, rank, responsibility** | Hierarchy gives **payouts per head recruited** |

- Punishment under s.3: **up to 3 years imprisonment + fine**. Promoting, conducting, *enrolling in*, or participating are all offences.
- **Consumer Protection (Direct Selling) Rules, 2021** also prohibit charging entry/registration fees to participants.

**Your model is fine as described** — you sell a leader tier to a politician for money. That is B2B SaaS, no different from selling CRM. **The moment a leader can earn money by signing up sub-leaders who also pay, you have built a pyramid scheme.**

**✅ Design the hierarchy to reward with status, not cash:**

- Ranks: *Sadasya → Panna Pramukh → Booth Pramukh → Mandal Pramukh → Vidhan Sabha Pramukh → Zila Adhyaksh → Prant Pramukh*
- Rewards: verified badge, leaderboard position, profile prominence, event stage access, "Samaj Ratna" annual awards, priority in matrimony/business listings.
- **Status is a far stronger motivator than money in samaj politics.** People spend lakhs to be on a stage. Sell the stage, not a commission.
- If you ever want cash incentives: pay a **flat referral bonus, one level deep only, capped, funded by you** — not by member fees. That is marketing spend, not a circulation scheme.

**Also drop the word "MLM" from every document, pitch, deck and internal chat.** Investors, Google Play reviewers, journalists and regulators pattern-match on it. Use **"Sangathan structure"** or **"organisational hierarchy."**

---

### 1.3 🟠 Hard caste-locked membership — soften the gate, keep the identity

**What you said:** "Gupta's leader will only be able to add Gupta in his hierarchy."

**What's genuinely fine:**

- Caste/samaj associations are legal, ancient and everywhere in India — Agrawal Sabha, Gupta Samaj, Maheshwari Mandal, Jat Mahasabha. Digitising them is a legitimate, large business.
- Self-declared community identity as a **profile attribute** is normal and expected. Matrimony platforms have done exactly this for 25 years.

**Where the risk sits:**

- **Hard-coded exclusion in software** ("this app rejects you because of your caste") reads very differently from a private samaj sabha's membership rules. It is a **PR and platform risk** more than a criminal one — but it is a serious one.
- **Google Play / Apple** policies restrict apps that discriminate on protected characteristics including caste. A takedown at scale would be terminal.
- **IT Rules 2021, Rule 3(1)(b)** obliges you to prevent content promoting enmity on grounds of caste. A caste-locked network with unmoderated chat is exactly where this goes wrong.
- **At election time**, `Section 123(3), Representation of the People Act 1951` makes an appeal for votes on grounds of caste, religion, race, community or language a **corrupt practice** — grounds to void an election. The Supreme Court in **Abhiram Singh v. C.D. Commachen (2017)** read this broadly: the appeal is a corrupt practice whether it invokes the *candidate's* caste **or the voter's**. Your leader-clients can lose their seats over campaign messaging your platform sent.

**✅ The reframe — same outcome, no exposure:**

- Communities are **open to join, curated by the admin.** Anyone can request; the leader approves. Exactly how a real samaj sabha works.
- `primary_samaj` is a **self-declared, optional, editable** profile field — never a system-enforced gate.
- Membership rules are set by the **community admin as their own bye-laws** and displayed transparently ("This community serves the Gupta Samaj of Purvanchal"). You provide the tool; they set the rules. This is the RWA / alumni-network model, and it is defensible.
- A person can belong to **multiple communities** — samaj + RWA + alumni + trade body. This is also what makes your graph valuable.
- **Hard-block at the messaging layer:** no template, broadcast or campaign tool may compose a message that asks for a vote on the basis of caste or religion. Build this as a lint rule in the broadcast composer. It protects your clients and it protects you.

---

### 1.4 🟡 The risk you didn't ask about: selling to rival parties at the same time

You said you'll sell to a BJP Gupta leader **and** an AAP Vaish leader simultaneously. Commercially smart — it's how Salesforce sells to Coke and Pepsi. But:

- **The day a BJP leader discovers you also host AAP voter data, you lose both.** In Indian politics this is not a hypothetical.
- A single shared-database bug that leaks one tenant's member list to another is **company-ending**, not a P1 bug.

**✅ What this forces on your architecture from day 1:**

- **Hard multi-tenancy** — tenant ID on every row, row-level security enforced at the database, never at the application layer alone. No cross-tenant query is ever possible, including for admins.
- **Position as neutral infrastructure**, publicly and consistently: "We are the rails. We don't do politics." Publish this. It's your only defensible answer when asked.
- **Contractual data isolation** — each tenant is the *Data Fiduciary* for their members under DPDP; you are the *Data Processor*. Put this in writing. It moves the primary compliance burden to them and is also legally accurate.
- **Never build a cross-tenant analytics product.** The temptation will be huge ("we can see all of UP!"). It is the one thing that converts your business into a scandal.

---

## 2. The reframe — what you're actually selling

> **Samuday Setu is Salesforce + LinkedIn + WhatsApp for Indian community organisations.**
> (Your deck already says this. It's right. Don't let the political use-case rewrite the positioning.)

**Six pillars — build in this order:**

| # | Pillar | Why it exists | Political value later |
|---|---|---|---|
| 1 | **Verified member directory** | The one thing every samaj wants and none has | The base map |
| 2 | **Sangathan hierarchy** | Leaders love org charts; it's how status is made visible | Booth-level command structure |
| 3 | **Events & Sammelan** | Samaj life is events. Digitise registration, passes, photos | Rally logistics, crowd mobilisation |
| 4 | **Seva / Sahayata** | Scholarships, medical help, disaster relief, grievances | **Issue heatmap — your crown jewel** |
| 5 | **Vyapar network** | Gupta/Vaish = trading communities. B2B directory has real money | Funding, and the reason members stay |
| 6 | **Vivah / Matrimony** | The single highest-intent reason an Indian family gives you accurate data | Household-level graph, not just individuals |

**The honest insight:** *Nobody downloads a political app.* They download an app that finds their daughter a match, gets their son a scholarship, brings them business, and puts their name on a stage. The political capability is what you harvest from that, not what you advertise.

---

## 3. The hierarchy model — Sangathan, not MLM

**Structure (mirror the real political geography — this is why it converts later):**

```
Rashtriya  →  Prant/State  →  Zila  →  Lok Sabha  →  Vidhan Sabha
           →  Mandal  →  Booth  →  Panna (30-60 voters)  →  Parivar  →  Sadasya
```

**Design rules:**

- **Span of control caps** — a Booth Pramukh manages ~10 Panna Pramukhs, a Panna Pramukh ~40 members. Caps force the tree to widen instead of one person hoarding 5,000 shallow contacts. Depth is what makes it real.
- **Invite quotas** — each rank gets a limited number of invites per month. Scarcity drives quality and prevents spam-farming.
- **Trust tiers:** `Unverified → Phone-verified → Community-vouched (2 members) → Document-verified → Office-bearer`. Gate features by tier; matrimony and business listings should require the higher tiers.
- **Activity decay** — rank is retained through activity, not granted permanently. An inactive Booth Pramukh drops rank after 90 days. This is what keeps your data alive instead of rotting.
- **Succession & transfer** — when a leader leaves, their subtree must be reassignable without orphaning. Design this on day 1; retrofitting a tree re-parent is painful.

**Store the tree as a closure table or materialised path**, not adjacency-list-plus-recursion. You will constantly ask "give me the entire subtree under this Zila Adhyaksh" and "how many members are under this booth" — those must be single-digit-millisecond queries, not recursive CTEs on a 10-lakh-row table.

---

## 4. Data policy — three tiers, printed on the wall

| Tier | Fields | Rule |
|---|---|---|
| 🟢 **Collect freely** (with notice + consent) | Name, phone, DOB, gender, photo, occupation, education, address text, PIN, district, self-declared samaj, gotra, Vidhan Sabha, booth, family links | Standard DPDP notice, purpose limitation, easy withdrawal |
| 🟡 **Collect carefully** | EPIC number, political affiliation, income band, GPS, grievance history | Explicit separate consent, encrypted at rest, strict access logs, shortest viable retention |
| 🔴 **NEVER collect** | **Aadhaar number / image / XML**, biometrics, PAN, bank details, passwords, health records, caste certificates | Reject at input layer. Automated scan for 12-digit patterns in every free-text field. |

**DPDP obligations you must design in now (deadline 13 May 2027, but retrofitting is 5× the cost):**

- **Consent ledger** — immutable record of who consented to what, when, in which language. Not a boolean column.
- **Notice in the user's language** — Hindi first, Bhojpuri/Maithili/Awadhi labels where it matters. English-only notice is not valid consent for a Bihar farmer.
- **Withdrawal = deletion**, propagated to backups and analytics within a defined SLA.
- **Breach reporting** to the Data Protection Board — build the detection and the report template before you need them.
- **Data residency in India.** Non-negotiable for this customer base regardless of what the law strictly requires.
- **Children's data** — verifiable parental consent required under 18. Family trees will pull in minors. Handle explicitly.
- **Consent Manager framework** goes live 13 Nov 2026 — plan interoperability.

---

## 5. What political value you legitimately get

This is the answer to "what benefits for elections" — all of it legal, and honestly more useful than an Aadhaar dump:

1. **Booth-level strength map** — members per booth, as a live heatmap. Tells a candidate where they are strong, weak, and where 200 more members flips a booth. This alone is worth the subscription.
2. **Influence graph** — not who has the most contacts, but who has the deepest *active* subtree. Identifies real ground operators, who are usually not the loud ones.
3. **Issue heatmap** *(the crown jewel)* — aggregate the Seva/grievance module. "Bijli complaints up 3× in Mandal 7 this month." This is genuine, real-time, hyperlocal intelligence that no survey firm can match, and it costs you nothing extra to produce.
4. **Owned distribution channel** — a message that reaches 2 lakh verified members in 60 seconds, without WhatsApp forwarding limits or Meta's policy changes.
5. **Volunteer supply chain** — who showed up to the last 3 events, who actually did the work. Rally attendance becomes a forecast, not a prayer.
6. **GOTV on polling day** — polling-day turnout mobilisation is entirely legal and is where elections are won. Panna Pramukh gets a checklist of 40 people, marks who has voted, and chases the rest.
7. **Winnability signals** — pre-ticket, a leader can show a party high command hard numbers on their base. This is a service you can charge separately for.
8. **Post-election governance** — constituency service tracking. Converts a one-time campaign customer into a five-year subscription. **This is your retention story.**

### 🚫 Red lines your product must actively prevent

- **No caste/religion vote appeals** in any broadcast (RPA s.123(3) — costs your client their seat).
- **No inducements** — cash, gifts, liquor. RPA s.123(1) bribery. Don't build any feature that could log or coordinate this.
- **Model Code of Conduct compliance** — MCC kicks in on announcement. Build an MCC mode that restricts campaign features.
- **No unlabelled political advertising**; expenditure through the platform may be reportable to ECI by your client.
- **No voter suppression capability**, ever. No "mark this person as opposition, don't remind them."
- **No scraped electoral rolls.** Parties with a reserved symbol legally receive rolls under Rule 22, Registration of Electors Rules 1960 — but bulk scraping and third-party voter-data brokerage is exactly the practice the press has investigated repeatedly. Don't touch it.

---

## 6. Business model

**Revenue lines (in order of how soon they pay):**

1. **Leader / Community subscription** — tiered by member count. This is your bread and butter.
   - *Starter* (up to 500 members) — free. Land-grab tier.
   - *Sangathan* (up to 10,000) — mid four-figures/month.
   - *Zila / Enterprise* (unlimited, white-label, custom hierarchy) — where the real money is.
2. **Verification-as-a-service** — ₹ per verified profile.
3. **Matrimony premium** — highest ARPU per individual user in this demographic. Charge families, not members.
4. **Vyapar listings & directory ads** — samaj business directories monetise well.
5. **Event ticketing / sammelan management** — take rate on registrations.
6. **Election-cycle Campaign Module** — high-price, seasonal add-on. Seasonal, so don't build the company on it.

**Pricing note for UP/Bihar:** price the *outcome*, not the seats. A leader spends ₹50 lakh–₹5 crore on a Vidhan Sabha campaign. A ₹2 lakh/year platform is a rounding error to them and 10× your cost to serve. **Do not price this like a ₹499/month SaaS.** Simultaneously, the free tier for ordinary samaj bodies must be genuinely free — that's your data moat and your PR shield.

---

## 7. Go-to-market — UP/Bihar, sequenced

**The cold-start problem is your only real problem.** An empty community app is worthless. Solve it in this exact order:

**Phase 1 — One samaj, one district (Months 1–4)**
- Pick **one** samaj and **one** district. Not "all of UP." Suggest a Vaishya/Gupta-dense pocket of Purvanchal or a Bihar district with a strong existing sabha.
- **Do not build from zero — digitise what exists.** Every district has a registered samaj trust with a printed member register, a WhatsApp group of 800, and an annual sammelan. Offer to digitise their register for free.
- Target: **5,000 verified members in one district.** Density beats spread. A samaj app with 5,000 members in one district is powerful; 5,000 scattered across India is worthless.

**Phase 2 — Event-led growth (Months 4–8)**
- Own the **annual sammelan**. Registration, digital passes, live directory, photo gallery, awards. One good sammelan can onboard 3,000 families in a weekend.
- Launch **Matrimony** here, not earlier. It needs a base to work, and once it works it becomes self-propelling — families recruit families.
- Target: **50,000 members across 5 districts.**

**Phase 3 — Multi-tenant expansion (Months 8–14)**
- Now sell the platform to the *second* samaj, and the third. You have a case study, screenshots and numbers.
- Open **RWAs, alumni networks, trade bodies** — the non-caste tenants. Critical: they diversify you, and they are your public proof that this is community infrastructure, not a caste network.
- Target: **5 lakh members, 20+ tenant organisations.**

**Phase 4 — Political layer (Months 14+)**
- Only now turn on the Campaign Module, for leaders who already have a base on your platform.
- By this point the political value is **real** because the base is real. Selling it earlier means selling an empty database to a politician, who will churn and tell everyone.

**Growth tactics that work in this demographic:**
- **Missed-call and IVR onboarding** — a huge share of your target users won't complete an app signup.
- **WhatsApp as the front door**, app as the destination. Don't fight WhatsApp; feed off it.
- **Print + digital hybrid** — a printed samaj directory with a QR code on every page.
- **Anchor on 50 "Zila Ratna" founding leaders.** Give them status, a title, a certificate, and a stage. Each brings 200–500 families. This — not paid ads — is your growth engine.

---

## 8. Technical principles (constraints, not code)

- **Offline-first is mandatory.** A Panna Pramukh in rural Bihar works on 2G in a courtyard with no signal. Local-first writes, background sync, conflict resolution. If it needs connectivity to be useful, it will not be used.
- **Low-end Android is the target device** — 2GB RAM, Android 10+, <40MB APK. Test on a ₹7,000 phone, not your laptop emulator.
- **Vernacular-first, not vernacular-translated.** Hindi is the default; English is the option. Numerals, dates, name fields, and gotra handling all need Indic-aware design.
- **Multi-tenancy at the database layer** (row-level security). See §1.4 — this is a survival requirement.
- **Hierarchy queries must be O(1)-ish** — closure table / materialised path.
- **India-region hosting**, encrypted at rest, field-level encryption for Tier-🟡 data.
- **Audit log everything** — every read of a member's profile by a leader. When (not if) someone alleges misuse, the audit log is your defence.
- **Aadhaar input rejection** — regex scan for 12-digit patterns and Verhoeff checksum in every free-text field, at write time. Reject, don't store-then-clean.
- **Rate-limit exports.** The single most likely way your database walks out the door is a leader bulk-exporting their subtree the day they switch parties. Watermark exports, cap volume, log and alert.

---

## 9. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Aadhaar collection | 🔴 Criminal | Never collect. Input-layer rejection. §1.1 |
| Pyramid-scheme structure | 🔴 Criminal | Status-based hierarchy, no recruitment payouts. §1.2 |
| Data breach (caste + politics + phone) | 🔴 Terminal | Minimise Tier-🟡, encrypt, audit, no Aadhaar to lose |
| Cross-tenant leak between rival parties | 🔴 Terminal | DB-level RLS, no cross-tenant analytics, ever |
| Investigative press story ("caste-profiling app") | 🟠 High | Neutral positioning, non-caste tenants, public data policy, no voter brokerage |
| Play Store takedown | 🟠 High | Open-join model, strong moderation, no discriminatory gating |
| Client loses election over your broadcast (RPA 123(3)) | 🟠 High | Broadcast lint rules, MCC mode, compliance guidance to clients |
| Empty-network churn | 🟠 High | Density-first GTM, digitise existing registers |
| Leader exports the base and leaves | 🟡 Medium | Export limits, watermarking, value in the platform not the list |

---

## 10. Your next 30 days

1. **Write the data policy first** — the three-tier table in §4, signed off, before schema design. Everything else inherits from it.
2. **Kill Aadhaar from every doc, wireframe and pitch.** Replace with EPIC + self-declared VS + booth. Update the deck.
3. **Remove "MLM" from all materials.** Rewrite the hierarchy as status-based Sangathan.
4. **Pick the district and the samaj.** Name them. Get on a train and meet the existing sabha's office-bearers.
5. **Get the register.** Digitise one real samaj's printed member list — even 800 people. That's your seed and your first case study.
6. **Talk to an election lawyer and a data-protection lawyer.** Two conversations, maybe ₹50k. Cheapest insurance you will ever buy for a business with this risk profile.
7. **Build the multi-tenant skeleton + hierarchy engine.** Nothing else matters if these two are wrong, and both are extremely expensive to retrofit.

---

## 11. Open questions for you to decide

- **Who is the Data Fiduciary** under DPDP — you, or each tenant leader? (Recommendation: tenant is Fiduciary, you are Processor. Get it in the contract.)
- **What happens to member data when a leader stops paying?** Does the community die, go read-only, or transfer? Decide now; it's a contract term and a product behaviour.
- **Will you accept tenants from parties whose politics you object to?** Answer it now, in writing. "We are neutral rails" is the only scalable answer, but be sure you mean it.
- **Free tier limits** — how big before you charge? This determines whether you're infrastructure or a niche tool.
- **Do you want the matrimony business at all?** It's the strongest monetiser and the strongest data-quality driver, but it is a whole second product with its own trust and safety burden.

---

### Sources

- [Aadhaar Act 2016 (as amended) — UIDAI](https://uidai.gov.in/images/Aadhaar_Act_2016_as_amended.pdf)
- [UIDAI — criminal penalties for unauthorised access/use](https://www.uidai.gov.in/en/289-faqs/your-aadhaar/protection-of-individual-information-in-uidai-system/1944-what-are-the-possible-criminal-penalties-envisaged-against-the-fraud-or-unauthorized-access-to-data.html)
- [Aadhaar authentication by private entities — data privacy perspective (S.S. Rana)](https://ssrana.in/articles/aadhaar-authentication-by-private-entities-from-data-privacy-perspective/)
- [DPDP Rules 2025 — compliance roadmap and deadlines](https://www.tcsa.in/resources/dpdp-rules-2025-implementation-roadmap)
- [DPDP Act compliance deadlines 2026–27](https://consentos.in/learn/dpdp-compliance-timeline/)
- [Abhiram Singh v. C.D. Commachen (2017) — full text, Indian Kanoon](https://indiankanoon.org/doc/85515763/)
- [Abhiram Singh — case background, Supreme Court Observer](https://www.scobserver.in/cases/abhiram-singh-cd-commachen-electoral-appeals-case-background/)
- [Consumer Protection (Direct Selling) Rules, 2021 — analysis](https://www.lexology.com/library/detail.aspx?g=a1529a72-a5f5-4882-b11a-41cbfea664af)
- [Prize Chits & Money Circulation Schemes (Banning) Act — pyramid scheme legal guide](https://advocategandhi.com/pyramid-scheme-in-india-a-complete-legal-guide-to-spotting-understanding-and-avoiding-financial-traps/)
- [Booth management apps and voter data brokers — The Wire](https://m.thewire.in/article/tech/the-mystery-behind-voter-slips-with-party-symbols-data-brokers-and-booth-management-apps)
- [The BJP's Saral app and booth-level data collection — Pulitzer Center](https://pulitzercenter.org/stories/data-collection-app-heart-bjps-indian-election-campaign)
- [Electoral rolls, privacy and free elections — Internet Freedom Foundation](https://internetfreedom.in/the-threat-to-free-and-fair-elections-between-transparency-privacy-and-deadlinks/)

> ⚠️ This document is strategic analysis, not legal advice. I am not a lawyer. Before launch, have an Indian election-law practitioner and a data-protection lawyer review your data policy, your tenant contracts, and your campaign module.
