--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 15.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users_config (id, entity_type, entity_value, display_name, description, is_active, sort_order, created_at, updated_at) FROM stdin;
473987c4-290b-411e-9725-489bce78a2d2	status	active	Active	User account is active and can access the system	t	1	2025-08-13 12:43:07.177463+05:30	2025-08-13 12:43:07.177463+05:30
64e3c755-886c-4d37-aad1-5eee9ec24a8b	status	inactive	Inactive	User account is temporarily inactive	t	2	2025-08-13 12:43:07.177463+05:30	2025-08-13 12:43:07.177463+05:30
0816148b-b38f-4bfb-a2d1-84516aa7536f	status	suspended	Suspended	User account is suspended due to policy violation	t	3	2025-08-13 12:43:07.177463+05:30	2025-08-13 12:43:07.177463+05:30
58358b71-2ee5-41dc-9e83-805bf1366c65	invitation_status	pending	Pending	Invitation sent, awaiting user response	t	1	2025-08-13 12:43:07.177463+05:30	2025-08-13 12:43:07.177463+05:30
9c1517cf-4652-4772-a139-10861ac1fd8a	invitation_status	accepted	Accepted	User accepted the invitation	t	2	2025-08-13 12:43:07.177463+05:30	2025-08-13 12:43:07.177463+05:30
1ebd1b1c-ffcd-49eb-8d5c-5cbd8fc3d3ab	invitation_status	declined	Declined	User declined the invitation	t	3	2025-08-13 12:43:07.177463+05:30	2025-08-13 12:43:07.177463+05:30
14b9e449-f576-4e22-8011-00dacbab5390	invitation_status	expired	Expired	Invitation expired before acceptance	t	4	2025-08-13 12:43:07.177463+05:30	2025-08-13 12:43:07.177463+05:30
023986c9-3cff-4691-a67a-1bca9e4ef38b	invitation_status	cancelled	Cancelled	Admin cancelled the invitation	t	5	2025-08-13 12:43:07.177463+05:30	2025-08-13 12:43:07.177463+05:30
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (user_id, email, password, first_name, last_name, phone_number, email_verified, status_id, last_visited_organization_id, last_login, login_attempts, lock_until, password_reset_token, password_reset_expires, password_changed_at, created_at, updated_at) FROM stdin;
1b604d5a-b896-4bc4-8c40-60d3afef32ea	jack@gmail.com	$2b$12$Z6DyWLrs1m0Xv/y.CVgl8OeEp4YL25h8XXxzW72MGLo6nwZSj5RTq	jack	brahma	\N	t	\N	\N	2025-08-13 17:43:38.603+05:30	0	\N	\N	\N	\N	2025-08-13 17:43:04.082+05:30	2025-08-13 17:43:38.604+05:30
fbf0fd57-6a07-480f-bef9-871e97b518df	sidharth.verma@xotiv.com	$2b$12$IB7DGsRCqfBpbuuH.YRNa.O8EFW1VWrMbWN0ZaQYIuBEDx0HeU9Ie	Xotiv	Sid	\N	f	\N	\N	2025-08-14 09:49:02.443+05:30	0	\N	\N	\N	2025-08-13 15:38:51.779+05:30	2025-08-13 15:20:24.28+05:30	2025-08-14 09:49:02.443+05:30
\.


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activities (activity_id, activity_type, related_type, related_id, subject, description, outcome, direction, duration_minutes, scheduled_at, completed_at, due_date, priority, user_id, next_followup_date, file_url, file_name, file_type, metadata, created_at, updated_at) FROM stdin;
cafa4d4a-6486-41e3-932d-eec36e1e78bb	call	lead	7e39b650-edd5-4455-82c9-cb168d237e4f	Initial Contact Follow-up		Connected - Positive	outbound	5	\N	2025-08-13 16:28:13.73+05:30	\N	high	fbf0fd57-6a07-480f-bef9-871e97b518df	2025-08-15 16:27:00+05:30	\N	\N	\N	\N	2025-08-13 16:28:14.397+05:30	2025-08-13 16:28:14.397+05:30
83410a3e-639c-4274-96e5-f6c1d3344fa1	task	lead	7e39b650-edd5-4455-82c9-cb168d237e4f	Demo Follow-up	Thanks for your time during the demo! What are your thoughts on how our solution could help {company}?	\N	\N	\N	2025-08-14 09:00:00+05:30	\N	2025-08-14 09:00:00+05:30	high	fbf0fd57-6a07-480f-bef9-871e97b518df	\N	\N	\N	\N	\N	2025-08-13 16:29:49.599+05:30	2025-08-13 16:29:49.599+05:30
656bcd45-c600-4d41-be20-bd3443fada21	call	lead	2887efa2-2ad3-42bc-9a28-08ff4a3d61a2	Initial Contact Follow-up		Connected - Positive	outbound	10	\N	2025-08-14 19:20:07.747+05:30	\N	medium	fbf0fd57-6a07-480f-bef9-871e97b518df	2025-08-14 19:19:00+05:30	\N	\N	\N	\N	2025-08-14 19:20:08.743+05:30	2025-08-14 19:20:08.743+05:30
31a0c7af-6b47-4d60-926f-c6244e4adabf	task	lead	2887efa2-2ad3-42bc-9a28-08ff4a3d61a2	Demo Follow-up	Thanks for your time during the demo! What are your thoughts on how our solution could help {company}?	\N	\N	\N	2025-08-15 09:00:00+05:30	\N	2025-08-15 09:00:00+05:30	high	fbf0fd57-6a07-480f-bef9-871e97b518df	\N	\N	\N	\N	\N	2025-08-14 19:24:28.45+05:30	2025-08-14 19:24:28.45+05:30
\.


