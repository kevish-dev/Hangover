export const SITE_NAME = "Hangover Trails";
export const SITE_ORIGIN = "https://hangovertrails.com";
export const LOGO_PATH = "/images/final-logo_png_transparent.png";
export const CONTACT_EMAIL = "experience@hangovertrails.com";
export const CONTACT_PHONE = "+918415929069";

export const navigation = [
  ["/trips", "Trips"],
  ["/festivals", "Festivals"],
  ["/custom-trips", "Custom trips"],
  ["/college-trips", "College trips"],
  ["/guides", "Travel guides"],
  ["/about", "About"],
  ["/booking-help", "Booking help"],
];

export const pages = {
  "/": {
    heading: "Northeast India group trips and festival travel",
    description: "Explore Arunachal Pradesh, Nagaland, Meghalaya and Assam with Hangover Trails. Browse small-group trips, music festival packages and custom itineraries.",
  },
  "/trips": {
    heading: "Northeast India group trips and tour packages",
    description: "Browse Hangover Trails itineraries in Arunachal Pradesh, Assam, Meghalaya and beyond. Compare trip duration, departures and package inclusions.",
  },
  "/festivals": {
    heading: "Northeast India festival travel packages",
    description: "Explore Hangover Trails festival trips in Northeast India, with itineraries, travel dates and details on transfers, stays and festival access.",
  },
  "/about": {
    heading: "About Hangover Trails",
    description: "Meet the team behind Hangover Trails, a community-led travel company shaped by its roots in Arunachal Pradesh and Northeast India.",
    sections: [
      ["Our story", "Hangover Trails started in 2023 with three friends discussing a different way to travel in Ziro Valley. The team plans small-group journeys built around local experiences, shared travel and detailed itineraries."],
      ["Meet the founders", "Donyi Camder Tok leads operations, Kaustav Banerjee leads technology, and Sandeep Kumar Singh leads marketing and sales."],
    ],
  },
  "/custom-trips": {
    heading: "Custom Northeast India trips",
    description: "Plan a private Northeast India itinerary with Hangover Trails for your dates, group size, budget and travel interests.",
    sections: [
      ["Plan around your group", "Tell us where you want to go, when you can travel, and how many people are coming. Share your preferred pace, stay standard, pickup city and any mobility or dietary requirements so we can discuss a suitable itinerary."],
      ["Choose what matters to you", "Use our Tawang, Mechuka, Anini and Namsai, or Ziro Valley and Kaziranga itineraries as a starting point. Let us know which days or experiences you want to keep and where you would prefer more time."],
      ["Get a trip proposal", "Ask for the day-by-day route, price and inclusions in writing. Confirm transport, stays, meals, permit assistance, payments and the terms for changing or cancelling the trip before paying."],
    ],
    related: ["tawang-group-trip", "mechuka-tour-package", "anini-namsai-tour-package", "ziro-valley-kaziranga-tour-package"],
    inquiry: true,
  },
  "/college-trips": {
    heading: "College and institute group trips in Northeast India",
    description: "Plan a college or institute trip to Tawang or Meghalaya. Explore group itineraries and contact Hangover Trails about your cohort and dates.",
    sections: [
      ["Trips for campus groups", "Our catalog includes college itineraries for Tawang and Meghalaya. Send us your institute name, preferred dates, group size, starting city and approximate per-person budget."],
      ["Coordinate with your group", "Tell us who will coordinate the trip for your institute and whether there are accessibility, dietary or scheduling requirements. Ask the team to confirm room sharing, transport, meeting points and what each traveler needs to bring."],
      ["Confirm the arrangements", "Review the itinerary, payment deadlines, inclusions and terms with the person coordinating the group before collecting payments. Ask how traveler changes or a group cancellation would be handled."],
    ],
    related: ["tawang-college-group-trip", "meghalaya-college-group-trip"],
    inquiry: true,
  },
  "/booking-help": {
    heading: "Booking, payments and trip support",
    description: "Find help with Hangover Trails bookings, departure dates, payment balances, cancellations and trip changes.",
    sections: [
      ["Before booking", "Choose a trip, then check its departure dates and package inclusions. Check which meals, stays, transfers, permits or festival passes are included. For a private or institute group, ask the team for a written trip proposal."],
      ["Payments and balances", "Review the total and any token amount offered in checkout. Keep your booking confirmation and use your signed-in profile or the official balance payment link from Hangover Trails to check what is due."],
      ["Changes, cancellations and refunds", "Ask Hangover Trails to confirm the change, cancellation and refund terms for your departure in writing before paying. If you already have a booking, contact us with your booking reference and the change you need."],
    ],
    inquiry: true,
  },
  "/guides": {
    heading: "Northeast India travel guides",
    description: "Plan the details of your Tawang, Mechuka or Hornbill Festival trip, from pickup and stays to permit and festival-pass questions.",
  },
  "/guides/tawang-trip-planning": {
    heading: "Planning a Tawang trip through Dirang and Sangti Valley",
    description: "What to check before booking Tawang, including pickup, the route via Dirang, stays and access to Sela Pass and Bum La.",
    sections: [
      ["Plan the drive as part of the trip", "The Hangover Trails Tawang route includes overnight stops around Dirang and Sangti Valley. Compare where each night is spent and ask how long the first and last drives take from your pickup and drop-off points. Agree on a meeting time before booking your flight or train."],
      ["Confirm permits and pass access", "Ask what permit assistance the package includes, which documents the team needs, and how the itinerary would change if an excursion to Bum La or Sela Pass cannot run. Check official information for your nationality before departure."],
      ["Know what is included overnight", "Check the specific stays on your departure, room-sharing arrangements and which meals are included. Use the itinerary to confirm which days combine sightseeing and longer transfers."],
    ],
    external: [["https://arunachalilp.com/", "Arunachal Pradesh permit information"]],
    related: ["tawang-group-trip", "tawang-college-group-trip"],
  },
  "/guides/mechuka-trip-planning": {
    heading: "Planning a six-day Mechuka trip",
    description: "Questions to ask about pickup, drive days, village and monastery visits, and stays on a Mechuka trip in Arunachal Pradesh.",
    sections: [
      ["Check pickup and overnight stops", "Before buying onward travel, compare the trip pickup with your actual airport or rail arrival, then confirm the planned drive days and any overnight stop on the way to Mechuka. Leave time for the return journey before a same-day connection."],
      ["Compare experiences in the valley", "The Hangover Trails itinerary highlights village and monastery visits. Ask how much walking is planned, which visits are guided, and how the team would adapt the day's plan for your group."],
      ["Ask about permits, meals and rooms", "Check permit assistance and documents with the team, then read the package inclusions for transport, stays and meals. Tell the team early if you need specific room arrangements or have access requirements."],
    ],
    external: [["https://arunachalilp.com/", "Arunachal Pradesh permit information"]],
    related: ["mechuka-tour-package"],
  },
  "/guides/ziro-valley-trip-planning": {
    heading: "Planning a Ziro Valley trip in Arunachal Pradesh",
    description: "Plan time around Ziro Valley’s villages, rice fields and music festival, with practical questions about transport and stays.",
    sections: [
      ["Plan time in the valley", "Ziro is known for its rice fields and the Apatani villages around the valley. Ask about locally guided visits and how to respect community preferences on photography. Leave time to explore the valley if you are also travelling onward to Kaziranga."],
      ["Festival timing and access", "Use the official festival site to check the current edition, location and passes. Ask your travel provider to confirm whether a festival pass, transfers, bedding and meals are included before paying."],
      ["Coordinate pickup and stays", "Check when and where your trip begins and what your transport covers. Compare camping and other stays based on bathrooms, bedding and walking distance to the activities you plan to attend."],
    ],
    external: [["https://www.zirofestival.com/", "Official Ziro Festival website"]],
    related: ["ziro-valley-kaziranga-tour-package", "ziro-music-festival-package"],
  },
  "/guides/hornbill-festival-trip-planning": {
    heading: "Planning a Hornbill Festival trip to Nagaland",
    description: "How to compare a Hornbill Festival travel package, including festival days, campsite or stays, transfers and pass inclusions.",
    sections: [
      ["Match your package to the festival programme", "Nagaland Tourism publishes information about the Hornbill Festival. Check the programme for the edition you want to attend. Compare it with the dates and days at the festival on your package, including which days are spent travelling or visiting other places."],
      ["Compare transfers and festival access", "Check the pickup and return cities, transfers between your stay and the festival venue, and which festival passes are included. Ask how evening transfers work if you plan to stay for performances."],
      ["Check accommodation and what to bring", "If your departure includes camping, confirm the equipment, bedding, bathrooms and meals. Ask what each traveler should bring and how the operator handles changes to the festival schedule."],
    ],
    external: [["https://tourism.nagaland.gov.in/events/hornbill-festival/", "Nagaland Tourism Hornbill Festival information"]],
    related: ["hornbill-festival-package"],
  },
};

export const guidePaths = Object.keys(pages).filter((path) => path.startsWith("/guides/"));
export const editorialPaths = ["/custom-trips", "/college-trips", "/booking-help", "/guides", ...guidePaths];
