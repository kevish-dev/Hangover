import { prisma } from "../../prisma/client.js";

// Helper to get start and end date for a given timeframe
function getTimeframeDates(timeframe) {
  const now = new Date();
  let startDate = new Date();
  
  if (timeframe === "1M") {
    startDate.setMonth(now.getMonth() - 1);
  } else if (timeframe === "6M") {
    startDate.setMonth(now.getMonth() - 6);
  } else if (timeframe === "1Y") {
    startDate.setFullYear(now.getFullYear() - 1);
  } else {
    // Default to 1M
    startDate.setMonth(now.getMonth() - 1);
  }
  
  return { startDate, endDate: now };
}

// Helper to format date for bucket label
function getBucketLabel(date, timeframe) {
  const d = new Date(date);
  if (timeframe === "1M") {
    // Weekly grouping for 1M (e.g. "Week 1", "Week 2" based on ISO week or just date)
    // For simplicity, let's just group by "Mon DD" for a few intervals or just every 7 days.
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (timeframe === "6M" || timeframe === "1Y") {
    // Monthly grouping (e.g. "Jan", "Feb")
    return d.toLocaleDateString('en-US', { month: 'short' });
  }
  return d.toLocaleDateString('en-US', { month: 'short' });
}

// Helper to normalize bucket keys (e.g., month-year) to ensure proper grouping
function getBucketKey(date, timeframe) {
  const d = new Date(date);
  if (timeframe === "1M") {
    // Group by every 3 days or week. Let's group by day of year for simplicity, but label as date.
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  } else {
    // Group by month
    return `${d.getFullYear()}-${d.getMonth()}`;
  }
}

// Initialize buckets
function initBuckets(startDate, endDate, timeframe) {
  const buckets = [];
  let current = new Date(startDate);
  
  if (timeframe === "1M") {
    // 1M -> ~4 weekly buckets. Let's do 4 discrete buckets for Week 1, 2, 3, 4
    for (let i = 0; i < 4; i++) {
       const weekStart = new Date(startDate);
       weekStart.setDate(startDate.getDate() + (i * 7));
       buckets.push({
         key: `Week ${i + 1}`,
         label: `Week ${i + 1}`,
         startDate: weekStart,
         endDate: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
       });
    }
  } else if (timeframe === "6M") {
    for (let i = 0; i < 6; i++) {
       const mStart = new Date(startDate);
       mStart.setMonth(startDate.getMonth() + i);
       buckets.push({
         key: `${mStart.getFullYear()}-${mStart.getMonth()}`,
         label: mStart.toLocaleDateString('en-US', { month: 'short' }),
       });
    }
  } else if (timeframe === "1Y") {
    // Quarter buckets
    for (let i = 0; i < 4; i++) {
       const qStart = new Date(startDate);
       qStart.setMonth(startDate.getMonth() + (i * 3));
       buckets.push({
         key: `Q${i + 1}`,
         label: `Q${i + 1} ${qStart.toLocaleDateString('en-US', { month: 'short' })}`,
         startDate: qStart,
         endDate: new Date(qStart).setMonth(qStart.getMonth() + 3)
       });
    }
  }
  return buckets;
}


export const getDashboardAnalytics = async (timeframe) => {
  const { startDate, endDate } = getTimeframeDates(timeframe);

  // 1. Fetch Ledger Entries
  const ledgerEntries = await prisma.ledgerEntry.findMany({
    where: {
      entryDate: { gte: startDate, lte: endDate }
    }
  });

  // 2. Fetch Travelers (via Booking)
  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      travelers: true,
      user: {
        include: {
          bookings: {
            select: { id: true, createdAt: true }
          }
        }
      }
    }
  });

  // 3. Fetch Reviews
  const reviews = await prisma.review.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      isPublished: true
    }
  });

  // --- Aggregation Logic ---
  
  // Cost Breakdown
  const costBreakdownMap = {};
  ledgerEntries.forEach(entry => {
    if (entry.type === "EXPENSE") {
      const cat = entry.category || "Uncategorized";
      costBreakdownMap[cat] = (costBreakdownMap[cat] || 0) + parseFloat(entry.amount);
    }
  });
  const costBreakdown = Object.keys(costBreakdownMap).map(name => ({
    name,
    value: costBreakdownMap[name]
  })).sort((a, b) => b.value - a.value).slice(0, 5); // top 5 expenses

  // Time-series generation based on timeframe
  let revenueVsCost = [];
  let cashflow = [];
  let travelersData = [];
  let ratings = [];

  const buckets = initBuckets(startDate, endDate, timeframe);
  
  // Helper to find bucket index
  const findBucketIndex = (date) => {
    if (timeframe === "1M" || timeframe === "1Y") {
       return buckets.findIndex(b => date >= b.startDate && date < b.endDate);
    } else {
       const key = getBucketKey(date, timeframe);
       return buckets.findIndex(b => b.key === key);
    }
  };

  // Initialize data structures for buckets
  buckets.forEach(b => {
    revenueVsCost.push({ name: b.label, revenue: 0, cost: 0 });
    cashflow.push({ name: b.label, amount: 0 });
    travelersData.push({ name: b.label, new: 0, returning: 0 });
    ratings.push({ name: b.label, ratingSum: 0, count: 0, rating: 0 });
  });

  // Aggregate Ledger (Revenue, Cost, Cashflow)
  ledgerEntries.forEach(entry => {
    let idx = findBucketIndex(new Date(entry.entryDate));
    if (idx !== -1 && idx < revenueVsCost.length) {
      const amt = parseFloat(entry.amount);
      if (entry.type === "INCOME") {
        revenueVsCost[idx].revenue += amt;
        cashflow[idx].amount += amt;
      } else if (entry.type === "EXPENSE") {
        revenueVsCost[idx].cost += amt;
        cashflow[idx].amount -= amt;
      }
    }
  });

  // Aggregate Travelers
  bookings.forEach(booking => {
    let idx = findBucketIndex(new Date(booking.createdAt));
    if (idx !== -1 && idx < travelersData.length) {
       const travelerCount = booking.numberOfTravelers || 1;
       // Check if returning user: if user has bookings created before this one
       const isReturning = booking.user?.bookings?.some(b => new Date(b.createdAt) < new Date(booking.createdAt));
       if (isReturning) {
         travelersData[idx].returning += travelerCount;
       } else {
         travelersData[idx].new += travelerCount;
       }
    }
  });

  // Aggregate Reviews
  reviews.forEach(review => {
    let idx = findBucketIndex(new Date(review.createdAt));
    if (idx !== -1 && idx < ratings.length) {
       ratings[idx].ratingSum += review.rating;
       ratings[idx].count += 1;
       ratings[idx].rating = parseFloat((ratings[idx].ratingSum / ratings[idx].count).toFixed(1));
    }
  });
  
  // Clean up rating objects to match frontend needs
  const finalRatings = ratings.map(r => ({
    name: r.name,
    rating: r.rating || 0
  }));

  return {
    revenueVsCost,
    costBreakdown,
    cashflow,
    travelers: travelersData,
    ratings: finalRatings
  };
};
