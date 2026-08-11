/**
 * The vocabulary join codes are built from.
 *
 * A random string like `K7M2QX9B` is the hardest possible thing to give someone
 * over a phone call. `SURAJ-KAMAL` is a thing two people already share: it can be
 * spoken once, remembered on the walk home, and typed without spelling it out
 * letter by letter. That is the entire reason this file exists.
 *
 * Selection rules, all of which the unit test enforces:
 *   - Concrete, everyday nouns. Nothing abstract, nothing that needs explaining.
 *     Sun, river, lamp, mango — things a 70-year-old in a village names daily.
 *   - Religiously and politically neutral. The same platform sells to a samaj, an
 *     RWA and a political outfit; a code must never read as a statement.
 *   - No word may be a prefix of another. Codes are matched ignoring separators
 *     (see `normaliseJoinCode`), so `SUR` + `AJGAR` and `SURAJ` + `GAR` would
 *     collapse to the same string. Forbidding prefixes removes the whole class.
 *   - Unambiguous in Latin script *and* carried in Devanagari, because the app is
 *     Hindi-first and the code is read far more often than it is typed.
 *
 * The usable space is `n × (n − 1)` ordered pairs. Adding words widens it
 * quadratically and needs no migration — existing codes stay valid.
 */
export interface JoinWord {
  /** Uppercase Latin. This is what goes in the code and the database. */
  readonly latin: string;
  /** Devanagari, for display. Never parsed, never stored. */
  readonly devanagari: string;
}

const word = (latin: string, devanagari: string): JoinWord => ({ latin, devanagari });

