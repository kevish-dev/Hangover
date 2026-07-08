--
-- PostgreSQL database dump
--

\restrict BQtM4xjbwCcF819c7w8LjNL3dB9LrnumwDmTEZHCzaHP952xheHqIsLeItMwNId

-- Dumped from database version 15.18
-- Dumped by pg_dump version 18.3 (Homebrew)

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
    "tripId" text,
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "festivalId" text,
    "packageId" text,
    "slotId" text NOT NULL
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
    "tripId" text,
    question text NOT NULL,
    answer text NOT NULL,
    "order" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "festivalId" text
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
    "isActive" boolean DEFAULT true NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "destinationId" text,
    "videoUrl" text
);


ALTER TABLE public."Festival" OWNER TO admin;

--
-- Name: FestivalTag; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."FestivalTag" (
    id text NOT NULL,
    tag text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FestivalTag" OWNER TO admin;

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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "festivalId" text
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
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "festivalId" text
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
-- Name: Package; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Package" (
    id text NOT NULL,
    "tripId" text,
    "festivalId" text,
    title text NOT NULL,
    price numeric(10,2) NOT NULL,
    "tokenAmount" numeric(10,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Package" OWNER TO admin;

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
    "receiptNumberInt" integer
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
-- Name: Slot; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Slot" (
    id text NOT NULL,
    "tripId" text,
    "festivalId" text,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    capacity integer NOT NULL,
    "filledSpots" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Slot" OWNER TO admin;

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
    highlights jsonb DEFAULT '[]'::jsonb NOT NULL,
    "galleryImages" text[],
    inclusions text[],
    exclusions text[],
    "stayTransportImages" jsonb DEFAULT '[]'::jsonb NOT NULL,
    price numeric(10,2) NOT NULL,
    "tokenAmount" numeric(10,2) NOT NULL,
    "tripType" public."TripType" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "destinationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
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
    "govtIdImageUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UserProfile" OWNER TO admin;

--
-- Name: _FestivalToFestivalTag; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."_FestivalToFestivalTag" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_FestivalToFestivalTag" OWNER TO admin;

--
-- Name: _TripToTripTag; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."_TripToTripTag" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_TripToTripTag" OWNER TO admin;

--
-- Name: Payment receiptNumberInt; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Payment" ALTER COLUMN "receiptNumberInt" SET DEFAULT nextval('public."Payment_receiptNumberInt_seq"'::regclass);


--
-- Data for Name: Booking; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Booking" (id, "bookingReference", "userId", "tripId", status, "paymentStatus", "numberOfTravelers", "totalAmount", "tokenAmount", "amountPaid", "amountDue", "initialPaymentType", "balanceDueDate", "reservedAt", "confirmedAt", "cancelledAt", "completedAt", "cancellationReason", "cancelledBy", "specialRequests", "createdAt", "updatedAt", "festivalId", "packageId", "slotId") FROM stdin;
a3a5aa9a-6a91-47a1-84f5-8eb35e102bf8	HNG-0FC8DA89	5ef36453-36a7-4099-9cc7-e6012ed162d7	4c6c9cbc-1208-48d1-9b02-0bfae92bc790	CANCELLED	REFUNDED	1	5.00	2.00	5.00	0.00	TOKEN	2026-06-25 11:08:00	2026-07-04 11:14:52.063	2026-07-04 11:16:00.297	2026-07-04 11:17:24.845	\N	Admin initiated cancellation and refund	5ef36453-36a7-4099-9cc7-e6012ed162d7	\N	2026-07-04 11:14:09.464	2026-07-06 19:08:53.995	\N	\N	201e962d-acc1-4c5f-8f75-5b095a636fcd
789f8d5c-f4ba-416f-9e95-ea5eeb74e1c9	HNG-7E916E95	5ef36453-36a7-4099-9cc7-e6012ed162d7	4c6c9cbc-1208-48d1-9b02-0bfae92bc790	CANCELLED	REFUNDED	2	10.50	4.20	10.50	0.00	TOKEN	2026-06-25 11:08:00	2026-07-06 08:09:54.055	2026-07-06 08:12:32.577	2026-07-06 08:13:01.546	\N	Admin initiated cancellation	5ef36453-36a7-4099-9cc7-e6012ed162d7	\N	2026-07-06 08:09:28.981	2026-07-06 19:08:53.995	\N	\N	201e962d-acc1-4c5f-8f75-5b095a636fcd
da473526-ced7-4e9e-905b-7907c1c25cdf	HNG-4D6F4BD8	5ef36453-36a7-4099-9cc7-e6012ed162d7	4c6c9cbc-1208-48d1-9b02-0bfae92bc790	CANCELLED	REFUNDED	1	5.25	2.10	5.25	0.00	FULL	2026-06-25 11:08:00	\N	2026-07-06 08:17:05.313	2026-07-06 18:57:11.659	\N	Admin initiated cancellation	5ef36453-36a7-4099-9cc7-e6012ed162d7	\N	2026-07-06 08:16:43.004	2026-07-06 19:08:53.995	\N	\N	201e962d-acc1-4c5f-8f75-5b095a636fcd
fc7b38f4-4ea5-429a-a630-dc80c5a4f674	HNG-6322F532	5ef36453-36a7-4099-9cc7-e6012ed162d7	\N	PENDING	PENDING	1	5.25	2.10	0.00	3.15	TOKEN	2026-06-25 11:08:00	\N	\N	\N	\N	\N	\N	\N	2026-07-07 12:38:16.828	2026-07-07 12:40:05.826	\N	\N	201e962d-acc1-4c5f-8f75-5b095a636fcd
\.


--
-- Data for Name: Destination; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Destination" (id, name, state, subheading, "isPublished", "createdAt", "updatedAt") FROM stdin;
4d95cddd-8de1-447a-9312-2ecb0050001c	test	test	hfvuijomgbdk	t	2026-07-04 11:10:30.166	2026-07-04 11:10:30.166
\.


--
-- Data for Name: FAQ; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."FAQ" (id, "tripId", question, answer, "order", "createdAt", "updatedAt", "festivalId") FROM stdin;
43d850d9-bc11-4e1a-9c99-4efe1008e4d5	4c6c9cbc-1208-48d1-9b02-0bfae92bc790	ques 1	ans 1	0	2026-07-07 12:35:49.122	2026-07-07 12:35:49.122	\N
58af7ced-3ca3-4ea8-a454-71873a0daf78	4c6c9cbc-1208-48d1-9b02-0bfae92bc790	ques 2	ans 2	1	2026-07-07 12:35:49.122	2026-07-07 12:35:49.122	\N
e4c19fc4-9be7-4363-a80d-b242695996d4	d176c10d-e1e1-4704-9d83-5428990daf68	Is the Inner Line Permit included?	Pickup and drop are from Dibrugarh Airport or Railway Station.	1	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891	\N
1f271401-fa68-44f9-848a-c7b44303a9ad	d176c10d-e1e1-4704-9d83-5428990daf68	What type of accommodation is provided?	Yes, Inner Line Permit and all required passes are included.	2	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891	\N
3d47969d-1efa-409c-848b-96130bbd4ef0	d176c10d-e1e1-4704-9d83-5428990daf68	What meals are included?	Premium resorts, camps, and local homestays as per the itinerary.	3	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891	\N
8b3a3331-5793-43a6-85f2-9436069b6a0c	d176c10d-e1e1-4704-9d83-5428990daf68	Is the Pomo Trek suitable for beginners?	Only breakfast is included for all 7 days.	4	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891	\N
\.


--
-- Data for Name: Festival; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Festival" (id, title, slug, location, "bannerImages", duration, "difficultyLevel", "bestTimeToVisit", "maxAltitude", overview, highlights, "galleryImages", inclusions, exclusions, "stayTransportImages", price, "tokenAmount", "isActive", "isFeatured", "isPublished", "createdAt", "updatedAt", "destinationId", "videoUrl") FROM stdin;
\.


--
-- Data for Name: FestivalTag; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."FestivalTag" (id, tag, "createdAt", "updatedAt") FROM stdin;
2efb817e-4941-46fc-a19e-56084663ef87	frewqferq	2026-07-06 18:05:09.758	2026-07-06 18:05:09.758
\.


--
-- Data for Name: Inquiry; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Inquiry" (id, name, email, phone, "tripType", "tripId", "userId", subject, message, "isResolved", "resolvedAt", "resolvedById", "adminNotes", "createdAt", "updatedAt", "festivalId") FROM stdin;
\.


--
-- Data for Name: Itinerary; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Itinerary" (id, "tripId", title, description, "createdAt", "updatedAt", "festivalId") FROM stdin;
2113becf-f1f9-4a10-bee5-4d0fb025ae03	4c6c9cbc-1208-48d1-9b02-0bfae92bc790	Main Itinerary	this the itenary	2026-07-07 12:35:49.122	2026-07-07 12:35:49.122	\N
c97e6dac-0c2b-4b5f-9852-0c33c9dfb88d	d176c10d-e1e1-4704-9d83-5428990daf68	Standard Itinerary		2026-07-07 13:07:12.891	2026-07-07 13:07:12.891	\N
8e112f16-6896-49dc-9732-ad418db3eea3	cd551328-0e12-4c79-a865-385704a47b78	Standard Itinerary		2026-07-07 13:07:12.925	2026-07-07 13:07:12.925	\N
123aca8f-f6ac-4936-9a07-65eedda25704	b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	Standard Itinerary		2026-07-07 13:07:12.943	2026-07-07 13:07:12.943	\N
23f82e83-d5e4-47cd-acd9-b4dc3b52f300	702fd9f3-8e18-477c-8a70-f97d05f7adbc	Standard Itinerary		2026-07-07 13:07:12.962	2026-07-07 13:07:12.962	\N
a1786710-61bb-4d07-b7d8-1b58e3b2e255	f567f94b-fd89-4785-b260-fb629f15d72e	Standard Itinerary		2026-07-07 13:07:12.981	2026-07-07 13:07:12.981	\N
\.


--
-- Data for Name: ItineraryActivity; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."ItineraryActivity" (id, "itineraryDayId", title, description, "time", "order", "createdAt", "updatedAt") FROM stdin;
13ec40e4-71ce-42bd-8ca4-e94fcb7cf28b	4adb980e-7af3-4662-b592-63bd9832e5fd	1st act	1st act desc	1	0	2026-07-07 12:35:49.122	2026-07-07 12:35:49.122
\.


--
-- Data for Name: ItineraryDay; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."ItineraryDay" (id, "itineraryId", "dayNumber", title, description, "createdAt", "updatedAt") FROM stdin;
4adb980e-7af3-4662-b592-63bd9832e5fd	2113becf-f1f9-4a10-bee5-4d0fb025ae03	1	day 1	test 1 	2026-07-07 12:35:49.122	2026-07-07 12:35:49.122
b52d09be-48e6-4e2d-af34-d8aeffb0350e	c97e6dac-0c2b-4b5f-9852-0c33c9dfb88d	1	Day 1	Arrive at Dibrugarh and drive to Roing. Explore the local market and stay overnight.	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
7d5b3695-2281-4d16-b5d5-216ce8d762c2	c97e6dac-0c2b-4b5f-9852-0c33c9dfb88d	2	Day 2	Journey from Roing to Anini via Mayodiya Pass and enjoy panoramic mountain views.	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
574904ce-89ed-4c41-a9b9-2e4311384a15	c97e6dac-0c2b-4b5f-9852-0c33c9dfb88d	3	Day 3	Excursion to the scenic Acheso Valley and return to Anini.	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
cbadac9c-f5c9-4929-9439-48c092b784f5	c97e6dac-0c2b-4b5f-9852-0c33c9dfb88d	4	Day 4	Full-day Pomo Valley Trek through lakes, waterfalls, and grasslands.	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
ce5f30e0-eada-4bca-ac5b-37c82f7950ff	c97e6dac-0c2b-4b5f-9852-0c33c9dfb88d	5	Day 5	Explore Mathu Valley, local villages, and interact with the Idu Mishmi Tribe.	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
629a5a64-2651-473d-b376-46bf2687ade3	c97e6dac-0c2b-4b5f-9852-0c33c9dfb88d	6	Day 6	Scenic drive from Anini to Namsai.	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
84d370de-656e-457f-a52d-fe58907f6ce9	c97e6dac-0c2b-4b5f-9852-0c33c9dfb88d	7	Day 7	Visit Parshuram Kund and the Golden Pagoda. Leisure evening at a riverside resort.	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
88b86c40-62e7-465c-a1c1-8eeee04991a4	c97e6dac-0c2b-4b5f-9852-0c33c9dfb88d	8	Day 8	Depart from Namsai to Dibrugarh for onward journey.	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
33a302cb-913e-4d34-8529-dd6fc2763a88	8e112f16-6896-49dc-9732-ad418db3eea3	1	Day 1	Arrive at Dibrugarh and drive to Aalo. Overnight stay in homestay.	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
b6e6a219-009b-4b47-8ccd-a7a25d3492ae	8e112f16-6896-49dc-9732-ad418db3eea3	2	Day 2	Visit Kaying village and Siko Dido Waterfall before reaching Mechuka. Explore local market.	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
3cf07002-cbc2-4081-985a-a12aff6c1732	8e112f16-6896-49dc-9732-ad418db3eea3	3	Day 3	Visit Hanuman Mandir, Gurudwara, Ancient Buddhist Cave, Dorjeeling and Rabeng villages, Gompas, and enjoy BBQ Night.	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
f8e702c8-2f99-499c-9eec-f4a60d881d34	8e112f16-6896-49dc-9732-ad418db3eea3	4	Day 4	Trek to Mechuka La, visit Adventure Park and witness Gorshey community dance festival.	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
52efcdd7-95b7-474b-bf6f-ba01d2344db1	8e112f16-6896-49dc-9732-ad418db3eea3	5	Day 5	Depart Mechuka, stop at Aalo and explore Pasighat.	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
bc716615-be4c-432e-80f5-f7663b354636	8e112f16-6896-49dc-9732-ad418db3eea3	6	Day 6	Drive to Dibrugarh for airport or railway station drop.	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
ed6b9a4e-ba75-46bd-9b59-7210f743b130	123aca8f-f6ac-4936-9a07-65eedda25704	1	Day 1	Arrive at Guwahati and drive to Jamiri. Check into your stay and relax.	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
c00d3ef0-ed41-44a7-916d-b3c6c92c29d7	123aca8f-f6ac-4936-9a07-65eedda25704	2	Day 2	Travel from Jamiri to Dirang. Visit Gonpa Monastery, Nag Mandir, and Dirang Monastery.	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
d9c5cd75-9236-494b-b150-0043323ff6fa	123aca8f-f6ac-4936-9a07-65eedda25704	3	Day 3	Explore Sangti Valley with a short trek, culinary workshop, and riverside bonfire.	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
ee8ec128-b902-4989-98b3-f591662cbe1c	123aca8f-f6ac-4936-9a07-65eedda25704	4	Day 4	Journey to Tawang via Sela Pass, Sela Lake, and Jang Waterfall. Visit Tawang Monastery and Giant Buddha Statue.	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
88523a66-537b-4008-98e3-253f809f265b	123aca8f-f6ac-4936-9a07-65eedda25704	5	Day 5	Excursion to Bum La Pass, PTSO Lake, Madhuri Lake, Tawang War Memorial, and Tawang Market.	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
546df7d5-6f51-495a-88ee-c9a4ba83bbb7	123aca8f-f6ac-4936-9a07-65eedda25704	6	Day 6	Travel to Rupa via Sela Tunnel. Visit Jaswant Garh War Memorial and Bomdila Top.	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
5c2232d0-88a8-4f90-a83b-7c3ed57475a9	123aca8f-f6ac-4936-9a07-65eedda25704	7	Day 7	Enjoy breakfast and depart for Guwahati with unforgettable memories.	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
f9f87f10-2154-4494-afae-c7b5996dd457	23f82e83-d5e4-47cd-acd9-b4dc3b52f300	1	Day 1	Arrive in Guwahati and transfer to Kaziranga. Relax and prepare for the adventure ahead.	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
3b7195ae-8ef6-4ad5-a4c2-f03abea29c75	23f82e83-d5e4-47cd-acd9-b4dc3b52f300	2	Day 2	Enjoy a safari in Kaziranga National Park and spot the One Horn Rhinoceros. Travel onward to Itanagar.	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
90fe5ee9-2e03-47cc-a30e-62ee3d19466d	23f82e83-d5e4-47cd-acd9-b4dc3b52f300	3	Day 3	Journey to Ziro Valley, visit Sree Sidheswar Nath Temple and Shee Lake, enjoy cycling, wine tasting, and momo-making workshop.	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
b2f4f928-8f45-434d-9581-95b1ad85a93b	23f82e83-d5e4-47cd-acd9-b4dc3b52f300	4	Day 4	Sunrise at Pamu Yalang viewpoint, explore Apatani villages, enjoy an authentic tribal lunch, cultural storytelling session, and BBQ night.	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
fa7e999e-d483-492d-8e2a-e48b17c3221d	23f82e83-d5e4-47cd-acd9-b4dc3b52f300	5	Day 5	Bid farewell to Ziro Valley and transfer to Itanagar Airport or Naharlagun Railway Station.	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
43695b2e-08a1-4d04-990e-ac3ef91e9e4d	a1786710-61bb-4d07-b7d8-1b58e3b2e255	1	Day 1	Depart from Guwahati, visit Tezpur, Bhalukpong, Nag Mandir, Bomdila and Jamiri before reaching Sangti Valley.	2026-07-07 13:07:12.981	2026-07-07 13:07:12.981
8d3dd52e-4888-4ca7-943f-3a6bc96d27c8	a1786710-61bb-4d07-b7d8-1b58e3b2e255	2	Day 2	Explore Dirang Monastery and Dirang Fort. Trek to an Apple Orchard and enjoy riverside evening snacks.	2026-07-07 13:07:12.981	2026-07-07 13:07:12.981
29086a09-7775-4466-a06d-5a15fd9bb73a	a1786710-61bb-4d07-b7d8-1b58e3b2e255	3	Day 3	Travel to Tawang via Sela Pass and Sela Lake. Visit Tawang Monastery, Giant Buddha Statue, War Memorial and local market.	2026-07-07 13:07:12.981	2026-07-07 13:07:12.981
6e2981a3-dd89-4825-85cd-81d7c4dcccf4	a1786710-61bb-4d07-b7d8-1b58e3b2e255	4	Day 4	Excursion to Bum La Pass, PTSO Lake, Madhuri Lake and India's highest CCD outlet.	2026-07-07 13:07:12.981	2026-07-07 13:07:12.981
62891ed5-a7e7-409f-80c0-585b574a666b	a1786710-61bb-4d07-b7d8-1b58e3b2e255	5	Day 5	Travel from Tawang to Jamiri via Jang Waterfall, Sela Tunnel and Jaswant Garh War Memorial. Enjoy BBQ Night with Karaoke.	2026-07-07 13:07:12.981	2026-07-07 13:07:12.981
548d4db2-036f-4bd4-af1b-6918b2d9ac47	a1786710-61bb-4d07-b7d8-1b58e3b2e255	6	Day 6	Breakfast and departure to Guwahati with unforgettable mountain memories.	2026-07-07 13:07:12.981	2026-07-07 13:07:12.981
\.


--
-- Data for Name: Package; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Package" (id, "tripId", "festivalId", title, price, "tokenAmount", "createdAt", "updatedAt") FROM stdin;
15aa277f-c092-4c01-9339-7e6f7669690f	4c6c9cbc-1208-48d1-9b02-0bfae92bc790	\N	test	15.00	2.00	2026-07-07 12:35:49.122	2026-07-07 12:35:49.122
41c8853e-f6a1-4995-8619-dbe4bc98962a	4c6c9cbc-1208-48d1-9b02-0bfae92bc790	\N	test2	10.00	5.00	2026-07-07 12:35:49.122	2026-07-07 12:35:49.122
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Payment" (id, "bookingId", "paymentIntentId", type, status, amount, currency, "razorpayOrderId", "razorpayPaymentId", "razorpaySignature", "paymentMethod", "idempotencyKey", "failureCode", "failureReason", "receiptNumber", notes, "paidAt", "createdAt", "updatedAt", "receiptNumberInt") FROM stdin;
3865f682-11d4-4b46-92f5-cec284c3eb53	a3a5aa9a-6a91-47a1-84f5-8eb35e102bf8	d76213c9-67d9-4c21-89d6-2052cfbd5593	TOKEN	REFUNDED	2.00	INR	order_T9PBTSZLCNn7Ql	pay_T9PBYge7b3B4Ma	4ff0a2949c0f409b4b5bc424bfd3b99ba9106ab3be7895c0a4cb0765bb13b566	netbanking	a3a5aa9a-6a91-47a1-84f5-8eb35e102bf8-TOKEN-order_T9PBTSZLCNn7Ql	\N	\N	RCPT-5B8575C302	{"paymentType": "TOKEN"}	2026-07-04 11:14:52.054	2026-07-04 11:14:52.057	2026-07-04 11:17:24.837	1
fb0f11ee-ec7a-4f2f-8087-0a49c6533656	a3a5aa9a-6a91-47a1-84f5-8eb35e102bf8	25b37dbe-341a-4a41-9908-12a751b2015d	BALANCE	REFUNDED	3.00	INR	order_T9PCLPgbDp0yA0	pay_T9PCQ8jtewKcGM	4579238f8e66a8d57c5faf9370f3b9673ccfb7192e089a507e167c3cf1ef079a	netbanking	a3a5aa9a-6a91-47a1-84f5-8eb35e102bf8-BALANCE-order_T9PCLPgbDp0yA0	\N	\N	RCPT-32A7325774	{"paymentType": "BALANCE"}	2026-07-04 11:16:00.289	2026-07-04 11:16:00.291	2026-07-04 11:17:24.842	2
e2c3834f-d966-4edb-9bbe-cd8f8301b63d	789f8d5c-f4ba-416f-9e95-ea5eeb74e1c9	22a95e99-e212-408a-bd44-7918e905a452	TOKEN	REFUNDED	4.20	INR	order_TA96P6nITp20yZ	pay_TA96Z3GvlBlkpy	4159ca5f0f1bc5da3f87b52c7624d59a1507c143e56396a1e60a9a075dd2935f	netbanking	789f8d5c-f4ba-416f-9e95-ea5eeb74e1c9-TOKEN-order_TA96P6nITp20yZ	\N	\N	RCPT-0A9321D90D	{"paymentType": "TOKEN"}	2026-07-06 08:09:54.045	2026-07-06 08:09:54.047	2026-07-06 08:13:01.538	3
6b76617c-e2ad-4045-891a-5ed58f6229ea	789f8d5c-f4ba-416f-9e95-ea5eeb74e1c9	9deec3d1-7b6d-4799-8202-d797c5a7c337	BALANCE	REFUNDED	6.30	INR	order_TA99E9MiYehEvw	pay_TA99KbBd9XsLZT	119909a6d978b621b355b19f68c235995c4fa920c296ed0ebed3e5a8381bfaad	netbanking	789f8d5c-f4ba-416f-9e95-ea5eeb74e1c9-BALANCE-order_TA99E9MiYehEvw	\N	\N	RCPT-B56E08D761	{"paymentType": "BALANCE"}	2026-07-06 08:12:32.567	2026-07-06 08:12:32.571	2026-07-06 08:13:01.543	4
897e0b5a-8345-4ada-98e8-a2e41e6c8df6	da473526-ced7-4e9e-905b-7907c1c25cdf	a9097426-e107-403c-8aa9-b3e269a5069f	FULL	REFUNDED	5.25	INR	order_TA9E2nyuEI6sf9	pay_TA9E81QkOTfi9y	00808dee44298b534fdaa865d6fa74f58d83be5899f844c88126caa56d2ea7df	netbanking	da473526-ced7-4e9e-905b-7907c1c25cdf-FULL-order_TA9E2nyuEI6sf9	\N	\N	RCPT-BF0FEE76C3	{"paymentType": "FULL"}	2026-07-06 08:17:05.302	2026-07-06 08:17:05.304	2026-07-06 18:57:11.657	5
\.


--
-- Data for Name: PaymentIntent; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."PaymentIntent" (id, "bookingId", "razorpayOrderId", type, amount, currency, status, "expiresAt", "createdAt", "updatedAt") FROM stdin;
34fe1c8a-da9a-4378-8f08-735268c3c20b	a3a5aa9a-6a91-47a1-84f5-8eb35e102bf8	order_T9PBF3t2vcnqO3	FULL	5.00	INR	EXPIRED	2026-07-04 11:29:09.715	2026-07-04 11:14:09.717	2026-07-04 11:14:22.718
d76213c9-67d9-4c21-89d6-2052cfbd5593	a3a5aa9a-6a91-47a1-84f5-8eb35e102bf8	order_T9PBTSZLCNn7Ql	TOKEN	2.00	INR	COMPLETED	2026-07-04 11:29:22.892	2026-07-04 11:14:22.893	2026-07-04 11:14:52.062
25b37dbe-341a-4a41-9908-12a751b2015d	a3a5aa9a-6a91-47a1-84f5-8eb35e102bf8	order_T9PCLPgbDp0yA0	BALANCE	3.00	INR	COMPLETED	2026-07-04 11:30:12.321	2026-07-04 11:15:12.322	2026-07-04 11:16:00.295
22a95e99-e212-408a-bd44-7918e905a452	789f8d5c-f4ba-416f-9e95-ea5eeb74e1c9	order_TA96P6nITp20yZ	TOKEN	4.20	INR	COMPLETED	2026-07-06 08:24:29.237	2026-07-06 08:09:29.239	2026-07-06 08:09:54.053
9deec3d1-7b6d-4799-8202-d797c5a7c337	789f8d5c-f4ba-416f-9e95-ea5eeb74e1c9	order_TA99E9MiYehEvw	BALANCE	6.30	INR	COMPLETED	2026-07-06 08:27:09.566	2026-07-06 08:12:09.567	2026-07-06 08:12:32.576
a9097426-e107-403c-8aa9-b3e269a5069f	da473526-ced7-4e9e-905b-7907c1c25cdf	order_TA9E2nyuEI6sf9	FULL	5.25	INR	COMPLETED	2026-07-06 08:31:43.188	2026-07-06 08:16:43.189	2026-07-06 08:17:05.311
f8f92fc6-3236-42cf-97ac-fd679ff45985	fc7b38f4-4ea5-429a-a630-dc80c5a4f674	order_TAcDSnItHCPQoP	TOKEN	2.10	INR	EXPIRED	2026-07-07 12:53:17.065	2026-07-07 12:38:17.067	2026-07-07 12:40:05.855
30548ba0-d9f7-4510-a284-77b5105a2b0a	fc7b38f4-4ea5-429a-a630-dc80c5a4f674	order_TAcFNljEfymJrw	TOKEN	2.10	INR	CREATED	2026-07-07 12:55:06.037	2026-07-07 12:40:06.038	2026-07-07 12:40:06.038
\.


--
-- Data for Name: PaymentReminder; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."PaymentReminder" (id, "bookingId", type, status, "sentBy", email, subject, "sentAt", "providerMessageId", "failureReason", "createdAt") FROM stdin;
8e556636-3417-4802-ad37-938d1a31389f	789f8d5c-f4ba-416f-9e95-ea5eeb74e1c9	MANUAL	SENT	5ef36453-36a7-4099-9cc7-e6012ed162d7	nimit.s25306@nst.rishihood.edu.in	Balance Payment Due - test (HNG-7E916E95)	2026-07-06 08:11:49.686	\N	\N	2026-07-06 08:11:44.616
\.


--
-- Data for Name: PaymentWebhook; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."PaymentWebhook" (id, "eventId", "eventType", payload, signature, processed, "processedAt", "processingError", "retryCount", "createdAt") FROM stdin;
93d289d6-e3cf-4f4d-9430-3e31a56eaab0	payment.authorized	payment.authorized	{"event": "payment.authorized", "entity": "event", "payload": {"payment": {"entity": {"id": "pay_T9NZeg7DtBjenu", "fee": null, "tax": null, "upi": {"vpa": "nimit4school-1@okaxis", "flow": "intent", "payer_account_type": "bank_account"}, "vpa": "nimit4school-1@okaxis", "bank": null, "email": "nimit.s25306@nst.rishihood.edu.in", "notes": {"user_id": "5ef36453-36a7-4099-9cc7-e6012ed162d7", "booking_id": "a3e92b1f-f7e7-4f62-bcb9-bbf9147aed7c", "payment_type": "FULL"}, "amount": 500, "entity": "payment", "method": "upi", "reward": null, "status": "authorized", "wallet": null, "card_id": null, "contact": "+919958052004", "captured": false, "currency": "INR", "order_id": "order_T9NYDBACx9PjO3", "created_at": 1783157994, "error_code": null, "error_step": null, "invoice_id": null, "description": "test — Full Payment", "error_reason": null, "error_source": null, "acquirer_data": {"rrn": "618505386127"}, "international": false, "refund_status": null, "amount_refunded": 0, "error_description": null}}}, "contains": ["payment"], "account_id": "acc_Sz4N9tszIRFouK", "created_at": 1783157994}	9cff274a6b7b8365a97b96358d91e72fbe81c549e64c6464fe3e82446e528c3f	t	2026-07-04 09:39:54.501	\N	0	2026-07-04 09:39:54.498
21cfd35f-a9af-423b-aa11-b8e1e504624e	payment.captured	payment.captured	{"event": "payment.captured", "entity": "event", "payload": {"payment": {"entity": {"id": "pay_T9NZeg7DtBjenu", "fee": 12, "tax": 2, "upi": {"vpa": "nimit4school-1@okaxis", "flow": "intent", "payer_account_type": "bank_account"}, "vpa": "nimit4school-1@okaxis", "bank": null, "email": "nimit.s25306@nst.rishihood.edu.in", "notes": {"user_id": "5ef36453-36a7-4099-9cc7-e6012ed162d7", "booking_id": "a3e92b1f-f7e7-4f62-bcb9-bbf9147aed7c", "payment_type": "FULL"}, "amount": 500, "entity": "payment", "method": "upi", "reward": null, "status": "captured", "wallet": null, "card_id": null, "contact": "+919958052004", "captured": true, "currency": "INR", "order_id": "order_T9NYDBACx9PjO3", "created_at": 1783157994, "error_code": null, "error_step": null, "invoice_id": null, "base_amount": 500, "description": "test — Full Payment", "error_reason": null, "error_source": null, "acquirer_data": {"rrn": "618505386127"}, "international": false, "refund_status": null, "amount_refunded": 0, "error_description": null}}}, "contains": ["payment"], "account_id": "acc_Sz4N9tszIRFouK", "created_at": 1783157995}	eaa7eee79e62b72d0bab5545f9fae87a2018d66790bcd608fe08d29bbd6cc3a1	t	2026-07-04 09:39:59.557	\N	0	2026-07-04 09:39:55.142
4a0a5ec3-1723-4472-a533-5d1b77cb694c	refund.created	refund.created	{"event": "refund.created", "entity": "event", "payload": {"refund": {"entity": {"id": "rfnd_T90Wh1CYHEmPEV", "notes": {"admin_id": "fe1ca190-9fd0-40ef-94c3-db5f67b500a8"}, "amount": 200, "entity": "refund", "status": "processed", "receipt": null, "batch_id": null, "currency": "INR", "created_at": 1783076827, "payment_id": "pay_T8zv3fhdy1fOfp", "acquirer_data": {"rrn": "618416947412"}, "speed_processed": "normal", "speed_requested": "normal"}}, "payment": {"entity": {"id": "pay_T8zv3fhdy1fOfp", "fee": 4, "tax": 0, "upi": {"vpa": "nimit4school-1@okicici", "flow": "intent", "payer_account_type": "bank_account"}, "vpa": "nimit4school-1@okicici", "bank": null, "email": "abc@gmail.com", "notes": {"user_id": "fe1ca190-9fd0-40ef-94c3-db5f67b500a8", "booking_id": "16d27217-0153-41f8-953d-db5b3953a2f1", "payment_type": "TOKEN"}, "amount": 200, "entity": "payment", "method": "upi", "status": "refunded", "wallet": null, "card_id": null, "contact": "+919958052004", "captured": true, "currency": "INR", "order_id": "order_T8zuaXkSvsFy5Q", "provider": null, "store_id": null, "token_id": null, "device_id": null, "account_id": null, "created_at": 1783074691, "error_code": null, "error_step": null, "fee_bearer": null, "invoice_id": null, "settled_by": null, "base_amount": 200, "customer_id": null, "description": "test — Token Payment", "terminal_id": null, "error_reason": null, "error_source": null, "acquirer_data": {"rrn": "655006975961"}, "international": false, "receiver_type": null, "refund_status": "full", "source_channel": "online", "amount_refunded": 200, "internal_status": null, "gateway_provider": "Razorpay", "error_description": null, "amount_transferred": 0, "optimizer_provider": null, "gateway_merchant_id": null, "gateway_terminal_id": null}}}, "contains": ["refund", "payment"], "account_id": "acc_Sz4N9tszIRFouK", "created_at": 1783076831}	33b72da8464aa51b49347ec3fecede95552391cb3cd4885dfba4c351658ac518	t	2026-07-04 09:56:56.613	\N	0	2026-07-04 09:56:56.606
395f7582-5b37-4b50-9a14-18b688ca09bf	refund.processed	refund.processed	{"event": "refund.processed", "entity": "event", "payload": {"refund": {"entity": {"id": "rfnd_T90Wh1CYHEmPEV", "notes": {"admin_id": "fe1ca190-9fd0-40ef-94c3-db5f67b500a8"}, "amount": 200, "entity": "refund", "status": "processed", "receipt": null, "batch_id": null, "currency": "INR", "created_at": 1783076827, "payment_id": "pay_T8zv3fhdy1fOfp", "acquirer_data": {"rrn": "618416947412"}, "speed_processed": "normal", "speed_requested": "normal"}}, "payment": {"entity": {"id": "pay_T8zv3fhdy1fOfp", "fee": 4, "tax": 0, "upi": {"vpa": "nimit4school-1@okicici", "flow": "intent", "payer_account_type": "bank_account"}, "vpa": "nimit4school-1@okicici", "bank": null, "email": "abc@gmail.com", "notes": {"user_id": "fe1ca190-9fd0-40ef-94c3-db5f67b500a8", "booking_id": "16d27217-0153-41f8-953d-db5b3953a2f1", "payment_type": "TOKEN"}, "amount": 200, "entity": "payment", "method": "upi", "status": "refunded", "wallet": null, "card_id": null, "contact": "+919958052004", "captured": true, "currency": "INR", "order_id": "order_T8zuaXkSvsFy5Q", "provider": null, "store_id": null, "token_id": null, "device_id": null, "account_id": null, "created_at": 1783074691, "error_code": null, "error_step": null, "fee_bearer": null, "invoice_id": null, "settled_by": null, "base_amount": 200, "customer_id": null, "description": "test — Token Payment", "terminal_id": null, "error_reason": null, "error_source": null, "acquirer_data": {"rrn": "655006975961"}, "international": false, "receiver_type": null, "refund_status": "full", "source_channel": "online", "amount_refunded": 200, "internal_status": null, "gateway_provider": "Razorpay", "error_description": null, "amount_transferred": 0, "optimizer_provider": null, "gateway_merchant_id": null, "gateway_terminal_id": null}}}, "contains": ["refund", "payment"], "account_id": "acc_Sz4N9tszIRFouK", "created_at": 1783076831}	77989b5d4e42aad235821e7663f9820b50af12f5d7520528e206218e8f8560ef	t	2026-07-04 09:56:56.632	\N	0	2026-07-04 09:56:56.625
\.


--
-- Data for Name: Refund; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Refund" (id, "paymentId", amount, status, reason, "razorpayRefundId", "initiatedBy", "processedAt", "failureReason", metadata, "createdAt", "updatedAt") FROM stdin;
4d50edaf-77cb-471d-bc87-79a142e9be87	3865f682-11d4-4b46-92f5-cec284c3eb53	2.00	SUCCESS	Admin initiated cancellation and refund	rfnd_T9PEcsyepubQOg	5ef36453-36a7-4099-9cc7-e6012ed162d7	\N	\N	{"razorpayRefund": {"id": "rfnd_T9PEcsyepubQOg", "notes": {"reason": "Admin initiated cancellation and refund", "admin_id": "5ef36453-36a7-4099-9cc7-e6012ed162d7"}, "amount": 200, "entity": "refund", "status": "pending", "receipt": null, "batch_id": null, "currency": "INR", "created_at": 1783163842, "payment_id": "pay_T9PBYge7b3B4Ma", "base_amount": 200, "acquirer_data": {"arn": null}, "speed_processed": "normal", "speed_requested": "normal"}}	2026-07-04 11:17:24.832	2026-07-04 11:17:24.832
afc7a6d5-efb7-42f5-8f94-5e8cd7139ab3	fb0f11ee-ec7a-4f2f-8087-0a49c6533656	3.00	SUCCESS	Admin initiated cancellation and refund	rfnd_T9PEf8yH2SO23G	5ef36453-36a7-4099-9cc7-e6012ed162d7	\N	\N	{"razorpayRefund": {"id": "rfnd_T9PEf8yH2SO23G", "notes": {"reason": "Admin initiated cancellation and refund", "admin_id": "5ef36453-36a7-4099-9cc7-e6012ed162d7"}, "amount": 300, "entity": "refund", "status": "pending", "receipt": null, "batch_id": null, "currency": "INR", "created_at": 1783163844, "payment_id": "pay_T9PCQ8jtewKcGM", "base_amount": 300, "acquirer_data": {"arn": null}, "speed_processed": "normal", "speed_requested": "normal"}}	2026-07-04 11:17:24.84	2026-07-04 11:17:24.84
166f1089-6681-419b-bfb5-428cbb6a11fa	e2c3834f-d966-4edb-9bbe-cd8f8301b63d	4.20	SUCCESS	Admin initiated cancellation	rfnd_TA9A65iDC2iQVE	5ef36453-36a7-4099-9cc7-e6012ed162d7	\N	\N	{"razorpayRefund": {"id": "rfnd_TA9A65iDC2iQVE", "notes": {"reason": "Admin initiated cancellation", "admin_id": "5ef36453-36a7-4099-9cc7-e6012ed162d7"}, "amount": 420, "entity": "refund", "status": "pending", "receipt": null, "batch_id": null, "currency": "INR", "created_at": 1783325579, "payment_id": "pay_TA96Z3GvlBlkpy", "base_amount": 420, "acquirer_data": {"arn": null}, "speed_processed": "normal", "speed_requested": "normal"}}	2026-07-06 08:13:01.532	2026-07-06 08:13:01.532
fb2e464e-5517-4ae8-a518-dc3fc2b43b57	6b76617c-e2ad-4045-891a-5ed58f6229ea	6.30	SUCCESS	Admin initiated cancellation	rfnd_TA9A7uRBF7zi21	5ef36453-36a7-4099-9cc7-e6012ed162d7	\N	\N	{"razorpayRefund": {"id": "rfnd_TA9A7uRBF7zi21", "notes": {"reason": "Admin initiated cancellation", "admin_id": "5ef36453-36a7-4099-9cc7-e6012ed162d7"}, "amount": 630, "entity": "refund", "status": "pending", "receipt": null, "batch_id": null, "currency": "INR", "created_at": 1783325580, "payment_id": "pay_TA99KbBd9XsLZT", "base_amount": 630, "acquirer_data": {"arn": null}, "speed_processed": "normal", "speed_requested": "normal"}}	2026-07-06 08:13:01.541	2026-07-06 08:13:01.541
c1c36d73-4c6e-4dc6-9d72-828ed94e4115	897e0b5a-8345-4ada-98e8-a2e41e6c8df6	5.25	SUCCESS	Admin initiated cancellation	rfnd_TAK8Zuem6KoYl6	5ef36453-36a7-4099-9cc7-e6012ed162d7	\N	\N	{"razorpayRefund": {"id": "rfnd_TAK8Zuem6KoYl6", "notes": {"reason": "Admin initiated cancellation", "admin_id": "5ef36453-36a7-4099-9cc7-e6012ed162d7"}, "amount": 525, "entity": "refund", "status": "pending", "receipt": null, "batch_id": null, "currency": "INR", "created_at": 1783364230, "payment_id": "pay_TA9E81QkOTfi9y", "base_amount": 525, "acquirer_data": {"arn": null}, "speed_processed": "normal", "speed_requested": "normal"}}	2026-07-06 18:57:11.652	2026-07-06 18:57:11.652
\.


--
-- Data for Name: Slot; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Slot" (id, "tripId", "festivalId", "startDate", "endDate", capacity, "filledSpots", "createdAt", "updatedAt") FROM stdin;
201e962d-acc1-4c5f-8f75-5b095a636fcd	4c6c9cbc-1208-48d1-9b02-0bfae92bc790	\N	2026-07-05 11:08:00	2026-07-06 11:08:00	10	0	2026-07-06 19:08:53.981	2026-07-07 12:35:49.122
\.


--
-- Data for Name: Traveler; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Traveler" (id, "bookingId", "fullName", gender, "dateOfBirth", phone, aadhaar, "createdAt", "updatedAt") FROM stdin;
df8ba02f-cefe-496e-8239-e59051466320	789f8d5c-f4ba-416f-9e95-ea5eeb74e1c9	test test	Male	2026-07-07 00:00:00	9958052004	\N	2026-07-06 08:09:28.981	2026-07-06 08:09:28.981
\.


--
-- Data for Name: Trip; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Trip" (id, title, slug, location, "bannerImages", duration, "difficultyLevel", "bestTimeToVisit", "maxAltitude", overview, highlights, "galleryImages", inclusions, exclusions, "stayTransportImages", price, "tokenAmount", "tripType", "isActive", "isFeatured", "isPublished", "destinationId", "createdAt", "updatedAt") FROM stdin;
d176c10d-e1e1-4704-9d83-5428990daf68	Anini & Namsai - 7 Nights 8 Days	anini-namsai-7-nights-8-days-1783429632787	Anini, Namsai	{}	8	Moderate	October to April	0	Experience the untouched beauty of Arunachal Pradesh on this 7 Nights and 8 Days journey through Roing, Anini, and Namsai. Explore pristine valleys, waterfalls, high-altitude grasslands, tribal villages, scenic mountain passes, the breathtaking Pomo Valley Trek, and spiritual landmarks such as Golden Pagoda and Parshuram Kund. Designed for nature lovers and adventure seekers, this trip combines exploration, trekking, cultural immersion, and comfortable stays amidst the stunning landscapes of Northeast India.	[{"text": "Scenic road journey from Dibrugarh to Roing, Anini, and Namsai\\","}, {"text": "Visit to Mayodiya Pass with panoramic mountain views\\","}, {"text": "Excursion to the pristine Acheso Valley\\","}, {"text": "Full-day Pomo Valley Trek through lakes, waterfalls, and grasslands\\","}, {"text": "Explore Mathu Valley and surrounding landscapes\\","}, {"text": "Interact with the indigenous Idu Mishmi tribe\\","}, {"text": "Visit the famous Golden Pagoda in Namsai\\","}, {"text": "Excursion to the sacred Parshuram Kund\\","}, {"text": "Bonfire and BBQ experience\\","}, {"text": "Stay in premium resorts and authentic homestays"}]	{}	{"Transport to and from Dibrugarh Airport/Railway Station\\",","Transportation by Innova / Duster / Sedan\\",","7 Breakfasts\\",","7 Nights stay in premium resorts and homestays\\",","1 BBQ Night\\",","1 Bonfire Experience\\",","Inner Line Permit and required travel passes\\",","Guide charges for Pomo Valley Trek\\",","Experienced trip coordinator (for custom trips)\\",","Local driver with terrain knowledge\\",","All transfers and sightseeing as per itinerary\\",","First-aid kit"}	{"Lunch, dinner, snacks and beverages\\",","Personal expenses\\",","Medical expenses\\",","Tips and gratuities\\",","Monument entry fees\\",","Adventure activity charges not specified\\",","Expenses due to damage caused by travelers\\",","Expenses arising from medical emergencies\\",","Costs due to weather disruptions or natural calamities\\",","Room heater charges\\",","Additional accommodation or food due to roadblocks or bad weather\\",","Anything not specifically mentioned under inclusions"}	[]	24499.00	5000.00	MOUNTAIN_TREK	t	t	t	\N	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
cd551328-0e12-4c79-a865-385704a47b78	Mechuka - 5 Nights 6 Days	mechuka-5-nights-6-days-1783429632921	Mechuka	{}	6	Moderate	October to April	0	Discover the hidden gem of Arunachal Pradesh with an unforgettable journey to Mechuka, a picturesque valley surrounded by snow-capped mountains, lush landscapes, ancient monasteries, and vibrant tribal culture. Experience stunning waterfalls, breathtaking treks, traditional villages, spiritual landmarks, local festivals, and authentic homestay experiences on this carefully curated 5 Nights and 6 Days adventure.	[{"text": "Scenic road trip from Dibrugarh to Mechuka via Aalo"}, {"text": "Visit the majestic Siko Dido Waterfall"}, {"text": "Explore Hanuman Mandir Pareidolia Rock Formation"}, {"text": "Visit ancient Buddhist Cave and Gurudwara"}, {"text": "Explore Dorjeeling and Rabeng villages"}, {"text": "Cycle through Mechuka town and Gompas"}, {"text": "Trek to Mechuka La for panoramic valley views"}, {"text": "Visit Mechuka Adventure Park"}, {"text": "Experience the traditional Gorshey community dance festival"}, {"text": "BBQ Night under the stars"}]	{}	{"Airport/Railway Station pickup and drop from Dibrugarh","Transportation by Innova/Xylo/Ertiga/Dzire","5 Breakfasts","5 Nights stay in premium resorts and homestays","1 BBQ Night","Inner Line Permit and all required passes","Experienced local driver","Trip coordinator on request for custom trips","All transfers and sightseeing as per itinerary","First-aid kit"}	{"Lunch, Dinner, Snacks and Beverages","Personal Expenses","Medical Expenses","Tips and Gratuities","Monument Entry Fees","Adventure Activity Charges","Damage Charges","Expenses due to medical emergencies or natural calamities","Room Heater Charges","Additional stay due to weather or roadblocks","Anything not mentioned in inclusions"}	[]	18999.00	5000.00	MOUNTAIN_TREK	t	t	t	\N	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	Tawang - 6 Nights 7 Days	tawang-6-nights-7-days-1783429632939	Tawang, Dirang	{}	7	Moderate	February to June and September to December	0	Explore the mystical beauty of Arunachal Pradesh on this 6 Nights 7 Days adventure covering Jamiri, Dirang, Sangti Valley, Tawang, and Rupa. Journey through high mountain passes, ancient monasteries, pristine lakes, waterfalls, war memorials, and breathtaking Himalayan landscapes. Experience local culture, village life, bonfires, scenic treks, and iconic destinations like Bum La Pass, Sela Pass, Madhuri Lake, and the magnificent Tawang Monastery.	[{"text": "Visit the iconic Tawang Monastery and Giant Buddha Statue"}, {"text": "Explore the Indo-China border at Bum La Pass"}, {"text": "Witness the beauty of Sela Pass and Sela Lake"}, {"text": "Visit Madhuri Lake and PTSO Lake"}, {"text": "Pay tribute at Tawang War Memorial and Jaswant Garh War Memorial"}, {"text": "Experience the Light Show at Tawang War Memorial"}, {"text": "Explore Dirang Monastery and Gonpa Monastery"}, {"text": "Trek through the beautiful landscapes of Sangti Valley"}, {"text": "Enjoy a culinary workshop and bonfire experience"}, {"text": "Visit Jang Waterfall and Bomdila Top"}]	{}	{"Pickup and drop from Guwahati Airport/Railway Station","Transportation by Innova/Xylo/Ertiga/Dzire","6 Breakfasts","6 Nights stay in premium resorts and homestays","1 BBQ Night","1 Bonfire Experience","Inner Line Permit and all required passes","Experienced local driver","Trip coordinator on request for custom trips","All transfers and sightseeing as per itinerary","First-aid kit"}	{"Lunch, Dinner, Snacks and Beverages","Personal Expenses","Medical Expenses","Tips and Gratuities","Monument Entry Fees","Adventure Activity Charges","Costs arising due to bad weather, roadblocks, medical emergencies, or natural calamities","Room Heater Charges","Additional accommodation expenses due to unforeseen circumstances","Anything not mentioned under inclusions"}	[]	22499.00	5000.00	MOUNTAIN_TREK	t	t	t	\N	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
702fd9f3-8e18-477c-8a70-f97d05f7adbc	Ziro Valley & Kaziranga - 4 Nights 5 Days	ziro-valley-kaziranga-4-nights-5-days-1783429632957	Ziro Valley, Kaziranga	{}	5	Moderate	October to April	0	Experience the perfect blend of wildlife, tribal culture, and natural beauty on this 4 Nights 5 Days journey through Kaziranga National Park and the enchanting Ziro Valley. Witness the iconic One Horn Rhinoceros, explore the serene landscapes of Arunachal Pradesh, interact with the unique Apatani tribe, enjoy traditional culinary experiences, cycling through lush rice fields, cultural storytelling sessions, and unforgettable hospitality in the heart of Northeast India.	[{"text": "Jeep Safari in Kaziranga National Park"}, {"text": "Spot the rare One Horn Rhinoceros"}, {"text": "Visit Sree Sidheswar Nath Temple featuring the world's tallest natural Shivling"}, {"text": "Enjoy serene moments at Shee Lake"}, {"text": "Cycling through the famous Ziro rice paddies"}, {"text": "Traditional wine tasting workshop"}, {"text": "Authentic momo-making experience"}, {"text": "Sunrise at Pamu Yalang viewpoint"}, {"text": "Apatani tribal village immersion"}, {"text": "Traditional lunch in an Apatani home"}, {"text": "Cultural storytelling with tribal elders"}, {"text": "BBQ night with music and dance"}]	{}	{"Pickup from Guwahati Airport/Railway Station","Transportation by Innova/Xylo/Ertiga/Dzire/Force Traveller/Force Urbania","4 Breakfasts","4 Nights stay in premium resorts and homestays","BBQ Night with Bonfire","Wine tasting workshop","Momo making workshop","Authentic traditional lunch","Cycle rentals","Inner Line Permit and necessary passes","Experienced trip coordinator and local driver","Guide charges where applicable","Transfers and sightseeing as per itinerary","First-aid kit"}	{"Lunch, Dinner, Snacks and Beverages except where mentioned","Personal Expenses","Medical Expenses","Tips and Gratuities","Monument Entry Fees","Adventure Activity Charges","Charges due to cycle damage","Costs arising from medical emergencies or acts of God","Room Heater Charges","Additional accommodation due to weather disruptions or roadblocks","Anything not specifically mentioned in inclusions"}	[]	18999.00	5000.00	JUNGLE_WILDLIFE	t	t	t	\N	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
4c6c9cbc-1208-48d1-9b02-0bfae92bc790	test	test-1783163372261	test	{https://res.cloudinary.com/dwvff1v5l/image/upload/v1783163377/uploads/trips/4c6c9cbc-1208-48d1-9b02-0bfae92bc790/bannerimages/ba8b216d-f46c-4d2b-a585-c72681cc2187.png}	1	Moderate	test	0	desc of the trip	[{"text": "highlight", "imageUrl": "https://res.cloudinary.com/dwvff1v5l/image/upload/v1783163375/uploads/trips/4c6c9cbc-1208-48d1-9b02-0bfae92bc790/highlights/8dff7614-a245-4bae-bea3-08397872d822.webp"}]	\N	{inclusion}	{exclusion}	[{"text": "hotel", "imageUrl": "https://res.cloudinary.com/dwvff1v5l/image/upload/v1783163373/uploads/trips/4c6c9cbc-1208-48d1-9b02-0bfae92bc790/staytransport/64db9505-8785-4b88-b073-eb68b907ac44.webp"}]	5.00	2.00	MOUNTAIN_TREK	t	t	t	4d95cddd-8de1-447a-9312-2ecb0050001c	2026-07-04 11:09:32.297	2026-07-07 12:35:49.168
f567f94b-fd89-4785-b260-fb629f15d72e	Tawang – The Mystical Trek Edition: 5 Nights 6 Days	tawang-the-mystical-trek-edition-5-nights-6-days-1783429632977	Tawang, Dirang, Sangti Valley, Jamiri	{}	6	Moderate	February to June and September to December	0	Experience the best of Arunachal Pradesh on this 5 Nights 6 Days adventure through Sangti Valley, Dirang, and Tawang. Explore ancient monasteries, picturesque valleys, high-altitude lakes, mountain passes, riverside trails, and the iconic Indo-China border at Bum La Pass. This journey combines trekking, culture, breathtaking Himalayan landscapes, bonfires, BBQ evenings, and unforgettable mountain experiences.	[{"text": "Explore Dirang Monastery and historic Dirang Fort"}, {"text": "Trek to a scenic Apple Orchard in Sangti Valley"}, {"text": "Riverside snacks and relaxation amidst nature"}, {"text": "Cross the iconic Sela Pass and Sela Lake"}, {"text": "Visit the magnificent Tawang Monastery and Giant Buddha Statue"}, {"text": "Explore Bum La Pass at the Indo-China border"}, {"text": "Visit PTSO Lake and Madhuri Lake (Sangetsar Lake)"}, {"text": "Stop at India's highest CCD outlet"}, {"text": "Visit Jang Waterfall and Sela Tunnel"}, {"text": "Pay homage at Jaswant Garh War Memorial"}, {"text": "Enjoy BBQ Night with Karaoke and Bonfire"}]	{}	{"Pickup and drop from Guwahati Airport/Railway Station","Transportation by Traveller/Innova/Xylo/Ertiga/Dzire","5 Breakfasts","5 Nights stay in premium resorts and homestays","1 BBQ Night","1 Bonfire Experience","Inner Line Permit and required passes","Trek Guide Charges","Evening Snacks on Trek Day","Experienced local driver with terrain knowledge","Transfers and sightseeing as per itinerary","First-aid kit"}	{"Lunch, Dinner, Snacks and Beverages","Personal Expenses","Medical Expenses","Tips and Gratuities","Monument Entry Fees","Adventure Activity Charges","Expenses arising due to medical emergencies or natural calamities","Room Heater Charges","Additional accommodation or food due to roadblocks and weather disruptions","Anything not specifically mentioned under inclusions"}	[]	20999.00	5000.00	MOUNTAIN_TREK	t	t	t	\N	2026-07-07 13:07:12.981	2026-07-07 13:07:12.981
\.


--
-- Data for Name: TripTag; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."TripTag" (id, tag, "createdAt", "updatedAt") FROM stdin;
1c55652f-450a-46c5-8ddb-26b1bc448b7f	this the overview	2026-07-04 09:34:14.241	2026-07-04 09:34:14.241
bae9ee35-47ac-44ac-b2a2-f5b65d51371e	trekking	2026-07-04 11:09:32.297	2026-07-04 11:09:32.297
ada0a7dc-a61a-4e6b-8c0c-eabd16788908	mountains	2026-07-04 11:09:32.297	2026-07-04 11:09:32.297
1c666fa7-db39-4f77-b632-524034d613bf	Adventure	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
eb97ea26-dfe4-4642-b2c9-4766d34cd97a	Trekking	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
e2384c09-bfe8-4b20-8406-9d616acb47cb	Nature	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
b1d36610-f955-4c40-be5c-dfd767945a1c	Mountain Escape	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
7f986c02-c836-4d32-8d9d-b335603bba66	Pomo Valley Trek	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
8e2cc72f-99f8-4065-9339-449da1aad750	Idu Mishmi Tribe	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
be5b4921-94ee-4611-8e2a-ffe8da196f15	Road Trip	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
35e13517-16d9-4f1e-b54d-abb52bdb6853	Homestay Experience	2026-07-07 13:07:12.891	2026-07-07 13:07:12.891
de011ba7-0b52-40a1-bbca-a5c08cd317c3	Mechuka	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
2944b600-20d6-4fae-bec3-8631197b40b2	Arunachal Pradesh	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
d7210785-af35-41d4-a23b-7c62227aa54b	Northeast India	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
8d3f2899-9bf0-42fe-b62e-8453824f3641	Adventure Travel	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
cedda48a-e3e4-41d7-a1b5-ed6877b19e77	Cultural Tourism	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
975817d8-c66f-443e-ab13-4842b9fbcd3d	Snow-Capped Peaks	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
6833d7ba-1ff1-488e-944a-add992e565e7	Tribal Villages	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
ad6f49fa-e66d-4bdf-bc1a-a7c270629ded	Monastery Trail	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
b46aefae-97bb-4187-be8a-fff78d29f0dd	Offbeat India	2026-07-07 13:07:12.925	2026-07-07 13:07:12.925
8eeee0d8-fd13-4512-b422-665677558d23	Tawang	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
62f20a9a-d966-49c6-bd54-dc072fd23485	Himalayan Adventure	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
6c11856e-d302-45b7-84cf-30dc8eaf3822	Bum La Pass	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
b89ff7ac-af2a-4bd8-b41f-e1a110e8129e	Sela Pass	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
fc7666e9-e365-4628-82b6-e38ee9256d97	Nature Escape	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
ef52da8b-3a2b-4adb-98b6-218c610b4cea	Mountain Expedition	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
bc9b8b2e-b6a1-4c2d-9192-a0138df16c7f	War Memorials	2026-07-07 13:07:12.943	2026-07-07 13:07:12.943
96f7c92c-d149-4c3d-a834-3ab51202a425	Ziro Valley	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
e48428a9-b63f-4627-94b0-18e2b77f437b	Kaziranga	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
9ea57673-f2e8-428f-960f-729b6dcfbc9f	Assam	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
63b72bad-a0a7-4c91-853d-fcac5ab080f8	Apatani Tribe	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
09193c4d-a187-49ac-81a4-76b015bace38	Tribal Tourism	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
4bfc90c4-a57f-44a6-bf56-a47a41755efc	Wildlife Safari	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
1441c240-f074-4705-916f-e10c6740beb0	One Horned Rhino	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
547441ff-a677-4505-8b9e-e8cddbaebdd2	Cultural Experience	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
a628ce3f-bdea-47ad-b707-e500394ba357	Offbeat Travel	2026-07-07 13:07:12.962	2026-07-07 13:07:12.962
5b69b942-0dd0-4ed1-9d80-9229098e46b3	Sangti Valley	2026-07-07 13:07:12.981	2026-07-07 13:07:12.981
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."User" (id, email, "googleId", role, "isActive", "lastLoginAt", "createdAt", "updatedAt") FROM stdin;
5ef36453-36a7-4099-9cc7-e6012ed162d7	nimit.s25306@nst.rishihood.edu.in	118319155274636810791	ADMIN	t	2026-07-07 13:34:42.161	2026-07-04 09:26:08.799	2026-07-07 13:34:42.17
\.


--
-- Data for Name: UserProfile; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."UserProfile" (id, "userId", "fullName", phone, "alternatePhone", "dateOfBirth", gender, "addressLine1", "addressLine2", city, state, "postalCode", country, "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "bloodGroup", "medicalNotes", "govtIdType", "govtIdNumber", "govtIdImageUrl", "createdAt", "updatedAt") FROM stdin;
5b27d5fa-29fd-438a-a9ef-efecd0c983d6	5ef36453-36a7-4099-9cc7-e6012ed162d7	Nimit Sharma	9958052004	\N	2026-07-06 00:00:00	MALE	test	\N	\N	\N	122001	\N	\N	\N	\N	\N	\N	AADHAAR	\N	https://res.cloudinary.com/dwvff1v5l/image/upload/v1783157751/uploads/users/5ef36453-36a7-4099-9cc7-e6012ed162d7/govtid/AADHAAR/doc.webp	2026-07-04 09:26:08.799	2026-07-07 12:40:05.724
\.


--
-- Data for Name: _FestivalToFestivalTag; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."_FestivalToFestivalTag" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _TripToTripTag; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."_TripToTripTag" ("A", "B") FROM stdin;
4c6c9cbc-1208-48d1-9b02-0bfae92bc790	bae9ee35-47ac-44ac-b2a2-f5b65d51371e
4c6c9cbc-1208-48d1-9b02-0bfae92bc790	ada0a7dc-a61a-4e6b-8c0c-eabd16788908
d176c10d-e1e1-4704-9d83-5428990daf68	1c666fa7-db39-4f77-b632-524034d613bf
d176c10d-e1e1-4704-9d83-5428990daf68	eb97ea26-dfe4-4642-b2c9-4766d34cd97a
d176c10d-e1e1-4704-9d83-5428990daf68	e2384c09-bfe8-4b20-8406-9d616acb47cb
d176c10d-e1e1-4704-9d83-5428990daf68	b1d36610-f955-4c40-be5c-dfd767945a1c
d176c10d-e1e1-4704-9d83-5428990daf68	7f986c02-c836-4d32-8d9d-b335603bba66
d176c10d-e1e1-4704-9d83-5428990daf68	8e2cc72f-99f8-4065-9339-449da1aad750
d176c10d-e1e1-4704-9d83-5428990daf68	be5b4921-94ee-4611-8e2a-ffe8da196f15
d176c10d-e1e1-4704-9d83-5428990daf68	35e13517-16d9-4f1e-b54d-abb52bdb6853
cd551328-0e12-4c79-a865-385704a47b78	de011ba7-0b52-40a1-bbca-a5c08cd317c3
cd551328-0e12-4c79-a865-385704a47b78	2944b600-20d6-4fae-bec3-8631197b40b2
cd551328-0e12-4c79-a865-385704a47b78	d7210785-af35-41d4-a23b-7c62227aa54b
cd551328-0e12-4c79-a865-385704a47b78	8d3f2899-9bf0-42fe-b62e-8453824f3641
cd551328-0e12-4c79-a865-385704a47b78	cedda48a-e3e4-41d7-a1b5-ed6877b19e77
cd551328-0e12-4c79-a865-385704a47b78	b1d36610-f955-4c40-be5c-dfd767945a1c
cd551328-0e12-4c79-a865-385704a47b78	975817d8-c66f-443e-ab13-4842b9fbcd3d
cd551328-0e12-4c79-a865-385704a47b78	6833d7ba-1ff1-488e-944a-add992e565e7
cd551328-0e12-4c79-a865-385704a47b78	35e13517-16d9-4f1e-b54d-abb52bdb6853
cd551328-0e12-4c79-a865-385704a47b78	eb97ea26-dfe4-4642-b2c9-4766d34cd97a
cd551328-0e12-4c79-a865-385704a47b78	ad6f49fa-e66d-4bdf-bc1a-a7c270629ded
cd551328-0e12-4c79-a865-385704a47b78	b46aefae-97bb-4187-be8a-fff78d29f0dd
b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	8eeee0d8-fd13-4512-b422-665677558d23
b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	2944b600-20d6-4fae-bec3-8631197b40b2
b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	d7210785-af35-41d4-a23b-7c62227aa54b
b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	ad6f49fa-e66d-4bdf-bc1a-a7c270629ded
b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	62f20a9a-d966-49c6-bd54-dc072fd23485
b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	6c11856e-d302-45b7-84cf-30dc8eaf3822
b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	b89ff7ac-af2a-4bd8-b41f-e1a110e8129e
b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	be5b4921-94ee-4611-8e2a-ffe8da196f15
b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	cedda48a-e3e4-41d7-a1b5-ed6877b19e77
b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	fc7666e9-e365-4628-82b6-e38ee9256d97
b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	ef52da8b-3a2b-4adb-98b6-218c610b4cea
b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	b46aefae-97bb-4187-be8a-fff78d29f0dd
b3f9696c-c481-4ef2-9e1d-23f9e0e764c3	bc9b8b2e-b6a1-4c2d-9192-a0138df16c7f
702fd9f3-8e18-477c-8a70-f97d05f7adbc	96f7c92c-d149-4c3d-a834-3ab51202a425
702fd9f3-8e18-477c-8a70-f97d05f7adbc	e48428a9-b63f-4627-94b0-18e2b77f437b
702fd9f3-8e18-477c-8a70-f97d05f7adbc	2944b600-20d6-4fae-bec3-8631197b40b2
702fd9f3-8e18-477c-8a70-f97d05f7adbc	9ea57673-f2e8-428f-960f-729b6dcfbc9f
702fd9f3-8e18-477c-8a70-f97d05f7adbc	63b72bad-a0a7-4c91-853d-fcac5ab080f8
702fd9f3-8e18-477c-8a70-f97d05f7adbc	09193c4d-a187-49ac-81a4-76b015bace38
702fd9f3-8e18-477c-8a70-f97d05f7adbc	4bfc90c4-a57f-44a6-bf56-a47a41755efc
702fd9f3-8e18-477c-8a70-f97d05f7adbc	1441c240-f074-4705-916f-e10c6740beb0
702fd9f3-8e18-477c-8a70-f97d05f7adbc	547441ff-a677-4505-8b9e-e8cddbaebdd2
702fd9f3-8e18-477c-8a70-f97d05f7adbc	d7210785-af35-41d4-a23b-7c62227aa54b
702fd9f3-8e18-477c-8a70-f97d05f7adbc	fc7666e9-e365-4628-82b6-e38ee9256d97
702fd9f3-8e18-477c-8a70-f97d05f7adbc	a628ce3f-bdea-47ad-b707-e500394ba357
f567f94b-fd89-4785-b260-fb629f15d72e	8eeee0d8-fd13-4512-b422-665677558d23
f567f94b-fd89-4785-b260-fb629f15d72e	2944b600-20d6-4fae-bec3-8631197b40b2
f567f94b-fd89-4785-b260-fb629f15d72e	d7210785-af35-41d4-a23b-7c62227aa54b
f567f94b-fd89-4785-b260-fb629f15d72e	eb97ea26-dfe4-4642-b2c9-4766d34cd97a
f567f94b-fd89-4785-b260-fb629f15d72e	62f20a9a-d966-49c6-bd54-dc072fd23485
f567f94b-fd89-4785-b260-fb629f15d72e	6c11856e-d302-45b7-84cf-30dc8eaf3822
f567f94b-fd89-4785-b260-fb629f15d72e	b89ff7ac-af2a-4bd8-b41f-e1a110e8129e
f567f94b-fd89-4785-b260-fb629f15d72e	5b69b942-0dd0-4ed1-9d80-9229098e46b3
f567f94b-fd89-4785-b260-fb629f15d72e	ad6f49fa-e66d-4bdf-bc1a-a7c270629ded
f567f94b-fd89-4785-b260-fb629f15d72e	b1d36610-f955-4c40-be5c-dfd767945a1c
f567f94b-fd89-4785-b260-fb629f15d72e	cedda48a-e3e4-41d7-a1b5-ed6877b19e77
f567f94b-fd89-4785-b260-fb629f15d72e	be5b4921-94ee-4611-8e2a-ffe8da196f15
f567f94b-fd89-4785-b260-fb629f15d72e	b46aefae-97bb-4187-be8a-fff78d29f0dd
\.


--
-- Name: Payment_receiptNumberInt_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public."Payment_receiptNumberInt_seq"', 5, true);


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
-- Name: FestivalTag FestivalTag_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."FestivalTag"
    ADD CONSTRAINT "FestivalTag_pkey" PRIMARY KEY (id);


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
-- Name: Package Package_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Package"
    ADD CONSTRAINT "Package_pkey" PRIMARY KEY (id);


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
-- Name: Slot Slot_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Slot"
    ADD CONSTRAINT "Slot_pkey" PRIMARY KEY (id);


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
-- Name: _FestivalToFestivalTag _FestivalToFestivalTag_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."_FestivalToFestivalTag"
    ADD CONSTRAINT "_FestivalToFestivalTag_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _TripToTripTag _TripToTripTag_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."_TripToTripTag"
    ADD CONSTRAINT "_TripToTripTag_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: Booking_balanceDueDate_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Booking_balanceDueDate_idx" ON public."Booking" USING btree ("balanceDueDate");


--
-- Name: Booking_bookingReference_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Booking_bookingReference_key" ON public."Booking" USING btree ("bookingReference");


--
-- Name: Booking_packageId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Booking_packageId_idx" ON public."Booking" USING btree ("packageId");


--
-- Name: Booking_paymentStatus_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Booking_paymentStatus_idx" ON public."Booking" USING btree ("paymentStatus");


--
-- Name: Booking_slotId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Booking_slotId_idx" ON public."Booking" USING btree ("slotId");


--
-- Name: Booking_status_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Booking_status_idx" ON public."Booking" USING btree (status);


--
-- Name: Booking_userId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Booking_userId_idx" ON public."Booking" USING btree ("userId");


--
-- Name: Destination_isPublished_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Destination_isPublished_idx" ON public."Destination" USING btree ("isPublished");


--
-- Name: FAQ_festivalId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "FAQ_festivalId_idx" ON public."FAQ" USING btree ("festivalId");


--
-- Name: FAQ_order_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "FAQ_order_idx" ON public."FAQ" USING btree ("order");


--
-- Name: FAQ_tripId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "FAQ_tripId_idx" ON public."FAQ" USING btree ("tripId");


--
-- Name: FestivalTag_tag_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "FestivalTag_tag_key" ON public."FestivalTag" USING btree (tag);


--
-- Name: Festival_destinationId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Festival_destinationId_idx" ON public."Festival" USING btree ("destinationId");


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
-- Name: Inquiry_createdAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Inquiry_createdAt_idx" ON public."Inquiry" USING btree ("createdAt");


--
-- Name: Inquiry_email_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Inquiry_email_idx" ON public."Inquiry" USING btree (email);


--
-- Name: Inquiry_festivalId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Inquiry_festivalId_idx" ON public."Inquiry" USING btree ("festivalId");


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
-- Name: Itinerary_festivalId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Itinerary_festivalId_idx" ON public."Itinerary" USING btree ("festivalId");


--
-- Name: Itinerary_tripId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Itinerary_tripId_idx" ON public."Itinerary" USING btree ("tripId");


--
-- Name: Package_festivalId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Package_festivalId_idx" ON public."Package" USING btree ("festivalId");


--
-- Name: Package_tripId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Package_tripId_idx" ON public."Package" USING btree ("tripId");


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
-- Name: Slot_festivalId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Slot_festivalId_idx" ON public."Slot" USING btree ("festivalId");


--
-- Name: Slot_startDate_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Slot_startDate_idx" ON public."Slot" USING btree ("startDate");


--
-- Name: Slot_tripId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Slot_tripId_idx" ON public."Slot" USING btree ("tripId");


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
-- Name: _FestivalToFestivalTag_B_index; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "_FestivalToFestivalTag_B_index" ON public."_FestivalToFestivalTag" USING btree ("B");


--
-- Name: _TripToTripTag_B_index; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "_TripToTripTag_B_index" ON public."_TripToTripTag" USING btree ("B");


--
-- Name: Booking Booking_festivalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES public."Festival"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Booking Booking_packageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES public."Package"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Booking Booking_slotId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES public."Slot"(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- Name: FAQ FAQ_festivalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."FAQ"
    ADD CONSTRAINT "FAQ_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES public."Festival"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FAQ FAQ_tripId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."FAQ"
    ADD CONSTRAINT "FAQ_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES public."Trip"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Festival Festival_destinationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Festival"
    ADD CONSTRAINT "Festival_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES public."Destination"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Inquiry Inquiry_festivalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Inquiry"
    ADD CONSTRAINT "Inquiry_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES public."Festival"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Inquiry Inquiry_resolvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Inquiry"
    ADD CONSTRAINT "Inquiry_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Inquiry Inquiry_tripId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Inquiry"
    ADD CONSTRAINT "Inquiry_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES public."Trip"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Inquiry Inquiry_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Inquiry"
    ADD CONSTRAINT "Inquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- Name: Itinerary Itinerary_festivalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Itinerary"
    ADD CONSTRAINT "Itinerary_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES public."Festival"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Itinerary Itinerary_tripId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Itinerary"
    ADD CONSTRAINT "Itinerary_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES public."Trip"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Package Package_festivalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Package"
    ADD CONSTRAINT "Package_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES public."Festival"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Package Package_tripId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Package"
    ADD CONSTRAINT "Package_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES public."Trip"(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- Name: Slot Slot_festivalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Slot"
    ADD CONSTRAINT "Slot_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES public."Festival"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Slot Slot_tripId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Slot"
    ADD CONSTRAINT "Slot_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES public."Trip"(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- Name: _FestivalToFestivalTag _FestivalToFestivalTag_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."_FestivalToFestivalTag"
    ADD CONSTRAINT "_FestivalToFestivalTag_A_fkey" FOREIGN KEY ("A") REFERENCES public."Festival"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _FestivalToFestivalTag _FestivalToFestivalTag_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."_FestivalToFestivalTag"
    ADD CONSTRAINT "_FestivalToFestivalTag_B_fkey" FOREIGN KEY ("B") REFERENCES public."FestivalTag"(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- PostgreSQL database dump complete
--

\unrestrict BQtM4xjbwCcF819c7w8LjNL3dB9LrnumwDmTEZHCzaHP952xheHqIsLeItMwNId

