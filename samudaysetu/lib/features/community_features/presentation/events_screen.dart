import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/media/app_images.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_palette.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/hindi_date.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/widgets/entrance.dart';
import '../data/sample_events.dart';
import '../domain/community_event.dart';
import 'widgets/sample_notice.dart';

/// The community's events, split into what is coming and what has happened.
///
/// Every row here is a sample, and the banner at the top says so. That is the
/// deal this screen makes: it shows the real layout, the real information
/// architecture and the real interactions, with content that is openly
/// invented — rather than an empty state that teaches the member nothing about
/// what the feature will be.
///
/// The data source is [SampleEvents] today and will be a repository tomorrow.
/// Nothing below reads from it more than once, and nothing below assumes the
/// list is static, so that swap is a one-line change plus an `AsyncView`.
class EventsScreen extends StatelessWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    // Read the clock once. Calling `DateTime.now()` per row would let a build
    // that straddles midnight sort one event into both sections.
    final now = DateTime.now();
    final events = SampleEvents.all(now: now);

    final upcoming = <CommunityEvent>[];
    final past = <CommunityEvent>[];
    for (final event in events) {
      (event.isPast(now) ? past : upcoming).add(event);
    }

    upcoming.sort((a, b) => a.startsAt.compareTo(b.startsAt));
    // Past events run newest-first: the one that just happened is the one
    // somebody is looking for.
    past.sort((a, b) => b.startsAt.compareTo(a.startsAt));

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text('कार्यक्रम', style: TextStyle(fontSize: 18)),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppTheme.pagePadding),
          children: <Widget>[
            const SampleNotice(
              message: 'ये कार्यक्रम सिर्फ़ नमूने हैं — असली नहीं। यह सुविधा '
                  'चालू होने पर यहाँ आपके समुदाय के असली कार्यक्रम दिखेंगे।',
            ),
            const SizedBox(height: 22),

            if (upcoming.isNotEmpty) ...<Widget>[
              _SectionTitle(title: 'आने वाले कार्यक्रम', count: upcoming.length),
              const SizedBox(height: 12),
              for (final (index, event) in upcoming.indexed)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Entrance.staggered(
                    index: index,
                    child: _EventCard(event: event, now: now),
                  ),
                ),
            ],

            if (past.isNotEmpty) ...<Widget>[
              const SizedBox(height: 12),
              _SectionTitle(title: 'बीत चुके कार्यक्रम', count: past.length),
              const SizedBox(height: 12),
              for (final event in past)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _EventCard(event: event, now: now, isPast: true),
                ),
            ],

            const SizedBox(height: 8),
            Text(
              'जब यह सुविधा चालू होगी, आपके समुदाय के नेता यहीं कार्यक्रम '
              'जोड़ेंगे और आपको सूचना मिल जाएगी।',
              textAlign: TextAlign.center,
              style: theme.textTheme.muted.copyWith(
                height: AppTheme.devanagariLineHeight,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.count});

  final String title;
  final int count;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Row(
      children: <Widget>[
        Text(
          title,
          style: theme.textTheme.large.copyWith(
            height: AppTheme.devanagariLineHeight,
          ),
        ),
        const SizedBox(width: 8),
        Text('($count)', style: theme.textTheme.muted),
      ],
    );
  }
}

/// One row in the list.
///
/// The date block on the left is the thing people scan for, so it gets the
/// strongest position and does not wrap. Everything else can ellipsise.
class _EventCard extends StatelessWidget {
  const _EventCard({
    required this.event,
    required this.now,
    this.isPast = false,
  });

  final CommunityEvent event;
  final DateTime now;
  final bool isPast;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    // Past events are dimmed rather than hidden or greyed to unreadability:
    // still legible, clearly secondary.
    final foreground = isPast
        ? theme.colorScheme.mutedForeground
        : theme.colorScheme.foreground;

    return Material(
      // `Material` rather than a bare `Container` so the tap splash paints in
      // front of the decoration instead of behind it.
      color: theme.colorScheme.muted,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: () => context.push(AppRoutes.communityEvent(event.id)),
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              // A cover per row rather than a hero per screen: the list is what
              // a member actually scrolls, and a wall of text rows is the thing
              // they scroll past. Small on purpose — at 76dp the CDN is asked
              // for a ~228px image, which is a few kilobytes each.
              //
              // The date is printed *on* the cover rather than in a tile beside
              // it. Measured on a 360dp phone, a date tile and a cover together
              // leave the title about 128dp — roughly six Devanagari
              // characters before it wraps. Combining them gives back 66dp.
              _EventCover(
                kind: event.kind,
                date: event.startsAt,
                isPast: isPast,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Icon(
                          event.kind.icon,
                          size: 15,
                          color: theme.colorScheme.mutedForeground,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          event.kind.label,
                          style: theme.textTheme.muted.copyWith(fontSize: 12),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            HindiDate.relativeDay(event.startsAt, now: now),
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.muted.copyWith(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      event.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.large.copyWith(
                        height: AppTheme.devanagariLineHeight,
                        color: foreground,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      event.summary,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.muted.copyWith(
                        height: AppTheme.devanagariLineHeight,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: <Widget>[
                        Icon(
                          Icons.place_rounded,
                          size: 15,
                          color: theme.colorScheme.mutedForeground,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            '${event.venue} · ${HindiDate.time(event.startsAt)}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.muted.copyWith(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The day and month, stacked. Fixed width so every card's text starts on the
/// same vertical line — a ragged left edge is what makes a list feel unbuilt.
/// The square cover on an events row, with the date over it.
///
/// Fading a past event rather than desaturating it is deliberate: a
/// `ColorFiltered` grayscale would be a `saveLayer` per row on a device that
/// cannot spare them, while an opacity is free to the compositor and reads the
/// same — "this one is over".
class _EventCover extends StatelessWidget {
  const _EventCover({
    required this.kind,
    required this.date,
    required this.isPast,
  });

  final EventKind kind;
  final DateTime date;
  final bool isPast;

  static const double _size = 76;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Opacity(
      opacity: isPast ? 0.55 : 1,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        child: SizedBox.square(
          dimension: _size,
          child: DecoratedBox(
            decoration: BoxDecoration(color: theme.colorScheme.background),
            child: Stack(
              fit: StackFit.expand,
              children: <Widget>[
                AppNetworkImage(image: AppImages.eventCover(kind.name)),

                // The scrim is not optional here. The date is white, the photo
                // underneath is whatever a stranger uploaded, and half of these
                // covers are bright sky.
                const DecoratedBox(
                  decoration: BoxDecoration(gradient: AppSurfaces.imageScrim),
                ),

                Align(
                  alignment: Alignment.bottomCenter,
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        Text(
                          '${date.day}',
                          style: theme.textTheme.large.copyWith(
                            height: 1.05,
                            fontWeight: FontWeight.w700,
                            color: AppPalette.white,
                          ),
                        ),
                        Text(
                          HindiDate.month(date),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.small.copyWith(
                            fontSize: 11,
                            height: 1.1,
                            color: AppPalette.white.withValues(alpha: 0.92),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

