import 'package:flutter/material.dart';

/// One dated entry in the association's history.
@immutable
class SamajMilestone {
  const SamajMilestone({
    required this.period,
    required this.title,
    required this.detail,
  });

  /// Displayed verbatim, not parsed. Several of these are approximate, and a
  /// `DateTime` would force a precision the association's own records may not
  /// have.
  final String period;

  final String title;
  final String detail;
}

/// One principle the association holds, as shown on the values grid.
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

/// Everything the app says about the association, as data.
///
/// **This branch is the timber-trade build, and this content is a placeholder,
/// not a record.** It was written to make the app demonstrable to a timber
/// merchants' association before that association has supplied anything: the
/// founding year, the office bearers, the milestones and the market towns below
/// are plausible for a north-Indian timber body and true of none in particular.
/// Every line is expected to be replaced with the association's own before this
/// is shown as fact — showing invented history to people who know the real
/// history is the fastest way to lose the room.
///
/// The class and file keep the names they had on `main` on purpose. This is a
/// re-skin branch, not a refactor: the screens under
/// `features/about/presentation/` read this file and hold no copy of their own,
/// so a correction stays a one-line edit here by anyone who can open a text
/// editor — no layout to understand, no widget to break, and no rename to
/// reconcile when a fix lands on `main`.
abstract final class SamajProfile {
  /// Heading over [nameMeaning] on the about screen.
  ///
  /// Lives here rather than in the widget because the Arkvanshi build had it
  /// inline ('अर्क का अर्थ') and it was the one string the re-brand nearly
  /// missed — a lineage heading sitting above timber-trade copy.
  static const String nameMeaningHeading = 'संघ क्या है';

  /// What the association is. The first thing a prospective member reads.
  static const String nameMeaning =
      'काष्ठ व्यापार संघ लकड़ी के व्यापारियों, आरा मिल संचालकों, प्लाईवुड और '
      'पैनल कारोबारियों का साझा मंच है। मंडी में अकेला व्यापारी न रेट पर बात कर '
      'पाता है, न नीति पर — संघ वही आवाज़ है जो सबकी तरफ़ से एक साथ उठती है।';

  /// Founding and standing. Replace with the association's own account.
  static const String origin =
      'संघ की स्थापना क्षेत्र के काष्ठ व्यापारियों ने मिलकर की, ताकि नाप-तौल, '
      'भुगतान और माल की गुणवत्ता को लेकर आपसी भरोसा बना रहे। आज यह मंडी के '
      'व्यापारियों, वन विभाग और खरीदारों के बीच की सीधी कड़ी है।';

  /// A note the app shows to the member, in the app's own voice.
  ///
  /// Present because claiming certainty the app does not have would be the
  /// fastest way to lose the room in front of people who run this trade.
  static const String sourceNote =
      'यह विवरण नमूने के तौर पर तैयार किया गया है। संघ के पदाधिकारियों से '
      'प्राप्त जानकारी के आधार पर इसे बदला और पूरा किया जाएगा।';

  /// Market towns the association's members trade in, shown as chips.
  static const List<String> regions = <String>[
    'गांधीधाम',
    'यमुनानगर',
    'नांगलोई',
    'कीर्ति नगर',
    'बरेली',
    'गोरखपुर',
    'लखनऊ',
  ];

  /// The history timeline, oldest first.
  static const List<SamajMilestone> milestones = <SamajMilestone>[
    SamajMilestone(
      period: 'स्थापना',
      title: 'मंडी के व्यापारियों की पहली बैठक',
      detail: 'नाप, भुगतान और उधार को लेकर आपसी नियम तय करने के लिए क्षेत्र के '
          'काष्ठ व्यापारी पहली बार एक मंच पर आए।',
    ),
    SamajMilestone(
      period: 'पंजीकरण',
      title: 'संघ का विधिवत गठन',
      detail: 'संस्था के रूप में पंजीकरण, कार्यकारिणी का चुनाव और सदस्यता '
          'नियमावली लागू।',
    ),
    SamajMilestone(
      period: 'आरा मिल नीति',
      title: 'वन विभाग के साथ संवाद',
      detail: 'आरा मिल लाइसेंस और परिवहन पास की प्रक्रिया पर विभाग के सामने '
          'व्यापारियों का साझा पक्ष रखा गया।',
    ),
    SamajMilestone(
      period: 'जीएसटी',
      title: 'कर बदलाव पर सदस्य प्रशिक्षण',
      detail: 'दरों और ई-वे बिल में बदलाव के समय सदस्यों के लिए कार्यशालाएँ, '
          'ताकि छोटा व्यापारी भी अनुपालन में पीछे न रहे।',
    ),
    SamajMilestone(
      period: 'गुणवत्ता',
      title: 'ग्रेडिंग पर साझा मानक',
      detail: 'सागौन, साल और आयातित लकड़ी की ग्रेडिंग पर सदस्यों के बीच एक जैसी '
          'भाषा — खरीदार के साथ विवाद घटाने के लिए।',
    ),
    SamajMilestone(
      period: 'आज',
      title: 'मंडी से बाज़ार तक',
      detail: 'सदस्य फर्मों की जानकारी, बैठक की सूचना और विभागीय परिपत्र अब एक '
          'ही जगह — यही ऐप उसी काम को आगे बढ़ाता है।',
    ),
  ];

  /// Principles, shown as a grid.
  static const List<SamajValue> values = <SamajValue>[
    SamajValue(
      icon: Icons.straighten_rounded,
      title: 'सही नाप',
      detail: 'घन फुट की गिनती पर कोई दो राय नहीं — यही व्यापार की नींव है।',
    ),
    SamajValue(
      icon: Icons.verified_rounded,
      title: 'माल की गुणवत्ता',
      detail: 'जो ग्रेड बताया, वही माल — ग्रेडिंग पर सदस्यों का साझा मानक।',
    ),
    SamajValue(
      icon: Icons.handshake_rounded,
      title: 'भुगतान का भरोसा',
      detail: 'तय समय पर लेन-देन, और विवाद हो तो संघ के भीतर समाधान।',
    ),
    SamajValue(
      icon: Icons.gavel_rounded,
      title: 'नियम का पालन',
      detail: 'लाइसेंस, परिवहन पास और कर — अनुपालन में कोई सदस्य पीछे न छूटे।',
    ),
    SamajValue(
      icon: Icons.forest_rounded,
      title: 'वन का सम्मान',
      detail: 'वैध स्रोत से लकड़ी, और अगली पीढ़ी के लिए बचा हुआ जंगल।',
    ),
    SamajValue(
      icon: Icons.groups_rounded,
      title: 'एक आवाज़',
      detail: 'नीति और रेट पर अकेला व्यापारी नहीं, पूरा संघ बात करता है।',
    ),
  ];

  /// What the association wants the app to make possible. Deliberately phrased
  /// as things a member can check later, not as sentiment.
  static const List<String> objectives = <String>[
    'सदस्य फर्मों की पहचान, पता और संपर्क एक जगह',
    'बैठक, कार्यशाला और वार्षिक अधिवेशन की सूचना हर सदस्य तक समय पर',
    'वन विभाग और कर विभाग के परिपत्र बिना देरी सदस्यों तक',
    'नाप, ग्रेडिंग और भुगतान के विवाद में संघ के भीतर सुनवाई',
    'नए सदस्यों के लिए लाइसेंस और अनुपालन की सही जानकारी',
    'खरीदार और आपूर्तिकर्ता के बीच सदस्यों का भरोसेमंद परिचय',
  ];
}