--
-- Data for Name: automation_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.automation_rules (rule_id, name, description, trigger, conditions, actions, is_active, priority, last_triggered, trigger_count, organization_id, created_by, created_at, updated_at) FROM stdin;
b3849e31-8a0c-43ff-9ab5-6b82d1a90250	High Score Lead Alert	Notify when a lead scores 60 or higher	lead_score_changed	{"score": {"gte": 60}}	[{"type": "notification", "target": "assigned_user", "priority": "high", "template": "high_score_lead"}]	t	1	\N	0	ec3e6730-ab57-4633-8f82-490a04ff8123	7c526086-2137-4067-a25c-e7b142fd7bd9	2025-08-07 18:33:42.085649+05:30	2025-08-07 18:33:42.085649+05:30
a64775d0-3ffd-4f05-8bee-ff379c3acf47	Stale Lead Reminder	Notify when a lead hasn't been contacted in 7 days	lead_stale	{"status": {"neq": "qualified"}, "daysSinceLastActivity": {"gte": 7}}	[{"type": "notification", "target": "assigned_user", "priority": "medium", "template": "stale_lead_reminder"}]	t	2	\N	0	ec3e6730-ab57-4633-8f82-490a04ff8123	7c526086-2137-4067-a25c-e7b142fd7bd9	2025-08-07 18:33:42.085649+05:30	2025-08-07 18:33:42.085649+05:30
f9b26ed3-284e-42af-95e1-6af1274a6737	Deal Stuck Alert	Alert when deal stays in same stage for 14+ days	deal_stuck	{"stage": {"nin": ["closed_won", "closed_lost"]}, "daysInStage": {"gte": 14}}	[{"type": "notification", "target": "assigned_user", "priority": "high", "template": "deal_stuck_alert"}, {"type": "notification", "target": "manager", "priority": "medium", "template": "deal_stuck_manager"}]	t	3	\N	0	ec3e6730-ab57-4633-8f82-490a04ff8123	7c526086-2137-4067-a25c-e7b142fd7bd9	2025-08-07 18:33:42.085649+05:30	2025-08-07 18:33:42.085649+05:30
e0665cef-9c57-450d-ab0a-5495d6a9dc46	Follow-up Due Reminder	Daily reminder for due follow-ups	follow_up_due	{"dueDate": {"eq": "today"}}	[{"type": "notification", "target": "assigned_user", "priority": "high", "template": "follow_up_due"}]	t	4	\N	0	ec3e6730-ab57-4633-8f82-490a04ff8123	7c526086-2137-4067-a25c-e7b142fd7bd9	2025-08-07 18:33:42.085649+05:30	2025-08-07 18:33:42.085649+05:30
3fdb9b58-f314-4d41-a272-bd16ed91d913	New Lead Assignment	Notify user when a lead is assigned to them	lead_created	{"assignedTo": {"exists": true}}	[{"type": "notification", "target": "assigned_user", "priority": "medium", "template": "lead_assigned"}]	t	5	\N	0	ec3e6730-ab57-4633-8f82-490a04ff8123	7c526086-2137-4067-a25c-e7b142fd7bd9	2025-08-07 18:33:42.085649+05:30	2025-08-07 18:33:42.085649+05:30
\.


