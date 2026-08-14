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
        title: 'मासिक समाज बैठक',
        kind: EventKind.meeting,
        startsAt: at(2, 18, 0),
        venue: 'समाज भवन, वार्ड 4',
        host: 'प्रबंध समिति',
        summary: 'महीने का हिसाब और आगे की योजना।',
        details: 'हर महीने की तरह इस बार भी बैठक में पिछले महीने का हिसाब रखा '
            'जाएगा और आगे के कामों पर बात होगी। कोई सुझाव या शिकायत हो तो बैठक '
            'में रख सकते हैं। सभी सदस्य आमंत्रित हैं।',
        isSample: true,
      ),
      CommunityEvent(
        id: 'sample-health-camp',
        title: 'निःशुल्क स्वास्थ्य शिविर',
        kind: EventKind.camp,
        startsAt: at(6, 9, 0),
        venue: 'प्राथमिक विद्यालय परिसर',
        host: 'स्वास्थ्य समिति',
        summary: 'जाँच और दवाइयाँ — बिना किसी शुल्क के।',
        details: 'शहर के डॉक्टरों द्वारा शुगर, रक्तचाप और आँखों की जाँच की '
            'जाएगी। ज़रूरी दवाइयाँ मौके पर ही दी जाएँगी। आधार कार्ड साथ लाएँ। '
            'शिविर दोपहर 2 बजे तक चलेगा।',
        isSample: true,
      ),
      CommunityEvent(
        id: 'sample-festival',
        title: 'सांस्कृतिक कार्यक्रम और भोज',
        kind: EventKind.festival,
        startsAt: at(13, 19, 30),
        venue: 'मुख्य चौपाल',
        host: 'युवा मंडल',
        summary: 'बच्चों की प्रस्तुतियाँ, उसके बाद सामूहिक भोज।',
        details: 'शाम को बच्चों के गीत और नृत्य की प्रस्तुतियाँ होंगी, फिर '
            'सामूहिक भोज। परिवार सहित आएँ। जो सहयोग करना चाहें वे युवा मंडल से '
            'संपर्क करें।',
        isSample: true,
      ),
      CommunityEvent(
        id: 'sample-skill-training',
        title: 'सिलाई प्रशिक्षण — पहला दिन',
        kind: EventKind.training,
        startsAt: at(20, 11, 0),
        venue: 'सामुदायिक केंद्र, कमरा 2',
        host: 'महिला समिति',
        summary: 'दस दिन का निःशुल्क प्रशिक्षण, सीमित सीटें।',
        details: 'दस दिन के इस प्रशिक्षण में सिलाई की बुनियादी जानकारी दी '
            'जाएगी। मशीनें केंद्र पर उपलब्ध रहेंगी। नाम पहले से लिखवाना ज़रूरी '
            'है — सीटें सीमित हैं।',
        isSample: true,
      ),

      // One event in the past, so the screen can show what a finished event
      // looks like. A list that only ever grows forward hides half the design.
      CommunityEvent(
        id: 'sample-cleanliness-drive',
        title: 'स्वच्छता अभियान',
        kind: EventKind.drive,
        startsAt: at(-5, 7, 0),
        venue: 'मंदिर से बस स्टैंड तक',
        host: 'युवा मंडल',
        summary: 'सुबह दो घंटे की सफ़ाई — 40 सदस्य शामिल हुए।',
        details: 'मंदिर से बस स्टैंड तक की सड़क की सफ़ाई की गई। झाड़ू और थैले '
            'समिति की ओर से दिए गए थे। अगला अभियान अगले महीने रखा जाएगा।',
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
