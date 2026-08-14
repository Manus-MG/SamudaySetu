import 'package:flutter/material.dart';

/// What kind of gathering this is.
///
/// Kept as a closed enum rather than a free-text label so the list stays
/// scannable: a member glancing at four rows recognises the icon before they
/// read the title, and a server that later invents a new kind cannot break the
/// layout by sending a twenty-character string.
enum EventKind {
  meeting('बैठक', Icons.groups_rounded),
  festival('उत्सव', Icons.celebration_rounded),
  camp('शिविर', Icons.medical_services_rounded),
  drive('अभियान', Icons.cleaning_services_rounded),
  training('प्रशिक्षण', Icons.school_rounded);

  const EventKind(this.label, this.icon);

  /// Hindi, shown on the badge.
  final String label;
  final IconData icon;
}

/// One community event.
///
/// Shaped the way the events API will return it, not the way the sample data
/// happens to be convenient, so that swapping the sample source for a real
/// repository later is a change of data source and nothing else. The one field
/// that will *not* come from the server is [isSample] — see its doc.
@immutable
class CommunityEvent {
  const CommunityEvent({
    required this.id,
    required this.title,
    required this.kind,
    required this.startsAt,
    required this.venue,
    required this.host,
    required this.summary,
    required this.details,
    this.isSample = false,
  });

  final String id;
  final String title;
  final EventKind kind;

  /// Local time. The backend will send an ISO-8601 instant; India has a single
  /// timezone and no daylight saving, so the conversion is lossless.
  final DateTime startsAt;

  final String venue;

  /// Who is organising — a person or a committee, as the member would say it.
  final String host;

  /// One line, for the list row.
  final String summary;

  /// The full text, for the detail screen.
  final String details;

  /// True when this row is illustrative rather than a real event.
  ///
  /// Carried on the model rather than assumed by the screen, so that when real
  /// events arrive alongside the samples nothing has to be rewritten — and so
  /// that no code path can accidentally render a sample without the banner that
  /// says so. Showing someone an invented health camp they might travel to is
  /// not a UI bug, it is a broken promise.
  final bool isSample;

  bool isPast(DateTime now) => startsAt.isBefore(now);
}