--
-- Data for Name: leads_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leads_config (id, entity_type, entity_value, description, display_order, metadata, is_active, created_at, updated_at) FROM stdin;
d76f8b63-b095-452f-b34d-4104107ab946	status	new	New lead, not yet contacted	1	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
c6da890a-ebee-4585-8f08-de23ae78a688	status	contact_attempted	Initial contact attempted	2	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
fcd63267-186e-4180-8777-e8a9f3e49362	status	in_conversation	Lead is engaged and responding	3	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
8b30f607-fee9-4f9d-bd12-f670c448477d	status	qualified	Lead meets qualification criteria	4	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
7844c9b5-e9d3-4a99-b557-975e5f26f047	status	disqualified	Lead is not a good fit	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
3ef5e94c-52cd-4209-ad7f-fedc1a5fe15c	status	not_reachable	Unable to reach lead	6	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
1bab62fc-df13-416b-acf9-ac64e9a4adc4	source	linkedin	LinkedIn outreach	1	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
7c57eecd-5d10-4504-a92a-5d60711d0c6b	source	cold_call	Cold calling	2	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
2e5d107f-4c78-4587-b39b-0b7d82f1b77d	source	referral	Referred by existing contact	3	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
01737059-fbb8-4025-b7ca-0f7d16a2d6c0	source	website	Website form submission	4	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
d6733cd4-ea02-4ddc-addc-4c7cea8b4fb9	source	email_campaign	Email marketing campaign	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
2ed8b869-3cad-4c12-8137-42d2e16cedc5	source	trade_show	Trade show or event	6	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
a7757fc2-6712-4667-bf25-2056373bc808	source	google_ads	Google Ads campaign	7	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
eabfa0eb-6aa7-4e63-b2cf-6b1d85166c84	source	other	Other source	8	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
06dfde90-6e26-445f-af59-b407b4be6500	company_size	1-10	1-10 employees	1	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
f5c42566-1d08-4800-9e09-22c25744aee0	company_size	11-50	11-50 employees	2	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
e1210e1d-7050-44a7-aa57-4a4944d4710d	company_size	51-200	51-200 employees	3	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
64bbc0ef-65fc-4f19-a3f0-5a7f834f0233	company_size	201-500	201-500 employees	4	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
b6b8c091-4dff-41af-8736-5f5a29a4f3ba	company_size	501-1000	501-1000 employees	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
1c254b27-7693-49a3-be88-6e34c97cfa95	company_size	1001+	1000+ employees	6	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
0f4bd6cd-0f96-46a4-ab5f-4e382f06c890	score_grade	hot	Hot lead (40+ points)	1	{"color": "#ff4444", "maxScore": 100, "minScore": 40}	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
04488da9-be49-4c26-a029-972fdb24b17d	score_grade	warm	Warm lead (20-39 points)	2	{"color": "#ffaa00", "maxScore": 39, "minScore": 20}	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
c23d1bb6-5781-4c5c-850b-15afd1258a19	score_grade	cold	Cold lead (0-19 points)	3	{"color": "#4444ff", "maxScore": 19, "minScore": 0}	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
dfb62da5-0c79-4678-a699-dabcac773a67	industry	technology	Technology & Software	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
44a52ab9-f1a3-4c04-a40d-3f28602873a0	industry	healthcare	Healthcare & Medical	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
14a1d565-b9c9-4337-b81a-1922b5277e76	industry	finance	Financial Services	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
b3238d4b-a7bc-4105-a331-00d08580cbb7	industry	manufacturing	Manufacturing	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
bd3131ad-1dda-4a51-bb63-21395e244c9a	industry	retail	Retail & E-commerce	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
a42bc339-f8d3-4cd0-ba89-c661c5b0372c	industry	education	Education	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
575494bb-18a6-4715-921c-0d20d55927fd	industry	real_estate	Real Estate	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
7fe66c1f-bba7-45a9-8ef1-49bd5f39a232	industry	consulting	Consulting Services	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
3c93efcd-7913-4803-bdda-2b751bda06df	industry	construction	Construction	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
75a8218c-7189-4db0-83fb-0bc64dc77ead	industry	other	Other Industry	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
c0aaf5b9-af1a-4895-9b1b-7f4b743e988e	product_interest	crm_basic	CRM Basic Plan	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
5e27d19b-b728-4475-baa8-de78fca11c2d	product_interest	crm_professional	CRM Professional Plan	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
2fdbb8da-d0b8-4bb1-a5fd-885046f1aeb2	product_interest	crm_enterprise	CRM Enterprise Plan	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
538b8739-be95-47c3-b20d-8c4e53419efd	product_interest	custom_solution	Custom Solution	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
b8c30167-dcc9-49c0-ba23-46179e15255e	product_interest	integration_services	Integration Services	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
00342714-1819-4e99-a25a-b2766268bae7	product_interest	consulting	Consulting Services	5	\N	t	2025-08-07 09:48:01.025+05:30	2025-08-07 09:48:01.025+05:30
\.


