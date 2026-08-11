-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "GovtIdType" AS ENUM ('AADHAAR', 'PASSPORT');

-- CreateEnum
CREATE TYPE "MediaResourceType" AS ENUM ('IMAGE', 'VIDEO', 'RAW');

-- CreateEnum
CREATE TYPE "MediaDeliveryType" AS ENUM ('PUBLIC', 'AUTHENTICATED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('MOUNTAIN_TREK', 'BEACH_ESCAPE', 'DESERT_EXPEDITION', 'JUNGLE_WILDLIFE', 'HERITAGE_WALK', 'ROAD_TRIP', 'BACKPACKING_TOUR', 'PHOTOGRAPHY_TOUR', 'BONFIRE_RETREAT', 'INSTITUTE_COLLEGE_TRIP', 'CUSTOM_TRIP');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'RESERVED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('CATALOG', 'CRM');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'FAILED', 'OVERDUE', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('TOKEN', 'BALANCE', 'FULL');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('CREATED', 'PENDING', 'PENDING_VERIFICATION', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('CREATED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "CrmLeadSource" AS ENUM ('WEBSITE', 'PHONE', 'WHATSAPP', 'REFERRAL', 'WALK_IN', 'MANUAL');

-- CreateEnum
CREATE TYPE "CrmLeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'QUOTE_SENT', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "CrmActivityType" AS ENUM ('NOTE', 'CALL', 'EMAIL', 'WHATSAPP', 'STATUS_CHANGE', 'TASK_EVENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CrmTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CrmTaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CrmTaskCategory" AS ENUM ('FOLLOW_UP', 'PAYMENT', 'TRAVELER_DOCUMENT', 'HOTEL', 'TRANSPORT', 'PERMIT', 'VENDOR', 'GENERAL');

-- CreateEnum
CREATE TYPE "DepartureOperationStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HotelReservationStatus" AS ENUM ('PLANNED', 'REQUESTED', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorPaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OperationalTaskCategory" AS ENUM ('HOTEL', 'TRANSPORT', 'PERMIT', 'VENDOR', 'ACTIVITY', 'DOCUMENTATION', 'PAYMENT_COLLECTION', 'GENERAL');

-- CreateEnum
CREATE TYPE "OperationalTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "BookingAddOnStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "LedgerScope" AS ENUM ('TRIP', 'FESTIVAL', 'BOOKING', 'OTHER');

-- CreateEnum
CREATE TYPE "LedgerEntrySource" AS ENUM ('BOOKING_PAYMENT', 'REFUND', 'OPERATIONAL_TASK', 'ADDON_PURCHASE', 'VENDOR_PAYMENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceSource" AS ENUM ('CUSTOM', 'BOOKING_RECEIPT');

-- CreateEnum
CREATE TYPE "CrmInclusionType" AS ENUM ('ACCOMMODATION', 'MEAL', 'SIGHTSEEING', 'ACTIVITY', 'HOTEL_STAY', 'DROP_OFF_TRANSFER', 'COMMON', 'TRANSPORT');

-- CreateEnum
CREATE TYPE "CrmCommonInclusionKey" AS ENUM ('BREAKFAST', 'DINNER', 'ILP_AND_PERMITS', 'TRAVEL', 'VEHICLE_TYPE', 'BBQ', 'BONFIRE', 'TRIP_GUIDE', 'FIRST_AID_KIT');

-- CreateEnum
CREATE TYPE "CrmVehicleType" AS ENUM ('SEDAN', 'SUV', 'INNOVA', 'TRAVELLER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "alternatePhone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "bloodGroup" TEXT,
    "medicalNotes" TEXT,
    "govtIdType" "GovtIdType",
    "govtIdNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "govtIdImageUrl" TEXT,
    "govtIdAssetId" TEXT,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "bannerImages" TEXT[],
    "duration" INTEGER NOT NULL,
    "bestTimeToVisit" TEXT NOT NULL,
    "overview" TEXT NOT NULL,
    "inclusions" TEXT[],
    "exclusions" TEXT[],
    "tripType" "TripType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isSignature" BOOLEAN NOT NULL DEFAULT false,
    "signatureOrder" INTEGER NOT NULL DEFAULT 0,
    "destinationId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isListed" BOOLEAN NOT NULL DEFAULT true,
    "shareTokenHash" TEXT,
    "shareTokenExpiresAt" TIMESTAMP(3),
    "highlights" JSONB NOT NULL DEFAULT '[]',
    "stayTransportImages" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryDay" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "festivalId" TEXT,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "todos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryDayTask" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "category" "OperationalTaskCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "unitPrice" DECIMAL(10,2),
    "quantityNeeded" INTEGER,
    "dueOffsetDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryDayTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingReason" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingTripType" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "iconName" TEXT NOT NULL DEFAULT 'Compass',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingTripType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingFootprint" (
    "id" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "suffix" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL,
    "sublabel" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingFootprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingJourneyMilestone" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconName" TEXT NOT NULL DEFAULT 'MapPin',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingJourneyMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestivalTag" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FestivalTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Festival" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "bannerImages" TEXT[],
    "videoUrl" TEXT,
    "duration" INTEGER NOT NULL,
    "bestTimeToVisit" TEXT NOT NULL,
    "overview" TEXT NOT NULL,
    "highlights" JSONB NOT NULL DEFAULT '[]',
    "inclusions" TEXT[],
    "exclusions" TEXT[],
    "stayTransportImages" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isListed" BOOLEAN NOT NULL DEFAULT true,
    "shareTokenHash" TEXT,
    "shareTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "destinationId" TEXT,

    CONSTRAINT "Festival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "subheading" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmDestination" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmDestination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "stayLocationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "images" JSONB DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StayLocation" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "images" JSONB DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StayLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "stayLocationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "images" JSONB DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferLocation" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTrip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "numberOfNights" INTEGER NOT NULL,
    "totalAmount" DECIMAL(10,2),
    "tokenAmount" DECIMAL(10,2),
    "destinationId" TEXT NOT NULL,
    "tripType" "TripType",
    "bestTimeToVisit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isListed" BOOLEAN NOT NULL DEFAULT true,
    "operationsReminderDays" INTEGER NOT NULL DEFAULT 3,
    "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "websiteOverview" TEXT,
    "websiteFaqs" JSONB NOT NULL DEFAULT '[]',
    "websiteBannerImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "websiteStayTransportImages" JSONB NOT NULL DEFAULT '[]',
    "websiteHighlights" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTripCommonInclusion" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "key" "CrmCommonInclusionKey" NOT NULL,
    "numberOfDays" INTEGER,
    "isIncluded" BOOLEAN,
    "vehicleType" "CrmVehicleType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTripCommonInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTripItineraryDay" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "stayLocationId" TEXT,
    "propertyId" TEXT,
    "breakfast" BOOLEAN NOT NULL DEFAULT false,
    "lunch" BOOLEAN NOT NULL DEFAULT false,
    "dinner" BOOLEAN NOT NULL DEFAULT false,
    "transportEnabled" BOOLEAN NOT NULL DEFAULT false,
    "transportText" TEXT,
    "notes" TEXT,
    "isDropOff" BOOLEAN NOT NULL DEFAULT false,
    "dropOffLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTripItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTripItineraryDayCommonInclusion" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "key" "CrmCommonInclusionKey" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmTripItineraryDayCommonInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTripItineraryDayPlace" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmTripItineraryDayPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTripItineraryDayActivity" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTripItineraryDayActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTripInclusion" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "itineraryDayId" TEXT,
    "type" "CrmInclusionType" NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTripInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmFestival" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "numberOfNights" INTEGER NOT NULL,
    "totalAmount" DECIMAL(10,2),
    "tokenAmount" DECIMAL(10,2),
    "destinationId" TEXT NOT NULL,
    "tripType" "TripType",
    "bestTimeToVisit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isListed" BOOLEAN NOT NULL DEFAULT true,
    "operationsReminderDays" INTEGER NOT NULL DEFAULT 3,
    "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "websiteOverview" TEXT,
    "websiteFaqs" JSONB NOT NULL DEFAULT '[]',
    "websiteBannerImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "websiteStayTransportImages" JSONB NOT NULL DEFAULT '[]',
    "websiteHighlights" JSONB NOT NULL DEFAULT '[]',
    "websiteVideoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmFestival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmFestivalCommonInclusion" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "key" "CrmCommonInclusionKey" NOT NULL,
    "numberOfDays" INTEGER,
    "isIncluded" BOOLEAN,
    "vehicleType" "CrmVehicleType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmFestivalCommonInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmFestivalItineraryDay" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "stayLocationId" TEXT,
    "propertyId" TEXT,
    "breakfast" BOOLEAN NOT NULL DEFAULT false,
    "lunch" BOOLEAN NOT NULL DEFAULT false,
    "dinner" BOOLEAN NOT NULL DEFAULT false,
    "transportEnabled" BOOLEAN NOT NULL DEFAULT false,
    "transportText" TEXT,
    "notes" TEXT,
    "isDropOff" BOOLEAN NOT NULL DEFAULT false,
    "dropOffLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmFestivalItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmFestivalItineraryDayCommonInclusion" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "key" "CrmCommonInclusionKey" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmFestivalItineraryDayCommonInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmFestivalItineraryDayPlace" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmFestivalItineraryDayPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmFestivalItineraryDayActivity" (
    "id" TEXT NOT NULL,
    "itineraryDayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmFestivalItineraryDayActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmFestivalInclusion" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "itineraryDayId" TEXT,
    "type" "CrmInclusionType" NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmFestivalInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "festivalId" TEXT,
    "crmTripId" TEXT,
    "crmFestivalId" TEXT,
    "title" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "tokenAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "festivalId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "title" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL,
    "filledSpots" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "numberOfTravelers" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "tokenAmount" DECIMAL(10,2) NOT NULL,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(10,2) NOT NULL,
    "initialPaymentType" "PaymentType" NOT NULL,
    "balanceDueDate" TIMESTAMP(3),
    "reservedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reviewRequestedAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancelledBy" TEXT,
    "specialRequests" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "source" "BookingSource" NOT NULL DEFAULT 'CATALOG',
    "packageId" TEXT,
    "slotId" TEXT,
    "crmTripSlotId" TEXT,
    "crmFestivalSlotId" TEXT,
    "tripId" TEXT,
    "crmTripId" TEXT,
    "crmFestivalId" TEXT,
    "festivalId" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Traveler" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "gender" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "phone" TEXT,
    "aadhaar" TEXT,
    "aadhaarAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Traveler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "resourceType" "MediaResourceType" NOT NULL,
    "deliveryType" "MediaDeliveryType" NOT NULL DEFAULT 'PUBLIC',
    "format" TEXT,
    "version" TEXT,
    "bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "folder" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "festivalId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripTag" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "tripType" "TripType",
    "tripId" TEXT,
    "userId" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "festivalId" TEXT,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalTask" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "itineraryDayId" TEXT,
    "crmItineraryDayId" TEXT,
    "crmFestivalItineraryDayId" TEXT,
    "crmSourceKey" TEXT,
    "sourceTemplateId" TEXT,
    "addOnId" TEXT,
    "category" "OperationalTaskCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "unitPrice" DECIMAL(10,2),
    "quantityNeeded" INTEGER,
    "quantityAcquired" INTEGER,
    "dueAt" TIMESTAMP(3),
    "status" "OperationalTaskStatus" NOT NULL DEFAULT 'PENDING',
    "assigneeId" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "lastReminderSentAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalTaskReminder" (
    "id" TEXT NOT NULL,
    "operationalTaskId" TEXT NOT NULL,
    "channel" "ReminderType" NOT NULL DEFAULT 'AUTOMATIC',
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalTaskReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOn" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "festivalId" TEXT,
    "crmTripId" TEXT,
    "crmFestivalId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "maxQuantityPerBooking" INTEGER,
    "maxQuantityPerSlot" INTEGER,
    "purchaseCutoffOffsetDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAddOn" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "addOnId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "status" "BookingAddOnStatus" NOT NULL DEFAULT 'PENDING',
    "purchasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'CREATED',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "type" "PaymentType" NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'CREATED',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "paymentMethod" TEXT,
    "utr" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "failureCode" TEXT,
    "failureReason" TEXT,
    "receiptNumber" TEXT,
    "notes" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "receiptNumberInt" SERIAL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhook" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReminder" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "sentBy" TEXT,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "razorpayRefundId" TEXT,
    "initiatedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "scope" "LedgerScope" NOT NULL,
    "tripId" TEXT,
    "festivalId" TEXT,
    "crmTripId" TEXT,
    "crmFestivalId" TEXT,
    "bookingId" TEXT,
    "paymentId" TEXT,
    "operationalTaskId" TEXT,
    "bookingAddOnId" TEXT,
    "source" "LedgerEntrySource" NOT NULL DEFAULT 'MANUAL',
    "category" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "description" TEXT,
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "userId" TEXT NOT NULL,
    "tripId" TEXT,
    "festivalId" TEXT,
    "bookingId" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomInvoice" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "dueDate" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'SENT',
    "source" "InvoiceSource" NOT NULL DEFAULT 'CUSTOM',
    "bookingId" TEXT,
    "paymentId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTripSlot" (
    "id" TEXT NOT NULL,
    "crmTripId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "title" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL,
    "filledSpots" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTripSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmFestivalSlot" (
    "id" TEXT NOT NULL,
    "crmFestivalId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "title" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL,
    "filledSpots" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmFestivalSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TripToTripTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TripToTripTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FestivalToFestivalTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FestivalToFestivalTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CrmTripToTripTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CrmTripToTripTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CrmFestivalToFestivalTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CrmFestivalToFestivalTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_govtIdAssetId_key" ON "UserProfile"("govtIdAssetId");

-- CreateIndex
CREATE INDEX "UserProfile_govtIdNumber_idx" ON "UserProfile"("govtIdNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_slug_key" ON "Trip"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_shareTokenHash_key" ON "Trip"("shareTokenHash");

-- CreateIndex
CREATE INDEX "Trip_tripType_idx" ON "Trip"("tripType");

-- CreateIndex
CREATE INDEX "Trip_isActive_idx" ON "Trip"("isActive");

-- CreateIndex
CREATE INDEX "Trip_isFeatured_idx" ON "Trip"("isFeatured");

-- CreateIndex
CREATE INDEX "Trip_isSignature_signatureOrder_idx" ON "Trip"("isSignature", "signatureOrder");

-- CreateIndex
CREATE INDEX "Trip_isPublished_idx" ON "Trip"("isPublished");

-- CreateIndex
CREATE INDEX "Trip_location_idx" ON "Trip"("location");

-- CreateIndex
CREATE INDEX "Trip_destinationId_idx" ON "Trip"("destinationId");

-- CreateIndex
CREATE INDEX "ItineraryDay_tripId_idx" ON "ItineraryDay"("tripId");

-- CreateIndex
CREATE INDEX "ItineraryDay_festivalId_idx" ON "ItineraryDay"("festivalId");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryDay_tripId_dayNumber_key" ON "ItineraryDay"("tripId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryDay_festivalId_dayNumber_key" ON "ItineraryDay"("festivalId", "dayNumber");

-- CreateIndex
CREATE INDEX "ItineraryDayTask_itineraryDayId_idx" ON "ItineraryDayTask"("itineraryDayId");

-- CreateIndex
CREATE INDEX "ItineraryDayTask_category_idx" ON "ItineraryDayTask"("category");

-- CreateIndex
CREATE INDEX "LandingReason_isActive_sortOrder_idx" ON "LandingReason"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "LandingTripType_isActive_sortOrder_idx" ON "LandingTripType"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "LandingFootprint_isActive_sortOrder_idx" ON "LandingFootprint"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "LandingJourneyMilestone_isActive_sortOrder_idx" ON "LandingJourneyMilestone"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FestivalTag_tag_key" ON "FestivalTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "Festival_slug_key" ON "Festival"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Festival_shareTokenHash_key" ON "Festival"("shareTokenHash");

-- CreateIndex
CREATE INDEX "Festival_isActive_idx" ON "Festival"("isActive");

-- CreateIndex
CREATE INDEX "Festival_isFeatured_idx" ON "Festival"("isFeatured");

-- CreateIndex
CREATE INDEX "Festival_isPublished_idx" ON "Festival"("isPublished");

-- CreateIndex
CREATE INDEX "Festival_location_idx" ON "Festival"("location");

-- CreateIndex
CREATE INDEX "Festival_destinationId_idx" ON "Festival"("destinationId");

-- CreateIndex
CREATE INDEX "Destination_isPublished_idx" ON "Destination"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "CrmDestination_name_key" ON "CrmDestination"("name");

-- CreateIndex
CREATE INDEX "Place_stayLocationId_isActive_idx" ON "Place"("stayLocationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Place_stayLocationId_name_key" ON "Place"("stayLocationId", "name");

-- CreateIndex
CREATE INDEX "StayLocation_destinationId_isActive_idx" ON "StayLocation"("destinationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StayLocation_destinationId_name_key" ON "StayLocation"("destinationId", "name");

-- CreateIndex
CREATE INDEX "Property_stayLocationId_isActive_idx" ON "Property"("stayLocationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Property_stayLocationId_name_key" ON "Property"("stayLocationId", "name");

-- CreateIndex
CREATE INDEX "TransferLocation_destinationId_isActive_idx" ON "TransferLocation"("destinationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TransferLocation_destinationId_name_key" ON "TransferLocation"("destinationId", "name");

-- CreateIndex
CREATE INDEX "CrmTrip_destinationId_idx" ON "CrmTrip"("destinationId");

-- CreateIndex
CREATE INDEX "CrmTrip_isActive_idx" ON "CrmTrip"("isActive");

-- CreateIndex
CREATE INDEX "CrmTrip_isFeatured_idx" ON "CrmTrip"("isFeatured");

-- CreateIndex
CREATE INDEX "CrmTrip_isPublished_idx" ON "CrmTrip"("isPublished");

-- CreateIndex
CREATE INDEX "CrmTrip_isListed_idx" ON "CrmTrip"("isListed");

-- CreateIndex
CREATE INDEX "CrmTrip_createdAt_idx" ON "CrmTrip"("createdAt");

-- CreateIndex
CREATE INDEX "CrmTripCommonInclusion_tripId_idx" ON "CrmTripCommonInclusion"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmTripCommonInclusion_tripId_key_key" ON "CrmTripCommonInclusion"("tripId", "key");

-- CreateIndex
CREATE INDEX "CrmTripItineraryDay_tripId_idx" ON "CrmTripItineraryDay"("tripId");

-- CreateIndex
CREATE INDEX "CrmTripItineraryDay_stayLocationId_idx" ON "CrmTripItineraryDay"("stayLocationId");

-- CreateIndex
CREATE INDEX "CrmTripItineraryDay_propertyId_idx" ON "CrmTripItineraryDay"("propertyId");

-- CreateIndex
CREATE INDEX "CrmTripItineraryDay_dropOffLocationId_idx" ON "CrmTripItineraryDay"("dropOffLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmTripItineraryDay_tripId_dayNumber_key" ON "CrmTripItineraryDay"("tripId", "dayNumber");

-- CreateIndex
CREATE INDEX "CrmTripItineraryDayCommonInclusion_itineraryDayId_idx" ON "CrmTripItineraryDayCommonInclusion"("itineraryDayId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmTripItineraryDayCommonInclusion_itineraryDayId_key_key" ON "CrmTripItineraryDayCommonInclusion"("itineraryDayId", "key");

-- CreateIndex
CREATE INDEX "CrmTripItineraryDayPlace_itineraryDayId_displayOrder_idx" ON "CrmTripItineraryDayPlace"("itineraryDayId", "displayOrder");

-- CreateIndex
CREATE INDEX "CrmTripItineraryDayPlace_placeId_idx" ON "CrmTripItineraryDayPlace"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmTripItineraryDayPlace_itineraryDayId_placeId_key" ON "CrmTripItineraryDayPlace"("itineraryDayId", "placeId");

-- CreateIndex
CREATE INDEX "CrmTripItineraryDayActivity_itineraryDayId_displayOrder_idx" ON "CrmTripItineraryDayActivity"("itineraryDayId", "displayOrder");

-- CreateIndex
CREATE INDEX "CrmTripInclusion_tripId_displayOrder_idx" ON "CrmTripInclusion"("tripId", "displayOrder");

-- CreateIndex
CREATE INDEX "CrmTripInclusion_itineraryDayId_idx" ON "CrmTripInclusion"("itineraryDayId");

-- CreateIndex
CREATE INDEX "CrmTripInclusion_type_idx" ON "CrmTripInclusion"("type");

-- CreateIndex
CREATE UNIQUE INDEX "CrmTripInclusion_tripId_sourceKey_key" ON "CrmTripInclusion"("tripId", "sourceKey");

-- CreateIndex
CREATE INDEX "CrmFestival_destinationId_idx" ON "CrmFestival"("destinationId");

-- CreateIndex
CREATE INDEX "CrmFestival_isActive_idx" ON "CrmFestival"("isActive");

-- CreateIndex
CREATE INDEX "CrmFestival_isFeatured_idx" ON "CrmFestival"("isFeatured");

-- CreateIndex
CREATE INDEX "CrmFestival_isPublished_idx" ON "CrmFestival"("isPublished");

-- CreateIndex
CREATE INDEX "CrmFestival_isListed_idx" ON "CrmFestival"("isListed");

-- CreateIndex
CREATE INDEX "CrmFestival_createdAt_idx" ON "CrmFestival"("createdAt");

-- CreateIndex
CREATE INDEX "CrmFestivalCommonInclusion_festivalId_idx" ON "CrmFestivalCommonInclusion"("festivalId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmFestivalCommonInclusion_festivalId_key_key" ON "CrmFestivalCommonInclusion"("festivalId", "key");

-- CreateIndex
CREATE INDEX "CrmFestivalItineraryDay_festivalId_idx" ON "CrmFestivalItineraryDay"("festivalId");

-- CreateIndex
CREATE INDEX "CrmFestivalItineraryDay_stayLocationId_idx" ON "CrmFestivalItineraryDay"("stayLocationId");

-- CreateIndex
CREATE INDEX "CrmFestivalItineraryDay_propertyId_idx" ON "CrmFestivalItineraryDay"("propertyId");

-- CreateIndex
CREATE INDEX "CrmFestivalItineraryDay_dropOffLocationId_idx" ON "CrmFestivalItineraryDay"("dropOffLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmFestivalItineraryDay_festivalId_dayNumber_key" ON "CrmFestivalItineraryDay"("festivalId", "dayNumber");

-- CreateIndex
CREATE INDEX "CrmFestivalItineraryDayCommonInclusion_itineraryDayId_idx" ON "CrmFestivalItineraryDayCommonInclusion"("itineraryDayId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmFestivalItineraryDayCommonInclusion_itineraryDayId_key_key" ON "CrmFestivalItineraryDayCommonInclusion"("itineraryDayId", "key");

-- CreateIndex
CREATE INDEX "CrmFestivalItineraryDayPlace_itineraryDayId_displayOrder_idx" ON "CrmFestivalItineraryDayPlace"("itineraryDayId", "displayOrder");

-- CreateIndex
CREATE INDEX "CrmFestivalItineraryDayPlace_placeId_idx" ON "CrmFestivalItineraryDayPlace"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmFestivalItineraryDayPlace_itineraryDayId_placeId_key" ON "CrmFestivalItineraryDayPlace"("itineraryDayId", "placeId");

-- CreateIndex
CREATE INDEX "CrmFestivalItineraryDayActivity_itineraryDayId_displayOrder_idx" ON "CrmFestivalItineraryDayActivity"("itineraryDayId", "displayOrder");

-- CreateIndex
CREATE INDEX "CrmFestivalInclusion_festivalId_displayOrder_idx" ON "CrmFestivalInclusion"("festivalId", "displayOrder");

-- CreateIndex
CREATE INDEX "CrmFestivalInclusion_itineraryDayId_idx" ON "CrmFestivalInclusion"("itineraryDayId");

-- CreateIndex
CREATE INDEX "CrmFestivalInclusion_type_idx" ON "CrmFestivalInclusion"("type");

-- CreateIndex
CREATE UNIQUE INDEX "CrmFestivalInclusion_festivalId_sourceKey_key" ON "CrmFestivalInclusion"("festivalId", "sourceKey");

-- CreateIndex
CREATE INDEX "Package_tripId_idx" ON "Package"("tripId");

-- CreateIndex
CREATE INDEX "Package_festivalId_idx" ON "Package"("festivalId");

-- CreateIndex
CREATE INDEX "Package_crmTripId_idx" ON "Package"("crmTripId");

-- CreateIndex
CREATE INDEX "Package_crmFestivalId_idx" ON "Package"("crmFestivalId");

-- CreateIndex
CREATE INDEX "Slot_tripId_idx" ON "Slot"("tripId");

-- CreateIndex
CREATE INDEX "Slot_festivalId_idx" ON "Slot"("festivalId");

-- CreateIndex
CREATE INDEX "Slot_startDate_idx" ON "Slot"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingReference_key" ON "Booking"("bookingReference");

-- CreateIndex
CREATE INDEX "Booking_packageId_idx" ON "Booking"("packageId");

-- CreateIndex
CREATE INDEX "Booking_slotId_idx" ON "Booking"("slotId");

-- CreateIndex
CREATE INDEX "Booking_crmTripSlotId_idx" ON "Booking"("crmTripSlotId");

-- CreateIndex
CREATE INDEX "Booking_crmFestivalSlotId_idx" ON "Booking"("crmFestivalSlotId");

-- CreateIndex
CREATE INDEX "Booking_source_idx" ON "Booking"("source");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_paymentStatus_idx" ON "Booking"("paymentStatus");

-- CreateIndex
CREATE INDEX "Booking_balanceDueDate_idx" ON "Booking"("balanceDueDate");

-- CreateIndex
CREATE INDEX "Booking_crmTripId_idx" ON "Booking"("crmTripId");

-- CreateIndex
CREATE INDEX "Booking_crmFestivalId_idx" ON "Booking"("crmFestivalId");

-- CreateIndex
CREATE UNIQUE INDEX "Traveler_aadhaarAssetId_key" ON "Traveler"("aadhaarAssetId");

-- CreateIndex
CREATE INDEX "Traveler_bookingId_idx" ON "Traveler"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_publicId_key" ON "MediaAsset"("publicId");

-- CreateIndex
CREATE INDEX "MediaAsset_uploadedById_idx" ON "MediaAsset"("uploadedById");

-- CreateIndex
CREATE INDEX "MediaAsset_deliveryType_idx" ON "MediaAsset"("deliveryType");

-- CreateIndex
CREATE INDEX "FAQ_tripId_idx" ON "FAQ"("tripId");

-- CreateIndex
CREATE INDEX "FAQ_festivalId_idx" ON "FAQ"("festivalId");

-- CreateIndex
CREATE INDEX "FAQ_order_idx" ON "FAQ"("order");

-- CreateIndex
CREATE UNIQUE INDEX "TripTag_tag_key" ON "TripTag"("tag");

-- CreateIndex
CREATE INDEX "Inquiry_email_idx" ON "Inquiry"("email");

-- CreateIndex
CREATE INDEX "Inquiry_tripId_idx" ON "Inquiry"("tripId");

-- CreateIndex
CREATE INDEX "Inquiry_festivalId_idx" ON "Inquiry"("festivalId");

-- CreateIndex
CREATE INDEX "Inquiry_userId_idx" ON "Inquiry"("userId");

-- CreateIndex
CREATE INDEX "Inquiry_isResolved_idx" ON "Inquiry"("isResolved");

-- CreateIndex
CREATE INDEX "Inquiry_createdAt_idx" ON "Inquiry"("createdAt");

-- CreateIndex
CREATE INDEX "OperationalTask_bookingId_idx" ON "OperationalTask"("bookingId");

-- CreateIndex
CREATE INDEX "OperationalTask_itineraryDayId_idx" ON "OperationalTask"("itineraryDayId");

-- CreateIndex
CREATE INDEX "OperationalTask_crmItineraryDayId_idx" ON "OperationalTask"("crmItineraryDayId");

-- CreateIndex
CREATE INDEX "OperationalTask_crmFestivalItineraryDayId_idx" ON "OperationalTask"("crmFestivalItineraryDayId");

-- CreateIndex
CREATE INDEX "OperationalTask_category_idx" ON "OperationalTask"("category");

-- CreateIndex
CREATE INDEX "OperationalTask_status_dueAt_idx" ON "OperationalTask"("status", "dueAt");

-- CreateIndex
CREATE INDEX "OperationalTask_assigneeId_idx" ON "OperationalTask"("assigneeId");

-- CreateIndex
CREATE INDEX "OperationalTaskReminder_operationalTaskId_idx" ON "OperationalTaskReminder"("operationalTaskId");

-- CreateIndex
CREATE INDEX "OperationalTaskReminder_status_idx" ON "OperationalTaskReminder"("status");

-- CreateIndex
CREATE INDEX "AddOn_tripId_idx" ON "AddOn"("tripId");

-- CreateIndex
CREATE INDEX "AddOn_festivalId_idx" ON "AddOn"("festivalId");

-- CreateIndex
CREATE INDEX "AddOn_crmTripId_idx" ON "AddOn"("crmTripId");

-- CreateIndex
CREATE INDEX "AddOn_crmFestivalId_idx" ON "AddOn"("crmFestivalId");

-- CreateIndex
CREATE INDEX "AddOn_isActive_idx" ON "AddOn"("isActive");

-- CreateIndex
CREATE INDEX "BookingAddOn_bookingId_idx" ON "BookingAddOn"("bookingId");

-- CreateIndex
CREATE INDEX "BookingAddOn_addOnId_idx" ON "BookingAddOn"("addOnId");

-- CreateIndex
CREATE INDEX "BookingAddOn_status_idx" ON "BookingAddOn"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_razorpayOrderId_key" ON "PaymentIntent"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "PaymentIntent_bookingId_idx" ON "PaymentIntent"("bookingId");

-- CreateIndex
CREATE INDEX "PaymentIntent_status_idx" ON "PaymentIntent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentIntentId_key" ON "Payment"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "Payment"("type");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhook_eventId_key" ON "PaymentWebhook"("eventId");

-- CreateIndex
CREATE INDEX "PaymentWebhook_eventType_idx" ON "PaymentWebhook"("eventType");

-- CreateIndex
CREATE INDEX "PaymentWebhook_processed_idx" ON "PaymentWebhook"("processed");

-- CreateIndex
CREATE INDEX "PaymentWebhook_createdAt_idx" ON "PaymentWebhook"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentReminder_bookingId_idx" ON "PaymentReminder"("bookingId");

-- CreateIndex
CREATE INDEX "PaymentReminder_status_idx" ON "PaymentReminder"("status");

-- CreateIndex
CREATE INDEX "PaymentReminder_createdAt_idx" ON "PaymentReminder"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_razorpayRefundId_key" ON "Refund"("razorpayRefundId");

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- CreateIndex
CREATE INDEX "Refund_createdAt_idx" ON "Refund"("createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_tripId_idx" ON "LedgerEntry"("tripId");

-- CreateIndex
CREATE INDEX "LedgerEntry_festivalId_idx" ON "LedgerEntry"("festivalId");

-- CreateIndex
CREATE INDEX "LedgerEntry_crmTripId_idx" ON "LedgerEntry"("crmTripId");

-- CreateIndex
CREATE INDEX "LedgerEntry_crmFestivalId_idx" ON "LedgerEntry"("crmFestivalId");

-- CreateIndex
CREATE INDEX "LedgerEntry_bookingId_idx" ON "LedgerEntry"("bookingId");

-- CreateIndex
CREATE INDEX "LedgerEntry_type_scope_idx" ON "LedgerEntry"("type", "scope");

-- CreateIndex
CREATE INDEX "LedgerEntry_entryDate_idx" ON "LedgerEntry"("entryDate");

-- CreateIndex
CREATE INDEX "LedgerEntry_source_idx" ON "LedgerEntry"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_tripId_idx" ON "Review"("tripId");

-- CreateIndex
CREATE INDEX "Review_festivalId_idx" ON "Review"("festivalId");

-- CreateIndex
CREATE INDEX "Review_isPublished_idx" ON "Review"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "CustomInvoice_paymentId_key" ON "CustomInvoice"("paymentId");

-- CreateIndex
CREATE INDEX "CustomInvoice_status_idx" ON "CustomInvoice"("status");

-- CreateIndex
CREATE INDEX "CustomInvoice_source_idx" ON "CustomInvoice"("source");

-- CreateIndex
CREATE INDEX "CustomInvoice_bookingId_idx" ON "CustomInvoice"("bookingId");

-- CreateIndex
CREATE INDEX "CustomInvoice_customerEmail_idx" ON "CustomInvoice"("customerEmail");

-- CreateIndex
CREATE INDEX "CrmTripSlot_crmTripId_idx" ON "CrmTripSlot"("crmTripId");

-- CreateIndex
CREATE INDEX "CrmTripSlot_startDate_idx" ON "CrmTripSlot"("startDate");

-- CreateIndex
CREATE INDEX "CrmFestivalSlot_crmFestivalId_idx" ON "CrmFestivalSlot"("crmFestivalId");

-- CreateIndex
CREATE INDEX "CrmFestivalSlot_startDate_idx" ON "CrmFestivalSlot"("startDate");

-- CreateIndex
CREATE INDEX "_TripToTripTag_B_index" ON "_TripToTripTag"("B");

-- CreateIndex
CREATE INDEX "_FestivalToFestivalTag_B_index" ON "_FestivalToFestivalTag"("B");

-- CreateIndex
CREATE INDEX "_CrmTripToTripTag_B_index" ON "_CrmTripToTripTag"("B");

-- CreateIndex
CREATE INDEX "_CrmFestivalToFestivalTag_B_index" ON "_CrmFestivalToFestivalTag"("B");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_govtIdAssetId_fkey" FOREIGN KEY ("govtIdAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryDayTask" ADD CONSTRAINT "ItineraryDayTask_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "ItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Festival" ADD CONSTRAINT "Festival_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_stayLocationId_fkey" FOREIGN KEY ("stayLocationId") REFERENCES "StayLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayLocation" ADD CONSTRAINT "StayLocation_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "CrmDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_stayLocationId_fkey" FOREIGN KEY ("stayLocationId") REFERENCES "StayLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferLocation" ADD CONSTRAINT "TransferLocation_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "CrmDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTrip" ADD CONSTRAINT "CrmTrip_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "CrmDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTripCommonInclusion" ADD CONSTRAINT "CrmTripCommonInclusion_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTripItineraryDay" ADD CONSTRAINT "CrmTripItineraryDay_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTripItineraryDay" ADD CONSTRAINT "CrmTripItineraryDay_stayLocationId_fkey" FOREIGN KEY ("stayLocationId") REFERENCES "StayLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTripItineraryDay" ADD CONSTRAINT "CrmTripItineraryDay_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTripItineraryDay" ADD CONSTRAINT "CrmTripItineraryDay_dropOffLocationId_fkey" FOREIGN KEY ("dropOffLocationId") REFERENCES "TransferLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTripItineraryDayCommonInclusion" ADD CONSTRAINT "CrmTripItineraryDayCommonInclusion_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "CrmTripItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTripItineraryDayPlace" ADD CONSTRAINT "CrmTripItineraryDayPlace_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "CrmTripItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTripItineraryDayPlace" ADD CONSTRAINT "CrmTripItineraryDayPlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTripItineraryDayActivity" ADD CONSTRAINT "CrmTripItineraryDayActivity_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "CrmTripItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTripInclusion" ADD CONSTRAINT "CrmTripInclusion_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTripInclusion" ADD CONSTRAINT "CrmTripInclusion_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "CrmTripItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFestival" ADD CONSTRAINT "CrmFestival_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "CrmDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFestivalCommonInclusion" ADD CONSTRAINT "CrmFestivalCommonInclusion_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "CrmFestival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFestivalItineraryDay" ADD CONSTRAINT "CrmFestivalItineraryDay_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "CrmFestival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFestivalItineraryDay" ADD CONSTRAINT "CrmFestivalItineraryDay_stayLocationId_fkey" FOREIGN KEY ("stayLocationId") REFERENCES "StayLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFestivalItineraryDay" ADD CONSTRAINT "CrmFestivalItineraryDay_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFestivalItineraryDay" ADD CONSTRAINT "CrmFestivalItineraryDay_dropOffLocationId_fkey" FOREIGN KEY ("dropOffLocationId") REFERENCES "TransferLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFestivalItineraryDayCommonInclusion" ADD CONSTRAINT "CrmFestivalItineraryDayCommonInclusion_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "CrmFestivalItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFestivalItineraryDayPlace" ADD CONSTRAINT "CrmFestivalItineraryDayPlace_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "CrmFestivalItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFestivalItineraryDayPlace" ADD CONSTRAINT "CrmFestivalItineraryDayPlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFestivalItineraryDayActivity" ADD CONSTRAINT "CrmFestivalItineraryDayActivity_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "CrmFestivalItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFestivalInclusion" ADD CONSTRAINT "CrmFestivalInclusion_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "CrmFestival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFestivalInclusion" ADD CONSTRAINT "CrmFestivalInclusion_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "CrmFestivalItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_crmTripId_fkey" FOREIGN KEY ("crmTripId") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_crmFestivalId_fkey" FOREIGN KEY ("crmFestivalId") REFERENCES "CrmFestival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_crmTripSlotId_fkey" FOREIGN KEY ("crmTripSlotId") REFERENCES "CrmTripSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_crmFestivalSlotId_fkey" FOREIGN KEY ("crmFestivalSlotId") REFERENCES "CrmFestivalSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_crmTripId_fkey" FOREIGN KEY ("crmTripId") REFERENCES "CrmTrip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_crmFestivalId_fkey" FOREIGN KEY ("crmFestivalId") REFERENCES "CrmFestival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traveler" ADD CONSTRAINT "Traveler_aadhaarAssetId_fkey" FOREIGN KEY ("aadhaarAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Traveler" ADD CONSTRAINT "Traveler_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FAQ" ADD CONSTRAINT "FAQ_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FAQ" ADD CONSTRAINT "FAQ_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_itineraryDayId_fkey" FOREIGN KEY ("itineraryDayId") REFERENCES "ItineraryDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_crmItineraryDayId_fkey" FOREIGN KEY ("crmItineraryDayId") REFERENCES "CrmTripItineraryDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_crmFestivalItineraryDayId_fkey" FOREIGN KEY ("crmFestivalItineraryDayId") REFERENCES "CrmFestivalItineraryDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalTaskReminder" ADD CONSTRAINT "OperationalTaskReminder_operationalTaskId_fkey" FOREIGN KEY ("operationalTaskId") REFERENCES "OperationalTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOn" ADD CONSTRAINT "AddOn_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOn" ADD CONSTRAINT "AddOn_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOn" ADD CONSTRAINT "AddOn_crmTripId_fkey" FOREIGN KEY ("crmTripId") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOn" ADD CONSTRAINT "AddOn_crmFestivalId_fkey" FOREIGN KEY ("crmFestivalId") REFERENCES "CrmFestival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAddOn" ADD CONSTRAINT "BookingAddOn_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAddOn" ADD CONSTRAINT "BookingAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_crmTripId_fkey" FOREIGN KEY ("crmTripId") REFERENCES "CrmTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_crmFestivalId_fkey" FOREIGN KEY ("crmFestivalId") REFERENCES "CrmFestival"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_operationalTaskId_fkey" FOREIGN KEY ("operationalTaskId") REFERENCES "OperationalTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_bookingAddOnId_fkey" FOREIGN KEY ("bookingAddOnId") REFERENCES "BookingAddOn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTripSlot" ADD CONSTRAINT "CrmTripSlot_crmTripId_fkey" FOREIGN KEY ("crmTripId") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmFestivalSlot" ADD CONSTRAINT "CrmFestivalSlot_crmFestivalId_fkey" FOREIGN KEY ("crmFestivalId") REFERENCES "CrmFestival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TripToTripTag" ADD CONSTRAINT "_TripToTripTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TripToTripTag" ADD CONSTRAINT "_TripToTripTag_B_fkey" FOREIGN KEY ("B") REFERENCES "TripTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FestivalToFestivalTag" ADD CONSTRAINT "_FestivalToFestivalTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Festival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FestivalToFestivalTag" ADD CONSTRAINT "_FestivalToFestivalTag_B_fkey" FOREIGN KEY ("B") REFERENCES "FestivalTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CrmTripToTripTag" ADD CONSTRAINT "_CrmTripToTripTag_A_fkey" FOREIGN KEY ("A") REFERENCES "CrmTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CrmTripToTripTag" ADD CONSTRAINT "_CrmTripToTripTag_B_fkey" FOREIGN KEY ("B") REFERENCES "TripTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CrmFestivalToFestivalTag" ADD CONSTRAINT "_CrmFestivalToFestivalTag_A_fkey" FOREIGN KEY ("A") REFERENCES "CrmFestival"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CrmFestivalToFestivalTag" ADD CONSTRAINT "_CrmFestivalToFestivalTag_B_fkey" FOREIGN KEY ("B") REFERENCES "FestivalTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

