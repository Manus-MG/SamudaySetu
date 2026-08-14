import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/hindi_date.dart';
import '../../../core/widgets/entrance.dart';
import '../domain/community_event.dart';
import 'widgets/sample_notice.dart';

/// Everything about one event, on one screen.
///
/// The layout is the real one — the same fields, in the same order, that a real
/// event will fill — because the point of a sample is to show what the finished
/// thing looks like. What is *not* real is stated at the top and again at the
/// action: the "मैं आ रहा हूँ" button is present and disabled rather than
/// absent, so the member can see the feature they are waiting for.
class EventDetailScreen extends StatelessWidget {
  const EventDetailScreen({required this.event, super.key});

  final CommunityEvent event;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);
    final now = DateTime.now();
    final isPast = event.isPast(now);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Text(event.kind.label, style: const TextStyle(fontSize: 18)),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppTheme.pagePadding),
          children: <Widget>[
            if (event.isSample) ...<Widget>[
              const SampleNotice(
                message: 'यह एक नमूना कार्यक्रम है — यह सच में नहीं हो रहा।',
              ),
              const SizedBox(height: 20),
            ],

            Entrance.staggered(
              index: 0,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Container(
                    height: 52,
                    width: 52,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.muted,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      event.kind.icon,
                      size: 26,
                      color: theme.colorScheme.foreground,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          event.title,
                          style: theme.textTheme.h3.copyWith(
                            height: AppTheme.devanagariLineHeight,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          isPast
                              ? 'यह कार्यक्रम हो चुका है'
                              : HindiDate.relativeDay(event.startsAt, now: now),
                          style: theme.textTheme.muted.copyWith(
                            height: AppTheme.devanagariLineHeight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            Entrance.staggered(
              index: 1,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: theme.colorScheme.muted,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: <Widget>[
                    _DetailRow(
                      icon: Icons.calendar_today_rounded,
                      label: 'तारीख़',
                      value: HindiDate.fullDate(event.startsAt),
                    ),
                    _DetailRow(
                      icon: Icons.schedule_rounded,
                      label: 'समय',
                      value: HindiDate.time(event.startsAt),
                    ),
                    _DetailRow(
                      icon: Icons.place_rounded,
                      label: 'जगह',
                      value: event.venue,
                    ),
                    _DetailRow(
                      icon: Icons.person_rounded,
                      label: 'आयोजक',
                      value: event.host,
                      isLast: true,
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            Entrance.staggered(
              index: 2,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'जानकारी',
                    style: theme.textTheme.large.copyWith(
                      height: AppTheme.devanagariLineHeight,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    event.details,
                    style: theme.textTheme.p.copyWith(
                      height: AppTheme.devanagariLineHeight,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Shown disabled rather than hidden. A greyed-out button with an
            // explanation under it tells the member what is coming; removing it
            // tells them nothing, and they have no way to ask.
            if (!isPast)
              Entrance.staggered(
                index: 3,
                child: Column(
                  children: <Widget>[
                    SizedBox(
                      width: double.infinity,
                      height: AppTheme.minTapTarget,
                      child: ShadButton(
                        onPressed: null,
                        child: const Text(
                          'मैं आ रहा हूँ',
                          style: TextStyle(fontSize: 16),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'यह बटन तब काम करेगा जब कार्यक्रम की सुविधा चालू होगी।',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.muted.copyWith(
                        height: AppTheme.devanagariLineHeight,
                      ),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 20),

            SizedBox(
              height: AppTheme.minTapTarget,
              child: ShadButton.ghost(
                // A deep-linked event has nothing to pop back to; send those
                // users to the list rather than leaving them on a dead end.
                onPressed: () => context.canPop()
                    ? context.pop()
                    : context.go(AppRoutes.communityEvents),
                child: const Text('सभी कार्यक्रम देखें'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
    this.isLast = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Padding(
      padding: EdgeInsets.only(bottom: isLast ? 0 : 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, size: 18, color: theme.colorScheme.mutedForeground),
          const SizedBox(width: 12),
          SizedBox(
            width: 68,
            child: Text(
              label,
              style: theme.textTheme.muted.copyWith(
                height: AppTheme.devanagariLineHeight,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: theme.textTheme.p.copyWith(
                height: AppTheme.devanagariLineHeight,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