--
-- Data for Name: organization_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organization_config (id, entity_type, entity_value, display_name, description, config_data, is_active, sort_order, created_at, updated_at) FROM stdin;
06139b4b-be45-4572-8c6b-a51880cff973	status	active	Active	Organization is active	\N	t	1	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
9837448f-8d6f-4a31-99fe-c1a74d9003dd	status	inactive	Inactive	Organization is inactive	\N	t	2	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
96114898-f066-4b83-b822-6e5cd516d898	status	suspended	Suspended	Organization is suspended	\N	t	3	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
bd5a4ba2-b086-4424-8d00-79eb67251aa8	subscription_status	trial	Trial	Trial subscription	\N	t	1	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
9ec51eab-cf6d-4dab-be18-4426219af701	subscription_status	active	Active	Active subscription	\N	t	2	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
20013e2b-9ae3-4a9d-b1a2-734e2b5b26fd	subscription_status	cancelled	Cancelled	Cancelled subscription	\N	t	3	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
af7224a9-377b-4931-ae62-9eaa3b437af7	subscription_status	past_due	Past Due	Payment past due	\N	t	4	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
f6291fc3-870e-4e28-b2be-348a2188db4b	plan_type	trial	Trial	Trial plan	\N	t	1	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
81e3737d-a608-4533-a229-8dcff7d7aa0b	plan_type	basic	Basic	Basic plan	\N	t	2	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
10227292-3d9e-4958-ad75-d67049e9e01c	plan_type	pro	Pro	Pro plan	\N	t	3	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
dfc98ffd-333a-4aa7-b0e1-ceb3acbd23be	plan_type	enterprise	Enterprise	Enterprise plan	\N	t	4	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
f541b9ea-3ff6-4d3a-82bf-0eaff1f1d15a	company_size	startup	Startup	Solo entrepreneurs and small startups	\N	t	1	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
c07c1c79-a9ee-453a-8061-fbd73c5488d0	company_size	small	Small	Small business (2-10 employees)	\N	t	2	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
8d3da959-f681-4c81-86c9-3632eb36c1d0	company_size	medium	Medium	Medium business (11-50 employees)	\N	t	3	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
8d63f6b5-1dbb-4432-aeaa-28a446903942	company_size	large	Large	Large business (51-200 employees)	\N	t	4	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
43f4d4da-7451-43ff-8b4d-c6b804754884	company_size	enterprise	Enterprise	Enterprise (200+ employees)	\N	t	5	2025-08-13 12:43:20.566661+05:30	2025-08-13 12:43:20.566661+05:30
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (organization_id, name, slug, description, industry_type, company_size_config_id, primary_use_case, current_tool, logo_url, website, address, city, state, postal_code, country, phone, created_by, status_id, subscription_status_id, plan_type_id, trial_starts_at, trial_ends_at, subscription_starts_at, subscription_ends_at, billing_email, max_users, max_workspaces, max_storage_gb, features_enabled, settings, created_at, updated_at) FROM stdin;
20555d4b-df2c-4f63-8491-b1f8e88b3ade	Xotiv Technologies	xotiv-technologies-97b518df	Organization for Xotiv Sid	sales-pipeline	8d63f6b5-1dbb-4432-aeaa-28a446903942	sales-pipeline	business-development	\N	\N	\N	\N	\N	\N	\N	\N	fbf0fd57-6a07-480f-bef9-871e97b518df	06139b4b-be45-4572-8c6b-a51880cff973	bd5a4ba2-b086-4424-8d00-79eb67251aa8	f6291fc3-870e-4e28-b2be-348a2188db4b	2025-08-13 15:20:24.801+05:30	2025-08-27 15:20:24.801+05:30	\N	\N	\N	5	3	10	["contacts", "leads", "basic_reports"]	{}	2025-08-13 15:20:24.818+05:30	2025-08-13 15:20:24.818+05:30
489f6216-6ba4-43af-888c-237a5f87f8d6	Amazon	amazon-97b518df	Ecom org	Manufacturing	c07c1c79-a9ee-453a-8061-fbd73c5488d0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	fbf0fd57-6a07-480f-bef9-871e97b518df	06139b4b-be45-4572-8c6b-a51880cff973	bd5a4ba2-b086-4424-8d00-79eb67251aa8	f6291fc3-870e-4e28-b2be-348a2188db4b	2025-08-13 15:41:59.731+05:30	2025-08-27 15:41:59.731+05:30	\N	\N	\N	5	3	10	["contacts", "leads", "basic_reports"]	{}	2025-08-13 15:41:59.739+05:30	2025-08-13 15:41:59.739+05:30
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leads (lead_id, organization_id, first_name, last_name, email, alt_email, phone, alt_phone, linkedin_profile, business_name, company_website, meta_data, source_id, industry_id, company_size_id, product_interest, tags, status_id, assigned_to, created_by, lead_score, score_grade_id, qualification_notes, last_contact_date, next_followup_date, created_at, updated_at, job_title) FROM stdin;
7da16960-ec25-4e54-897f-03aa5b2a6468	489f6216-6ba4-43af-888c-237a5f87f8d6	Priyank	Sharma	priank@gmail.com	\N	+918744098062	\N	\N	Priyank Corporation	http://aalsi.co	\N	a7757fc2-6712-4667-bf25-2056373bc808	\N	\N	\N	[]	d76f8b63-b095-452f-b34d-4104107ab946	\N	fbf0fd57-6a07-480f-bef9-871e97b518df	0	c23d1bb6-5781-4c5c-850b-15afd1258a19	\N	\N	\N	2025-08-13 15:58:17.284+05:30	2025-08-13 15:58:17.284+05:30	BDM
7e39b650-edd5-4455-82c9-cb168d237e4f	489f6216-6ba4-43af-888c-237a5f87f8d6	John	Doe	john.doe@testcorp.com	\N	+918744098062	\N	\N	John Corporation	https://techbysid.netlify.app/	\N	2ed8b869-3cad-4c12-8137-42d2e16cedc5	\N	\N	\N	[]	c6da890a-ebee-4585-8f08-de23ae78a688	\N	fbf0fd57-6a07-480f-bef9-871e97b518df	0	c23d1bb6-5781-4c5c-850b-15afd1258a19	\N	\N	\N	2025-08-13 16:14:13.432+05:30	2025-08-13 16:27:16.198+05:30	VP SALE
a68f17a0-70b2-4c3b-8542-9ad7e8745b03	489f6216-6ba4-43af-888c-237a5f87f8d6	Simba	Lion	simba@gmail.com	\N	+918744098062	\N	\N	Simba Lion Org	alsi.com	{"workspaceId": "d8e28923-48f1-4ea8-9a82-d5ab24734aa2"}	d6733cd4-ea02-4ddc-addc-4c7cea8b4fb9	\N	\N	\N	[]	d76f8b63-b095-452f-b34d-4104107ab946	\N	fbf0fd57-6a07-480f-bef9-871e97b518df	0	c23d1bb6-5781-4c5c-850b-15afd1258a19	\N	\N	\N	2025-08-14 08:43:53.549+05:30	2025-08-14 08:43:53.549+05:30	\N
4bcfa2d1-c42b-4a0f-961a-f19999665cd2	489f6216-6ba4-43af-888c-237a5f87f8d6	SMB Test	User	smb@gmail.com	\N	+918744098062	\N	\N	Smb Org	xotiv technologies.com	{"workspaceId": "d8e28923-48f1-4ea8-9a82-d5ab24734aa2"}	01737059-fbb8-4025-b7ca-0f7d16a2d6c0	\N	\N	\N	[]	d76f8b63-b095-452f-b34d-4104107ab946	\N	fbf0fd57-6a07-480f-bef9-871e97b518df	0	c23d1bb6-5781-4c5c-850b-15afd1258a19	\N	\N	\N	2025-08-14 09:59:07.628+05:30	2025-08-14 09:59:07.628+05:30	\N
ae624d45-04bf-4f47-b422-a68f80f31d0f	489f6216-6ba4-43af-888c-237a5f87f8d6	John	Doe	john.doe@company.com	\N	+1-555-0123	\N	\N	Acme Corp	\N	{"workspaceId": "d8e28923-48f1-4ea8-9a82-d5ab24734aa2"}	01737059-fbb8-4025-b7ca-0f7d16a2d6c0	\N	\N	\N	[]	d76f8b63-b095-452f-b34d-4104107ab946	\N	fbf0fd57-6a07-480f-bef9-871e97b518df	0	\N	\N	\N	\N	2025-08-14 18:28:12.427+05:30	2025-08-14 18:28:12.427+05:30	CEO
aed67242-bd19-4b25-b272-20f3e86dad8b	489f6216-6ba4-43af-888c-237a5f87f8d6	Jane	Smith	jane.smith@techcorp.com	\N	+1-555-0124	\N	\N	TechCorp	\N	{"workspaceId": "d8e28923-48f1-4ea8-9a82-d5ab24734aa2"}	2e5d107f-4c78-4587-b39b-0b7d82f1b77d	\N	\N	\N	[]	d76f8b63-b095-452f-b34d-4104107ab946	\N	fbf0fd57-6a07-480f-bef9-871e97b518df	0	\N	\N	\N	\N	2025-08-14 18:28:12.445+05:30	2025-08-14 18:28:12.445+05:30	CTO
2887efa2-2ad3-42bc-9a28-08ff4a3d61a2	489f6216-6ba4-43af-888c-237a5f87f8d6	Mike	Johnson	mike.j@startup.io	\N	+1-555-0125	\N	\N	StartupIO	\N	{"workspaceId": "d8e28923-48f1-4ea8-9a82-d5ab24734aa2"}	1bab62fc-df13-416b-acf9-ac64e9a4adc4	\N	\N	\N	[]	d76f8b63-b095-452f-b34d-4104107ab946	\N	fbf0fd57-6a07-480f-bef9-871e97b518df	0	\N	\N	\N	\N	2025-08-14 18:28:12.452+05:30	2025-08-14 18:28:12.452+05:30	Founder
\.


