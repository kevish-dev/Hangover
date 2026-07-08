--
-- PostgreSQL database dump
--

\restrict ptnJ9kjKY5eAzYd5HmnjyDkwGfnqERZMuk614R9gs7fcSMgI8hAphg8Ef1VVAg1

-- Dumped from database version 15.18
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: admin
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO admin;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: admin
--

COMMENT ON SCHEMA public IS '';


--
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'PENDING',
    'RESERVED',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED'
);


ALTER TYPE public."BookingStatus" OWNER TO admin;

--
-- Name: Gender; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."Gender" AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER',
    'PREFER_NOT_TO_SAY'
);


ALTER TYPE public."Gender" OWNER TO admin;

--
-- Name: GovtIdType; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."GovtIdType" AS ENUM (
    'AADHAAR',
    'PASSPORT'
);


ALTER TYPE public."GovtIdType" OWNER TO admin;

--
-- Name: PaymentIntentStatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."PaymentIntentStatus" AS ENUM (
    'CREATED',
    'COMPLETED',
    'CANCELLED',
    'EXPIRED',
    'FAILED'
);


ALTER TYPE public."PaymentIntentStatus" OWNER TO admin;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PARTIALLY_PAID',
    'PAID',
    'FAILED',
    'OVERDUE',
    'REFUNDED',
    'PARTIALLY_REFUNDED'
);


ALTER TYPE public."PaymentStatus" OWNER TO admin;

--
-- Name: PaymentTransactionStatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."PaymentTransactionStatus" AS ENUM (
    'CREATED',
    'PENDING',
    'SUCCESS',
    'FAILED',
    'CANCELLED',
    'REFUNDED'
);


ALTER TYPE public."PaymentTransactionStatus" OWNER TO admin;

--
-- Name: PaymentType; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."PaymentType" AS ENUM (
    'TOKEN',
    'BALANCE',
    'FULL'
);


ALTER TYPE public."PaymentType" OWNER TO admin;

--
-- Name: RefundStatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."RefundStatus" AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED'
);


ALTER TYPE public."RefundStatus" OWNER TO admin;

--
-- Name: ReminderStatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."ReminderStatus" AS ENUM (
    'PENDING',
    'SENT',
    'FAILED'
);


ALTER TYPE public."ReminderStatus" OWNER TO admin;

--
-- Name: ReminderType; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."ReminderType" AS ENUM (
    'MANUAL',
    'AUTOMATIC'
);


ALTER TYPE public."ReminderType" OWNER TO admin;

--
-- Name: TripType; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."TripType" AS ENUM (
    'MOUNTAIN_TREK',
    'BEACH_ESCAPE',
    'DESERT_EXPEDITION',
    'JUNGLE_WILDLIFE',
    'HERITAGE_WALK',
    'ROAD_TRIP',
    'BACKPACKING_TOUR',
    'PHOTOGRAPHY_TOUR',
    'BONFIRE_RETREAT',
    'INSTITUTE_COLLEGE_TRIP',
    'CUSTOM_TRIP'
);


ALTER TYPE public."TripType" OWNER TO admin;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."UserRole" AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public."UserRole" OWNER TO admin;

--
-- Name: VerificationStatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."VerificationStatus" AS ENUM (
    'UNVERIFIED',
    'PENDING',
    'VERIFIED',
    'REJECTED'
);


ALTER TYPE public."VerificationStatus" OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Booking; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Booking" (
    id text NOT NULL,
    "bookingReference" text NOT NULL,
    "userId" text NOT NULL,
    "tripId" text NOT NULL,
    status public."BookingStatus" DEFAULT 'PENDING'::public."BookingStatus" NOT NULL,
    "paymentStatus" public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "numberOfTravelers" integer DEFAULT 1 NOT NULL,
    "totalAmount" numeric(10,2) NOT NULL,
    "tokenAmount" numeric(10,2) NOT NULL,
    "amountPaid" numeric(10,2) DEFAULT 0 NOT NULL,
    "amountDue" numeric(10,2) NOT NULL,
    "initialPaymentType" public."PaymentType" NOT NULL,
    "balanceDueDate" timestamp(3) without time zone,
    "reservedAt" timestamp(3) without time zone,
    "confirmedAt" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "cancellationReason" text,
    "cancelledBy" text,
    "specialRequests" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Booking" OWNER TO admin;

--
-- Name: Destination; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Destination" (
    id text NOT NULL,
    name text NOT NULL,
    state text NOT NULL,
    subheading text,
    "isPublished" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Destination" OWNER TO admin;

