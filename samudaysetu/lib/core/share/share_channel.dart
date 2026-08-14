import 'package:flutter/material.dart';

/// Every way an invite can leave the app.
///
/// Ordered by how little work the *recipient* has to do, which is the opposite
/// of how a leader tends to reach for them. Someone handed the code will read it
/// out loud; someone handed a WhatsApp message taps once. The UI renders this
/// list in declaration order, so the order is the recommendation.
enum ShareChannel {
  /// The OS share sheet. First because it is the only option that covers apps we
  /// have never heard of, and because on a phone where WhatsApp is not installed
  /// it is the one entry that still leads somewhere.
  system(
    label: 'सभी ऐप',
    hint: 'WhatsApp, SMS, ईमेल — जो भी फ़ोन में है',
    icon: Icons.ios_share_rounded,
  ),

  /// `wa.me` with the message pre-composed. Kept as its own button rather than
  /// left to the sheet: for this audience WhatsApp *is* messaging, and a green
  /// button they recognise beats a correct list they have to read.
  whatsApp(
    label: 'WhatsApp',
    hint: 'संदेश पहले से तैयार है',
    icon: Icons.chat_rounded,
    brandColor: Color(0xFF25D366),
  ),

  /// The QR as an image attachment. What a leader actually wants when the target
  /// is a WhatsApp group rather than one person — a picture survives forwarding,
  /// gets screenshotted, and can be held up on a phone at a meeting.
  qrImage(
    label: 'QR भेजें',
    hint: 'तस्वीर के रूप में',
    icon: Icons.qr_code_2_rounded,
  ),

  /// `sms:` with the body filled in. The fallback that works on a feature phone
  /// and on a handset with no data left in the month.
  sms(
    label: 'SMS',
    hint: 'बिना इंटरनेट वाले फ़ोन के लिए',
    icon: Icons.sms_rounded,
  ),

  /// `mailto:`. Rare on this audience's phones and free to offer.
  email(
    label: 'ईमेल',
    hint: null,
    icon: Icons.mail_rounded,
  ),

  /// The link alone, for pasting somewhere this app cannot reach.
  copyLink(
    label: 'लिंक कॉपी',
    hint: null,
    icon: Icons.link_rounded,
  ),

  /// The code alone. Last on the list because reading a code down a phone line
  /// is the worst of these paths, and first in a leader's instincts because it
  /// is the thing they were given.
  copyCode(
    label: 'कोड कॉपी',
    hint: null,
    icon: Icons.content_copy_rounded,
  );

  const ShareChannel({
    required this.label,
    required this.hint,
    required this.icon,
    this.brandColor,
  });

  /// Two words at most — this sits under a 56px icon tile on a 5" screen.
  final String label;

  /// One line of explanation, shown only in the list layout where there is room.
  final String? hint;

  final IconData icon;

  /// Set only where brand recognition does real work for someone who cannot read
  /// the label. Null means "use the theme", which is the default for a reason:
  /// a grid of seven branded colours is noise, not affordance.
  final Color? brandColor;

  /// Whether this channel needs a rendered QR to do anything.
  bool get requiresQr => this == ShareChannel.qrImage;
}