--
-- Data for Name: deals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.deals (deal_id, lead_id, title, description, value, currency, stage, probability, source, priority, expected_close_date, actual_close_date, lost_reason, user_id, organization_id, metadata, created_at, updated_at) FROM stdin;
1429f873-77cf-4442-bb7a-7741d80c411e	7e39b650-edd5-4455-82c9-cb168d237e4f	software Build SNT		10.00	USD	qualification	20	\N	medium	2025-08-20 05:30:00+05:30	\N	\N	fbf0fd57-6a07-480f-bef9-871e97b518df	489f6216-6ba4-43af-888c-237a5f87f8d6	\N	2025-08-13 16:47:31.866+05:30	2025-08-13 16:47:31.866+05:30
\.


--
-- Data for Name: email_otps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_otps (id, email, otp, purpose, attempts, expires_at, verified_at, created_at, updated_at) FROM stdin;
feecc768-6d53-4214-8c9b-a3afc4bfbe93	sidharth.verma@xotiv.com	962854	signup	2	2025-08-13 15:23:55.157+05:30	2025-08-13 15:15:12.062+05:30	2025-08-13 15:13:55.158+05:30	2025-08-13 15:15:12.062+05:30
\.


--
-- Data for Name: email_verifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_verifications (id, user_id, email, verification_token, expires_at, verified_at, attempts, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lead_scores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_scores (score_id, lead_id, total_score, tier, last_calculated, score_breakdown, user_id, organization_id, created_at, updated_at) FROM stdin;
1f4baeab-206a-44c0-8fb1-1388fb213585	cad9aa3b-9387-4c71-bba3-a8e449093930	12	warm	2025-08-12 09:52:36.873594+05:30	[{"points": 10, "reason": "Base score from lead quality", "ruleName": "Initial Assessment"}]	7c526086-2137-4067-a25c-e7b142fd7bd9	ec3e6730-ab57-4633-8f82-490a04ff8123	2025-08-12 09:52:36.873594+05:30	2025-08-12 09:52:36.873594+05:30
8a30e6e9-5e84-4422-8e19-dbdd55dd00a1	09236ec1-5f44-422d-affd-d3168abfef7e	17	burning	2025-08-12 09:52:36.873594+05:30	[{"points": 10, "reason": "Base score from lead quality", "ruleName": "Initial Assessment"}]	7c526086-2137-4067-a25c-e7b142fd7bd9	ec3e6730-ab57-4633-8f82-490a04ff8123	2025-08-12 09:52:36.873594+05:30	2025-08-12 09:52:36.873594+05:30
bc3cdeb3-63d5-4b27-80f3-416cde7eb8f1	833ca831-8ce2-48ea-bfa9-674e0ae8f388	39	cold	2025-08-12 09:52:36.873594+05:30	[{"points": 10, "reason": "Base score from lead quality", "ruleName": "Initial Assessment"}]	7c526086-2137-4067-a25c-e7b142fd7bd9	ec3e6730-ab57-4633-8f82-490a04ff8123	2025-08-12 09:52:36.873594+05:30	2025-08-12 09:52:36.873594+05:30
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (notification_id, user_id, type, title, message, priority, channel, is_read, read_at, action_url, action_label, related_type, related_id, organization_id, sent_at, expires_at, metadata, created_at, updated_at) FROM stdin;
76a755e9-fa71-4112-8158-4198b71935dd	7c526086-2137-4067-a25c-e7b142fd7bd9	lead_scored_high	🔥 High-Value Lead Alert	John Doe scored 85 points - high conversion potential!	high	in_app	f	\N	/pages/leads/sample	View Lead	\N	\N	ec3e6730-ab57-4633-8f82-490a04ff8123	2025-08-07 18:33:42.07732+05:30	\N	\N	2025-08-07 18:33:42.07732+05:30	2025-08-07 18:33:42.07732+05:30
536a7b8e-82d0-46b3-8525-bce91b7e8260	7c526086-2137-4067-a25c-e7b142fd7bd9	follow_up_due	📅 Follow-up Due Today	Follow-up scheduled for Jane Smith is due today	urgent	in_app	f	\N	/pages/leads/sample	Complete Follow-up	\N	\N	ec3e6730-ab57-4633-8f82-490a04ff8123	2025-08-07 16:33:42.07732+05:30	\N	\N	2025-08-07 18:33:42.07732+05:30	2025-08-07 18:33:42.07732+05:30
e275857e-8cf0-4d31-9412-bbd0e6edf2dc	7c526086-2137-4067-a25c-e7b142fd7bd9	deal_moved	📊 Deal Progress	Acme Corp deal moved to Negotiation stage	medium	in_app	f	\N	/deals/sample	View Deal	\N	\N	ec3e6730-ab57-4633-8f82-490a04ff8123	2025-08-06 18:33:42.07732+05:30	\N	\N	2025-08-07 18:33:42.07732+05:30	2025-08-07 18:33:42.07732+05:30
14beda6a-e53c-400f-bd07-e68d49bced8d	7c526086-2137-4067-a25c-e7b142fd7bd9	bulk_import_complete	📥 Import Complete	Successfully imported 45 leads from CSV file	medium	in_app	f	\N	/pages/leads	View Leads	\N	\N	ec3e6730-ab57-4633-8f82-490a04ff8123	2025-08-07 15:33:42.07732+05:30	\N	\N	2025-08-07 18:33:42.07732+05:30	2025-08-07 18:33:42.07732+05:30
d84cc557-56ee-4d21-9211-9b0079dd312c	7c526086-2137-4067-a25c-e7b142fd7bd9	lead_stale	⏰ Lead Needs Attention	Lead Mike Johnson hasn't been contacted in 7 days	medium	in_app	f	\N	/pages/leads/sample	Contact Lead	\N	\N	ec3e6730-ab57-4633-8f82-490a04ff8123	2025-08-07 12:33:42.07732+05:30	\N	\N	2025-08-07 18:33:42.07732+05:30	2025-08-07 18:33:42.07732+05:30
\.


--
-- Data for Name: org_user_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.org_user_accounts (id, organization_id, email, password_hash, first_name, last_name, status, last_login, created_at, updated_at) FROM stdin;
947042ce-0329-4e36-a5a3-54c2f7562cc1	489f6216-6ba4-43af-888c-237a5f87f8d6	jack@gmail.com	$2b$10$FPIQtgGEhUqEC.SYwYSIbeFkU/vFK6JFAlJ/M4Wed3FIg8eDnqC2C	jack	brahma	active	2025-08-13 17:43:04.668+05:30	2025-08-13 17:43:04.668+05:30	2025-08-13 17:43:04.668+05:30
\.


--
-- Data for Name: organization_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organization_roles (id, role, display_name, description, permissions, hierarchy_level, is_system_role, is_active, created_at, updated_at) FROM stdin;
e3e496e6-24a9-4e8d-afff-8fba9baabd26	owner	Owner	Organization owner with full control	{"can_invite_users": true, "can_remove_users": true, "can_edit_all_data": true, "can_view_all_data": true, "can_delete_all_data": true, "can_change_user_roles": true, "can_create_workspaces": true, "can_delete_workspaces": true, "can_manage_workspaces": true, "can_delete_organization": true, "can_manage_organization": true, "can_manage_subscription": true}	4	t	t	2025-08-13 12:43:37.163808+05:30	2025-08-13 12:43:37.163808+05:30
6db2e120-165e-4cc7-8449-69338d310d47	admin	Admin	Administrator with most permissions	{"can_invite_users": true, "can_remove_users": true, "can_edit_all_data": true, "can_view_all_data": true, "can_delete_all_data": true, "can_change_user_roles": true, "can_create_workspaces": true, "can_delete_workspaces": true, "can_manage_workspaces": true, "can_delete_organization": false, "can_manage_organization": true, "can_manage_subscription": false}	3	t	t	2025-08-13 12:43:37.163808+05:30	2025-08-13 12:43:37.163808+05:30
f162bafd-58eb-4c0c-9f07-df0473a2d460	manager	Manager	Manager with limited permissions	{"can_invite_users": true, "can_remove_users": false, "can_edit_all_data": true, "can_view_all_data": true, "can_delete_all_data": false, "can_change_user_roles": false, "can_create_workspaces": true, "can_delete_workspaces": false, "can_manage_workspaces": true, "can_delete_organization": false, "can_manage_organization": false, "can_manage_subscription": false}	2	t	t	2025-08-13 12:43:37.163808+05:30	2025-08-13 12:43:37.163808+05:30
d84db119-6277-4027-9b26-db71b2be44d1	viewer	Viewer	Read-only access	{"can_invite_users": false, "can_remove_users": false, "can_edit_all_data": false, "can_view_all_data": true, "can_delete_all_data": false, "can_change_user_roles": false, "can_create_workspaces": false, "can_delete_workspaces": false, "can_manage_workspaces": false, "can_delete_organization": false, "can_manage_organization": false, "can_manage_subscription": false}	1	t	t	2025-08-13 12:43:37.163808+05:30	2025-08-13 12:43:37.163808+05:30
\.


--
-- Data for Name: organization_workspaces; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organization_workspaces (id, organization_id, name, slug, description, status_id, created_by, settings, created_at, updated_at) FROM stdin;
d8e28923-48f1-4ea8-9a82-d5ab24734aa2	489f6216-6ba4-43af-888c-237a5f87f8d6	SMB	smb	\N	\N	fbf0fd57-6a07-480f-bef9-871e97b518df	{}	2025-08-14 08:32:40.381+05:30	2025-08-14 08:32:40.381+05:30
8176a069-52eb-4580-b091-b9a85de62db8	489f6216-6ba4-43af-888c-237a5f87f8d6	Test	test	\N	\N	fbf0fd57-6a07-480f-bef9-871e97b518df	{}	2025-08-14 08:39:21.71+05:30	2025-08-14 08:39:21.71+05:30
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, user_id, reset_token, expires_at, used_at, created_at, updated_at, reseted_at, token) FROM stdin;
\.