--
-- Name: FAQ; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."FAQ" (
    id text NOT NULL,
    "tripId" text NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    "order" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FAQ" OWNER TO admin;

--
-- Name: Festival; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Festival" (
    id text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    location text NOT NULL,
    "bannerImages" text[],
    duration integer NOT NULL,
    "stageDays" integer NOT NULL,
    "numberOfArtists" integer NOT NULL,
    "difficultyLevel" text NOT NULL,
    "bestTimeToVisit" text NOT NULL,
    "maxAltitude" integer NOT NULL,
    overview text NOT NULL,
    highlights jsonb DEFAULT '[]'::jsonb NOT NULL,
    "galleryImages" text[],
    inclusions text[],
    exclusions text[],
    "stayTransportImages" jsonb DEFAULT '[]'::jsonb NOT NULL,
    price numeric(10,2) NOT NULL,
    "tokenAmount" numeric(10,2) NOT NULL,
    capacity integer NOT NULL,
    "filledSpots" integer DEFAULT 0 NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Festival" OWNER TO admin;

--
-- Name: Inquiry; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Inquiry" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    "tripType" public."TripType",
    "tripId" text,
    "userId" text,
    subject text,
    message text NOT NULL,
    "isResolved" boolean DEFAULT false NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "resolvedById" text,
    "adminNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Inquiry" OWNER TO admin;

--
-- Name: Itinerary; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Itinerary" (
    id text NOT NULL,
    "tripId" text,
    title text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Itinerary" OWNER TO admin;

--
-- Name: ItineraryActivity; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."ItineraryActivity" (
    id text NOT NULL,
    "itineraryDayId" text NOT NULL,
    title text NOT NULL,
    description text,
    "time" text,
    "order" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ItineraryActivity" OWNER TO admin;

--
-- Name: ItineraryDay; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."ItineraryDay" (
    id text NOT NULL,
    "itineraryId" text NOT NULL,
    "dayNumber" integer NOT NULL,
    title text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ItineraryDay" OWNER TO admin;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    "paymentIntentId" text,
    type public."PaymentType" NOT NULL,
    status public."PaymentTransactionStatus" DEFAULT 'CREATED'::public."PaymentTransactionStatus" NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    "razorpayOrderId" text NOT NULL,
    "razorpayPaymentId" text,
    "razorpaySignature" text,
    "paymentMethod" text,
    "idempotencyKey" text NOT NULL,
    "failureCode" text,
    "failureReason" text,
    "receiptNumber" text,
    notes jsonb,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "receiptNumberInt" integer NOT NULL
);


ALTER TABLE public."Payment" OWNER TO admin;

--
-- Name: PaymentIntent; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."PaymentIntent" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    "razorpayOrderId" text NOT NULL,
    type public."PaymentType" NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    status public."PaymentIntentStatus" DEFAULT 'CREATED'::public."PaymentIntentStatus" NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PaymentIntent" OWNER TO admin;

--
-- Name: PaymentReminder; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."PaymentReminder" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    type public."ReminderType" NOT NULL,
    status public."ReminderStatus" DEFAULT 'PENDING'::public."ReminderStatus" NOT NULL,
    "sentBy" text,
    email text NOT NULL,
    subject text NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "providerMessageId" text,
    "failureReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PaymentReminder" OWNER TO admin;

--
-- Name: PaymentWebhook; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."PaymentWebhook" (
    id text NOT NULL,
    "eventId" text NOT NULL,
    "eventType" text NOT NULL,
    payload jsonb NOT NULL,
    signature text NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "processingError" text,
    "retryCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PaymentWebhook" OWNER TO admin;

--
-- Name: Payment_receiptNumberInt_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public."Payment_receiptNumberInt_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Payment_receiptNumberInt_seq" OWNER TO admin;

--
-- Name: Payment_receiptNumberInt_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public."Payment_receiptNumberInt_seq" OWNED BY public."Payment"."receiptNumberInt";


--
-- Name: Refund; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Refund" (
    id text NOT NULL,
    "paymentId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    status public."RefundStatus" DEFAULT 'PENDING'::public."RefundStatus" NOT NULL,
    reason text,
    "razorpayRefundId" text,
    "initiatedBy" text,
    "processedAt" timestamp(3) without time zone,
    "failureReason" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Refund" OWNER TO admin;

--
-- Name: Traveler; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Traveler" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    "fullName" text NOT NULL,
    gender text,
    "dateOfBirth" timestamp(3) without time zone,
    phone text,
    aadhaar text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Traveler" OWNER TO admin;

--
-- Name: Trip; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Trip" (
    id text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    location text NOT NULL,
    "bannerImages" text[],
    duration integer NOT NULL,
    "difficultyLevel" text NOT NULL,
    "bestTimeToVisit" text NOT NULL,
    "maxAltitude" integer NOT NULL,
    overview text NOT NULL,
    "galleryImages" text[],
    inclusions text[],
    exclusions text[],
    price numeric(10,2) NOT NULL,
    "tokenAmount" numeric(10,2) NOT NULL,
    capacity integer NOT NULL,
    "filledSpots" integer DEFAULT 0 NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "tripType" public."TripType" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "destinationId" text,
    "isPublished" boolean DEFAULT false NOT NULL,
    highlights jsonb DEFAULT '[]'::jsonb NOT NULL,
    "stayTransportImages" jsonb DEFAULT '[]'::jsonb NOT NULL
);


ALTER TABLE public."Trip" OWNER TO admin;

--
-- Name: TripTag; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."TripTag" (
    id text NOT NULL,
    tag text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TripTag" OWNER TO admin;

--
-- Name: User; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    "googleId" text NOT NULL,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO admin;

--
-- Name: UserProfile; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."UserProfile" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "fullName" text,
    phone text,
    "alternatePhone" text,
    "dateOfBirth" timestamp(3) without time zone,
    gender public."Gender",
    "addressLine1" text,
    "addressLine2" text,
    city text,
    state text,
    "postalCode" text,
    country text,
    "emergencyContactName" text,
    "emergencyContactPhone" text,
    "emergencyContactRelation" text,
    "bloodGroup" text,
    "medicalNotes" text,
    "govtIdType" public."GovtIdType",
    "govtIdNumber" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "govtIdImageUrl" text
);


ALTER TABLE public."UserProfile" OWNER TO admin;

--
-- Name: _TripToTripTag; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."_TripToTripTag" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_TripToTripTag" OWNER TO admin;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO admin;

--
-- Name: Payment receiptNumberInt; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Payment" ALTER COLUMN "receiptNumberInt" SET DEFAULT nextval('public."Payment_receiptNumberInt_seq"'::regclass);


--
-- Data for Name: Booking; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Booking" (id, "bookingReference", "userId", "tripId", status, "paymentStatus", "numberOfTravelers", "totalAmount", "tokenAmount", "amountPaid", "amountDue", "initialPaymentType", "balanceDueDate", "reservedAt", "confirmedAt", "cancelledAt", "completedAt", "cancellationReason", "cancelledBy", "specialRequests", "createdAt", "updatedAt") FROM stdin;
75b3d8b7-602d-42b4-a05e-f7aaef7058c2	HNG-2AF8DDDB	ec664699-1de8-4f9c-974b-d5f0135ca1d5	da700708-14c0-46a9-b06b-721b3ea2035f	PENDING	PENDING	1	20998.95	0.00	0.00	0.00	FULL	2026-09-13 18:30:00	\N	\N	\N	\N	\N	\N	Veg 	2026-07-06 11:02:09.225	2026-07-06 11:03:08.366
f590ae4b-3538-43b5-989d-a1e24d18f353	HNG-E47966BC	bf5262a4-d729-40aa-b7aa-6edc4689caac	da700708-14c0-46a9-b06b-721b3ea2035f	CONFIRMED	PAID	4	83995.80	0.00	83995.80	0.00	FULL	2026-09-13 18:30:00	\N	2026-07-06 15:31:38.56	\N	\N	\N	\N	\N	2026-07-06 15:30:33.553	2026-07-06 15:31:38.565
\.


--
-- Data for Name: Destination; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Destination" (id, name, state, subheading, "isPublished", "createdAt", "updatedAt") FROM stdin;
7bf7505d-0b18-469e-a885-ecf8415fe0fd	Ziro	Arunachal Pradesh		t	2026-07-06 05:57:43.794	2026-07-06 05:57:43.794
\.


--
-- Data for Name: FAQ; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."FAQ" (id, "tripId", question, answer, "order", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Festival; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Festival" (id, title, slug, location, "bannerImages", duration, "stageDays", "numberOfArtists", "difficultyLevel", "bestTimeToVisit", "maxAltitude", overview, highlights, "galleryImages", inclusions, exclusions, "stayTransportImages", price, "tokenAmount", capacity, "filledSpots", "startDate", "endDate", "isActive", "isFeatured", "isPublished", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Inquiry; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Inquiry" (id, name, email, phone, "tripType", "tripId", "userId", subject, message, "isResolved", "resolvedAt", "resolvedById", "adminNotes", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Itinerary; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Itinerary" (id, "tripId", title, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ItineraryActivity; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."ItineraryActivity" (id, "itineraryDayId", title, description, "time", "order", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ItineraryDay; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."ItineraryDay" (id, "itineraryId", "dayNumber", title, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Payment" (id, "bookingId", "paymentIntentId", type, status, amount, currency, "razorpayOrderId", "razorpayPaymentId", "razorpaySignature", "paymentMethod", "idempotencyKey", "failureCode", "failureReason", "receiptNumber", notes, "paidAt", "createdAt", "updatedAt", "receiptNumberInt") FROM stdin;
e07bda41-2f1f-4b54-a42f-925890c59bba	f590ae4b-3538-43b5-989d-a1e24d18f353	a4644361-d49b-45b2-9313-4677c2524824	FULL	SUCCESS	83995.80	INR	order_TAGcKMCu2L4srF	pay_TAGdBkONCUm5Lu	76ae5df1b99f871b65d92c7cfa960200521012b55ae55f7be6cec092f810ee6d	upi	f590ae4b-3538-43b5-989d-a1e24d18f353-FULL-order_TAGcKMCu2L4srF	\N	\N	RCPT-0B487361EF	{"paymentType": "FULL"}	2026-07-06 15:31:38.546	2026-07-06 15:31:38.547	2026-07-06 15:31:38.547	1
\.


--
-- Data for Name: PaymentIntent; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."PaymentIntent" (id, "bookingId", "razorpayOrderId", type, amount, currency, status, "expiresAt", "createdAt", "updatedAt") FROM stdin;
f3d6dc8f-9e94-4dec-8301-5a904a21a255	75b3d8b7-602d-42b4-a05e-f7aaef7058c2	order_TAC2oL6aY9Pe8I	FULL	20998.95	INR	EXPIRED	2026-07-06 11:17:10.013	2026-07-06 11:02:10.014	2026-07-06 11:03:09.534
3890c034-c50a-4f90-ac20-f59049f9fbda	75b3d8b7-602d-42b4-a05e-f7aaef7058c2	order_TAC3rOD8FjbDUn	FULL	20998.95	INR	CREATED	2026-07-06 11:18:09.608	2026-07-06 11:03:09.609	2026-07-06 11:03:09.609
a4644361-d49b-45b2-9313-4677c2524824	f590ae4b-3538-43b5-989d-a1e24d18f353	order_TAGcKMCu2L4srF	FULL	83995.80	INR	COMPLETED	2026-07-06 15:45:33.805	2026-07-06 15:30:33.806	2026-07-06 15:31:38.555
\.


--
-- Data for Name: PaymentReminder; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."PaymentReminder" (id, "bookingId", type, status, "sentBy", email, subject, "sentAt", "providerMessageId", "failureReason", "createdAt") FROM stdin;
\.


--
-- Data for Name: PaymentWebhook; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."PaymentWebhook" (id, "eventId", "eventType", payload, signature, processed, "processedAt", "processingError", "retryCount", "createdAt") FROM stdin;
5c78d8fb-50e0-43d7-9272-b9d5fd474e51	payment.authorized	payment.authorized	{"event": "payment.authorized", "entity": "event", "payload": {"payment": {"entity": {"id": "pay_TA74l7N2xJc6Im", "fee": null, "tax": null, "upi": {"vpa": "7374898467@slc", "flow": "intent", "payer_account_type": "credit_card"}, "vpa": "7374898467@slc", "bank": null, "email": "prokevish07@gmail.com", "notes": {"user_id": "f14e5ca8-e5d1-4faa-a00a-e022fc9ec50d", "booking_id": "2a6e7619-e2b5-4011-b1de-16f8ef124f20", "payment_type": "FULL"}, "amount": 100, "entity": "payment", "method": "upi", "reward": null, "status": "authorized", "wallet": null, "card_id": null, "contact": "+917374898467", "captured": false, "currency": "INR", "order_id": "order_TA74YV7gT6qKPB", "created_at": 1783318233, "error_code": null, "error_step": null, "invoice_id": null, "description": "ZIRO Music Festival — Full Payment", "error_reason": null, "error_source": null, "acquirer_data": {"rrn": "618748286718"}, "international": false, "refund_status": null, "amount_refunded": 0, "error_description": null}}}, "contains": ["payment"], "account_id": "acc_RrYeBvtEwMWN21", "created_at": 1783318233}	045ecc3190b9adb8461a597020dfe87bfa504732d812811f3502870cf30f5b95	t	2026-07-06 06:10:34.32	\N	0	2026-07-06 06:10:34.316
fcc61628-4bbc-4458-854d-50c6cfa99a89	payment.captured	payment.captured	{"event": "payment.captured", "entity": "event", "payload": {"payment": {"entity": {"id": "pay_TA74l7N2xJc6Im", "fee": 3, "tax": 0, "upi": {"vpa": "7374898467@slc", "flow": "intent", "payer_account_type": "credit_card"}, "vpa": "7374898467@slc", "bank": null, "email": "prokevish07@gmail.com", "notes": {"user_id": "f14e5ca8-e5d1-4faa-a00a-e022fc9ec50d", "booking_id": "2a6e7619-e2b5-4011-b1de-16f8ef124f20", "payment_type": "FULL"}, "amount": 100, "entity": "payment", "method": "upi", "reward": null, "status": "captured", "wallet": null, "card_id": null, "contact": "+917374898467", "captured": true, "currency": "INR", "order_id": "order_TA74YV7gT6qKPB", "created_at": 1783318233, "error_code": null, "error_step": null, "invoice_id": null, "base_amount": 100, "description": "ZIRO Music Festival — Full Payment", "error_reason": null, "error_source": null, "acquirer_data": {"rrn": "618748286718"}, "international": false, "refund_status": null, "amount_refunded": 0, "error_description": null}}}, "contains": ["payment"], "account_id": "acc_RrYeBvtEwMWN21", "created_at": 1783318234}	b375ef5a90694f15b4c6234a0f8fa3ace9446fe5ab92cd3cc0b9c354adf41e15	t	2026-07-06 06:10:36.816	\N	0	2026-07-06 06:10:35.101
ce753847-f1e5-4842-9ddc-c2bcf826e8de	refund.processed	refund.processed	{"event": "refund.processed", "entity": "event", "payload": {"refund": {"entity": {"id": "rfnd_TA76F1M7UAOnMX", "notes": {"reason": "Admin initiated cancellation and refund", "admin_id": "f14e5ca8-e5d1-4faa-a00a-e022fc9ec50d"}, "amount": 100, "entity": "refund", "status": "processed", "receipt": null, "batch_id": null, "currency": "INR", "created_at": 1783318316, "payment_id": "pay_TA74l7N2xJc6Im", "acquirer_data": {"rrn": "618711582861"}, "speed_processed": "normal", "speed_requested": "normal"}}, "payment": {"entity": {"id": "pay_TA74l7N2xJc6Im", "fee": 0, "tax": 0, "upi": {"vpa": "7374898467@slc", "flow": "intent", "payer_account_type": "credit_card"}, "vpa": "7374898467@slc", "bank": null, "email": "prokevish07@gmail.com", "notes": {"user_id": "f14e5ca8-e5d1-4faa-a00a-e022fc9ec50d", "booking_id": "2a6e7619-e2b5-4011-b1de-16f8ef124f20", "payment_type": "FULL"}, "amount": 100, "entity": "payment", "method": "upi", "status": "refunded", "wallet": null, "card_id": null, "contact": "+917374898467", "captured": true, "currency": "INR", "order_id": "order_TA74YV7gT6qKPB", "provider": null, "store_id": null, "token_id": null, "device_id": null, "account_id": null, "created_at": 1783318233, "error_code": null, "error_step": null, "fee_bearer": null, "invoice_id": null, "settled_by": null, "base_amount": 100, "customer_id": null, "description": "ZIRO Music Festival — Full Payment", "terminal_id": null, "error_reason": null, "error_source": null, "acquirer_data": {"rrn": "618748286718"}, "international": false, "receiver_type": null, "refund_status": "full", "source_channel": "online", "amount_refunded": 100, "internal_status": null, "gateway_provider": "Razorpay", "error_description": null, "amount_transferred": 0, "optimizer_provider": null, "gateway_merchant_id": null, "gateway_terminal_id": null}}}, "contains": ["refund", "payment"], "account_id": "acc_RrYeBvtEwMWN21", "created_at": 1783318320}	e9e7531d02baf1318bb46b546f27f8e90a38add4024ec5cb936a910994b7d469	t	2026-07-06 06:15:50.167	\N	0	2026-07-06 06:15:50.164
f662fc65-c604-4e4b-8443-c3f8ac486bfe	refund.created	refund.created	{"event": "refund.created", "entity": "event", "payload": {"refund": {"entity": {"id": "rfnd_TA76F1M7UAOnMX", "notes": {"reason": "Admin initiated cancellation and refund", "admin_id": "f14e5ca8-e5d1-4faa-a00a-e022fc9ec50d"}, "amount": 100, "entity": "refund", "status": "processed", "receipt": null, "batch_id": null, "currency": "INR", "created_at": 1783318316, "payment_id": "pay_TA74l7N2xJc6Im", "acquirer_data": {"rrn": "618711582861"}, "speed_processed": "normal", "speed_requested": "normal"}}, "payment": {"entity": {"id": "pay_TA74l7N2xJc6Im", "fee": 0, "tax": 0, "upi": {"vpa": "7374898467@slc", "flow": "intent", "payer_account_type": "credit_card"}, "vpa": "7374898467@slc", "bank": null, "email": "prokevish07@gmail.com", "notes": {"user_id": "f14e5ca8-e5d1-4faa-a00a-e022fc9ec50d", "booking_id": "2a6e7619-e2b5-4011-b1de-16f8ef124f20", "payment_type": "FULL"}, "amount": 100, "entity": "payment", "method": "upi", "status": "refunded", "wallet": null, "card_id": null, "contact": "+917374898467", "captured": true, "currency": "INR", "order_id": "order_TA74YV7gT6qKPB", "provider": null, "store_id": null, "token_id": null, "device_id": null, "account_id": null, "created_at": 1783318233, "error_code": null, "error_step": null, "fee_bearer": null, "invoice_id": null, "settled_by": null, "base_amount": 100, "customer_id": null, "description": "ZIRO Music Festival — Full Payment", "terminal_id": null, "error_reason": null, "error_source": null, "acquirer_data": {"rrn": "618748286718"}, "international": false, "receiver_type": null, "refund_status": "full", "source_channel": "online", "amount_refunded": 100, "internal_status": null, "gateway_provider": "Razorpay", "error_description": null, "amount_transferred": 0, "optimizer_provider": null, "gateway_merchant_id": null, "gateway_terminal_id": null}}}, "contains": ["refund", "payment"], "account_id": "acc_RrYeBvtEwMWN21", "created_at": 1783318320}	87f663881d01bdab06dc855f9ee48a7d40a08db43539c70070748b696134335c	t	2026-07-06 06:15:50.258	\N	0	2026-07-06 06:15:50.257
\.


--
-- Data for Name: Refund; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Refund" (id, "paymentId", amount, status, reason, "razorpayRefundId", "initiatedBy", "processedAt", "failureReason", metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Traveler; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Traveler" (id, "bookingId", "fullName", gender, "dateOfBirth", phone, aadhaar, "createdAt", "updatedAt") FROM stdin;
0b151701-a0c6-4343-bcaa-065fe6dfadfb	f590ae4b-3538-43b5-989d-a1e24d18f353	Vikas Eripurath	Male	1967-02-13 00:00:00	9847150043	\N	2026-07-06 15:30:33.553	2026-07-06 15:30:33.553
84749e2d-887d-4ebe-b8d0-c21a00daa6c2	f590ae4b-3538-43b5-989d-a1e24d18f353	Jayachandran  R	Male	1969-05-19 00:00:00	9447683836	\N	2026-07-06 15:30:33.553	2026-07-06 15:30:33.553
2fd9b49c-dcb2-46a7-b986-0ab42f9e566e	f590ae4b-3538-43b5-989d-a1e24d18f353	Praveen  Sadasivan Pillai	Male	1968-10-06 00:00:00	7012798502	\N	2026-07-06 15:30:33.553	2026-07-06 15:30:33.553
\.


--
-- Data for Name: Trip; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Trip" (id, title, slug, location, "bannerImages", duration, "difficultyLevel", "bestTimeToVisit", "maxAltitude", overview, "galleryImages", inclusions, exclusions, price, "tokenAmount", capacity, "filledSpots", "startDate", "endDate", "tripType", "isActive", "isFeatured", "createdAt", "updatedAt", "destinationId", "isPublished", highlights, "stayTransportImages") FROM stdin;
da700708-14c0-46a9-b06b-721b3ea2035f	ZIRO Music Festival	ziro-music-festival-1783317381863	Ziro Valley, Arunachal Pradesh	{https://res.cloudinary.com/dwvff1v5l/image/upload/v1783049339/uploads/trips/eb4ce705-803b-41e0-b99f-6a753fa33a44/bannerimages/a9491ed2-9e0f-4602-9e9a-763779c085f7.png}	5	Moderate	September	0	At Hangover, we believe travel is more than reaching a destination, it's about the memories you create and the people you share\nthem with. From family vacations and couple getaways to student expeditions, group adventures, and customized tours, every\nexperience is thoughtfully curated to combine exploration, comfort, and meaningful connections.\nFounded by three IIT Madras MBA graduates, Hangover began with a vision to redefine travel in North-East India through authentic\nexperiences, carefully designed itineraries, and exceptional hospitality.\nBecause at Hangover, We don't just plan trips- We create experiences you'll never get over.	{}	{"Transport to and from Guwahati Airport/ Railway Station","Transport: Traveller","Food (4 Breakfasts)","Stay (4 Nights) in Campsite or Homestays","Afterparty charges (for Campsite Edition)","Wine Tasting and momo making workshop","1 Authentic Traditional lunch with Village walk","1 BBQ Night (Only for Homestay Edition) and Bonfire","Trekking Guide Charges","Fishing charges","Inner Line Permit","Reliable, experienced trip coordinator and local driver with great knowledge of the area and the terrain","Transfers and sightseeing as per the itinerary","First-aid kit"}	{"Lunch, Snacks, Dinner and Beverages","Festival Passes","BBQ Charges for Campsite Edition","Any Personal expenses / Medical expenses / Tips","Monuments Entry fees or adventure cost","Cycle Rentals and any charges incurred from the damage of cycle","Any cost arising out of unforeseen circumstances including medical emergencies and acts of God","Room heater charges if anyone wants a personal room heater","Extra days stay / food at any place during the tour because of bad weather or road blocking due to snow","Anything that is not mentioned in the above list of inclusions"}	19999.00	0.00	20	4	2026-09-23 18:30:00	2026-09-28 18:29:00	MOUNTAIN_TREK	t	t	2026-07-06 05:56:21.922	2026-07-07 05:32:54.616	7bf7505d-0b18-469e-a885-ecf8415fe0fd	t	[{"text": "Village Walk in Apatani Settlement", "imageUrl": "https://res.cloudinary.com/dwvff1v5l/image/upload/v1783049331/uploads/trips/eb4ce705-803b-41e0-b99f-6a753fa33a44/highlights/d2467710-d8a1-4af2-bcf2-c28aeb627894.webp"}, {"text": "Camping and After Party", "imageUrl": "https://res.cloudinary.com/dwvff1v5l/image/upload/v1783049332/uploads/trips/eb4ce705-803b-41e0-b99f-6a753fa33a44/highlights/d36c8743-4b86-4c57-8dff-c631d4d2aa32.webp"}, {"text": "Trekking and Adventure", "imageUrl": "https://res.cloudinary.com/dwvff1v5l/image/upload/v1783049334/uploads/trips/eb4ce705-803b-41e0-b99f-6a753fa33a44/highlights/0e6e3ad4-7788-4fc9-9576-472d135d9142.webp"}, {"text": "Lunch in Traditional Apatani Home", "imageUrl": "https://res.cloudinary.com/dwvff1v5l/image/upload/v1783049335/uploads/trips/eb4ce705-803b-41e0-b99f-6a753fa33a44/highlights/6ed81f07-1dba-4697-b9c0-932ec5b4c9eb.webp"}, {"text": "Camping Life", "imageUrl": "https://res.cloudinary.com/dwvff1v5l/image/upload/v1783049336/uploads/trips/eb4ce705-803b-41e0-b99f-6a753fa33a44/highlights/1796e491-75db-47a5-a4c3-80150e8099a5.webp"}]	[{"text": "Hotel Rooms", "imageUrl": "https://res.cloudinary.com/dwvff1v5l/image/upload/v1783049326/uploads/trips/eb4ce705-803b-41e0-b99f-6a753fa33a44/staytransport/1c190477-02ee-4e19-b009-c9252065bb66.webp"}, {"text": "Washrooms", "imageUrl": "https://res.cloudinary.com/dwvff1v5l/image/upload/v1783049327/uploads/trips/eb4ce705-803b-41e0-b99f-6a753fa33a44/staytransport/c0f4abfd-79af-4cf7-92e1-329cf3aa1a8b.webp"}, {"text": "Transport", "imageUrl": "https://res.cloudinary.com/dwvff1v5l/image/upload/v1783049328/uploads/trips/eb4ce705-803b-41e0-b99f-6a753fa33a44/staytransport/88d81b7a-fa17-4285-accf-6928fc10e63c.webp"}]
\.


--
-- Data for Name: TripTag; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."TripTag" (id, tag, "createdAt", "updatedAt") FROM stdin;
1bccbfec-c80e-47d1-94ea-66c6957c61f7	Ziro Music Festival	2026-07-06 05:57:26.42	2026-07-06 05:57:26.42
c25cc99b-f3cb-463d-9303-237a297ff643	NorthEast	2026-07-06 05:57:26.42	2026-07-06 05:57:26.42
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."User" (id, email, "googleId", role, "isActive", "lastLoginAt", "createdAt", "updatedAt") FROM stdin;
85bf9964-7118-4749-81fd-431776b0aad9	pandeyshivam.2110@gmail.com	114044260554545796980	USER	t	2026-07-07 14:21:53.941	2026-07-07 14:21:53.933	2026-07-07 14:21:53.941
dd9057cd-372b-4a83-975d-a62a5cd8f2eb	shivam5feb92@gmail.com	117100880050501765918	USER	t	2026-07-07 15:11:04.643	2026-07-07 14:35:40.149	2026-07-07 15:11:04.643
ec664699-1de8-4f9c-974b-d5f0135ca1d5	tokdonyi01@gmail.com	106764332876098106198	USER	t	2026-07-08 05:48:12.539	2026-07-06 07:12:54.234	2026-07-08 05:48:12.54
f14e5ca8-e5d1-4faa-a00a-e022fc9ec50d	prokevish07@gmail.com	101067060205025990151	ADMIN	t	2026-07-08 06:49:09.783	2026-07-06 05:53:14.572	2026-07-08 06:49:09.783
7aef2ee6-34cd-4a0d-8629-6b88211474fe	nimit.s25306@nst.rishihood.edu.in	118319155274636810791	USER	t	2026-07-08 06:49:54.205	2026-07-08 06:49:54.2	2026-07-08 06:49:54.205
bf5262a4-d729-40aa-b7aa-6edc4689caac	ajithkrishn@gmail.com	101843045057205985966	USER	t	2026-07-06 15:40:20.362	2026-07-06 11:44:37.205	2026-07-06 15:40:20.363
00299ec6-a0a6-49d8-ba5b-81f6958bbb5d	kaustavbanerjee262@gmail.com	108116520632440276694	USER	t	2026-07-06 16:04:15.417	2026-07-06 06:19:30.621	2026-07-06 16:04:15.418
83ec5006-ef95-4012-9264-688ad1abe5b8	thatfinalyeartrip@gmail.com	110195545661354488663	ADMIN	t	2026-07-06 16:08:12.601	2026-07-06 16:04:30.477	2026-07-06 16:08:12.602
\.


--
-- Data for Name: UserProfile; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."UserProfile" (id, "userId", "fullName", phone, "alternatePhone", "dateOfBirth", gender, "addressLine1", "addressLine2", city, state, "postalCode", country, "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "bloodGroup", "medicalNotes", "govtIdType", "govtIdNumber", "createdAt", "updatedAt", "govtIdImageUrl") FROM stdin;
e2dcb07c-b631-4a23-9a00-8f18fe0ac045	00299ec6-a0a6-49d8-ba5b-81f6958bbb5d	Kaustav Banerjee	8697351923	\N	2002-02-21 00:00:00	MALE	12	\N	\N	\N	700050	\N	\N	\N	\N	\N	\N	AADHAAR	\N	2026-07-06 06:19:30.621	2026-07-06 06:29:02.3	https://res.cloudinary.com/mezqfut0/image/upload/v1783319340/uploads/users/00299ec6-a0a6-49d8-ba5b-81f6958bbb5d/govtid/AADHAAR/doc.webp
cfb6148b-3960-42ac-8657-9abc6eeed4f3	f14e5ca8-e5d1-4faa-a00a-e022fc9ec50d	Kevish Sewliya	7374898467	\N	2026-07-03 00:00:00	MALE	Genius W	\N	\N	\N	341510	\N	\N	\N	\N	\N	\N	AADHAAR	\N	2026-07-06 05:53:14.572	2026-07-06 06:50:54.182	https://res.cloudinary.com/mezqfut0/image/upload/v1783318157/uploads/users/f14e5ca8-e5d1-4faa-a00a-e022fc9ec50d/govtid/AADHAAR/doc.webp
2e2bdded-feb2-4a50-aa34-f1603467514e	ec664699-1de8-4f9c-974b-d5f0135ca1d5	Donyi Tok	+918413872431	\N	2001-06-01 00:00:00	MALE	Papunallah	\N	\N	\N	791110	\N	\N	\N	\N	\N	\N	AADHAAR	\N	2026-07-06 07:12:54.234	2026-07-06 11:03:07.651	https://res.cloudinary.com/mezqfut0/image/upload/v1783335727/uploads/users/ec664699-1de8-4f9c-974b-d5f0135ca1d5/govtid/AADHAAR/doc.webp
608ff0d1-279d-4f04-9d2e-fd27798dc21b	bf5262a4-d729-40aa-b7aa-6edc4689caac	Ajith Krishnan	9388481041	\N	1969-05-20 00:00:00	MALE	33/1530, Ramakodam Lane, Elamakkara, Ernakulam, Kerala	\N	\N	\N	682026	\N	\N	\N	\N	\N	\N	AADHAAR	\N	2026-07-06 11:44:37.205	2026-07-06 15:30:33.441	https://res.cloudinary.com/mezqfut0/image/upload/v1783351831/uploads/users/bf5262a4-d729-40aa-b7aa-6edc4689caac/govtid/AADHAAR/doc.webp
f618c888-a7fc-45c8-b086-906d39babd5c	83ec5006-ef95-4012-9264-688ad1abe5b8	Hangover	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-06 16:04:30.477	2026-07-06 16:04:30.477	\N
453a6d49-c6ca-42c5-b284-fe6385c05e07	85bf9964-7118-4749-81fd-431776b0aad9	Shivam Pandey	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-07 14:21:53.933	2026-07-07 14:21:53.933	\N
76696016-96bc-4ec7-9edf-726d9df4d1b3	dd9057cd-372b-4a83-975d-a62a5cd8f2eb	Shevam JKS Saini	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-07 14:35:40.149	2026-07-07 14:35:40.149	\N
9fa19a0c-d66e-4120-80f7-5258edacf909	7aef2ee6-34cd-4a0d-8629-6b88211474fe	Nimit Sharma	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-07-08 06:49:54.2	2026-07-08 06:49:54.2	\N
\.


--
-- Data for Name: _TripToTripTag; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."_TripToTripTag" ("A", "B") FROM stdin;
da700708-14c0-46a9-b06b-721b3ea2035f	1bccbfec-c80e-47d1-94ea-66c6957c61f7
da700708-14c0-46a9-b06b-721b3ea2035f	c25cc99b-f3cb-463d-9303-237a297ff643
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
60a75e54-3859-4db9-9ec8-c37354e8d3d3	69a49ef7742758fe77e8860d27d2ee3cf06e34014fcf1b9d4de1599af605e667	2026-07-06 05:50:12.235665+00	20260630182050_create_tables	\N	\N	2026-07-06 05:50:02.683752+00	1
fa2f0f87-052f-4eb3-b82b-44d83536b346	8ce27608c079ac08d7f6004c5e0961a78b3642ff56cdd609da2441934e230dbb	2026-07-06 05:50:13.299206+00	20260630184000_remove_govt_enums	\N	\N	2026-07-06 05:50:12.40036+00	1
f3d6f273-4cc2-4413-b790-0105fe07550d	8e2ef6d1cd5f9fa2220c0d451146874d3219e3a34c491c2ccd4ed3001a93f9a5	2026-07-06 05:50:14.999212+00	20260630190131_iteneraies	\N	\N	2026-07-06 05:50:13.453675+00	1
d7a579b9-ebe4-4422-9dfe-e5c36b481c14	3952f61484936b7858f8ebf434874b983755aea3d2c8271ab7e49c07e3d67268	2026-07-06 05:50:16.531967+00	20260701064102_schema_fixes	\N	\N	2026-07-06 05:50:15.164527+00	1
\.


--
-- Name: Payment_receiptNumberInt_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Payment_receiptNumberInt_seq"', 1, true);


--
-- Name: Booking Booking_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_pkey" PRIMARY KEY (id);


--
-- Name: Destination Destination_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Destination"
    ADD CONSTRAINT "Destination_pkey" PRIMARY KEY (id);


--
-- Name: FAQ FAQ_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."FAQ"
    ADD CONSTRAINT "FAQ_pkey" PRIMARY KEY (id);


--
-- Name: Festival Festival_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Festival"
    ADD CONSTRAINT "Festival_pkey" PRIMARY KEY (id);


--
-- Name: Inquiry Inquiry_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Inquiry"
    ADD CONSTRAINT "Inquiry_pkey" PRIMARY KEY (id);


--
-- Name: ItineraryActivity ItineraryActivity_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ItineraryActivity"
    ADD CONSTRAINT "ItineraryActivity_pkey" PRIMARY KEY (id);


--
-- Name: ItineraryDay ItineraryDay_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ItineraryDay"
    ADD CONSTRAINT "ItineraryDay_pkey" PRIMARY KEY (id);


--
-- Name: Itinerary Itinerary_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Itinerary"
    ADD CONSTRAINT "Itinerary_pkey" PRIMARY KEY (id);


--
-- Name: PaymentIntent PaymentIntent_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."PaymentIntent"
    ADD CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY (id);


--
-- Name: PaymentReminder PaymentReminder_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."PaymentReminder"
    ADD CONSTRAINT "PaymentReminder_pkey" PRIMARY KEY (id);


--
-- Name: PaymentWebhook PaymentWebhook_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."PaymentWebhook"
    ADD CONSTRAINT "PaymentWebhook_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: Refund Refund_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Refund"
    ADD CONSTRAINT "Refund_pkey" PRIMARY KEY (id);


--
-- Name: Traveler Traveler_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Traveler"
    ADD CONSTRAINT "Traveler_pkey" PRIMARY KEY (id);


--
-- Name: TripTag TripTag_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."TripTag"
    ADD CONSTRAINT "TripTag_pkey" PRIMARY KEY (id);


--
-- Name: Trip Trip_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Trip"
    ADD CONSTRAINT "Trip_pkey" PRIMARY KEY (id);


--
-- Name: UserProfile UserProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."UserProfile"
    ADD CONSTRAINT "UserProfile_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _TripToTripTag _TripToTripTag_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."_TripToTripTag"
    ADD CONSTRAINT "_TripToTripTag_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Booking_balanceDueDate_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Booking_balanceDueDate_idx" ON public."Booking" USING btree ("balanceDueDate");


--
-- Name: Booking_bookingReference_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Booking_bookingReference_key" ON public."Booking" USING btree ("bookingReference");


--
-- Name: Booking_paymentStatus_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Booking_paymentStatus_idx" ON public."Booking" USING btree ("paymentStatus");


--
-- Name: Booking_status_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Booking_status_idx" ON public."Booking" USING btree (status);


--
-- Name: Booking_tripId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Booking_tripId_idx" ON public."Booking" USING btree ("tripId");


--
-- Name: Booking_userId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Booking_userId_idx" ON public."Booking" USING btree ("userId");


--
-- Name: Destination_isPublished_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Destination_isPublished_idx" ON public."Destination" USING btree ("isPublished");


--
-- Name: FAQ_order_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "FAQ_order_idx" ON public."FAQ" USING btree ("order");


--
-- Name: FAQ_tripId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "FAQ_tripId_idx" ON public."FAQ" USING btree ("tripId");


--
-- Name: Festival_isActive_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Festival_isActive_idx" ON public."Festival" USING btree ("isActive");


--
-- Name: Festival_isFeatured_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Festival_isFeatured_idx" ON public."Festival" USING btree ("isFeatured");


--
-- Name: Festival_isPublished_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Festival_isPublished_idx" ON public."Festival" USING btree ("isPublished");


--
-- Name: Festival_location_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Festival_location_idx" ON public."Festival" USING btree (location);


--
-- Name: Festival_slug_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Festival_slug_key" ON public."Festival" USING btree (slug);


--
-- Name: Festival_startDate_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Festival_startDate_idx" ON public."Festival" USING btree ("startDate");


--
-- Name: Inquiry_createdAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Inquiry_createdAt_idx" ON public."Inquiry" USING btree ("createdAt");


--
-- Name: Inquiry_email_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Inquiry_email_idx" ON public."Inquiry" USING btree (email);


--
-- Name: Inquiry_isResolved_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Inquiry_isResolved_idx" ON public."Inquiry" USING btree ("isResolved");


--
-- Name: Inquiry_tripId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Inquiry_tripId_idx" ON public."Inquiry" USING btree ("tripId");


--
-- Name: Inquiry_userId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Inquiry_userId_idx" ON public."Inquiry" USING btree ("userId");


--
-- Name: ItineraryActivity_itineraryDayId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "ItineraryActivity_itineraryDayId_idx" ON public."ItineraryActivity" USING btree ("itineraryDayId");


--
-- Name: ItineraryActivity_order_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "ItineraryActivity_order_idx" ON public."ItineraryActivity" USING btree ("order");


--
-- Name: ItineraryDay_itineraryId_dayNumber_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "ItineraryDay_itineraryId_dayNumber_key" ON public."ItineraryDay" USING btree ("itineraryId", "dayNumber");


--
-- Name: ItineraryDay_itineraryId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "ItineraryDay_itineraryId_idx" ON public."ItineraryDay" USING btree ("itineraryId");


--
-- Name: Itinerary_tripId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Itinerary_tripId_idx" ON public."Itinerary" USING btree ("tripId");


--
-- Name: PaymentIntent_bookingId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "PaymentIntent_bookingId_idx" ON public."PaymentIntent" USING btree ("bookingId");


--
-- Name: PaymentIntent_razorpayOrderId_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "PaymentIntent_razorpayOrderId_key" ON public."PaymentIntent" USING btree ("razorpayOrderId");


--
-- Name: PaymentIntent_status_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "PaymentIntent_status_idx" ON public."PaymentIntent" USING btree (status);


--
-- Name: PaymentReminder_bookingId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "PaymentReminder_bookingId_idx" ON public."PaymentReminder" USING btree ("bookingId");


--
-- Name: PaymentReminder_createdAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "PaymentReminder_createdAt_idx" ON public."PaymentReminder" USING btree ("createdAt");


--
-- Name: PaymentReminder_status_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "PaymentReminder_status_idx" ON public."PaymentReminder" USING btree (status);


--
-- Name: PaymentWebhook_createdAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "PaymentWebhook_createdAt_idx" ON public."PaymentWebhook" USING btree ("createdAt");


--
-- Name: PaymentWebhook_eventId_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "PaymentWebhook_eventId_key" ON public."PaymentWebhook" USING btree ("eventId");


--
-- Name: PaymentWebhook_eventType_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "PaymentWebhook_eventType_idx" ON public."PaymentWebhook" USING btree ("eventType");


--
-- Name: PaymentWebhook_processed_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "PaymentWebhook_processed_idx" ON public."PaymentWebhook" USING btree (processed);


--
-- Name: Payment_bookingId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Payment_bookingId_idx" ON public."Payment" USING btree ("bookingId");


--
-- Name: Payment_createdAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Payment_createdAt_idx" ON public."Payment" USING btree ("createdAt");


--
-- Name: Payment_idempotencyKey_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON public."Payment" USING btree ("idempotencyKey");


--
-- Name: Payment_paidAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Payment_paidAt_idx" ON public."Payment" USING btree ("paidAt");


--
-- Name: Payment_paymentIntentId_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Payment_paymentIntentId_key" ON public."Payment" USING btree ("paymentIntentId");


--
-- Name: Payment_razorpayOrderId_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON public."Payment" USING btree ("razorpayOrderId");


--
-- Name: Payment_razorpayPaymentId_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON public."Payment" USING btree ("razorpayPaymentId");


--
-- Name: Payment_receiptNumber_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON public."Payment" USING btree ("receiptNumber");


--
-- Name: Payment_status_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Payment_status_idx" ON public."Payment" USING btree (status);


--
-- Name: Payment_type_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Payment_type_idx" ON public."Payment" USING btree (type);


--
-- Name: Refund_createdAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Refund_createdAt_idx" ON public."Refund" USING btree ("createdAt");


--
-- Name: Refund_paymentId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Refund_paymentId_idx" ON public."Refund" USING btree ("paymentId");


--
-- Name: Refund_razorpayRefundId_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Refund_razorpayRefundId_key" ON public."Refund" USING btree ("razorpayRefundId");


--
-- Name: Refund_status_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Refund_status_idx" ON public."Refund" USING btree (status);


--
-- Name: Traveler_bookingId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Traveler_bookingId_idx" ON public."Traveler" USING btree ("bookingId");


--
-- Name: TripTag_tag_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "TripTag_tag_key" ON public."TripTag" USING btree (tag);


--
-- Name: Trip_destinationId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Trip_destinationId_idx" ON public."Trip" USING btree ("destinationId");


--
-- Name: Trip_isActive_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Trip_isActive_idx" ON public."Trip" USING btree ("isActive");


--
-- Name: Trip_isFeatured_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Trip_isFeatured_idx" ON public."Trip" USING btree ("isFeatured");


--
-- Name: Trip_isPublished_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Trip_isPublished_idx" ON public."Trip" USING btree ("isPublished");


--
-- Name: Trip_location_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Trip_location_idx" ON public."Trip" USING btree (location);


--
-- Name: Trip_slug_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Trip_slug_key" ON public."Trip" USING btree (slug);


--
-- Name: Trip_startDate_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Trip_startDate_idx" ON public."Trip" USING btree ("startDate");


--
-- Name: Trip_tripType_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Trip_tripType_idx" ON public."Trip" USING btree ("tripType");


--
-- Name: UserProfile_govtIdNumber_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "UserProfile_govtIdNumber_idx" ON public."UserProfile" USING btree ("govtIdNumber");


--
-- Name: UserProfile_userId_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "UserProfile_userId_key" ON public."UserProfile" USING btree ("userId");


--
-- Name: User_email_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "User_email_idx" ON public."User" USING btree (email);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_googleId_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "User_googleId_key" ON public."User" USING btree ("googleId");


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: _TripToTripTag_B_index; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "_TripToTripTag_B_index" ON public."_TripToTripTag" USING btree ("B");


--
-- Name: Booking Booking_tripId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES public."Trip"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Booking Booking_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FAQ FAQ_tripId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."FAQ"
    ADD CONSTRAINT "FAQ_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES public."Trip"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Inquiry Inquiry_resolvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Inquiry"
    ADD CONSTRAINT "Inquiry_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Inquiry Inquiry_tripId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Inquiry"
    ADD CONSTRAINT "Inquiry_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES public."Trip"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Inquiry Inquiry_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Inquiry"
    ADD CONSTRAINT "Inquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ItineraryActivity ItineraryActivity_itineraryDayId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ItineraryActivity"
    ADD CONSTRAINT "ItineraryActivity_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES public."ItineraryDay"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ItineraryDay ItineraryDay_itineraryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."ItineraryDay"
    ADD CONSTRAINT "ItineraryDay_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES public."Itinerary"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Itinerary Itinerary_tripId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Itinerary"
    ADD CONSTRAINT "Itinerary_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES public."Trip"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PaymentIntent PaymentIntent_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."PaymentIntent"
    ADD CONSTRAINT "PaymentIntent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PaymentReminder PaymentReminder_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."PaymentReminder"
    ADD CONSTRAINT "PaymentReminder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_paymentIntentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES public."PaymentIntent"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Refund Refund_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Refund"
    ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public."Payment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Traveler Traveler_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Traveler"
    ADD CONSTRAINT "Traveler_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Trip Trip_destinationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Trip"
    ADD CONSTRAINT "Trip_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES public."Destination"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserProfile UserProfile_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."UserProfile"
    ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _TripToTripTag _TripToTripTag_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."_TripToTripTag"
    ADD CONSTRAINT "_TripToTripTag_A_fkey" FOREIGN KEY ("A") REFERENCES public."Trip"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _TripToTripTag _TripToTripTag_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."_TripToTripTag"
    ADD CONSTRAINT "_TripToTripTag_B_fkey" FOREIGN KEY ("B") REFERENCES public."TripTag"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: admin
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict ptnJ9kjKY5eAzYd5HmnjyDkwGfnqERZMuk614R9gs7fcSMgI8hAphg8Ef1VVAg1

