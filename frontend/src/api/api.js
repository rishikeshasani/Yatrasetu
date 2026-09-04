// YatraSetu API Client Service
// Backend Base URL
export const API_BASE_URL = "http://127.0.0.1:8000";

// Mock Fallback Data for resilient hackathon demos
export const MOCK_SITES = [
  {
    id: "site_kedarnath",
    name: "Kedarnath Temple",
    city: "Rudraprayag, Uttarakhand",
    state: "Uttarakhand",
    latitude: 30.7352,
    longitude: 79.0669,
    capacity: 2500,
    description: "One of the twelve sacred Jyotirlingas nestled in the Garhwal Himalayas at 3,583m.",
    image: "https://images.unsplash.com/photo-1626714485848-18e3c66f5647?auto=format&fit=crop&w=800&q=80",
    altitude: "3,584 m",
    darshan_timings: "4:00 AM - 9:00 PM"
  },
  {
    id: "site_badrinath",
    name: "Badrinath Temple",
    city: "Chamoli, Uttarakhand",
    state: "Uttarakhand",
    latitude: 30.7433,
    longitude: 79.4938,
    capacity: 3200,
    description: "Sacred abode of Lord Vishnu along the Alaknanda River, part of Char Dham.",
    image: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=800&q=80",
    altitude: "3,300 m",
    darshan_timings: "4:30 AM - 9:30 PM"
  },
  {
    id: "site_kashi",
    name: "Kashi Vishwanath Temple",
    city: "Varanasi, Uttar Pradesh",
    state: "Uttar Pradesh",
    latitude: 25.3109,
    longitude: 83.0107,
    capacity: 6000,
    description: "The spiritual heart of Varanasi on the holy Ganges, standing since ancient times.",
    image: "https://images.unsplash.com/photo-1561359313-0639aad49ca6?auto=format&fit=crop&w=800&q=80",
    altitude: "81 m",
    darshan_timings: "3:00 AM - 11:00 PM"
  },
  {
    id: "site_tirupati",
    name: "Tirupati Balaji (Venkateswara)",
    city: "Tirupati, Andhra Pradesh",
    state: "Andhra Pradesh",
    latitude: 13.6833,
    longitude: 79.3472,
    capacity: 12000,
    description: "World's most visited sacred pilgrimage spot on the seven peaks of Tirumala Hills.",
    image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80",
    altitude: "853 m",
    darshan_timings: "2:30 AM - 11:30 PM"
  },
  {
    id: "site_vaishnodevi",
    name: "Vaishno Devi Bhawan",
    city: "Katra, Jammu & Kashmir",
    state: "Jammu & Kashmir",
    latitude: 33.0308,
    longitude: 74.9490,
    capacity: 8500,
    description: "Holy cave shrine of Mata Vaishno Devi located in the Trikuta Mountains.",
    image: "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80",
    altitude: "1,585 m",
    darshan_timings: "Open 24 Hours"
  }
];

