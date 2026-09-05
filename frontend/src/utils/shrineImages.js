// ============================================================================
// YatraSetu Centralized Shrine Image Mapping & Asset Hub
// Maps canonical Site IDs (TS001 -> TS025) to verified local downloaded assets
// Directory: frontend/src/assets/YatraSetu_Image_Assets/
// ============================================================================

import ts001Img from '../assets/YatraSetu_Image_Assets/Kedarnath_Temple_in_Rainy_season.jpg';
import ts002Img from '../assets/YatraSetu_Image_Assets/Badrinath_Temple_,_Uttarakhand.jpg';
import ts003Img from '../assets/YatraSetu_Image_Assets/Dasaswamedh_ghat-varanasi_india-andres_larin.jpg';
import ts004Img from '../assets/YatraSetu_Image_Assets/Shri_Ram_Janambhoomi_Mandir,_Ayodhya_Dham.jpg';
import ts005Img from '../assets/YatraSetu_Image_Assets/Snowfall_in_Vaishno_Devi.jpg';
import ts006Img from '../assets/YatraSetu_Image_Assets/Tirumala_090615.jpg';
import ts007Img from '../assets/YatraSetu_Image_Assets/Shri_Jagannath_temple.jpg';
import ts008Img from '../assets/YatraSetu_Image_Assets/Mahakaleshwar_Temple,_Ujjain.jpg';
import ts009Img from '../assets/YatraSetu_Image_Assets/The_Golden_Temple_of_Amrithsar_7.jpg';
import ts010Img from '../assets/YatraSetu_Image_Assets/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg';
import ts011Img from '../assets/YatraSetu_Image_Assets/Ramanathaswamy_temple7.JPG';
import ts012Img from '../assets/YatraSetu_Image_Assets/Somanath_mandir_(cropped).jpg';
import ts013Img from '../assets/YatraSetu_Image_Assets/Shirdi_Sai_Baba_3.jpg';
import ts014Img from '../assets/YatraSetu_Image_Assets/Sabarimala_2.jpg';
import ts015Img from '../assets/YatraSetu_Image_Assets/Evening_view_of_Har-ki-Pauri,_Haridwar.jpg';
import ts016Img from '../assets/YatraSetu_Image_Assets/NorthIndiaCircuit_250.jpg';
import ts017Img from '../assets/YatraSetu_Image_Assets/PremMandirSideViewFromCanteen.jpg';
import ts018Img from '../assets/YatraSetu_Image_Assets/Taj_Mahal_(Edited).jpeg';
import ts019Img from '../assets/YatraSetu_Image_Assets/20191219_Fort_Amber,_Amer,_Jaipur_0955_9481.jpg';
import ts020Img from '../assets/YatraSetu_Image_Assets/Qutb_Minar_2022.jpg';
import ts021Img from '../assets/YatraSetu_Image_Assets/Kailash_temple,_Ellora,_Maharashtra_18.jpg';
import ts022Img from '../assets/YatraSetu_Image_Assets/Complex_of_Virupaksha_Temple,_Hampi_(04).jpg';
import ts023Img from '../assets/YatraSetu_Image_Assets/Pangong_Tso_2.jpg';
import ts024Img from '../assets/YatraSetu_Image_Assets/Kullu_Valley_from_Rohtang_Pass,_India.jpg';
import ts025Img from '../assets/YatraSetu_Image_Assets/Kamakhya_Temple_-_DEV_8829.jpg';

