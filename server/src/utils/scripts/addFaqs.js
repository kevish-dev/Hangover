import { prisma } from '../../prisma/client.js';

const faqsData = [
  {
    tripId: '80f88d20-59ab-41b7-844c-9e09d57f5527', // Anini & Namsai
    name: 'Anini & Namsai',
    faqs: [
      { question: "What is the pickup and drop location?", answer: "Pickup and drop are from Dibrugarh Airport or Railway Station." },
      { question: "Is the Inner Line Permit included?", answer: "Yes, Inner Line Permit and all required passes are included." },
      { question: "What type of accommodation is provided?", answer: "Premium resorts, camps, and local homestays as per the itinerary." },
      { question: "What meals are included?", answer: "Only breakfast is included for all 7 days." },
      { question: "Is the Pomo Trek suitable for beginners?", answer: "The trek involves 8-9 hours of trekking and moderate fitness is recommended." }
    ]
  },
  {
    tripId: 'cd551328-0e12-4c79-a865-385704a47b78', // Mechuka
    name: 'Mechuka - 5 Nights 6 Days',
    faqs: [
      { question: "What is the pickup point?", answer: "Dibrugarh Airport or Railway Station." },
      { question: "Is Inner Line Permit included?", answer: "Yes, all necessary permits are included." },
      { question: "What type of accommodation is provided?", answer: "Premium resorts and authentic homestays." },
      { question: "Are meals included?", answer: "Breakfast is included on all days." },
      { question: "Is the Mechuka La trek difficult?", answer: "The trek is suitable for travelers with basic fitness levels." },
      { question: "What is the minimum age requirement?", answer: "18 years and above or accompanied by a guardian." }
    ]
  },
  {
    tripId: 'b3f9696c-c481-4ef2-9e1d-23f9e0e764c3', // Tawang
    name: 'Tawang - 6 Nights 7 Days',
    faqs: [
      { question: "What is the pickup and drop point?", answer: "Guwahati Airport or Railway Station." },
      { question: "Is Bum La Pass included in the itinerary?", answer: "Yes, subject to permit and weather conditions." },
      { question: "Are permits included?", answer: "Yes, Inner Line Permit and other necessary passes are included." },
      { question: "What type of accommodation is provided?", answer: "Premium resorts and authentic homestays." },
      { question: "Are meals included?", answer: "Breakfast is included on all days." },
      { question: "What is the minimum age requirement?", answer: "18 years and above or accompanied by a guardian." }
    ]
  },
  {
    tripId: '702fd9f3-8e18-477c-8a70-f97d05f7adbc', // Ziro & Kaziranga
    name: 'Ziro Valley & Kaziranga - 4 Nights 5 Days',
    faqs: [
      { question: "What is the pickup location?", answer: "Guwahati Airport or Railway Station." },
      { question: "Is Kaziranga Safari included?", answer: "Safari visit is included in the itinerary, entry fees may be extra unless specifically mentioned." },
      { question: "What is unique about Ziro Valley?", answer: "Ziro is famous for its Apatani tribal culture, rice fields, and scenic landscapes." },
      { question: "Are workshops included?", answer: "Yes, wine tasting and momo-making workshops are included." },
      { question: "Is Inner Line Permit included?", answer: "Yes, all necessary permits are included." },
      { question: "What type of accommodation is provided?", answer: "Premium resorts and authentic homestays." }
    ]
  }
];

async function main() {
  for (const trip of faqsData) {
    console.log('Adding FAQs for:', trip.name);
    
    // Clear old FAQs if any
    await prisma.fAQ.deleteMany({ where: { tripId: trip.tripId } });
    
    for (let i = 0; i < trip.faqs.length; i++) {
      const faq = trip.faqs[i];
      await prisma.fAQ.create({
        data: {
          tripId: trip.tripId,
          question: faq.question,
          answer: faq.answer,
          order: i,
        },
      });
      console.log(`  Added: ${faq.question}`);
    }
  }
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