export const MOCK_DENSITY = {
  site_kedarnath: {
    site_id: "site_kedarnath",
    site_name: "Kedarnath Temple",
    people_count: 2180,
    occupancy_percentage: 87.2,
    status: "HIGH",
    last_updated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  },
  site_badrinath: {
    site_id: "site_badrinath",
    site_name: "Badrinath Temple",
    people_count: 1450,
    occupancy_percentage: 45.3,
    status: "NORMAL",
    last_updated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  },
  site_kashi: {
    site_id: "site_kashi",
    site_name: "Kashi Vishwanath Temple",
    people_count: 5640,
    occupancy_percentage: 94.0,
    status: "CRITICAL",
    last_updated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  },
  site_tirupati: {
    site_id: "site_tirupati",
    site_name: "Tirupati Balaji",
    people_count: 8100,
    occupancy_percentage: 67.5,
    status: "MODERATE",
    last_updated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  },
  site_vaishnodevi: {
    site_id: "site_vaishnodevi",
    site_name: "Vaishno Devi Bhawan",
    people_count: 3600,
    occupancy_percentage: 42.3,
    status: "NORMAL",
    last_updated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
};

export const MOCK_FORECAST = {
  site_kedarnath: {
    site_id: "site_kedarnath",
    site_name: "Kedarnath Temple",
    live_status: {
      people_count: 2180,
      occupancy_percentage: 87.2,
      status: "HIGH",
      last_updated: "Just now"
    },
    queue_forecast: {
      estimated_current_wait_mins: 145,
      normal_wait_mins: 35,
      peak_wait_mins: 160,
      queue_management_system: "RFID Token Queue & Batch Movement",
      fast_track_details: "Helicopter priority darshan pass available via IRCTC portal (₹2,500)"
    },
    seasonal_context: {
      peak_seasons: "May - June & Sept - Oct (Pre-Snowfall)",
      upcoming_peak_festivals: "Shravan Somvar & Diwali Closing Ceremony",
      weather_warnings: "High altitude drop to 2°C after 5 PM. Carry heavy woolens and rain poncho.",
      surge_triggers: "Morning 5:00 AM Maha Aarti & Helicopter batch arrivals at Helipad"
    }
  },
  site_badrinath: {
    site_id: "site_badrinath",
    site_name: "Badrinath Temple",
    live_status: {
      people_count: 1450,
      occupancy_percentage: 45.3,
      status: "NORMAL",
      last_updated: "Just now"
    },
    queue_forecast: {
      estimated_current_wait_mins: 30,
      normal_wait_mins: 25,
      peak_wait_mins: 120,
      queue_management_system: "Automated Turnstiles & Multi-Lane Queuing",
      fast_track_details: "Senior Citizen & Divyangjan special direct corridor"
    },
    seasonal_context: {
      peak_seasons: "May to July, September",
      upcoming_peak_festivals: "Badri Kedar Utsav & Janmashtami",
      weather_warnings: "Clear skies, mild afternoon breeze.",
      surge_triggers: "12:00 PM Afternoon Bhog & 8:00 PM Shayan Aarti"
    }
  },
  site_kashi: {
    site_id: "site_kashi",
    site_name: "Kashi Vishwanath Temple",
    live_status: {
      people_count: 5640,
      occupancy_percentage: 94.0,
      status: "CRITICAL",
      last_updated: "Just now"
    },
    queue_forecast: {
      estimated_current_wait_mins: 210,
      normal_wait_mins: 45,
      peak_wait_mins: 220,
      queue_management_system: "Corridor Barricading & Ganga Dwar Entry System",
      fast_track_details: "Sugam Darshan online ticket booking available (₹300)"
    },
    seasonal_context: {
      peak_seasons: "Round the year, extreme peaks during July-August (Shravan)",
      upcoming_peak_festivals: "Maha Shivratri, Dev Deepawali & Rangbhari Ekadashi",
      weather_warnings: "High daytime humidity; hydration stations active along corridor.",
      surge_triggers: "Mangala Aarti (3:00 AM) & Sandhya Ganga Aarti (6:30 PM)"
    }
  },
  site_tirupati: {
    site_id: "site_tirupati",
    site_name: "Tirupati Balaji",
    live_status: {
      people_count: 8100,
      occupancy_percentage: 67.5,
      status: "MODERATE",
      last_updated: "Just now"
    },
    queue_forecast: {
      estimated_current_wait_mins: 90,
      normal_wait_mins: 40,
      peak_wait_mins: 180,
      queue_management_system: "Vaikuntam Queue Complex 1 & 2 Electronic Time Slots",
      fast_track_details: "Seeghra Darshan (₹300 online booking) & Infant priority lane"
    },
    seasonal_context: {
      peak_seasons: "Year-round, major surges during Brahmotsavam & Vaikunta Ekadasi",
      upcoming_peak_festivals: "Annual Brahmotsavam & Rathasapthami",
      weather_warnings: "Warm daytime temperatures, carry umbrellas and water bottles.",
      surge_triggers: "Kalyanotsavam (10:30 AM) & Sahasra Deepalankarana Seva (5:30 PM)"
    }
  },
  site_vaishnodevi: {
    site_id: "site_vaishnodevi",
    site_name: "Vaishno Devi Bhawan",
    live_status: {
      people_count: 3600,
      occupancy_percentage: 42.3,
      status: "NORMAL",
      last_updated: "Just now"
    },
    queue_forecast: {
      estimated_current_wait_mins: 45,
      normal_wait_mins: 35,
      peak_wait_mins: 150,
      queue_management_system: "RFID Yatra Parchi & Barcoded Concourse Gates",
      fast_track_details: "Battery Car for elderly between Adhkuwari & Bhawan (₹354)"
    },
    seasonal_context: {
      peak_seasons: "Navratri (March/April & October), Summer vacations",
      upcoming_peak_festivals: "Sharad Navratri & New Year Eve",
      weather_warnings: "Chilly evenings at Bhawan (1,585m). Mild winds on track.",
      surge_triggers: "Morning 6:00 AM & Evening 7:00 PM Aarti Batches"
    }
  }
};

// ==========================================================================
// COMPREHENSIVE ALTERNATIVES DATASET WITH HOSPITALITY & CROWD TELEMETRY
// ==========================================================================
export const MOCK_ALTERNATIVES = {
  // 1. KEDARNATH ALTERNATIVES
  site_kedarnath: {
    site_id: "site_kedarnath",
    site_name: "Kedarnath Temple",
    current_occupancy_percentage: 87.2,
    current_status: "HIGH",
    redistribution_needed: true,
    recommendations: [
      {
        alternative_id: "alt_triyuginarayan",
        name: "Triyuginarayan Temple",
        type: "Sacred Eternal Flame Temple",
        distance_km: 14.5,
        travel_time_mins: 40,
        relative_crowd_percentage: 24,
        why_visit: "Venue of Lord Shiva & Goddess Parvati's celestial wedding with perpetual Akhand Dhuni flame burning for eons.",
        best_time_to_visit: "Early morning or late afternoon for clear valley vistas",
        road_connectivity: "Fully motorable scenic mountain road with dedicated parking",
        reward_points: 60,
        guide: {
          restaurants: [
            {
              id: "tr_r1",
              name: "GMVN Pahadi Bhojanalaya",
              cuisine: "Pure Sattvic Pahadi Thali & Garhwali Kheer",
              crowd_level: "LOW",
              occupancy_pct: 18,
              wait_time_mins: 5,
              distance: "150m from temple",
              price_range: "₹80 - ₹180",
              rating: 4.8,
              specialty: "Fresh Mandua Roti, Jhangora Kheer, Hot Herbal Tulsi Tea"
            },
            {
              id: "tr_r2",
              name: "Akhand Dhuni Devotee Cafe",
              cuisine: "Sattvic Snacks, Ginger Tea & Pure Ghee Halwa",
              crowd_level: "LOW",
              occupancy_pct: 22,
              wait_time_mins: 0,
              distance: "Near Temple Courtyard",
              price_range: "₹40 - ₹120",
              rating: 4.7,
              specialty: "Fresh Aloo Parathas without onion/garlic, Pahadi Dal"
            }
          ],
          viewpoints: [
            {
              id: "tr_v1",
              name: "Chaukhamba Snow Peak Lookout",
              highlight: "Breathtaking panoramic vista of snow-capped Chaukhamba & Kedarnath peaks without any high-altitude rush.",
              crowd_level: "LOW",
              occupancy_pct: 12,
              best_time: "Sunrise (6:00 AM - 8:30 AM)",
              scenic_rating: "4.9 ★"
            },
            {
              id: "tr_v2",
              name: "Saraswati & Rudra Kund Holy Pools",
              highlight: "Natural sacred springs where gods bathed before the celestial wedding; serene stone ghats.",
              crowd_level: "LOW",
              occupancy_pct: 20,
              best_time: "All Day",
              scenic_rating: "4.8 ★"
            }
          ],
          hotels: [
            {
              id: "tr_h1",
              name: "Triyuginarayan Mandir Trust Dharamshala",
              type: "Pilgrim Dharamshala",
              crowd_level: "LOW",
              occupancy_pct: 32,
              rooms_available: "14 Rooms Free",
              price_range: "₹300 - ₹600 / night",
              distance: "Adjacent to Temple Gate",
              amenities: "Geyser hot water, Clean bedding, Free evening Langar"
            },
            {
              id: "tr_h2",
              name: "Himalayan Eco Valley Cottages",
              type: "Eco Wooden Homestay",
              crowd_level: "MODERATE",
              occupancy_pct: 48,
              rooms_available: "6 Rooms Left",
              price_range: "₹900 - ₹1,800 / night",
              distance: "400m from Temple",
              amenities: "Valley view balcony, Room heaters, Organic home-cooked food"
            }
          ],
          amenities: {
            parking: { name: "Triyuginarayan Valley Parking", occupancy_pct: 25, slots_available: "70+ slots open", status: "Smooth Entry, No Jam" },
            water_atm: "Free RO Purified Mountain Spring Water Point",
            medical: "Primary First Aid & Oxygen Emergency Kit post with SDRF nurse"
          }
        }
      },
      {
        alternative_id: "alt_bhairavnath",
        name: "Bhairavnath Temple",
        type: "Guardian Deity Shrine",
        distance_km: 1.2,
        travel_time_mins: 25,
        relative_crowd_percentage: 32,
        why_visit: "Protector deity of Kedarnath valley offering majestic 360-degree aerial panorama of the entire Kedarnath shrine.",
        best_time_to_visit: "Sunrise hours (6:00 AM - 9:00 AM)",
        road_connectivity: "Paved gentle uphill walking trail with guard rails",
        reward_points: 40,
        guide: {
          restaurants: [
            {
              id: "bh_r1",
              name: "Bhairav Valley Mountain Tea Kiosk",
              cuisine: "Hot Pahadi Kadha, Gur Tea, Steamed Sweet Corn",
              crowd_level: "LOW",
              occupancy_pct: 25,
              wait_time_mins: 3,
              distance: "Midway on trek trail",
              price_range: "₹30 - ₹100",
              rating: 4.6,
              specialty: "High-altitude energy herbal tea, Warm dry fruit mix"
            }
          ],
          viewpoints: [
            {
              id: "bh_v1",
              name: "360° Kedarnath Valley Aerial Ridge",
              highlight: "Unmatched bird's-eye view of Kedarnath sanctum, glacier snout, and Mandakini gorge.",
              crowd_level: "MODERATE",
              occupancy_pct: 35,
              best_time: "Morning sunrise & early dusk",
              scenic_rating: "5.0 ★"
            }
          ],
          hotels: [
            {
              id: "bh_h1",
              name: "GMVN Swargarohini Rest House",
              type: "Base Government Cottages",
              crowd_level: "HIGH",
              occupancy_pct: 68,
              rooms_available: "3 Dorm Beds",
              price_range: "₹650 - ₹1,400",
              distance: "Near Kedarnath Helipad",
              amenities: "Solar heating, Thermal blankets, Doctor on call"
            }
          ],
          amenities: {
            parking: { name: "Gaurikund Base Multi-level Parking", occupancy_pct: 65, slots_available: "35 slots", status: "Moderate flow" },
            water_atm: "High altitude heated drinking water booth",
            medical: "Trek emergency oxygen refill post"
          }
        }
      },
      {
        alternative_id: "alt_omkareshwar_ukhimath",
        name: "Omkareshwar Temple (Ukhimath)",
        type: "Winter Seat of Kedarnath",
        distance_km: 42.0,
        travel_time_mins: 85,
        relative_crowd_percentage: 18,
        why_visit: "Peaceful ancient stone architecture where Kedarnath Rawals perform holy winter worship; deeply serene and spiritually charged.",
        best_time_to_visit: "10:00 AM - 4:00 PM",
        road_connectivity: "NH107 all-weather highway, comfortable taxi or bus drive",
        reward_points: 75,
        guide: {
          restaurants: [
            {
              id: "om_r1",
              name: "Ukhimath Highway Sattvic Bhojanalaya",
              cuisine: "Traditional Garhwali Thali, Dal Baati, Buttermilk",
              crowd_level: "LOW",
              occupancy_pct: 15,
              wait_time_mins: 5,
              distance: "100m from Omkareshwar temple",
              price_range: "₹70 - ₹150",
              rating: 4.8,
              specialty: "Fresh Chapatis, Pahadi Gahat Dal, Aloo Gutke"
            }
          ],
          viewpoints: [
            {
              id: "om_v1",
              name: "Madhyamaheshwar & Tungnath Ridge Vista",
              highlight: "Lush green terraced valleys with direct views of snow crests from the ancient courtyard.",
              crowd_level: "LOW",
              occupancy_pct: 14,
              best_time: "Afternoon 2:00 PM - 5:00 PM",
              scenic_rating: "4.8 ★"
            }
          ],
          hotels: [
            {
              id: "om_h1",
              name: "GMVN Tourist Rest House Ukhimath",
              type: "State Tourism Lodge",
              crowd_level: "LOW",
              occupancy_pct: 28,
              rooms_available: "20 Deluxe Rooms Free",
              price_range: "₹800 - ₹1,600 / night",
              distance: "300m from Temple",
              amenities: "Spacious lawn, Hot water, Family dining room, Ample parking"
            }
          ],
          amenities: {
            parking: { name: "Ukhimath Complex Parking", occupancy_pct: 20, slots_available: "100+ slots", status: "Wide Open Parking" },
            water_atm: "24x7 Filtered Drinking Water Stand",
            medical: "Ukhimath Community Health Centre (CHC)"
          }
        }
      }
    ]
  },

  // 2. TIRUPATI BALAJI ALTERNATIVES
  site_tirupati: {
    site_id: "site_tirupati",
    site_name: "Tirupati Balaji (Venkateswara)",
    current_occupancy_percentage: 67.5,
    current_status: "MODERATE",
    redistribution_needed: true,
    recommendations: [
      {
        alternative_id: "alt_padmavathi",
        name: "Sri Padmavathi Ammavari Temple (Tiruchanur)",
        type: "Divine Consort Sanctum",
        distance_km: 5.2,
        travel_time_mins: 15,
        relative_crowd_percentage: 28,
        why_visit: "Spiritual tradition states that pilgrimage to Tirupati is complete only after seeking blessings of Goddess Padmavathi. Significantly shorter wait lines.",
        best_time_to_visit: "7:00 AM - 10:00 AM or 3:00 PM - 5:30 PM",
        road_connectivity: "Wide 4-lane city arterial road with frequent TTD electric buses",
        reward_points: 50,
        guide: {
          restaurants: [
            {
              id: "tiru_r1",
              name: "Sri Krishna Bhavan Pure Veg",
              cuisine: "Traditional South Indian Ghee Roast Dosa, Pongal & Filter Coffee",
              crowd_level: "LOW",
              occupancy_pct: 25,
              wait_time_mins: 8,
              distance: "120m from Padmavathi Temple Gopuram",
              price_range: "₹60 - ₹160",
              rating: 4.8,
              specialty: "Hot Ghee Pongal, Medu Vada, Mini Tiffin, Tirupati Laddoo"
            },
            {
              id: "tiru_r2",
              name: "TTD Annaprasadam Hall (Tiruchanur)",
              cuisine: "Free Holy Temple Annaprasadam",
              crowd_level: "MODERATE",
              occupancy_pct: 42,
              wait_time_mins: 10,
              distance: "Temple North Gate",
              price_range: "Free (Holy Prasadam)",
              rating: 4.9,
              specialty: "Sambar Rice, Sweet Pongal, Curd Rice"
            }
          ],
          viewpoints: [
            {
              id: "tiru_v1",
              name: "Padma Sarovaram Holy Temple Tank",
              highlight: "Sacred golden lotus lake where Goddess Padmavathi manifested; peaceful perimeter walk and evening lamps.",
              crowd_level: "LOW",
              occupancy_pct: 20,
              best_time: "Evening 5:00 PM - 7:00 PM",
              scenic_rating: "4.8 ★"
            }
          ],
          hotels: [
            {
              id: "tiru_h1",
              name: "TTD Srinivasam Pilgrim Guest House",
              type: "TTD Trust Accommodation",
              crowd_level: "MODERATE",
              occupancy_pct: 45,
              rooms_available: "35 Rooms Available",
              price_range: "₹200 - ₹600 / night",
              distance: "Near Central Bus Station",
              amenities: "AC / Non-AC suites, 24-hour check-in, Direct darshan token counter"
            },
            {
              id: "tiru_h2",
              name: "Fortune Grand Ridge Tirupati",
              type: "Comfort Hotel",
              crowd_level: "LOW",
              occupancy_pct: 30,
              rooms_available: "18 Rooms",
              price_range: "₹2,200 - ₹4,500 / night",
              distance: "2.5 km from Temple",
              amenities: "Swimming pool, Pure veg multicuisine restaurant, Free WiFi"
            }
          ],
          amenities: {
            parking: { name: "TTD Tiruchanur Car Parking Plaza", occupancy_pct: 35, slots_available: "120+ slots open", status: "Plenty of shaded parking" },
            water_atm: "TTD Jalaprasadam Mineral Water Stations",
            medical: "Tiruchanur Primary Health Centre with 24x7 ambulance"
          }
        }
      },
      {
        alternative_id: "alt_govindaraja",
        name: "Sri Govindaraja Swamy Temple",
        type: "Ancient Vaishnavite Heritage",
        distance_km: 1.8,
        travel_time_mins: 10,
        relative_crowd_percentage: 30,
        why_visit: "Consecrated by saint Ramanujacharya in 1130 AD with an awe-inspiring 7-tier Rajagopuram and reclining Vishnu posture.",
        best_time_to_visit: "Afternoon 1:00 PM - 4:00 PM (Zero wait)",
        road_connectivity: "Heart of Tirupati city, 5 mins walk from Railway Station",
        reward_points: 40,
        guide: {
          restaurants: [
            {
              id: "gov_r1",
              name: "Mayura Pure Veg Bhojanam",
              cuisine: "Traditional Andhra Vegetarian Meals & Puliyogare",
              crowd_level: "LOW",
              occupancy_pct: 28,
              wait_time_mins: 5,
              distance: "Opposite Railway Station Exit",
              price_range: "₹90 - ₹200",
              rating: 4.7,
              specialty: "Unlimited Andhra Thali with Gunpowder Podi, Ghee & Pappu"
            }
          ],
          viewpoints: [
            {
              id: "gov_v1",
              name: "7-Tier Dravidian Rajagopuram Courtyard",
              highlight: "Marvel at ancient stone carvings, musical pillars, and centuries-old temple architecture.",
              crowd_level: "LOW",
              occupancy_pct: 18,
              best_time: "Morning 8:00 AM",
              scenic_rating: "4.7 ★"
            }
          ],
          hotels: [
            {
              id: "gov_h1",
              name: "TTD Madhavam Rest House",
              type: "Trust Pilgrim Complex",
              crowd_level: "LOW",
              occupancy_pct: 38,
              rooms_available: "40 Rooms Available",
              price_range: "₹400 - ₹900 / night",
              distance: "Railway Station Road",
              amenities: "Elevator, Clean hygienic rooms, Battery shuttle stop"
            }
          ],
          amenities: {
            parking: { name: "Station Road Municipal Multi-Level Parking", occupancy_pct: 40, slots_available: "90 slots", status: "Organized Automated Entry" },
            water_atm: "Smart Water Dispenser at Temple Gate",
            medical: "SVR Ruia Government General Hospital (1.5 km)"
          }
        }
      },
      {
        alternative_id: "alt_kapilatheertham",
        name: "Kapila Theertham & Holy Waterfall",
        type: "Sacred Cascade & Shiva Shrine",
        distance_km: 4.0,
        travel_time_mins: 12,
        relative_crowd_percentage: 19,
        why_visit: "Only historic Shiva temple in Tirupati, located at the mouth of a picturesque mountain gorge where Kapila Theertham waterfall cascades directly into temple pond.",
        best_time_to_visit: "Morning 6:30 AM - 9:30 AM or Post-Rain Waterfall View",
        road_connectivity: "Wide road at the base of Tirumala Hills, convenient auto & bus access",
        reward_points: 55,
        guide: {
          restaurants: [
            {
              id: "kp_r1",
              name: "Foothill Breeze Sattvic Canteen",
              cuisine: "South Indian Tiffins, Fresh Coconut Water & Buttermilk",
              crowd_level: "LOW",
              occupancy_pct: 15,
              wait_time_mins: 0,
              distance: "50m from waterfall entry",
              price_range: "₹30 - ₹100",
              rating: 4.6,
              specialty: "Fresh Filter Coffee, Hot Upma, Coconut Chutney"
            }
          ],
          viewpoints: [
            {
              id: "kp_v1",
              name: "Kapila Waterfall & Seshachalam Forest Cliffs",
              highlight: "Natural mountain stream descending from Tirumala holy hills surrounded by dense green cliffs and holy bells.",
              crowd_level: "LOW",
              occupancy_pct: 16,
              best_time: "Morning 7:00 AM - 10:00 AM",
              scenic_rating: "4.9 ★"
            }
          ],
          hotels: [
            {
              id: "kp_h1",
              name: "Alipiri Foothill Tourist Cottages",
              type: "Eco Hill Lodges",
              crowd_level: "LOW",
              occupancy_pct: 26,
              rooms_available: "15 Rooms",
              price_range: "₹800 - ₹1,500 / night",
              distance: "800m from Alipiri Tollgate",
              amenities: "Scenic green view, Peaceful surroundings, Room service"
            }
          ],
          amenities: {
            parking: { name: "Alipiri Transit Mega Parking Ground", occupancy_pct: 25, slots_available: "200+ spots", status: "Vast Open Parking" },
            water_atm: "TTD Water Dispenser",
            medical: "Alipiri TTD Emergency Dispensary"
          }
        }
      }
    ]
  },

  // 3. KASHI VISHWANATH ALTERNATIVES
  site_kashi: {
    site_id: "site_kashi",
    site_name: "Kashi Vishwanath Temple",
    current_occupancy_percentage: 94.0,
    current_status: "CRITICAL",
    redistribution_needed: true,
    recommendations: [
      {
        alternative_id: "alt_kalbhairav",
        name: "Kaal Bhairav Temple",
        type: "Kotwal of Varanasi",
        distance_km: 2.1,
        travel_time_mins: 15,
        relative_crowd_percentage: 38,
        why_visit: "The divine guardian of Kashi; traditionally visited to seek divine protection. Rich spiritual atmosphere with authentic heritage alleys.",
        best_time_to_visit: "2:00 PM - 5:00 PM (Off-Peak Hours)",
        road_connectivity: "E-rickshaw accessible via Visheshwarganj",
        reward_points: 50,
        guide: {
          restaurants: [
            {
              id: "kb_r1",
              name: "Kashi Vishram Sweets & Chaat",
              cuisine: "Famous Banarasi Malaiyo, Tamatar Chaat & Pure Desi Ghee Jalebi",
              crowd_level: "LOW",
              occupancy_pct: 26,
              wait_time_mins: 5,
              distance: "Near Police Chowki Visheshwarganj",
              price_range: "₹40 - ₹150",
              rating: 4.9,
              specialty: "Banarasi Kachori Sabzi, Rabdi Lassi, Saffron Peda"
            }
          ],
          viewpoints: [
            {
              id: "kb_v1",
              name: "Old Kashi Ancient Alleys & Silver Mask Sanctum",
              highlight: "Historical sanctum where Lord Bhairav is adorned with silver garlands and peacock feather blessings.",
              crowd_level: "MODERATE",
              occupancy_pct: 35,
              best_time: "Early afternoon",
              scenic_rating: "4.7 ★"
            }
          ],
          hotels: [
            {
              id: "kb_h1",
              name: "Shri Kashi Dharmashala Visheshwarganj",
              type: "Traditional Dharamshala",
              crowd_level: "MODERATE",
              occupancy_pct: 45,
              rooms_available: "12 Rooms Available",
              price_range: "₹350 - ₹750 / night",
              distance: "200m from Temple",
              amenities: "Clean water, Hot water, Peaceful central courtyard"
            }
          ],
          amenities: {
            parking: { name: "Maidagin Multi-Level Underground Parking", occupancy_pct: 55, slots_available: "45 slots", status: "Short wait for bay" },
            water_atm: "Kashi Smart City RO Drinking Post",
            medical: "Kabir Chaura Divisional Hospital (600m)"
          }
        }
      },
      {
        alternative_id: "alt_sarnath",
        name: "Sarnath Sacred Dhamekh Stupa & Temple",
        type: "Spiritual Heritage Sanctuary",
        distance_km: 9.8,
        travel_time_mins: 28,
        relative_crowd_percentage: 22,
        why_visit: "Lush peaceful deer park, Ashoka pillar, and ancient monastery grounds far away from city congestion.",
        best_time_to_visit: "Morning 8:00 AM - 11:00 AM",
        road_connectivity: "Wide 4-lane Ring Road, smooth cab ride",
        reward_points: 60,
        guide: {
          restaurants: [
            {
              id: "sr_r1",
              name: "Deer Park Garden Vegetarian Cafe",
              cuisine: "Healthy Sattvic Indian & Asian Vegetarian Dishes",
              crowd_level: "LOW",
              occupancy_pct: 16,
              wait_time_mins: 0,
              distance: "Adjacent to Archaeological Museum",
              price_range: "₹90 - ₹250",
              rating: 4.8,
              specialty: "Fresh Herbal Teas, Thali, Fresh fruit bowls, Fresh Paneer Kulcha"
            }
          ],
          viewpoints: [
            {
              id: "sr_v1",
              name: "Dhamekh Stupa & Lotus Garden Vista",
              highlight: "Monumental 43.6m stone stupa standing in pristine green gardens where Buddha gave his first sermon.",
              crowd_level: "LOW",
              occupancy_pct: 15,
              best_time: "Morning 8:30 AM",
              scenic_rating: "5.0 ★"
            }
          ],
          hotels: [
            {
              id: "sr_h1",
              name: "UP Tourism Rahi Tourist Bungalow Sarnath",
              type: "State Heritage Tourism Lodge",
              crowd_level: "LOW",
              occupancy_pct: 22,
              rooms_available: "25 Rooms Open",
              price_range: "₹900 - ₹2,000 / night",
              distance: "500m from Stupa Park",
              amenities: "Spacious green lawns, Conference hall, In-house veg restaurant"
            }
          ],
          amenities: {
            parking: { name: "Sarnath ASI Monument Parking Ground", occupancy_pct: 20, slots_available: "140+ slots open", status: "Huge Open Space" },
            water_atm: "ASI Clean Water Station",
            medical: "Sarnath Government Health Post"
          }
        }
      },
      {
        alternative_id: "alt_tulsimanasmandir",
        name: "Tulsi Manas & Durga Mandir",
        type: "Cultural Marble Temple",
        distance_km: 4.5,
        travel_time_mins: 20,
        relative_crowd_percentage: 28,
        why_visit: "Site where Goswami Tulsidas composed the Ramcharitmanas; majestic white marble walls engraved with poetic chaupais and peaceful sacred kund.",
        best_time_to_visit: "Evening 4:00 PM - 7:00 PM",
        road_connectivity: "Direct road via Assi Ghat corridor with easy parking",
        reward_points: 45,
        guide: {
          restaurants: [
            {
              id: "tm_r1",
              name: "Assi Ghat Sattvic Bhojanalaya",
              cuisine: "Pure Ghee Thali, Litti Chokha & Ayurvedic Kadha",
              crowd_level: "LOW",
              occupancy_pct: 22,
              wait_time_mins: 5,
              distance: "Near Durgakund Road",
              price_range: "₹70 - ₹180",
              rating: 4.7,
              specialty: "Traditional wood-fired Litti Chokha, Malai Dahi"
            }
          ],
          viewpoints: [
            {
              id: "tm_v1",
              name: "Makrana Marble Inscription Gallery",
              highlight: "Spectacular animated dioramas of Ramayana scenes and illuminated evening fountains in temple lawns.",
              crowd_level: "LOW",
              occupancy_pct: 24,
              best_time: "Evening 6:00 PM",
              scenic_rating: "4.8 ★"
            }
          ],
          hotels: [
            {
              id: "tm_h1",
              name: "Shanti Niwas Guest House (Durgakund)",
              type: "Pilgrim Rest House",
              crowd_level: "LOW",
              occupancy_pct: 35,
              rooms_available: "15 Rooms",
              price_range: "₹500 - ₹1,100 / night",
              distance: "150m from Tulsi Manas",
              amenities: "Air-cooled rooms, Safe lockers, Travel desk"
            }
          ],
          amenities: {
            parking: { name: "Durgakund Municipal Parking", occupancy_pct: 30, slots_available: "60+ slots", status: "Easy parking access" },
            water_atm: "Jal Sansthan Purified Water Booth",
            medical: "BHU Trauma Centre & Hospital (2.0 km)"
          }
        }
      }
    ]
  },

  // 4. BADRINATH ALTERNATIVES
  site_badrinath: {
    site_id: "site_badrinath",
    site_name: "Badrinath Temple",
    current_occupancy_percentage: 45.3,
    current_status: "NORMAL",
    redistribution_needed: false,
    recommendations: [
      {
        alternative_id: "alt_mana_village",
        name: "Mana Village & Vyas Gufa",
        type: "First Indian Himalayan Village",
        distance_km: 3.5,
        travel_time_mins: 15,
        relative_crowd_percentage: 26,
        why_visit: "Legendary village along the Saraswati River where Maharishi Vyas wrote Mahabharata and Pandavas began Swargarohini yatra.",
        best_time_to_visit: "10:00 AM - 3:30 PM",
        road_connectivity: "Paved motorable road till village gate",
        reward_points: 50,
        guide: {
          restaurants: [
            {
              id: "mn_r1",
              name: "India's First Tea Stall & Pahadi Rasoi",
              cuisine: "Hot Herbal Tea, Pahadi Roti, Steamed Maggi",
              crowd_level: "LOW",
              occupancy_pct: 22,
              wait_time_mins: 5,
              distance: "Near Bhim Pul",
              price_range: "₹40 - ₹140",
              rating: 4.8,
              specialty: "Tulsi-Ginger Mountain Tea, Hot Rajma Chawal"
            }
          ],
          viewpoints: [
            {
              id: "mn_v1",
              name: "Bhim Pul & Roaring Saraswati Gorge",
              highlight: "Colossal monolithic rock placed by Bhima over roaring glacial river with majestic mountain walls.",
              crowd_level: "LOW",
              occupancy_pct: 25,
              best_time: "Morning 11:00 AM",
              scenic_rating: "5.0 ★"
            }
          ],
          hotels: [
            {
              id: "mn_h1",
              name: "Mana Village Homestays",
              type: "Traditional Wood & Stone Homestay",
              crowd_level: "LOW",
              occupancy_pct: 30,
              rooms_available: "8 Rooms Free",
              price_range: "₹600 - ₹1,200 / night",
              distance: "Village Central Path",
              amenities: "Woolen quilts, Warm milk, Authentic tribal hospitality"
            }
          ],
          amenities: {
            parking: { name: "Mana Village Gate Parking", occupancy_pct: 28, slots_available: "45 slots", status: "Organized Parking" },
            water_atm: "Natural Mineral Water Stand",
            medical: "ITBP Military First Aid Post"
          }
        }
      }
    ]
  },

  // 5. VAISHNO DEVI ALTERNATIVES
  site_vaishnodevi: {
    site_id: "site_vaishnodevi",
    site_name: "Vaishno Devi Bhawan",
    current_occupancy_percentage: 42.3,
    current_status: "NORMAL",
    redistribution_needed: false,
    recommendations: [
      {
        alternative_id: "alt_bhairon_temple",
        name: "Bhairon Ghati Shrine & Cable Car",
        type: "Guardian Mountain Peak",
        distance_km: 1.5,
        travel_time_mins: 10,
        relative_crowd_percentage: 30,
        why_visit: "Spectacular aerial ropeway ride with panoramic view of Trikuta mountain range; completes the holy Vaishno Devi pilgrimage.",
        best_time_to_visit: "Daytime 8:00 AM - 4:00 PM",
        road_connectivity: "Modern high-capacity aerial ropeway (3 mins ride) or paved pony track",
        reward_points: 40,
        guide: {
          restaurants: [
            {
              id: "vd_r1",
              name: "Shrine Board Bhojanalaya Bhairon",
              cuisine: "Hygienic Pure Vegetarian Meals at Subsidized Prices",
              crowd_level: "LOW",
              occupancy_pct: 24,
              wait_time_mins: 5,
              distance: "Cable car upper station",
              price_range: "₹50 - ₹120",
              rating: 4.8,
              specialty: "Poori Chole, Rajma Rice, Sweet Halwa, Hot Tea"
            }
          ],
          viewpoints: [
            {
              id: "vd_v1",
              name: "Bhairon Temple Ridge Observatory",
              highlight: "Highest altitude point of Trikuta Hills (2,017m) overlooking the entire Jammu plains and Katra valley.",
              crowd_level: "LOW",
              occupancy_pct: 20,
              best_time: "Clear afternoon",
              scenic_rating: "4.9 ★"
            }
          ],
          hotels: [
            {
              id: "vd_h1",
              name: "Shrine Board Free Rest Hall Bhairon",
              type: "Pilgrim Rest Hall",
              crowd_level: "LOW",
              occupancy_pct: 35,
              rooms_available: "Dormitory Mats Available",
              price_range: "Free / Nominal Blanket Deposit",
              distance: "Near Shrine Entrance",
              amenities: "Heated halls, Clean washrooms, Free luggage counter"
            }
          ],
          amenities: {
            parking: { name: "Katra Base Multi-Level Parking", occupancy_pct: 45, slots_available: "300+ slots", status: "Smooth" },
            water_atm: "Shrine Board Free Water ATMs every 200m",
            medical: "Shrine Board 24-Hour Medical Dispensary"
          }
        }
      }
    ]
  }
};

export const MOCK_ALERTS = [
  {
    site_id: "site_kedarnath",
    zone_id: "zone_kedar_concourse",
    zone_name: "Kedarnath Main Sanctum Corridor",
    alert_type: "CROWD_DENSITY",
    severity: "HIGH",
    message: "⚠️ High crowd density (87.2%) detected near Kedarnath Sanctum. SDRF is holding queue at Base Gate.",
    people_count: 2180,
    occupancy_percentage: 87.2,
    timestamp: "2 mins ago",
    emergency_info: {
      nearest_hospital: "Kedarnath Swami Vivekananda 10-Bed Hospital",
      hospital_distance_km: 0.3,
      hospital_phone: "+91 1364 267211",
      nearest_police: "Kedarnath Police Station & SDRF Post",
      police_phone: "112 / +91 94565 96800",
      disaster_control_room: "1070 (State Emergency Center)",
      evacuation_routes: "Follow Green Markings towards Helipad Route and Eastern Emergency Gate",
      high_risk_zone_type: "Narrow Temple Approach & Low Oxygen Altitude Zone",
      risk_mitigation_measures: "Equipped with automated external defibrillators (AED), oxygen cylinders, and SDRF marshals."
    }
  },
  {
    site_id: "site_kashi",
    zone_id: "zone_kashi_gangadwar",
    zone_name: "Kashi Ganga Dwar Corridor Gate 4",
    alert_type: "CROWD_DENSITY",
    severity: "CRITICAL",
    message: "🚨 Critical bottleneck at Gate 4 Ganga Dwar. Please divert to Gate 1 (Godowlia Entrance).",
    people_count: 5640,
    occupancy_percentage: 94.0,
    timestamp: "Just now",
    emergency_info: {
      nearest_hospital: "Kashi Vishwanath Health Post & Mandaliya Hospital",
      hospital_distance_km: 1.2,
      hospital_phone: "108 / 0542-2508050",
      nearest_police: "Chowk Police Station & Dashashwamedh Outpost",
      police_phone: "112 / 0542-2415112",
      disaster_control_room: "1077 (Varanasi Smart City Control Room)",
      evacuation_routes: "Direct wide pathway toward Manikarnika Emergency Exit Ramp",
      high_risk_zone_type: "Severe Riverfront Surge & Narrow Alleyways",
      risk_mitigation_measures: "Continuous CCTV drone surveillance and NDRF river patrol stationed."
    }
  }
];

export const MOCK_SAFETY_INFO = {
  site_kedarnath: {
    nearest_hospital: "Kedarnath High Altitude Health Post & Vivekananda Hospital",
    hospital_distance_km: 0.3,
    hospital_phone: "108 / +91 1364 267211",
    nearest_police: "Kedarnath Shrine Police Station & SDRF Base",
    police_phone: "112 / +91 94565 96800",
    disaster_control_room: "1070 (Uttarakhand Disaster Management)",
    evacuation_routes: "Follow luminous green exit signs towards Eastern Helipad Zone",
    high_risk_zone_type: "Steep Valley Chokepoint & Hypoxia Risk",
    risk_mitigation_measures: "Active medical triage posts every 500m on trek route, thermal shelters open."
  },
  site_badrinath: {
    nearest_hospital: "Badrinath Base Government Hospital & Army Medical Unit",
    hospital_distance_km: 0.8,
    hospital_phone: "108 / +91 1389 222122",
    nearest_police: "Badrinath Main Police Thana",
    police_phone: "112 / +91 94111 12850",
    disaster_control_room: "1070 / 01372-251010",
    evacuation_routes: "Riverbank side walkway to Main Bus Terminal Area",
    high_risk_zone_type: "Alaknanda River Overflow & Bridge Congestion",
    risk_mitigation_measures: "Reinforced railings, constant river level telemetry."
  },
  site_kashi: {
    nearest_hospital: "Kabir Chaura Divisional Hospital, Varanasi",
    hospital_distance_km: 1.5,
    hospital_phone: "108 / 0542-2214300",
    nearest_police: "Chowk Police Thana & Kashi Corridor Task Force",
    police_phone: "112 / 0542-2415112",
    disaster_control_room: "1077 (Varanasi Command & Control Center)",
    evacuation_routes: "Wide Corridor Route towards Godowlia Plaza and Lalita Ghat Ramp",
    high_risk_zone_type: "High Density Urban Chokepoint",
    risk_mitigation_measures: "One-way crowd circulation barriers and automated turnstile pacing."
  },
  site_tirupati: {
    nearest_hospital: "TTD SVIMS Super Specialty Hospital, Alipiri",
    hospital_distance_km: 1.2,
    hospital_phone: "108 / 0877-2287777",
    nearest_police: "Tirumala Police Station & Special Protection Force",
    police_phone: "112 / 0877-2263444",
    disaster_control_room: "1077 (Tirupati District Control Room)",
    evacuation_routes: "Follow Outer Ring Road towards Alipiri Tollgate Exit",
    high_risk_zone_type: "Ghat Road Landslide & High Density Queue Complex",
    risk_mitigation_measures: "One-way ghat road movement, automated turnstile crowd control."
  },
  site_vaishnodevi: {
    nearest_hospital: "Shri Mata Vaishno Devi Narayana Super Specialty Hospital, Kakryal",
    hospital_distance_km: 12.0,
    hospital_phone: "108 / 01991-285666",
    nearest_police: "Bhawan Police Station & CRPF Yatra Security Unit",
    police_phone: "112 / 01991-232029",
    disaster_control_room: "01991-232124 (Shrine Board Command Center)",
    evacuation_routes: "Tarakote Marg new gentle track designated for emergency evacuation",
    high_risk_zone_type: "Steep Mountain Slope & Shooting Stones",
    risk_mitigation_measures: "Continuous rockfall wire meshing, automated weather telemetry."
  }
};

export const MOCK_VENDORS = [
  {
    id: "v_1",
    name: "Baba Kedar Pure Organic Prasad Bhandar",
    category: "Prasad & Holy Offerings",
    site_id: "site_kedarnath",
    rating: 4.9,
    reviews_count: 312,
    location: "Temple Gate 2, Shop #14",
    specialty: "Authentic Belpatra, Ghee Laddu & Mountain Honey",
    price_range: "₹50 - ₹350",
    verified: true,
    discount_points_offer: "Get 15% OFF using 30 Pilgrim Points"
  },
  {
    id: "v_2",
    name: "Garhwal Woolens & Himalayan Souvenirs",
    category: "Local Crafts & Warmwear",
    site_id: "site_kedarnath",
    rating: 4.8,
    reviews_count: 184,
    location: "Helipad Walkway, Stall #8",
    specialty: "Handmade Pashmina Shawls, Brass Trishul & Rudraksha",
    price_range: "₹100 - ₹1200",
    verified: true,
    discount_points_offer: "Get 20% OFF using 50 Pilgrim Points"
  },
  {
    id: "v_3",
    name: "Pahadi Herbal Tea & Pahadi Rasoi",
    category: "Traditional Food & Tea",
    site_id: "site_kedarnath",
    rating: 4.7,
    reviews_count: 245,
    location: "Opposite GMVN Rest House",
    specialty: "Hot Ginger Tulsi Kadha, Mandua Roti & Pahadi Dal",
    price_range: "₹30 - ₹150",
    verified: true,
    discount_points_offer: "Complimentary Hot Herbal Tea with 20 Points"
  },
  {
    id: "v_4",
    name: "Kashi Banarasi Silk & Puja Samagri Emporium",
    category: "Silk Weaves & Samagri",
    site_id: "site_kashi",
    rating: 4.9,
    reviews_count: 512,
    location: "Vishwanath Gali, Shop #45",
    specialty: "Handwoven GI-Tagged Silk Dupattas, Pure Ganga Jal Vessels",
    price_range: "₹150 - ₹2500",
    verified: true,
    discount_points_offer: "₹100 OFF coupon for 40 Pilgrim Points"
  },
  {
    id: "v_5",
    name: "Sri Venkateswara Traditional Woodcraft & Brass Idols",
    category: "Handicrafts & Devotional Idols",
    site_id: "site_tirupati",
    rating: 4.9,
    reviews_count: 420,
    location: "Srinivasam Commercial Complex, Shop #12",
    specialty: "Handcarved Red Sanders Idols, Pure Brass Lamps & Incense",
    price_range: "₹100 - ₹3500",
    verified: true,
    discount_points_offer: "Get 15% OFF using 35 Pilgrim Points"
  }
];

export const MOCK_WALLET = {
  user_id: "pilgrim_demo_user",
  user_name: "Yatri Rishikesh",
  tier: "Dharma Guardian (Tier 2)",
  total_points: 260,
  history: [
    { id: 1, points: 50, reason: "Chose Triyuginarayan off-peak alternative route", timestamp: "Today, 10:30 AM" },
    { id: 2, points: 40, reason: "Visited temple during designated green morning slot", timestamp: "Yesterday, 6:00 AM" },
    { id: 3, points: 20, reason: "Reported clean pathway & queue movement confirmation", timestamp: "2 days ago" },
    { id: 4, points: 150, reason: "Welcome SIH Pilgrim Safety Initiative Bonus", timestamp: "Initial Registration" }
  ]
};

// ==========================================
// SITE METADATA & COMPATIBILITY HELPERS
// ==========================================
export const SITE_METADATA = {
  TS001: { city: "Rudraprayag, Uttarakhand", state: "Uttarakhand", altitude: "3,584 m", darshan_timings: "5:00 AM - 9:00 PM", description: "Himalayan High-Altitude Pilgrimage / Jyotirlinga" },
  TS002: { city: "Chamoli, Uttarakhand", state: "Uttarakhand", altitude: "3,300 m", darshan_timings: "4:30 AM - 9:00 PM", description: "Char Dham Pilgrimage / Himalayan Shrine" },
  TS003: { city: "Varanasi, Uttar Pradesh", state: "Uttar Pradesh", altitude: "81 m", darshan_timings: "3:00 AM - 11:00 PM", description: "Sacred Riverfront & Jyotirlinga Heritage Corridor" },
  TS004: { city: "Ayodhya, Uttar Pradesh", state: "Uttar Pradesh", altitude: "102 m", darshan_timings: "6:30 AM - 10:00 PM", description: "Major Religious Shrine & Cultural Heritage" },
  TS005: { city: "Katra / Bhawan, Jammu & Kashmir", state: "Jammu and Kashmir", altitude: "1,585 m", darshan_timings: "Open 24 Hours", description: "Himalayan Cave Shrine / Hill Pilgrimage Trek" },
  TS006: { city: "Tirumala, Andhra Pradesh", state: "Andhra Pradesh", altitude: "853 m", darshan_timings: "2:30 AM - 1:30 AM", description: "Major Dravidian Vaishnavite Pilgrimage Hub" },
  TS007: { city: "Puri, Odisha", state: "Odisha", altitude: "10 m", darshan_timings: "5:00 AM - 11:00 PM", description: "Char Dham Coastal Pilgrimage & Kalinga Heritage" },
  TS008: { city: "Ujjain, Madhya Pradesh", state: "Madhya Pradesh", altitude: "492 m", darshan_timings: "4:00 AM - 11:00 PM", description: "Jyotirlinga Shrine / Sacred River Kshipra Corridor" },
  TS009: { city: "Amritsar, Punjab", state: "Punjab", altitude: "234 m", darshan_timings: "3:00 AM - 11:00 PM", description: "Spiritual Heritage Sanctuary & Community Kitchen (Langar)" },
  TS010: { city: "Madurai, Tamil Nadu", state: "Tamil Nadu", altitude: "101 m", darshan_timings: "5:00 AM - 10:00 PM", description: "Historic Dravidian Temple Architecture & Cultural Landmark" },
  TS011: { city: "Rameswaram, Tamil Nadu", state: "Tamil Nadu", altitude: "10 m", darshan_timings: "5:00 AM - 9:00 PM", description: "Island Jyotirlinga & Longest Pillared Temple Corridor" },
  TS012: { city: "Somnath, Gujarat", state: "Gujarat", altitude: "12 m", darshan_timings: "6:00 AM - 10:00 PM", description: "First of the Twelve Holy Jyotirlingas on Arabian Coast" },
  TS013: { city: "Shirdi, Maharashtra", state: "Maharashtra", altitude: "504 m", darshan_timings: "5:00 AM - 10:30 PM", description: "Sacred Pilgrimage Complex of Sai Baba of Shirdi" },
  TS014: { city: "Sabarimala, Kerala", state: "Kerala", altitude: "468 m", darshan_timings: "3:00 AM - 11:00 PM", description: "Forest Hill Shrine of Lord Ayyappa in Periyar Reserve" },
  TS015: { city: "Haridwar, Uttarakhand", state: "Uttarakhand", altitude: "314 m", darshan_timings: "Open 24 Hours", description: "Sacred Ganges Ghat Corridor & Ganga Aarti Hub" },
  TS016: { city: "Prayagraj, Uttar Pradesh", state: "Uttar Pradesh", altitude: "98 m", darshan_timings: "Open 24 Hours", description: "Holy Confluence of Ganga, Yamuna & Saraswati (Triveni)" },
  TS017: { city: "Vrindavan, Uttar Pradesh", state: "Uttar Pradesh", altitude: "170 m", darshan_timings: "7:45 AM - 9:30 PM", description: "Sacred Abode of Krishna Bhakti & Heritage Shrines" },
  TS018: { city: "Agra, Uttar Pradesh", state: "Uttar Pradesh", altitude: "169 m", darshan_timings: "Sunrise to Sunset", description: "UNESCO World Heritage Mughal Architectural Wonder" },
  TS019: { city: "Jaipur, Rajasthan", state: "Rajasthan", altitude: "431 m", darshan_timings: "8:00 AM - 9:00 PM", description: "Historic Hilltop Rajput Fortress & Heritage Palace" },
  TS020: { city: "Delhi", state: "Delhi", altitude: "216 m", darshan_timings: "7:00 AM - 9:00 PM", description: "Historic Minaret & Ancient Archaeological Sanctuary" },
  TS021: { city: "Chhatrapati Sambhajinagar, Maharashtra", state: "Maharashtra", altitude: "568 m", darshan_timings: "9:00 AM - 5:30 PM", description: "UNESCO Monumental Ancient Rock-Cut Monolithic Caves" },
  TS022: { city: "Hampi, Karnataka", state: "Karnataka", altitude: "467 m", darshan_timings: "6:00 AM - 6:00 PM", description: "UNESCO World Heritage Vijayanagara Empire Capital Ruins" },
  TS023: { city: "Leh, Ladakh", state: "Ladakh", altitude: "4,250 m", darshan_timings: "Daylight Hours", description: "Pristine High-Altitude Endorheic Himalayan Lake" },
  TS024: { city: "Manali, Himachal Pradesh", state: "Himachal Pradesh", altitude: "2,050 m", darshan_timings: "Daylight Hours", description: "High-Altitude Himalayan Mountain Pass & Adventure Valley" },
  TS025: { city: "Guwahati, Assam", state: "Assam", altitude: "150 m", darshan_timings: "5:30 AM - 8:00 PM", description: "Sacred Shakti Peetha Temple atop Nilachal Hill" },
  SITE001: { city: "Bhubaneswar, Odisha", state: "Odisha", altitude: "45 m", darshan_timings: "6:00 AM - 9:00 PM", description: "Historic Temple City Shrine" },
  SITE002: { city: "Puri, Odisha", state: "Odisha", altitude: "12 m", darshan_timings: "6:00 AM - 9:00 PM", description: "Sacred Coastal Heritage Shrine" }
};

export const SITE_ID_ALIASES = {
  TS001: 'site_kedarnath',
  TS002: 'site_badrinath',
  TS003: 'site_kashi',
  TS005: 'site_vaishnodevi',
  TS006: 'site_tirupati',
  site_kedarnath: 'TS001',
  site_badrinath: 'TS002',
  site_kashi: 'TS003',
  site_vaishnodevi: 'TS005',
  site_tirupati: 'TS006'
};

// ==========================================
// API CLIENT IMPLEMENTATIONS WITH RESILIENT FALLBACKS
// ==========================================

export async function fetchSites() {
  try {
    const res = await fetch(`${API_BASE_URL}/sites`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((site) => {
          const meta = SITE_METADATA[site.id] || {};
          return {
            ...meta,
            ...site,
            city: site.city || meta.city || meta.state || 'Pilgrim Center',
            state: site.state || meta.state || 'India',
            description: site.description || meta.description || `${site.name}, sacred heritage destination.`,
            altitude: site.altitude || meta.altitude || '',
            darshan_timings: site.darshan_timings || meta.darshan_timings || 'Daily Temple Hours'
          };
        });
      }
    }
  } catch (err) {
    console.warn("Using fallback sites data:", err);
  }
  return MOCK_SITES;
}

