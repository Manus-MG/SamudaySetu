import '../domain/community_event.dart';

/// The illustrative events shown until the events API exists.
///
/// Two rules govern this file, and both matter more than the copy:
///
///  1. **Every event is anchored to today.** Hard-coded dates rot — an app
///     demoed six months from now would show a "coming up" camp from last
///     winter, which reads as abandoned software. Offsets from `DateTime.now()`
///     mean the list is always plausible.
///  2. **Nothing here is presented as real.** Every row is built with
///     `isSample: true`, and the screens refuse to render a sample without the
///     banner that labels it. A member must never be able to mistake this for
///     something they could turn up to.
///
/// When the real API lands, this file is deleted and the provider that replaces
/// it returns the same [CommunityEvent] type. Nothing else changes.
abstract final class SampleEvents {
  /// Builds the sample set relative to [now], newest-first for past events and
  /// soonest-first for upcoming ones.
  ///
  /// [now] is injectable so a widget test can pin the clock; production callers
  /// pass nothing.
  static List<CommunityEvent> all({DateTime? now}) {
    final today = _startOfDay(now ?? DateTime.now());

    // India has no daylight saving, so adding a plain `Duration` to a local
    // midnight lands on the intended wall-clock time. This would need a
    // timezone-aware date library anywhere that shifts its clocks.
    DateTime at(int dayOffset, int hour, int minute) =>
        today.add(Duration(days: dayOffset, hours: hour, minutes: minute));

    return <CommunityEvent>[
      CommunityEvent(
        id: 'sample-monthly-meeting',
        title: 'मासिक कार्यकारिणी बैठक',
        kind: EventKind.meeting,
        startsAt: at(2, 18, 0),
        venue: 'संघ कार्यालय, टिम्बर मार्केट',
        host: 'कार्यकारिणी',
        summary: 'महीने का हिसाब, रेट पर चर्चा और आगे की योजना।',
        details: 'हर महीने की तरह इस बार भी बैठक में पिछले महीने का हिसाब रखा '
            'जाएगा, बाज़ार के रेट पर चर्चा होगी और आगे के कामों पर बात होगी। '
            'कोई सुझाव या शिकायत हो तो बैठक में रख सकते हैं। सभी सदस्य '
            'आमंत्रित हैं।',
        isSample: true,
      ),
      CommunityEvent(
        id: 'sample-measurement-camp',
        title: 'नाप-तौल जाँच शिविर',
        kind: EventKind.camp,
        startsAt: at(6, 9, 0),
        venue: 'मंडी परिसर, गेट नंबर 2',
        host: 'नाप-तौल समिति',
        summary: 'तराजू और माप की जाँच — बिना किसी शुल्क के।',
        details: 'विभाग के निरीक्षक मौके पर तराजू, फीता और घन फुट माप की जाँच '
            'करेंगे और प्रमाणपत्र जारी करेंगे। सदस्य अपने प्रतिष्ठान का पंजीयन '
            'नंबर साथ लाएँ। शिविर दोपहर 2 बजे तक चलेगा।',
        isSample: true,
      ),
      CommunityEvent(
        id: 'sample-annual-convention',
        title: 'वार्षिक अधिवेशन और सम्मान समारोह',
        kind: EventKind.festival,
        startsAt: at(13, 19, 30),
        venue: 'टाउन हॉल',
        host: 'संघ अध्यक्ष',
        summary: 'वर्ष का लेखा-जोखा, फिर सदस्यों का सम्मान और सहभोज।',
        details: 'अधिवेशन में वर्ष भर के कामकाज का ब्यौरा रखा जाएगा और नई '
            'कार्यकारिणी की घोषणा होगी। पुराने सदस्यों का सम्मान किया जाएगा, '
            'उसके बाद सहभोज। परिवार सहित आएँ।',
        isSample: true,
      ),
      CommunityEvent(
        id: 'sample-gst-training',
        title: 'जीएसटी और ई-वे बिल कार्यशाला',
        kind: EventKind.training,
        startsAt: at(20, 11, 0),
        venue: 'संघ कार्यालय, सभा कक्ष',
        host: 'कर सलाहकार समिति',
        summary: 'एक दिन की निःशुल्क कार्यशाला, सीमित सीटें।',
        details: 'कर सलाहकार लकड़ी और प्लाईवुड पर लागू दरें, ई-वे बिल भरने का '
            'तरीका और आम गलतियाँ समझाएँगे। लैपटॉप साथ ला सकते हैं। नाम पहले से '
            'लिखवाना ज़रूरी है — सीटें सीमित हैं।',
        isSample: true,
      ),

      // One event in the past, so the screen can show what a finished event
      // looks like. A list that only ever grows forward hides half the design.
      CommunityEvent(
        id: 'sample-plantation-drive',
        title: 'वृक्षारोपण अभियान',
        kind: EventKind.drive,
        startsAt: at(-5, 7, 0),
        venue: 'वन विभाग नर्सरी, बाईपास रोड',
        host: 'युवा व्यापारी मंच',
        summary: 'सुबह दो घंटे में 500 पौधे — 40 सदस्य शामिल हुए।',
        details: 'वन विभाग के सहयोग से सागौन और शीशम के पौधे लगाए गए। पौधे और '
            'औज़ार विभाग की ओर से दिए गए थे। अगला अभियान बरसात में रखा जाएगा।',
        isSample: true,
      ),
    ];
  }

  /// Resolves a deep-linked event id.
  ///
  /// Returns null when the id is unknown — the router turns that into the list
  /// screen rather than rendering a detail page with nothing in it.
  static CommunityEvent? byId(String? id, {DateTime? now}) {
    if (id == null || id.isEmpty) return null;
    for (final event in all(now: now)) {
      if (event.id == id) return event;
    }
    return null;
  }

  static DateTime _startOfDay(DateTime date) =>
      DateTime(date.year, date.month, date.day);
}