--
-- Data for Name: scoring_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.scoring_rules (rule_id, rule_name, rule_type, condition, points, is_active, priority, description, organization_id, created_by, created_at, updated_at) FROM stdin;
7f79d380-9b9f-49f3-83d7-c14118adfb6d	Responded to Outreach	activity_response	{"outcome": ["positive", "connected"], "activityType": ["call", "email"]}	15	t	1	Lead responded positively to call or email outreach	ec3e6730-ab57-4633-8f82-490a04ff8123	1c139f48-def9-4019-a0ea-f08763e021d3	2025-08-12 09:52:36.864086+05:30	2025-08-12 09:52:36.864086+05:30
a4ad023e-4f0a-4f5d-84d9-9cf5548242ff	Email Engagement	email_interaction	{"outcome": ["opened", "clicked"], "activityType": "email"}	8	t	2	Lead opened email or clicked links	ec3e6730-ab57-4633-8f82-490a04ff8123	1c139f48-def9-4019-a0ea-f08763e021d3	2025-08-12 09:52:36.868246+05:30	2025-08-12 09:52:36.868246+05:30
006bdb3f-efa3-453e-9627-192de762039d	Quotation Request	quotation_request	{"outcome": ["quotation_requested"], "activityType": ["call", "email"]}	25	t	3	Lead specifically asked for quotation or pricing	ec3e6730-ab57-4633-8f82-490a04ff8123	1c139f48-def9-4019-a0ea-f08763e021d3	2025-08-12 09:52:36.868246+05:30	2025-08-12 09:52:36.868246+05:30
0acbad09-75f7-4bcb-b69d-9ca9f1da8ef3	No Response Penalty	no_response_penalty	{"noPositiveResponse": true, "daysSinceLastActivity": 10}	-8	t	4	No response for 10+ days	ec3e6730-ab57-4633-8f82-490a04ff8123	1c139f48-def9-4019-a0ea-f08763e021d3	2025-08-12 09:52:36.868246+05:30	2025-08-12 09:52:36.868246+05:30
76abd56f-7ab4-42a5-b6c9-279c431133e4	Quality Lead Source	lead_source	{"field": "source", "values": ["referral", "inbound", "demo_request"]}	15	t	5	Lead came from high-quality source	ec3e6730-ab57-4633-8f82-490a04ff8123	1c139f48-def9-4019-a0ea-f08763e021d3	2025-08-12 09:52:36.868246+05:30	2025-08-12 09:52:36.868246+05:30
125e8e81-fc53-4f84-b5b6-694acdc62e75	Decision Maker Title	job_title_match	{"field": "jobTitle", "values": ["ceo", "cto", "founder", "director", "vp", "head"]}	10	t	6	Contact appears to be a decision maker	ec3e6730-ab57-4633-8f82-490a04ff8123	1c139f48-def9-4019-a0ea-f08763e021d3	2025-08-12 09:52:36.868246+05:30	2025-08-12 09:52:36.868246+05:30
7550bb36-6fc8-4c5c-9195-3ac0eb6a018c	Responded to Outreach	activity_response	{"outcome": ["positive", "connected"], "activityType": ["call", "email"]}	15	t	1	Lead responded positively to call or email outreach	ec3e6730-ab57-4633-8f82-490a04ff8123	1c139f48-def9-4019-a0ea-f08763e021d3	2025-08-12 09:53:14.348+05:30	2025-08-12 09:53:14.348+05:30
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tasks (task_id, title, description, type, priority, status, due_date, completed_at, lead_id, deal_id, assigned_to, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_invitations (id, organization_id, email, role_id, invited_by, status_id, invitation_token, message, expires_at, accepted_at, accepted_by_user_id, created_at, updated_at) FROM stdin;
1ef1bc68-d401-4dd9-878c-11091c624ca7	489f6216-6ba4-43af-888c-237a5f87f8d6	jack@gmail.com	d84db119-6277-4027-9b26-db71b2be44d1	fbf0fd57-6a07-480f-bef9-871e97b518df	9c1517cf-4652-4772-a139-10861ac1fd8a	f47a32e92ebd5b284613c7c9c1a8117b77156b8320ead8e870359792e62b6eba683d0fbe89754786985507edc990add907e173be45c64fbb5db577739294de26	\N	2025-08-20 17:00:13.686+05:30	2025-08-13 17:43:04.677+05:30	1b604d5a-b896-4bc4-8c40-60d3afef32ea	2025-08-13 17:00:13.687+05:30	2025-08-13 17:43:04.677+05:30
\.


--
-- Data for Name: user_organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_organizations (id, user_id, organization_id, role_id, status, joined_at, invited_by, created_at, updated_at) FROM stdin;
623c5352-d8a1-42b2-8d5b-2c3e8c92a26c	fbf0fd57-6a07-480f-bef9-871e97b518df	20555d4b-df2c-4f63-8491-b1f8e88b3ade	e3e496e6-24a9-4e8d-afff-8fba9baabd26	active	2025-08-13 15:20:24.833+05:30	\N	2025-08-13 15:20:24.833+05:30	2025-08-13 15:20:24.833+05:30
a15c38bf-27f2-45c8-b0ac-f122099e5d6a	fbf0fd57-6a07-480f-bef9-871e97b518df	489f6216-6ba4-43af-888c-237a5f87f8d6	e3e496e6-24a9-4e8d-afff-8fba9baabd26	active	2025-08-13 15:41:59.75+05:30	\N	2025-08-13 15:41:59.751+05:30	2025-08-13 15:41:59.751+05:30
c44d9d70-94ac-4bbe-ba0a-8be46a348596	1b604d5a-b896-4bc4-8c40-60d3afef32ea	489f6216-6ba4-43af-888c-237a5f87f8d6	d84db119-6277-4027-9b26-db71b2be44d1	active	2025-08-13 17:43:04.558+05:30	fbf0fd57-6a07-480f-bef9-871e97b518df	2025-08-13 17:43:04.559+05:30	2025-08-13 17:43:04.559+05:30
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_sessions (id, user_id, current_organization_id, session_token, refresh_token, expires_at, last_activity_at, ip_address, user_agent, device_info, is_active, created_at, updated_at) FROM stdin;
cee94629-62dd-469c-b534-0ba709db8db5	1b604d5a-b896-4bc4-8c40-60d3afef32ea	489f6216-6ba4-43af-888c-237a5f87f8d6	\N	\N	\N	2025-08-13 17:43:04.683+05:30	\N	\N	\N	t	2025-08-13 17:43:04.683+05:30	2025-08-13 17:43:04.683+05:30
db36e97e-7511-4fc7-b65c-f62db4224c19	fbf0fd57-6a07-480f-bef9-871e97b518df	489f6216-6ba4-43af-888c-237a5f87f8d6	\N	\N	\N	2025-08-14 09:49:02.421+05:30	\N	\N	\N	t	2025-08-13 15:20:24.843+05:30	2025-08-14 09:49:02.42+05:30
\.


--
-- PostgreSQL database dump complete
--

