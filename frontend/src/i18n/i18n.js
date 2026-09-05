import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      nav: {
        home: 'Home',
        destinations: 'Explore 25',
        crowdStatus: 'Live Crowd',
        forecast: 'AI Forecast',
        alternatives: 'Alternatives',
        safety: 'Safety & SOS',
        hotels: 'Hotels',
        wallet: 'Wallet',
        sos: 'Emergency SOS',
        roleSelect: 'Role Selection',
        platformOverview: 'Platform Overview',
        logout: 'Logout'
      },
      hero: {
        welcomeBadge: 'AI-Powered Sacred Pilgrimage Intelligence',
        title: 'Welcome to YatraSetu',
        subtitle: 'Plan your sacred pilgrimage with live AI crowd intelligence, queue wait telemetry, and smart congestion-free rerouting.',
        exploreCta: 'Explore 25 Destinations',
        liveStatusCta: 'View Live Telemetry',
        statDestinations: '25 Holy Shrines',
        statDestinationsSub: 'Active GIS Telemetry',
        statCCTV: 'AI Crowd Vision',
        statCCTVSub: 'Real-Time Occupancy',
        statReroute: 'Smart Rerouting',
        statRerouteSub: '+25 Punya Points',
        statSafety: 'SDRF & SOS Active',
        statSafetySub: '24/7 Protection'
      },
      crowdSummary: {
        title: 'Live Sanctum Telemetry',
        monitoring: 'CURRENTLY MONITORING',
        livePulse: 'Surveillance Active',
        full: 'Full',
        safeCap: 'Safe Capacity',
        estWait: 'Est. Wait',
        liveCount: 'Live Count',
        normal: 'NORMAL',
        moderate: 'MODERATE',
        high: 'HIGH',
        critical: 'CRITICAL',
        jumpToDetails: 'View Full Telemetry & Advisory'
      },
      grid: {
        title: '25 Sacred Pilgrimage Destinations',
        subtitle: 'Real-time AI surveillance, queue telemetry, and crowd density across India’s holiest sanctuaries',
        searchPlaceholder: 'Search destination by name, city, state, or circuit...',
        all: 'All Shrines',
        normal: 'Normal (<50%)',
        moderate: 'Moderate (50-74%)',
        high: 'High (75-89%)',
        critical: 'Critical (≥90%)',
        sortBy: 'Sort By',
        sortName: 'Shrine Name (A-Z)',
        sortLowest: 'Lowest Crowd First',
        sortHighest: 'Highest Crowd First',
        sortWait: 'Shortest Wait Time',
        showing: 'Showing',
        ofShrines: 'of 25 pilgrimage destinations',
        viewDetails: 'View Details',
        monitorLive: 'Monitor Live',
        safeCap: 'Safe Cap',
        full: 'Full',
        estWait: 'Wait'
      },
      details: {
        modalTitle: 'Destination Telemetry & Darshan Profile',
        sanctumStatus: 'Sanctum Crowd Status',
        currentOccupancy: 'Current Occupancy',
        liveHeadcount: 'Live Headcount',
        safeCapacity: 'Safe Holding Capacity',
        currentWait: 'Current Est. Wait',
        normalWait: 'Normal Avg. Wait',
        peakWait: 'Peak Festival Wait',
        darshanTimings: 'Darshan Timings',
        safetyHeader: 'Emergency & SDRF Contacts',
        nearestHospital: 'Nearest Hospital',
        policeStation: 'Police Station',
        evacuationRoute: 'Evacuation Path',
        setAsActive: 'Monitor This Shrine in Live Dashboard',
        close: 'Close',
        liveBadge: 'Verified Live Telemetry'
      },
      advisory: {
        badge: 'YatraSetu AI Dynamic Advisory',
        congestionAlert: 'Congestion Alert Active',
        conditionsManageable: 'CONDITIONS MANAGEABLE • REROUTING OPTIONAL',
        reroutingAdvised: 'CONGESTION DETECTED • REROUTING STRONGLY ADVISED',
        switchCta: 'Switch to Alternate Route (+25 Punya Points Pending)',
        headingTo: 'Heading to',
        pendingPoints: '+25 Punya Points pending arrival',
        simulateArrival: '📍 Demo: Simulate Arrival',
        verifiedGpsArrival: 'Verified GPS Arrival (within 200m)',
        switchBack: 'Return to Main Shrine'
      },
      hotels: {
        title: 'Verified Shrine Accommodations & Lodges',
        subtitle: 'Official temple ashrams, GMVN rest houses, and verified hospitality partners near',
        verifiedBadge: '✓ Official YatraSetu Verified',
        perNight: '/ night',
        expressCheckin: 'Express Check-in Ready',
        bookRoom: 'Instant Book Room',
        bookingSuccess: 'Booking Confirmed!'
      },
      safety: {
        title: 'Safety Advisories & Emergency SDRF Command',
        subtitle: 'Real-time weather telemetry, emergency evacuation paths, and instant SOS dispatch',
        emergencySOS: 'Emergency SOS Trigger',
        triggerSOS: 'TRIGGER EMERGENCY SOS'
      }
    }
  },
  hi: {
    translation: {
      nav: {
        home: 'मुख्य पृष्ठ',
        destinations: '25 पवित्र धाम',
        crowdStatus: 'लाइव भीड़',
        forecast: 'एआई पूर्वानुमान',
        alternatives: 'वैकल्पिक मार्ग',
        safety: 'सुरक्षा और एसओएस',
        hotels: 'तीर्थ आवास',
        wallet: 'पुण्य वॉलेट',
        sos: 'आपातकालीन एसओएस',
        roleSelect: 'भूमिका चयन',
        platformOverview: 'प्लेटफ़ॉर्म विवरण',
        logout: 'लॉग आउट'
      },
      hero: {
        welcomeBadge: 'एआई-संचालित पवित्र तीर्थ प्रणाली',
        title: 'यात्रासेतु में आपका स्वागत है',
        subtitle: 'लाइव भीड़ विश्लेषण, कतार प्रतीक्षा समय और स्मार्ट भीड़-मुक्त मार्गों के साथ अपनी पवित्र तीर्थयात्रा की योजना बनाएं।',
        exploreCta: '25 धाम देखें',
        liveStatusCta: 'लाइव स्थिति देखें',
        statDestinations: '25 पवित्र धाम',
        statDestinationsSub: 'सक्रिय जीआईएस टेलीमेट्री',
        statCCTV: 'एआई भीड़ विज़न',
        statCCTVSub: 'रीयल-टाइम भीड़ स्तर',
        statReroute: 'स्मार्ट रूट बदलाव',
        statRerouteSub: '+25 पुण्य अंक',
        statSafety: 'एसडीआरएफ और एसओएस सक्रिय',
        statSafetySub: '24/7 तीर्थयात्री सुरक्षा'
      },
      crowdSummary: {
        title: 'लाइव गर्भगृह टेलीमेट्री',
        monitoring: 'वर्तमान में निगरानी',
        livePulse: 'निगरानी सक्रिय',
        full: 'भरा हुआ',
        safeCap: 'सुरक्षित क्षमता',
        estWait: 'अनुमानित प्रतीक्षा',
        liveCount: 'वर्तमान श्रद्धालु',
        normal: 'सामान्य',
        moderate: 'मध्यम',
        high: 'अधिक',
        critical: 'अत्यधिक भीड़',
        jumpToDetails: 'पूर्ण विवरण और परामर्श देखें'
      },
      grid: {
        title: '25 पवित्र तीर्थ स्थल',
        subtitle: 'भारत के सबसे पवित्र तीर्थों की रीयल-टाइम एआई निगरानी और कतार प्रतीक्षा टेलीमेट्री',
        searchPlaceholder: 'तीर्थ का नाम, शहर, राज्य या सर्किट खोजें...',
        all: 'सभी धाम',
        normal: 'सामान्य (<50%)',
        moderate: 'मध्यम (50-74%)',
        high: 'अधिक (75-89%)',
        critical: 'अत्यधिक भीड़ (≥90%)',
        sortBy: 'क्रमबद्ध करें',
        sortName: 'तीर्थ नाम (A-Z)',
        sortLowest: 'कम भीड़ पहले',
        sortHighest: 'अधिक भीड़ पहले',
        sortWait: 'कम प्रतीक्षा समय',
        showing: 'दिखा रहे हैं',
        ofShrines: 'कुल 25 पवित्र तीर्थों में से',
        viewDetails: 'विवरण देखें',
        monitorLive: 'लाइव मॉनिटर करें',
        safeCap: 'सुरक्षित क्षमता',
        full: 'भरा',
        estWait: 'प्रतीक्षा'
      },
      details: {
        modalTitle: 'तीर्थ टेलीमेट्री और दर्शन विवरण',
        sanctumStatus: 'गर्भगृह भीड़ स्थिति',
        currentOccupancy: 'वर्तमान भीड़ प्रतिशत',
        liveHeadcount: 'वर्तमान श्रद्धालु संख्या',
        safeCapacity: 'सुरक्षित धारण क्षमता',
        currentWait: 'वर्तमान प्रतीक्षा समय',
        normalWait: 'सामान्य औसत प्रतीक्षा',
        peakWait: 'शिखर उत्सव प्रतीक्षा',
        darshanTimings: 'दर्शन समय',
        safetyHeader: 'आपातकालीन और एसडीआरएफ संपर्क',
        nearestHospital: 'निकटतम अस्पताल',
        policeStation: 'पुलिस स्टेशन',
        evacuationRoute: 'निकासी मार्ग',
        setAsActive: 'इस धाम को लाइव डैशबोर्ड में मॉनिटर करें',
        close: 'बंद करें',
        liveBadge: 'सत्यापित लाइव टेलीमेट्री'
      },
      advisory: {
        badge: 'यात्रासेतु एआई गतिशील परामर्श',
        congestionAlert: 'भीड़ चेतावनी सक्रिय',
        conditionsManageable: 'स्थितियां सामान्य हैं • मार्ग परिवर्तन वैकल्पिक',
        reroutingAdvised: 'भीड़ अधिक है • वैकल्पिक मार्ग की दृढ़ अनुशंसा की जाती है',
        switchCta: 'वैकल्पिक मार्ग चुनें (+25 पुण्य अंक लंबित)',
        headingTo: 'की ओर बढ़ रहे हैं:',
        pendingPoints: '+25 पुण्य अंक आगमन पर मिलेंगे',
        simulateArrival: '📍 डेमो: जीपीएस आगमन अनुकरण करें',
        verifiedGpsArrival: 'सत्यापित जीपीएस आगमन (200 मीटर के भीतर)',
        switchBack: 'मुख्य धाम वापस लौटें'
      },
      hotels: {
        title: 'सत्यापित तीर्थ आवास और आश्रम',
        subtitle: 'आधिकारिक मंदिर आश्रम, जीएमवीएन विश्राम गृह और होटल भागीदार:',
        verifiedBadge: '✓ आधिकारिक यात्रासेतु सत्यापित',
        perNight: '/ रात',
        expressCheckin: 'त्वरित चेक-इन तैयार',
        bookRoom: 'कमरा तुरंत बुक करें',
        bookingSuccess: 'बुकिंग की पुष्टि हो गई!'
      },
      safety: {
        title: 'सुरक्षा परामर्श और आपातकालीन एसडीआरएफ कमांड',
        subtitle: 'मौसम टेलीमेट्री, आपातकालीन निकासी मार्ग और त्वरित एसओएस प्रेषण',
        emergencySOS: 'आपातकालीन एसओएस अलर्ट',
        triggerSOS: 'आपातकालीन एसओएस भेजें'
      }
    }
  },
  te: {
    translation: {
      nav: {
        home: 'హోమ్',
        destinations: '25 క్షేత్రాలు',
        crowdStatus: 'ప్రత్యక్ష రద్దీ',
        forecast: 'AI అంచనా',
        alternatives: 'ప్రత్యామ్నాయాలు',
        safety: 'భద్రత & SOS',
        hotels: 'వసతి',
        wallet: 'పుణ్య వాలెట్',
        sos: 'అత్యవసర SOS',
        roleSelect: 'పాత్ర ఎంపిక',
        platformOverview: 'వేదిక సమాచారం',
        logout: 'లాగ్ అవుట్'
      },
      hero: {
        welcomeBadge: 'AI ఆధారిత పవిత్ర యాత్రా వ్యవస్థ',
        title: 'యాత్రాసేతుకు స్వాగతం',
        subtitle: 'ప్రత్యక్ష రద్దీ సమాచారం, క్యూ వేచి ఉండే సమయం మరియు స్మార్ట్ రద్దీ-రహిత డైవర్షన్లతో మీ పవిత్ర యాత్రను ప్లాన్ చేసుకోండి.',
        exploreCta: '25 క్షేత్రాలను చూడండి',
        liveStatusCta: 'ప్రత్యక్ష స్థితిని చూడండి',
        statDestinations: '25 పవిత్ర క్షేత్రాలు',
        statDestinationsSub: 'పూర్తి GIS టెలిమెట్రీ',
        statCCTV: 'AI రద్దీ విజన్',
        statCCTVSub: 'నిజ-సమయ ఆక్యుపెన్సీ',
        statReroute: 'స్మార్ట్ రీరూటింగ్',
        statRerouteSub: '+25 పుణ్య పాయింట్లు',
        statSafety: 'SDRF & SOS సిద్ధం',
        statSafetySub: '24/7 యాత్రికుల రక్షణ'
      },
      crowdSummary: {
        title: 'ప్రత్యక్ష గర్భగుడి టెలిమెట్రీ',
        monitoring: 'ప్రస్తుతం పర్యవేక్షిస్తున్నది',
        livePulse: 'పర్యవేక్షణ సక్రియంగా ఉంది',
        full: 'నిండినది',
        safeCap: 'సురక్షిత సామర్థ్యం',
        estWait: 'సుమారు వేచి ఉండే సమయం',
        liveCount: 'ప్రస్తుత భక్తుల సంఖ్య',
        normal: 'సాధారణం',
        moderate: 'మధ్యస్థం',
        high: 'ఎక్కువ',
        critical: 'తీవ్ర రద్దీ',
        jumpToDetails: 'పూర్తి సమాచారం మరియు సలహా చూడండి'
      },
      grid: {
        title: '25 పవిత్ర తీర్థయాత్రా క్షేత్రాలు',
        subtitle: 'భారతదేశంలోని అత్యంత పవిత్ర క్షేత్రాల నిజ-సమయ AI పర్యవేక్షణ మరియు క్యూ సమాచారం',
        searchPlaceholder: 'క్షేత్రం పేరు, నగరం లేదా రాష్ట్రం ద్వారా వెతకండి...',
        all: 'అన్ని క్షేత్రాలు',
        normal: 'సాధారణం (<50%)',
        moderate: 'మధ్యస్థం (50-74%)',
        high: 'ఎక్కువ (75-89%)',
        critical: 'తీవ్ర రద్దీ (≥90%)',
        sortBy: 'క్రమబద్ధీకరించు',
        sortName: 'క్షేత్రం పేరు (A-Z)',
        sortLowest: 'తక్కువ రద్దీ మొదట',
        sortHighest: 'ఎక్కువ రద్దీ మొదట',
        sortWait: 'తక్కువ వేచి ఉండే సమయం',
        showing: 'చూపిస్తున్నది',
        ofShrines: '25 పవిత్ర క్షేత్రాలలో',
        viewDetails: 'వివరాలు చూడండి',
        monitorLive: 'లైవ్ పర్యవేక్షించండి',
        safeCap: 'సురక్షిత సామర్థ్యం',
        full: 'నిండినది',
        estWait: 'వేచి ఉండే సమయం'
      },
      details: {
        modalTitle: 'క్షేత్ర సమాచారం & దర్శన ప్రొఫైల్',
        sanctumStatus: 'గర్భగుడి రద్దీ స్థితి',
        currentOccupancy: 'ప్రస్తుత రద్దీ శాతం',
        liveHeadcount: 'ప్రస్తుత భక్తుల సంఖ్య',
        safeCapacity: 'సురక్షిత సామర్థ్యం',
        currentWait: 'ప్రస్తుత వేచి ఉండే సమయం',
        normalWait: 'సాధారణ సగటు సమయం',
        peakWait: 'పీక్ పండుగ సమయం',
        darshanTimings: 'దర్శన సమయాలు',
        safetyHeader: 'అత్యవసర & SDRF పరిచయాలు',
        nearestHospital: 'సమీప ఆసుపత్రి',
        policeStation: 'పోలీస్ స్టేషన్',
        evacuationRoute: 'తరలింపు మార్గం',
        setAsActive: 'ఈ క్షేత్రాన్ని లైవ్ డ్యాష్‌బోర్డులో పర్యవేక్షించండి',
        close: 'మూసివేయి',
        liveBadge: 'ధృవీకరించబడిన లైవ్ టెలిమెట్రీ'
      },
      advisory: {
        badge: 'యాత్రాసేతు AI యాత్రికుల సలహా',
        congestionAlert: 'రద్దీ హెచ్చరిక సక్రియం',
        conditionsManageable: 'పరిస్థితి అదుపులో ఉంది • డైవర్షన్ ఐచ్ఛికం',
        reroutingAdvised: 'రద్దీ ఎక్కువ • ప్రత్యామ్నాయ మార్గం సూచించబడింది',
        switchCta: 'ప్రత్యామ్నాయ మార్గానికి మారండి (+25 పుణ్య పాయింట్లు పెండింగ్)',
        headingTo: 'వెళ్తున్నారు:',
        pendingPoints: '+25 పుణ్య పాయింట్లు చేరిన తర్వాత లభిస్తాయి',
        simulateArrival: '📍 డెమో: GPS చేరికను అనుకరించండి',
        verifiedGpsArrival: 'ధృవీకరించబడిన GPS చేరిక (200మీ పరిధిలో)',
        switchBack: 'ప్రధాన ఆలయానికి తిరిగి వెళ్లండి'
      },
      hotels: {
        title: 'ధృవీకరించబడిన తీర్థ వసతి & లాడ్జీలు',
        subtitle: 'అధికారిక ఆలయ ఆశ్రమాలు, వసతి గృహాలు మరియు భాగస్వాములు:',
        verifiedBadge: '✓ అధికారిక యాత్రాసేతు ధృవీకరించినది',
        perNight: '/ రాత్రికి',
        expressCheckin: 'ఎక్స్‌ప్రెస్ చెక్-ఇన్ సిద్ధం',
        bookRoom: 'గదిని వెంటనే బుక్ చేయండి',
        bookingSuccess: 'బుకింగ్ నిర్ధారించబడింది!'
      },
      safety: {
        title: 'భద్రతా సలహాలు & అత్యవసర SDRF కమాండ్',
        subtitle: 'వాతావరణ సమాచారం, అత్యవసర తరలింపు మార్గాలు మరియు తక్షణ SOS సహాయం',
        emergencySOS: 'అత్యవసర SOS హెచ్చరిక',
        triggerSOS: 'అత్యవసర SOS పంపండి'
      }
    }
  },
  ta: {
    translation: {
      nav: {
        home: 'முகப்பு',
        destinations: '25 ஸ்தலங்கள்',
        crowdStatus: 'நேரடி கூட்டம்',
        forecast: 'AI கணிப்பு',
        alternatives: 'மாற்று வழிகள்',
        safety: 'பாதுகாப்பு & SOS',
        hotels: 'தங்குமிடம்',
        wallet: 'புண்ய வாலட்',
        sos: 'அவசர SOS',
        roleSelect: 'பணி தேர்வு',
        platformOverview: 'கண்ணோட்டம்',
        logout: 'வெளியேறு'
      },
      hero: {
        welcomeBadge: 'AI அடிப்படையிலான புண்ணிய யாத்திரை அமைப்பு',
        title: 'யாத்ராசேதுவிற்கு வரவேற்கிறோம்',
        subtitle: 'நேரடி கூட்ட நெரிசல் தகவல், வரிசை காத்திருப்பு நேரம் மற்றும் ஸ்மார்ட் மாற்றுப்பாதைகளுடன் உங்கள் புண்ணிய யாத்திரையை திட்டமிடுங்கள்.',
        exploreCta: '25 ஸ்தலங்களை காண்க',
        liveStatusCta: 'நேரடி நிலையை காண்க',
        statDestinations: '25 புண்ணிய ஸ்தலங்கள்',
        statDestinationsSub: 'முழு GIS கண்காணிப்பு',
        statCCTV: 'AI கூட்ட பார்வை',
        statCCTVSub: 'நிகழ்நேர ஆக்கிரமிப்பு',
        statReroute: 'ஸ்மார்ட் மாற்றுப்பாதை',
        statRerouteSub: '+25 புண்ய புள்ளிகள்',
        statSafety: 'SDRF & SOS தயார்',
        statSafetySub: '24/7 யாத்ரீகர் பாதுகாப்பு'
      },
      crowdSummary: {
        title: 'நேரடி கருவறை கண்காணிப்பு',
        monitoring: 'தற்போது கண்காணிக்கப்படுகிறது',
        livePulse: 'கண்காணிப்பு செயலில் உள்ளது',
        full: 'நிரம்பியது',
        safeCap: 'பாதுகாப்பான கொள்ளளவு',
        estWait: 'மதிப்பிடப்பட்ட காத்திருப்பு',
        liveCount: 'தற்போதைய பக்தர்கள்',
        normal: 'சாதாரண',
        moderate: 'மிதமான',
        high: 'அதிக',
        critical: 'மிக தீவிர கூட்டம்',
        jumpToDetails: 'முழு விவரங்கள் மற்றும் ஆலோசனையை காண்க'
      },
      grid: {
        title: '25 புண்ணிய யாத்திரை ஸ்தலங்கள்',
        subtitle: 'இந்தியாவின் மிக புனிதமான ஸ்தலங்களின் நிகழ்நேர AI கண்காணிப்பு மற்றும் வரிசை தகவல்',
        searchPlaceholder: 'ஸ்தலத்தின் பெயர், நகரம் அல்லது மாநிலம் மூலம் தேடவும்...',
        all: 'அனைத்து ஸ்தலங்கள்',
        normal: 'சாதாரண (<50%)',
        moderate: 'மிதமான (50-74%)',
        high: 'அதிக (75-89%)',
        critical: 'மிக தீவிர கூட்டம் (≥90%)',
        sortBy: 'வரிசைப்படுத்து',
        sortName: 'ஸ்தலத்தின் பெயர் (A-Z)',
        sortLowest: 'குறைந்த கூட்டம் முதலில்',
        sortHighest: 'அதிக கூட்டம் முதலில்',
        sortWait: 'குறைந்த காத்திருப்பு நேரம்',
        showing: 'காட்டப்படுகிறது',
        ofShrines: '25 புனித யாத்திரை ஸ்தலங்களில்',
        viewDetails: 'விவரங்களை காண்க',
        monitorLive: 'நேரலை காண்க',
        safeCap: 'பாதுகாப்பான கொள்ளளவு',
        full: 'நிரம்பியது',
        estWait: 'காத்திருப்பு'
      },
      details: {
        modalTitle: 'ஸ்தல தகவல் மற்றும் தரிசன விவரம்',
        sanctumStatus: 'கருவறை கூட்ட நிலை',
        currentOccupancy: 'தற்போதைய ஆக்கிரமிப்பு',
        liveHeadcount: 'நேரடி பக்தர்கள் எண்ணிக்கை',
        safeCapacity: 'பாதுகாப்பான கொள்ளளவு',
        currentWait: 'தற்போதைய காத்திருப்பு நேரம்',
        normalWait: 'சாதாரண சராசரி நேரம்',
        peakWait: 'உச்ச திருவிழா காத்திருப்பு',
        darshanTimings: 'தரிசன நேரங்கள்',
        safetyHeader: 'அவசர & SDRF தொடர்புகள்',
        nearestHospital: 'அருகிலுள்ள மருத்துவமனை',
        policeStation: 'காவல் நிலையம்',
        evacuationRoute: 'வெளியேறும் பாதை',
        setAsActive: 'இந்த ஸ்தலத்தை நேரலை டாஷ்போர்டில் கண்காணிக்கவும்',
        close: 'மூடு',
        liveBadge: 'சரிபார்க்கப்பட்ட நேரடி தகவல்'
      },
      advisory: {
        badge: 'யாத்ராசேது AI யாத்ரீகர் ஆலோசனை',
        congestionAlert: 'நெரிசல் எச்சரிக்கை செயலில் உள்ளது',
        conditionsManageable: 'நிலவரம் சீராக உள்ளது • மாற்றுப்பாதை விருப்பமானது',
        reroutingAdvised: 'நெரிசல் அதிகம் • மாற்றுப்பாதை பெரிதும் பரிந்துரைக்கப்படுகிறது',
        switchCta: 'மாற்றுப் பாதைக்கு மாறவும் (+25 புண்ய புள்ளிகள் நிலுவை)',
        headingTo: 'நோக்கி செல்கிறீர்கள்:',
        pendingPoints: '+25 புண்ய புள்ளிகள் வருகையின் போது வழங்கப்படும்',
        simulateArrival: '📍 டெமோ: GPS வருகையை உருவகப்படுத்தவும்',
        verifiedGpsArrival: 'சரிபார்க்கப்பட்ட GPS வருகை (200மீ சுற்றளவுக்குள்)',
        switchBack: 'முதன்மை கோயிலுக்குத் திரும்புங்கள்'
      },
      hotels: {
        title: 'சரிபார்க்கப்பட்ட யாத்திரை தங்குமிடங்கள்',
        subtitle: 'அதிகாரப்பூர்வ கோயில் ஆசிரமங்கள், தங்குமிடங்கள் மற்றும் கூட்டாளர்கள்:',
        verifiedBadge: '✓ அதிகாரப்பூர்வ யாத்ராசேது சரிபார்க்கப்பட்டது',
        perNight: '/ இரவுக்கு',
        expressCheckin: 'விரைவு செக்-இன் தயார்',
        bookRoom: 'அறையை உடனே முன்பதிவு செய்',
        bookingSuccess: 'முன்பதிவு உறுதி செய்யப்பட்டது!'
      },
      safety: {
        title: 'பாதுகாப்பு ஆலோசனைகள் மற்றும் அவசர SDRF கட்டளை',
        subtitle: 'வானிலை தகவல், அவசர கால வெளியேறும் பாதைகள் மற்றும் உடனடி SOS உதவி',
        emergencySOS: 'அவசர SOS எச்சரிக்கை',
        triggerSOS: 'அவசர SOS அனுப்புக'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