export async function fetchSiteDensity(siteId) {
  if (!siteId) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/sites/${encodeURIComponent(siteId)}/density`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Fallback density for ${siteId}:`, err);
  }
  const alias = SITE_ID_ALIASES[siteId];
  return (
    MOCK_DENSITY[siteId] ||
    (alias ? MOCK_DENSITY[alias] : null) || {
      site_id: siteId,
      site_name: "Sacred Shrine",
      people_count: 0,
      occupancy_percentage: 0.0,
      status: "NORMAL",
      last_updated: "Just now"
    }
  );
}

export async function fetchSiteForecast(siteId) {
  if (!siteId) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/sites/${encodeURIComponent(siteId)}/crowd-forecast`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Fallback forecast for ${siteId}:`, err);
  }
  const alias = SITE_ID_ALIASES[siteId];
  return (
    MOCK_FORECAST[siteId] ||
    (alias ? MOCK_FORECAST[alias] : null) || {
      site_id: siteId,
      site_name: "Sacred Shrine",
      live_status: { people_count: 0, occupancy_percentage: 0.0, status: "NORMAL", last_updated: "Just now" },
      queue_forecast: {
        estimated_current_wait_mins: 20,
        normal_wait_mins: 20,
        peak_wait_mins: 90,
        queue_management_system: "Standard Queue System",
        fast_track_details: "Priority lane available for senior citizens"
      },
      seasonal_context: {
        peak_seasons: "Festival and seasonal peak periods",
        upcoming_peak_festivals: "Seasonal Utsav",
        weather_warnings: "Pleasant weather conditions.",
        surge_triggers: "Morning and Evening Aarti"
      }
    }
  );
}