export const JOIN_WORDS: readonly JoinWord[] = Object.freeze([
  // ── Sky, weather, water, land ──────────────────────────────────────────────
  word('SURAJ', 'सूरज'),
  word('CHAND', 'चाँद'),
  word('TARA', 'तारा'),
  word('BADAL', 'बादल'),
  word('BARISH', 'बारिश'),
  word('HAWA', 'हवा'),
  word('BIJLI', 'बिजली'),
  word('KOHRA', 'कोहरा'),
  word('DHOOP', 'धूप'),
  word('OAS', 'ओस'),
  word('AAKASH', 'आकाश'),
  word('SAWAN', 'सावन'),
  word('BASANT', 'बसंत'),
  word('SUBAH', 'सुबह'),
  word('SHAAM', 'शाम'),
  word('RAAT', 'रात'),
  word('SAVERA', 'सवेरा'),
  word('UJALA', 'उजाला'),
  word('CHHAYA', 'छाया'),
  word('NADI', 'नदी'),
  word('SAGAR', 'सागर'),
  word('JHEEL', 'झील'),
  word('JHARNA', 'झरना'),
  word('LEHAR', 'लहर'),
  word('DHARA', 'धारा'),
  word('PAHAD', 'पहाड़'),
  word('MITTI', 'मिट्टी'),
  word('PATTHAR', 'पत्थर'),
  word('RETI', 'रेती'),
  word('KIRAN', 'किरण'),

  // ── Trees, flowers, crops ──────────────────────────────────────────────────
  word('PEEPAL', 'पीपल'),
  word('NEEM', 'नीम'),
  word('BARGAD', 'बरगद'),
  word('TULSI', 'तुलसी'),
  word('GULAB', 'गुलाब'),
  word('KAMAL', 'कमल'),
  word('CHAMELI', 'चमेली'),
  word('GENDA', 'गेंदा'),
  word('MOGRA', 'मोगरा'),
  word('PHOOL', 'फूल'),
  word('PATTA', 'पत्ता'),
  word('BEEJ', 'बीज'),
  word('BAAG', 'बाग'),
  word('KHET', 'खेत'),
  word('FASAL', 'फसल'),
  word('GEHUN', 'गेहूँ'),
  word('DHAAN', 'धान'),
  word('SARSON', 'सरसों'),
  word('BAJRA', 'बाजरा'),
  word('JOWAR', 'ज्वार'),
  word('MOONG', 'मूंग'),

  // ── Birds and animals ──────────────────────────────────────────────────────
  word('MOR', 'मोर'),
  word('KOYAL', 'कोयल'),
  word('TOTA', 'तोता'),
  word('CHIDIYA', 'चिड़िया'),
  word('KABOOTAR', 'कबूतर'),
  word('HANS', 'हंस'),
  word('BATAK', 'बतख'),
  word('MURGA', 'मुर्गा'),
  // `BAAZ` (hawk) was cut: it differs from `BAAG` only in its last sound, and
  // these words get read aloud down a bad phone line.
  word('GAAY', 'गाय'),
  word('BAIL', 'बैल'),
  word('BHAINS', 'भैंस'),
  word('BAKRI', 'बकरी'),
  word('GHODA', 'घोड़ा'),
  word('HATHI', 'हाथी'),
  word('HIRAN', 'हिरण'),
  word('SHER', 'शेर'),
  word('UNT', 'ऊँट'),
  word('BANDAR', 'बंदर'),
  word('KHARGOSH', 'खरगोश'),
  word('GILHARI', 'गिलहरी'),
  word('KACHUA', 'कछुआ'),
  word('MACHHLI', 'मछली'),
  word('TITLI', 'तितली'),
  word('BHAWRA', 'भँवरा'),
  word('JUGNU', 'जुगनू'),

  // ── Colours ────────────────────────────────────────────────────────────────
  word('LAAL', 'लाल'),
  word('HARA', 'हरा'),
  word('NEELA', 'नीला'),
  word('PEELA', 'पीला'),
  word('SAFED', 'सफ़ेद'),
  word('KAALA', 'काला'),
  word('BHOORA', 'भूरा'),
  word('SUNHARA', 'सुनहरा'),
  word('RANG', 'रंग'),

  // ── Home and village ───────────────────────────────────────────────────────
  word('DEEPAK', 'दीपक'),
  word('DIYA', 'दिया'),
  word('MATKA', 'मटका'),
  word('THALI', 'थाली'),
  word('KATORI', 'कटोरी'),
  word('CHAMMACH', 'चम्मच'),
  word('CHABI', 'चाबी'),
  word('TAALA', 'ताला'),
  word('DARWAZA', 'दरवाज़ा'),
  word('KHIDKI', 'खिड़की'),
  word('SEEDHI', 'सीढ़ी'),
  word('KURSI', 'कुर्सी'),
  word('MEZ', 'मेज़'),
  word('PALANG', 'पलंग'),
  word('CHARPAI', 'चारपाई'),
  word('CHADAR', 'चादर'),
  word('TAKIYA', 'तकिया'),
  word('JHOOLA', 'झूला'),
  word('CHHATA', 'छाता'),
  word('THAILA', 'थैला'),
  word('JHADU', 'झाड़ू'),
  word('BALTI', 'बाल्टी'),
  word('RASSI', 'रस्सी'),
  word('DHAAGA', 'धागा'),
  word('KAAGAZ', 'काग़ज़'),
  word('KALAM', 'कलम'),
  word('KITAB', 'किताब'),
  word('GHADI', 'घड़ी'),
  word('AAINA', 'आईना'),
  word('KANGHI', 'कंघी'),
  word('SANDOOK', 'संदूक'),
  word('TOKRI', 'टोकरी'),
  word('CHAKKA', 'चक्का'),
  word('KUAN', 'कुआँ'),
  word('NAAV', 'नाव'),
  word('PUL', 'पुल'),
  word('RAASTA', 'रास्ता'),
  word('SADAK', 'सड़क'),
  word('GAON', 'गाँव'),
  word('SHEHAR', 'शहर'),
  word('MELA', 'मेला'),
  word('DUKAAN', 'दुकान'),
  word('MAKAAN', 'मकान'),
  word('AANGAN', 'आँगन'),
  word('CHAUPAL', 'चौपाल'),

  // ── Food ───────────────────────────────────────────────────────────────────
  word('ROTI', 'रोटी'),
  word('CHAWAL', 'चावल'),
  word('DAL', 'दाल'),
  word('SABZI', 'सब्ज़ी'),
  word('ACHAR', 'अचार'),
  word('GUD', 'गुड़'),
  word('CHEENI', 'चीनी'),
  word('NAMAK', 'नमक'),
  word('HALDI', 'हल्दी'),
  word('MIRCH', 'मिर्च'),
  word('DHANIYA', 'धनिया'),
  word('JEERA', 'जीरा'),
  word('ELAICHI', 'इलायची'),
  word('ADRAK', 'अदरक'),
  word('LAHSUN', 'लहसुन'),
  word('PYAAZ', 'प्याज़'),
  word('ALOO', 'आलू'),
  word('TAMATAR', 'टमाटर'),
  word('BAINGAN', 'बैंगन'),
  word('BHINDI', 'भिंडी'),
  word('GAJAR', 'गाजर'),
  word('NIMBU', 'नींबू'),
  word('ANAR', 'अनार'),
  word('SEB', 'सेब'),
  word('ANGOOR', 'अंगूर'),
  word('PAPITA', 'पपीता'),
  word('AMRUD', 'अमरूद'),
  word('NARIYAL', 'नारियल'),
  word('KAJU', 'काजू'),
  word('DAHI', 'दही'),
  word('DOODH', 'दूध'),
  word('GHEE', 'घी'),
  word('CHAI', 'चाय'),
  word('LADDU', 'लड्डू'),
  word('JALEBI', 'जलेबी'),
  word('BARFI', 'बर्फ़ी'),
  word('KHEER', 'खीर'),
  word('PURI', 'पूरी'),
  word('SAMOSA', 'समोसा'),
  word('PAKORA', 'पकोड़ा'),

  // ── Music ──────────────────────────────────────────────────────────────────
  word('DHOL', 'ढोल'),
  word('TABLA', 'तबला'),
  word('BANSURI', 'बाँसुरी'),
  word('SITAR', 'सितार'),
  word('VEENA', 'वीणा'),
  word('MANJIRA', 'मंजीरा'),
  word('GHUNGROO', 'घुँघरू'),
  word('SANGEET', 'संगीत'),
  word('GEET', 'गीत'),

  // ── Warm, neutral ideas ────────────────────────────────────────────────────
  word('KHUSHI', 'ख़ुशी'),
  word('UMANG', 'उमंग'),
  word('SAPNA', 'सपना'),
  word('AASHA', 'आशा'),
  word('SHANTI', 'शांति'),
  word('SATHI', 'साथी'),
  word('VIKAS', 'विकास'),
  word('SEVA', 'सेवा'),
  word('GYAN', 'ज्ञान'),
  word('VIDYA', 'विद्या'),
  word('SAAHAS', 'साहस'),
  word('PRERNA', 'प्रेरणा'),
  word('MILAN', 'मिलन'),
  word('SANGAM', 'संगम'),
  word('EKTA', 'एकता'),
  word('SETU', 'सेतु'),
  word('JYOTI', 'ज्योति'),
  word('CHAMAK', 'चमक'),
  word('MADHUR', 'मधुर'),
  word('SUNDAR', 'सुंदर'),
  word('NAVEEN', 'नवीन'),
  word('AMAR', 'अमर'),
]);

/** Latin → Devanagari, built once. Lets a stored code be rendered in Hindi. */
const DEVANAGARI_BY_LATIN: ReadonlyMap<string, string> = new Map(
  JOIN_WORDS.map((entry) => [entry.latin, entry.devanagari]),
);

/**
 * Renders a generated code in Devanagari — `SURAJ-KAMAL` → `सूरज-कमल`.
 *
 * Returns `null` for a custom code, because a community that named itself
 * `GUPTASAMAJ` has no Devanagari form we can derive without transliterating,
 * and a wrong transliteration on a poster is worse than none.
 */
export function toDevanagariCode(code: string): string | null {
  const parts = code.split('-');
  const rendered = parts.map((part) => DEVANAGARI_BY_LATIN.get(part));

  if (rendered.some((part) => part === undefined)) return null;
  return rendered.join('-');
}

/** Total distinct two-word codes. Surfaced so capacity is observable, not guessed. */
export const JOIN_WORD_PAIR_SPACE = JOIN_WORDS.length * (JOIN_WORDS.length - 1);
