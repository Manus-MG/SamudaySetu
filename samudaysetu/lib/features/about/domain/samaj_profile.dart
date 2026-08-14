import 'package:flutter/material.dart';

/// One dated entry in the samaj's history.
@immutable
class SamajMilestone {
  const SamajMilestone({
    required this.period,
    required this.title,
    required this.detail,
  });

  /// Displayed verbatim, not parsed. Several of these are approximate or
  /// disputed ("लगभग 918 ई.", "14वीं सदी"), and a `DateTime` would force a
  /// precision the sources do not have.
  final String period;

  final String title;
  final String detail;
}

/// One value the samaj holds, as shown on the values grid.
@immutable
class SamajValue {
  const SamajValue({
    required this.icon,
    required this.title,
    required this.detail,
  });

  final IconData icon;
  final String title;
  final String detail;
}

/// Everything the app says about the Arkvanshi samaj, as data.
///
/// **This content is a draft, not an authority.** It was assembled from public
/// community writing — `arkvanshikshatriya.blogspot.com`,
/// `omkararkvanshikshatriya.blogspot.com` and the Wikipedia article on Sandila
/// — and not from the samaj itself. Oral lineage history is contested by nature:
/// dates shift by centuries between tellings, and which figures belong to the
/// vansh is exactly the kind of claim a samaj is entitled to settle for itself.
/// Every line below is expected to be corrected by the samaj's own elders
/// before this is shown as fact.
///
/// That is the reason this file exists at all. The screens under
/// `features/about/presentation/` read it and hold no copy of their own, so a
/// correction is a one-line edit here by anyone who can open a text editor —
/// no layout to understand, no widget to break.
abstract final class SamajProfile {
  /// What the name means. The single most-repeated point across every source,
  /// and the one that earns the app its saffron palette.
  static const String nameMeaning =
      'अर्क का अर्थ ही सूर्य है। अर्कवंश सूर्यवंश की कोई शाखा नहीं, बल्कि उसी का '
      'पर्यायवाची नाम है — उन सूर्यवंशी क्षत्रियों का नाम जिन्होंने सूर्य के '
      'पर्याय "अर्क" से अपनी पहचान बनाई। समय के साथ यही नाम अर्कवंशी से अर्क, '
      'अरक और अरख तक बोला जाता रहा।';

  /// Origin and lineage.
  static const String origin =
      'परंपरा के अनुसार अर्कवंशी क्षत्रिय भगवान श्री राम के पुत्र कुश की परंपरा '
      'से चले आते हैं। सूर्य इस वंश के कुलदेवता हैं और समाज सदियों से सूर्य का '
      'उपासक रहा है। अवध और उसके आसपास के क्षेत्रों में इस वंश के राजाओं ने लंबे '
      'समय तक शासन किया।';

  /// A note the app shows to the member, in the app's own voice.
  ///
  /// Present because claiming certainty the sources do not have would be the
  /// fastest way to lose the room in front of people who know this history
  /// better than any website does.
  static const String sourceNote =
      'यह विवरण सार्वजनिक रूप से उपलब्ध सामग्री से तैयार किया गया है। समाज के '
      'वरिष्ठजनों के सुझाव पर इसे सुधारा और बढ़ाया जाएगा।';

  /// Regions historically associated with the vansh, shown as chips.
  static const List<String> regions = <String>[
    'सांडीला',
    'मलिहाबाद',
    'खागा',
    'फतेहपुर',
    'कानपुर',
    'प्रयागराज',
    'बहराइच',
  ];