// Direct Key Mapping by Site ID
export const SHRINE_IMAGES = {
  TS001: ts001Img,
  TS002: ts002Img,
  TS003: ts003Img,
  TS004: ts004Img,
  TS005: ts005Img,
  TS006: ts006Img,
  TS007: ts007Img,
  TS008: ts008Img,
  TS009: ts009Img,
  TS010: ts010Img,
  TS011: ts011Img,
  TS012: ts012Img,
  TS013: ts013Img,
  TS014: ts014Img,
  TS015: ts015Img,
  TS016: ts016Img,
  TS017: ts017Img,
  TS018: ts018Img,
  TS019: ts019Img,
  TS020: ts020Img,
  TS021: ts021Img,
  TS022: ts022Img,
  TS023: ts023Img,
  TS024: ts024Img,
  TS025: ts025Img,

  // Legacy Site ID Aliases
  site_kedarnath: ts001Img,
  site_badrinath: ts002Img,
  site_kashi: ts003Img,
  site_ayodhya: ts004Img,
  site_vaishnodevi: ts005Img,
  site_tirupati: ts006Img,
  site_puri: ts007Img,
  SITE001: ts001Img,
  SITE002: ts007Img
};

// Original Asset Filename Registry
export const SHRINE_IMAGE_FILES = {
  TS001: 'Kedarnath_Temple_in_Rainy_season.jpg',
  TS002: 'Badrinath_Temple_,_Uttarakhand.jpg',
  TS003: 'Dasaswamedh_ghat-varanasi_india-andres_larin.jpg',
  TS004: 'Shri_Ram_Janambhoomi_Mandir,_Ayodhya_Dham.jpg',
  TS005: 'Snowfall_in_Vaishno_Devi.jpg',
  TS006: 'Tirumala_090615.jpg',
  TS007: 'Shri_Jagannath_temple.jpg',
  TS008: 'Mahakaleshwar_Temple,_Ujjain.jpg',
  TS009: 'The_Golden_Temple_of_Amrithsar_7.jpg',
  TS010: 'An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg',
  TS011: 'Ramanathaswamy_temple7.JPG',
  TS012: 'Somanath_mandir_(cropped).jpg',
  TS013: 'Shirdi_Sai_Baba_3.jpg',
  TS014: 'Sabarimala_2.jpg',
  TS015: 'Evening_view_of_Har-ki-Pauri,_Haridwar.jpg',
  TS016: 'NorthIndiaCircuit_250.jpg',
  TS017: 'PremMandirSideViewFromCanteen.jpg',
  TS018: 'Taj_Mahal_(Edited).jpeg',
  TS019: '20191219_Fort_Amber,_Amer,_Jaipur_0955_9481.jpg',
  TS020: 'Qutb_Minar_2022.jpg',
  TS021: 'Kailash_temple,_Ellora,_Maharashtra_18.jpg',
  TS022: 'Complex_of_Virupaksha_Temple,_Hampi_(04).jpg',
  TS023: 'Pangong_Tso_2.jpg',
  TS024: 'Kullu_Valley_from_Rohtang_Pass,_India.jpg',
  TS025: 'Kamakhya_Temple_-_DEV_8829.jpg'
};