export async function fetchSitePrediction(siteId) {
  if (!siteId) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/sites/${encodeURIComponent(siteId)}/prediction`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Fallback prediction for ${siteId}:`, err);
  }
  return { site_id: siteId, predicted_next_count: null, prediction: "Prediction unavailable" };
}

export async function fetchAlternatives(siteId) {
  if (!siteId) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/sites/${encodeURIComponent(siteId)}/alternatives`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Fallback alternatives for ${siteId}:`, err);
  }
  const alias = SITE_ID_ALIASES[siteId];
  return (
    MOCK_ALTERNATIVES[siteId] ||
    (alias ? MOCK_ALTERNATIVES[alias] : null) || {
      site_id: siteId,
      site_name: "Sacred Spot",
      current_occupancy_percentage: 0,
      current_status: "NORMAL",
      redistribution_needed: false,
      recommendations: []
    }
  );
}

export async function fetchAlerts() {
  try {
    const res = await fetch(`${API_BASE_URL}/alerts`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn("Fallback alerts:", err);
  }
  return MOCK_ALERTS;
}

export async function fetchSafetyInfo(siteId) {
  if (!siteId) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/sites/${encodeURIComponent(siteId)}/safety-info`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Fallback safety info for ${siteId}:`, err);
  }
  const alias = SITE_ID_ALIASES[siteId];
  return (
    MOCK_SAFETY_INFO[siteId] ||
    (alias ? MOCK_SAFETY_INFO[alias] : null) || {
      nearest_hospital: "Local Community Health Center",
      hospital_distance_km: 1.2,
      hospital_phone: "108",
      nearest_police: "Local Police Station",
      police_phone: "112",
      disaster_control_room: "1070",
      evacuation_routes: "Follow marked emergency evacuation pathways.",
      high_risk_zone_type: "Crowd Congestion Area",
      risk_mitigation_measures: "Follow volunteer and SDRF security marshals."
    }
  );
}