  /// The history timeline, oldest first.
  static const List<SamajMilestone> milestones = <SamajMilestone>[
    SamajMilestone(
      period: 'प्राचीन काल',
      title: 'सूर्यवंश की परंपरा',
      detail: 'श्री राम के पुत्र कुश की परंपरा से चली आ रही क्षत्रिय वंशावली, '
          'जिसमें सूर्य को कुलदेवता माना गया।',
    ),
    SamajMilestone(
      period: 'महाराजा खंगारसेन',
      title: 'खागा नगर की स्थापना',
      detail: 'खागा नगर बसाया और दशाश्वमेध यज्ञ कराया — यह यज्ञ बिना पशुबलि के, '
          'शाकाहारी विधि से संपन्न हुआ।',
    ),
    SamajMilestone(
      period: 'लगभग 918 ई.',
      title: 'महाराजा तिलोकचंद्र',
      detail: 'लगभग चौवन वर्ष का शासन। इंद्रप्रस्थ तक अपने राज्य का विस्तार '
          'करने का उल्लेख मिलता है।',
    ),
    SamajMilestone(
      period: '1034 ई.',
      title: 'महाराजा सुहेलदेव',
      detail: 'बहराइच के युद्ध में विशाल आक्रमणकारी सेना को पराजित किया — अवध '
          'की रक्षा की सबसे बड़ी स्मृतियों में एक।',
    ),
    SamajMilestone(
      period: 'मध्यकाल',
      title: 'सांडीला और मलिहाबाद',
      detail: 'महाराजा सल्हीय सिंह ने सांडीला और महाराजा मल्हीय सिंह ने '
          'मलिहाबाद बसाया — दोनों नगर आज भी उन्हीं नामों से जाने जाते हैं।',
    ),
    SamajMilestone(
      period: '14वीं सदी',
      title: 'सांडीला का संघर्ष',
      detail: 'चौदहवीं सदी के अंतिम दौर तक सांडीला पर अर्कवंशी शासन रहा। उस '
          'शासन के अवशेष क्षेत्र के प्राचीन गढ़ों में आज भी दिखाई देते हैं।',
    ),
  ];

  /// Values, shown as a grid.
  static const List<SamajValue> values = <SamajValue>[
    SamajValue(
      icon: Icons.wb_sunny_rounded,
      title: 'सूर्य उपासना',
      detail: 'कुलदेवता सूर्य — तेज, अनुशासन और नियमितता का प्रतीक।',
    ),
    SamajValue(
      icon: Icons.shield_rounded,
      title: 'क्षात्र धर्म',
      detail: 'अपने लोगों की रक्षा और दिए हुए वचन पर टिके रहना।',
    ),
    SamajValue(
      icon: Icons.spa_rounded,
      title: 'अहिंसा',
      detail: 'यज्ञ बिना पशुबलि के — शक्ति के साथ संयम की परंपरा।',
    ),
    SamajValue(
      icon: Icons.menu_book_rounded,
      title: 'शिक्षा',
      detail: 'हर पीढ़ी पिछली से आगे पढ़े — समाज की सबसे बड़ी पूँजी।',
    ),
    SamajValue(
      icon: Icons.handshake_rounded,
      title: 'एकता',
      detail: 'गाँव और शहर में बिखरे परिवार, एक ही वंश की डोर से जुड़े।',
    ),
    SamajValue(
      icon: Icons.volunteer_activism_rounded,
      title: 'सेवा',
      detail: 'जरूरत के समय समाज का साथ — यही समाज होने का अर्थ है।',
    ),
  ];

  /// What the samaj wants the app to make possible. Deliberately phrased as
  /// things a member can check later, not as sentiment.
  static const List<String> objectives = <String>[
    'समाज के सभी परिवारों की एक जगह पहचान और संपर्क',
    'कार्यक्रम, बैठक और उत्सव की सूचना हर सदस्य तक समय पर',
    'युवाओं के लिए शिक्षा और रोजगार की जानकारी साझा करना',
    'विवाह और पारिवारिक संबंधों में समाज के भीतर सही जानकारी',
    'वंश का इतिहास और परंपरा अगली पीढ़ी तक सुरक्षित पहुँचाना',
    'जरूरतमंद परिवारों तक समाज की सहायता पहुँचाना',
  ];
}