// 25 Canonical YatraSetu Destinations with Real Image Bindings
export const CANONICAL_25_SHRINES = [
  {
    id: 'TS001',
    name: 'Kedarnath Temple',
    city: 'Rudraprayag, Uttarakhand',
    state: 'Uttarakhand',
    capacity: 13000,
    category: 'Char Dham & Himalayas',
    image: ts001Img,
    fileName: SHRINE_IMAGE_FILES.TS001
  },
  {
    id: 'TS002',
    name: 'Badrinath Temple',
    city: 'Chamoli, Uttarakhand',
    state: 'Uttarakhand',
    capacity: 16000,
    category: 'Char Dham & Himalayas',
    image: ts002Img,
    fileName: SHRINE_IMAGE_FILES.TS002
  },
  {
    id: 'TS003',
    name: 'Kashi Vishwanath Temple & Dashashwamedh Ghat',
    city: 'Varanasi, Uttar Pradesh',
    state: 'Uttar Pradesh',
    capacity: 120000,
    category: 'Sacred Jyotirlingas',
    image: ts003Img,
    fileName: SHRINE_IMAGE_FILES.TS003
  },
  {
    id: 'TS004',
    name: 'Shri Ram Janmabhoomi Mandir',
    city: 'Ayodhya, Uttar Pradesh',
    state: 'Uttar Pradesh',
    capacity: 150000,
    category: 'Heritage & Cultural',
    image: ts004Img,
    fileName: SHRINE_IMAGE_FILES.TS004
  },
  {
    id: 'TS005',
    name: 'Shri Mata Vaishno Devi Shrine',
    city: 'Katra, Jammu and Kashmir',
    state: 'Jammu and Kashmir',
    capacity: 50000,
    category: 'Char Dham & Himalayas',
    image: ts005Img,
    fileName: SHRINE_IMAGE_FILES.TS005
  },
  {
    id: 'TS006',
    name: 'Tirumala Venkateswara Temple',
    city: 'Tirupati, Andhra Pradesh',
    state: 'Andhra Pradesh',
    capacity: 75000,
    category: 'South Indian Shrines',
    image: ts006Img,
    fileName: SHRINE_IMAGE_FILES.TS006
  },
  {
    id: 'TS007',
    name: 'Shree Jagannath Temple',
    city: 'Puri, Odisha',
    state: 'Odisha',
    capacity: 60000,
    category: 'Heritage & Cultural',
    image: ts007Img,
    fileName: SHRINE_IMAGE_FILES.TS007
  },
  {
    id: 'TS008',
    name: 'Mahakaleshwar Jyotirlinga Temple',
    city: 'Ujjain, Madhya Pradesh',
    state: 'Madhya Pradesh',
    capacity: 80000,
    category: 'Sacred Jyotirlingas',
    image: ts008Img,
    fileName: SHRINE_IMAGE_FILES.TS008
  },
  {
    id: 'TS009',
    name: 'Golden Temple / Sri Harmandir Sahib',
    city: 'Amritsar, Punjab',
    state: 'Punjab',
    capacity: 100000,
    category: 'Heritage & Cultural',
    image: ts009Img,
    fileName: SHRINE_IMAGE_FILES.TS009
  },
  {
    id: 'TS010',
    name: 'Meenakshi Sundareswarar Temple',
    city: 'Madurai, Tamil Nadu',
    state: 'Tamil Nadu',
    capacity: 45000,
    category: 'South Indian Shrines',
    image: ts010Img,
    fileName: SHRINE_IMAGE_FILES.TS010
  },
  {
    id: 'TS011',
    name: 'Ramanathaswamy Temple',
    city: 'Rameswaram, Tamil Nadu',
    state: 'Tamil Nadu',
    capacity: 40000,
    category: 'Sacred Jyotirlingas',
    image: ts011Img,
    fileName: SHRINE_IMAGE_FILES.TS011
  },
  {
    id: 'TS012',
    name: 'Shree Somnath Jyotirlinga Temple',
    city: 'Prabhas Patan, Gujarat',
    state: 'Gujarat',
    capacity: 50000,
    category: 'Sacred Jyotirlingas',
    image: ts012Img,
    fileName: SHRINE_IMAGE_FILES.TS012
  },
  {
    id: 'TS013',
    name: 'Shri Saibaba Sansthan Temple',
    city: 'Shirdi, Maharashtra',
    state: 'Maharashtra',
    capacity: 65000,
    category: 'Heritage & Cultural',
    image: ts013Img,
    fileName: SHRINE_IMAGE_FILES.TS013
  },
  {
    id: 'TS014',
    name: 'Sabarimala Sree Dharma Sastha Temple',
    city: 'Pathanamthitta, Kerala',
    state: 'Kerala',
    capacity: 70000,
    category: 'South Indian Shrines',
    image: ts014Img,
    fileName: SHRINE_IMAGE_FILES.TS014
  },
  {
    id: 'TS015',
    name: 'Har Ki Pauri Ghat & Mansa Devi',
    city: 'Haridwar, Uttarakhand',
    state: 'Uttarakhand',
    capacity: 85000,
    category: 'Char Dham & Himalayas',
    image: ts015Img,
    fileName: SHRINE_IMAGE_FILES.TS015
  },
  {
    id: 'TS016',
    name: 'Triveni Sangam & Kumbh Mela Grounds',
    city: 'Prayagraj, Uttar Pradesh',
    state: 'Uttar Pradesh',
    capacity: 200000,
    category: 'Heritage & Cultural',
    image: ts016Img,
    fileName: SHRINE_IMAGE_FILES.TS016
  },
  {
    id: 'TS017',
    name: 'Bankey Bihari Temple & Prem Mandir',
    city: 'Vrindavan, Uttar Pradesh',
    state: 'Uttar Pradesh',
    capacity: 55000,
    category: 'Heritage & Cultural',
    image: ts017Img,
    fileName: SHRINE_IMAGE_FILES.TS017
  },
  {
    id: 'TS018',
    name: 'Taj Mahal Monument Complex',
    city: 'Agra, Uttar Pradesh',
    state: 'Uttar Pradesh',
    capacity: 70000,
    category: 'Heritage & Cultural',
    image: ts018Img,
    fileName: SHRINE_IMAGE_FILES.TS018
  },
  {
    id: 'TS019',
    name: 'Amber Fort & Palace Complex',
    city: 'Jaipur, Rajasthan',
    state: 'Rajasthan',
    capacity: 35000,
    category: 'Heritage & Cultural',
    image: ts019Img,
    fileName: SHRINE_IMAGE_FILES.TS019
  },
  {
    id: 'TS020',
    name: 'Qutub Minar & Mehrauli Archaeological Complex',
    city: 'New Delhi, Delhi',
    state: 'Delhi',
    capacity: 30000,
    category: 'Heritage & Cultural',
    image: ts020Img,
    fileName: SHRINE_IMAGE_FILES.TS020
  },
  {
    id: 'TS021',
    name: 'Ajanta and Ellora Rock-Cut Caves',
    city: 'Chhatrapati Sambhaji Nagar, Maharashtra',
    state: 'Maharashtra',
    capacity: 25000,
    category: 'Heritage & Cultural',
    image: ts021Img,
    fileName: SHRINE_IMAGE_FILES.TS021
  },
  {
    id: 'TS022',
    name: 'Group of Monuments at Hampi',
    city: 'Hampi, Karnataka',
    state: 'Karnataka',
    capacity: 30000,
    category: 'South Indian Shrines',
    image: ts022Img,
    fileName: SHRINE_IMAGE_FILES.TS022
  },
  {
    id: 'TS023',
    name: 'Pangong Tso Lake & Hemis Monastery',
    city: 'Leh, Ladakh',
    state: 'Ladakh',
    capacity: 15000,
    category: 'Char Dham & Himalayas',
    image: ts023Img,
    fileName: SHRINE_IMAGE_FILES.TS023
  },
  {
    id: 'TS024',
    name: 'Rohtang Pass & Solang Valley Adventure Zone',
    city: 'Manali, Himachal Pradesh',
    state: 'Himachal Pradesh',
    capacity: 20000,
    category: 'Char Dham & Himalayas',
    image: ts024Img,
    fileName: SHRINE_IMAGE_FILES.TS024
  },
  {
    id: 'TS025',
    name: 'Maa Kamakhya Devalaya',
    city: 'Guwahati, Assam',
    state: 'Assam',
    capacity: 40000,
    category: 'Heritage & Cultural',
    image: ts025Img,
    fileName: SHRINE_IMAGE_FILES.TS025
  }
];