export async function checkLocationSafety(latitude, longitude) {
  try {
    const res = await fetch(`${API_BASE_URL}/check-safety`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude, longitude })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Fallback check-safety:", err);
  }
  return {
    in_danger_zone: false,
    message: "You are currently in a safe area."
  };
}

export async function triggerSOS(userId = "pilgrim_demo_user", latitude = 30.7352, longitude = 79.0669) {
  try {
    const res = await fetch(`${API_BASE_URL}/sos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, latitude, longitude })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Fallback SOS:", err);
  }
  return {
    message: "🚨 Emergency SOS alert broadcasted to SDRF, Police & Temple Control Room with your live GPS location.",
    status: "success"
  };
}

export async function fetchVendors(siteId) {
  try {
    const url = siteId ? `${API_BASE_URL}/vendors/${encodeURIComponent(siteId)}` : `${API_BASE_URL}/vendors`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((v) => ({
          ...v,
          category: v.category || v.type || "Artisan / Merchant",
          specialty: v.specialty || v.specialties_or_services || "Authentic Local Offerings",
          discount_points_offer: v.discount_points_offer || v.offer || "",
          location: v.location || v.address_locality || "Near Site Entrance",
          rating: v.rating || 4.8,
          reviews_count: v.reviews_count || 120
        }));
      }
    }
  } catch (err) {
    console.warn(`Fallback vendors for ${siteId}:`, err);
  }
  if (siteId) {
    const alias = SITE_ID_ALIASES[siteId];
    const filtered = MOCK_VENDORS.filter((v) => v.site_id === siteId || (alias && v.site_id === alias));
    return filtered;
  }
  return MOCK_VENDORS;
}

export async function fetchWallet(userId = "pilgrim_demo_user") {
  try {
    const res = await fetch(`${API_BASE_URL}/wallet/${userId}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn(`Fallback wallet for ${userId}:`, err);
  }
  return MOCK_WALLET;
}

export async function rewardUser(userId = "pilgrim_demo_user", points = 50, reason = "Green Pilgrim Milestone") {
  try {
    const res = await fetch(`${API_BASE_URL}/wallet/reward`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, points, reason })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Fallback reward user:", err);
  }
  return { message: `${points} Green Pilgrim Punya Points credited!`, status: "success" };
}

export async function fetchSiteScheduleInsights(siteId) {
  if (!siteId) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/sites/${encodeURIComponent(siteId)}/schedule-insights`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn(`Fallback schedule insights for ${siteId}:`, err);
  }
  return null;
}

export async function fetchSiteMLForecast(siteId) {
  if (!siteId) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/sites/${encodeURIComponent(siteId)}/forecast`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn(`Fallback ML forecast for ${siteId}:`, err);
  }
  return null;
}

