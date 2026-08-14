import 'package:flutter/material.dart';

/// What belonging to a community will get you.
///
/// This enum is a *promise*, not a description of shipped behaviour, and the
/// distinction is the whole reason the file exists. A member who has just typed
/// a join code has no way to tell whether the app is finished or abandoned, and
/// the honest answer — "here is what is coming, and here is one of them you can
/// look at today" — is more convincing than either a blank screen or a home
/// page padded with fake counters.
///
/// Each entry therefore carries [status] explicitly. Nothing in the UI may
/// infer "this works" from the mere presence of a tile; it reads the status.
///
/// When a feature ships, exactly two things change here: its [status] becomes
/// [FeatureStatus.live] and its route starts pointing at the real screen. The
/// copy, the icon and the ordering are already written.
enum FeatureStatus {
  /// Built and usable against real data. Nothing is [live] yet.
  live,

  /// Not built, but there is something honest to show — sample content, clearly
  /// labelled as a sample.
  preview,

  /// Not built and nothing to show. The tile opens a screen that says so and
  /// explains what it will do.
  comingSoon,
}

enum CommunityFeature {
  events(
    slug: 'events',
    label: 'कार्यक्रम',
    tagline: 'बैठकें, उत्सव और शिविर — सब एक जगह।',
    icon: Icons.event_rounded,
    status: FeatureStatus.preview,
    promises: <String>[
      'आने वाले कार्यक्रमों की पूरी जानकारी — तारीख़, समय और जगह',
      'एक दबाव में बताएँ कि आप आ रहे हैं',
      'कार्यक्रम से पहले फ़ोन पर याद दिलाया जाएगा',
    ],
  ),

  chat(
    slug: 'chat',
    label: 'समुदाय चैट',
    tagline: 'अपने समुदाय के सदस्यों से सीधे बात करें।',
    icon: Icons.forum_rounded,
    status: FeatureStatus.comingSoon,
    promises: <String>[
      'पूरे समुदाय का एक साझा समूह',
      'फ़ोटो और आवाज़ का संदेश भी भेज सकेंगे',
      'नेता ज़रूरी संदेश सबसे ऊपर रख सकेंगे',
    ],
  ),

  announcements(
    slug: 'announcements',
    label: 'सूचनाएँ',
    tagline: 'नेता की घोषणाएँ सीधे आपके फ़ोन पर।',
    icon: Icons.campaign_rounded,
    status: FeatureStatus.comingSoon,
    promises: <String>[
      'ज़रूरी ख़बर छूटेगी नहीं',
      'पुरानी सूचनाएँ कभी भी दोबारा पढ़ें',
      'सूचना को परिवार और पड़ोसियों को आगे भेजें',
    ],
  ),

  directory(
    slug: 'directory',
    label: 'सदस्य सूची',
    tagline: 'अपने समुदाय के लोगों को खोजें।',
    icon: Icons.groups_rounded,
    status: FeatureStatus.comingSoon,
    promises: <String>[
      'नाम या गाँव से सदस्य खोजें',
      'ज़रूरत पड़ने पर सीधे फ़ोन मिलाएँ',
      'आप तय करेंगे कि आपका नंबर कौन देख सकता है',
    ],
  ),

  polls(
    slug: 'polls',
    label: 'राय और मतदान',
    tagline: 'समुदाय के फ़ैसलों में अपनी बात रखें।',
    icon: Icons.how_to_vote_rounded,
    status: FeatureStatus.comingSoon,
    promises: <String>[
      'सवाल पर एक दबाव में अपनी राय दें',
      'नतीजा सबको दिखेगा — कोई शक नहीं',
      'हर सदस्य की एक ही राय गिनी जाएगी',
    ],
  ),

  help(
    slug: 'help',
    label: 'सहायता और सेवा',
    tagline: 'ज़रूरत पड़ने पर समुदाय से मदद माँगें।',
    icon: Icons.volunteer_activism_rounded,
    status: FeatureStatus.comingSoon,
    promises: <String>[
      'मदद का अनुरोध पूरे समुदाय तक पहुँचेगा',
      'कौन मदद कर रहा है, यह साफ़ दिखेगा',
      'चाहें तो अनुरोध बिना नाम के भेजें',
    ],
  ),

  documents(
    slug: 'documents',
    label: 'दस्तावेज़',
    tagline: 'समुदाय के ज़रूरी कागज़ और फ़ॉर्म।',
    icon: Icons.folder_shared_rounded,
    status: FeatureStatus.comingSoon,
    promises: <String>[
      'योजनाओं के फ़ॉर्म और सूचनाएँ एक जगह',
      'बिना इंटरनेट के भी पढ़ने के लिए सहेजें',
      'दूसरों को सीधे भेजें',
    ],
  );

  const CommunityFeature({
    required this.slug,
    required this.label,
    required this.tagline,
    required this.icon,
    required this.status,
    required this.promises,
  });

  /// The URL segment. Stable and ASCII, because it ends up in a deep link that
  /// gets forwarded on WhatsApp — never derive it from [label].
  final String slug;

  /// Hindi, because it is shown to members and the app is Hindi-first.
  final String label;

  /// One line, under the title. Written as a benefit to the member, not as a
  /// description of a feature: "अपने समुदाय के लोगों को खोजें", not "सदस्य
  /// निर्देशिका मॉड्यूल".
  final String tagline;

  final IconData icon;
  final FeatureStatus status;

  /// Three concrete things the member will be able to do. Three is a deliberate
  /// cap: a list long enough to scroll reads as a roadmap nobody will finish.
  final List<String> promises;

  /// The features shown in the grid, in the order they appear.
  ///
  /// [events] is excluded because it gets its own full-width card above the
  /// grid — it is the only one with something real to look at, and levelling it
  /// with six placeholders would waste the one piece of evidence the app has.
  /// Backed by a top-level constant rather than declared inline: an enum's own
  /// members may not always reference its constants, and a getter over a `const`
  /// list allocates nothing on rebuild.
  static List<CommunityFeature> get grid => _gridFeatures;

  /// Resolves a deep-linked slug. Returns null rather than falling back to a
  /// default: a link to a feature this build does not know about should send
  /// the user somewhere sensible, not silently open an unrelated screen.
  static CommunityFeature? fromSlug(String? slug) {
    if (slug == null) return null;
    for (final feature in values) {
      if (feature.slug == slug) return feature;
    }
    return null;
  }

  /// The short chip on the tile. `null` once a feature is [FeatureStatus.live],
  /// so shipping one removes its badge without touching the widget.
  String? get statusLabel => switch (status) {
        FeatureStatus.live => null,
        FeatureStatus.preview => 'नमूना',
        FeatureStatus.comingSoon => 'जल्द',
      };
}

/// See [CommunityFeature.grid].
const List<CommunityFeature> _gridFeatures = <CommunityFeature>[
  CommunityFeature.chat,
  CommunityFeature.announcements,
  CommunityFeature.directory,
  CommunityFeature.polls,
  CommunityFeature.help,
  CommunityFeature.documents,
];