/**
 * Returns the verified local image for a given site ID or name.
 * Safe fallback guarantees no broken images and zero Unsplash reliance.
 */
export function getShrineImage(siteId, fallback = ts001Img) {
  if (!siteId) return fallback;

  // 1. Direct ID match
  if (SHRINE_IMAGES[siteId]) return SHRINE_IMAGES[siteId];

  // 2. Normalization (uppercase trimmed)
  const norm = String(siteId).trim().toUpperCase();
  if (SHRINE_IMAGES[norm]) return SHRINE_IMAGES[norm];

  // 3. Lowercase / alias check
  const lower = String(siteId).trim().toLowerCase();
  if (SHRINE_IMAGES[lower]) return SHRINE_IMAGES[lower];

  // 4. Fuzzy / name keywords check
  if (lower.includes('kedarnath')) return ts001Img;
  if (lower.includes('badrinath')) return ts002Img;
  if (lower.includes('kashi') || lower.includes('varanasi') || lower.includes('ghat')) return ts003Img;
  if (lower.includes('ayodhya') || lower.includes('ram')) return ts004Img;
  if (lower.includes('vaishno') || lower.includes('katra')) return ts005Img;
  if (lower.includes('tirupati') || lower.includes('tirumala') || lower.includes('venkateswara')) return ts006Img;
  if (lower.includes('puri') || lower.includes('jagannath')) return ts007Img;
  if (lower.includes('mahakal') || lower.includes('ujjain')) return ts008Img;
  if (lower.includes('golden') || lower.includes('amritsar') || lower.includes('harmandir')) return ts009Img;
  if (lower.includes('meenakshi') || lower.includes('madurai')) return ts010Img;
  if (lower.includes('rameshwar') || lower.includes('ramanatha')) return ts011Img;
  if (lower.includes('somnath') || lower.includes('patan')) return ts012Img;
  if (lower.includes('shirdi') || lower.includes('saibaba') || lower.includes('sai')) return ts013Img;
  if (lower.includes('sabarimala') || lower.includes('ayyappa')) return ts014Img;
  if (lower.includes('haridwar') || lower.includes('pauri') || lower.includes('mansa')) return ts015Img;
  if (lower.includes('triveni') || lower.includes('sangam') || lower.includes('prayagraj') || lower.includes('kumbh')) return ts016Img;
  if (lower.includes('prem') || lower.includes('vrindavan') || lower.includes('bihari')) return ts017Img;
  if (lower.includes('taj') || lower.includes('agra') || lower.includes('mahal')) return ts018Img;
  if (lower.includes('amber') || lower.includes('jaipur') || lower.includes('amer')) return ts019Img;
  if (lower.includes('qutub') || lower.includes('qutb') || lower.includes('mehrauli')) return ts020Img;
  if (lower.includes('ajanta') || lower.includes('ellora') || lower.includes('kailash')) return ts021Img;
  if (lower.includes('hampi') || lower.includes('virupaksha')) return ts022Img;
  if (lower.includes('pangong') || lower.includes('ladakh') || lower.includes('hemis')) return ts023Img;
  if (lower.includes('rohtang') || lower.includes('manali') || lower.includes('solang')) return ts024Img;
  if (lower.includes('kamakhya') || lower.includes('guwahati') || lower.includes('nilachal')) return ts025Img;

  return fallback;
}

/**
 * Returns category designation for filtering
 */
export function getShrineCategory(siteId, siteName = '') {
  const match = CANONICAL_25_SHRINES.find((s) => s.id === siteId);
  if (match) return match.category;

  const lower = (siteName || '').toLowerCase();
  if (lower.includes('kedarnath') || lower.includes('badrinath') || lower.includes('vaishno') || lower.includes('pangong') || lower.includes('rohtang') || lower.includes('haridwar')) {
    return 'Char Dham & Himalayas';
  }
  if (lower.includes('kashi') || lower.includes('mahakal') || lower.includes('somnath') || lower.includes('rameshwar')) {
    return 'Sacred Jyotirlingas';
  }
  if (lower.includes('tirupati') || lower.includes('meenakshi') || lower.includes('sabarimala') || lower.includes('hampi')) {
    return 'South Indian Shrines';
  }
  return 'Heritage & Cultural';
}
