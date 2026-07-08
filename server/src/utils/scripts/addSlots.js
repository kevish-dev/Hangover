import { prisma } from '../../prisma/client.js';

const capacity = 12;

const tripsData = [
  {
    tripId: '80f88d20-59ab-41b7-844c-9e09d57f5527',
    name: 'Anini & Namsai',
    slots: [
      { startDate: '2026-08-31', endDate: '2026-09-07', title: null, priority: 0 },
      { startDate: '2026-09-28', endDate: '2026-10-05', title: null, priority: 0 },
      { startDate: '2026-10-13', endDate: '2026-10-20', title: null, priority: 0 },
      { startDate: '2026-11-03', endDate: '2026-11-10', title: null, priority: 0 },
      { startDate: '2026-11-17', endDate: '2026-11-24', title: null, priority: 0 },
    ],
  },
  {
    tripId: 'b3f9696c-c481-4ef2-9e1d-23f9e0e764c3',
    name: 'Tawang - 6 Nights 7 Days',
    slots: [
      { startDate: '2026-09-29', endDate: '2026-10-05', title: 'Gandhi Jayanti weekend', priority: 1 },
      { startDate: '2026-10-14', endDate: '2026-10-20', title: 'Durga Puja, Dussehra holidays', priority: 2 },
      { startDate: '2026-11-04', endDate: '2026-11-10', title: 'Diwali', priority: 3 },
      { startDate: '2026-08-11', endDate: '2026-08-17', title: 'Independence Day', priority: 4 },
      { startDate: '2026-09-01', endDate: '2026-09-07', title: 'Janmashtami', priority: 5 },
      { startDate: '2026-11-18', endDate: '2026-11-24', title: 'Guru Nanak Jayanti', priority: 6 },
    ],
  },
  {
    tripId: '702fd9f3-8e18-477c-8a70-f97d05f7adbc',
    name: 'Ziro Valley & Kaziranga - 4 Nights 5 Days',
    slots: [
      { startDate: '2026-08-13', endDate: '2026-08-17', title: 'Independence Day + weekend', priority: 0 },
      { startDate: '2026-09-03', endDate: '2026-09-07', title: 'Janmashtami + weekend', priority: 0 },
      { startDate: '2026-09-11', endDate: '2026-09-15', title: 'Ganesh Chaturthi', priority: 0 },
      { startDate: '2026-10-01', endDate: '2026-10-05', title: 'Gandhi Jayanti', priority: 0 },
      { startDate: '2026-10-16', endDate: '2026-10-20', title: 'Durga Puja / Dussehra', priority: 0 },
      { startDate: '2026-11-06', endDate: '2026-11-10', title: 'Diwali', priority: 0 },
      { startDate: '2026-11-20', endDate: '2026-11-24', title: 'Guru Nanak Jayanti', priority: 0 },
    ],
  },
  {
    tripId: 'cd551328-0e12-4c79-a865-385704a47b78',
    name: 'Mechuka - 5 Nights 6 Days',
    slots: [
      { startDate: '2026-09-30', endDate: '2026-10-05', title: 'Gandhi Jayanti', priority: 1 },
      { startDate: '2026-10-16', endDate: '2026-10-21', title: 'Durga Puja / Dussehra', priority: 2 },
      { startDate: '2026-11-05', endDate: '2026-11-10', title: 'Diwali', priority: 3 },
      { startDate: '2026-08-12', endDate: '2026-08-17', title: 'Independence Day', priority: 4 },
      { startDate: '2026-09-02', endDate: '2026-09-07', title: 'Janmashtami', priority: 5 },
      { startDate: '2026-09-10', endDate: '2026-09-15', title: 'Ganesh Chaturthi', priority: 0 },
      { startDate: '2026-11-20', endDate: '2026-11-25', title: 'Guru Nanak Jayanti', priority: 0 },
    ],
  },
];

async function main() {
  for (const trip of tripsData) {
    console.log('Adding slots for:', trip.name);
    for (const slot of trip.slots) {
      await prisma.slot.create({
        data: {
          tripId: trip.tripId,
          startDate: new Date(slot.startDate + 'T00:00:00.000Z'),
          endDate: new Date(slot.endDate + 'T00:00:00.000Z'),
          title: slot.title,
          priority: slot.priority,
          capacity,
          filledSpots: 0,
        },
      });
      console.log('  Added:', slot.startDate, '->', slot.endDate, 'P' + slot.priority, slot.title ? '(' + slot.title + ')' : '');
    }
  }
  console.log('Done!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
