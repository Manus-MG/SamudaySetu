import 'dart:math' as math;

import 'package:flutter/widgets.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../theme/app_palette.dart';

/// What an illustration depicts.
///
/// A closed set, not a free-form path parameter. Every motif here answers a
/// question the app actually asks a member ("what is a community?", "why is
/// this list empty?"), and keeping the set closed is what stops the app
/// accumulating twelve near-identical drawings of people.
enum IllustrationMotif {
  /// Overlapping rings — people gathered. Belonging, membership.
  community,

  /// A node tree. Hierarchy, structure, "my organisation".
  network,

  /// A shield with a check. Privacy, safety, verification.
  shield,

  /// Concentric arcs radiating from a point. Events, announcements, reach.
  gathering,

  /// An envelope with a badge. Invitations, share kits.
  invite,

  /// An open container with faint rows. Nothing here yet — but nothing broken.
  empty,

  /// A cloud, struck through. No connection.
  offline,
}

/// How an illustration is coloured.
enum IllustrationTone {
  /// Brand strokes on a soft wash. The default, for page backgrounds.
  soft,

  /// Light strokes, for drawing on top of the brand gradient or a photo.
  onBrand,

  /// Low-contrast neutral, for the placeholder that sits under a loading image
  /// where it must not compete with the photo that replaces it.
  quiet,
}

/// A vector illustration, drawn at paint time.
///
/// This is the app's answer to "the screens look empty" for everything that is
/// not a photograph. It ships no bytes, downloads nothing, decodes nothing, and
/// is sharp at every pixel density — which on a 2 GB phone over 2G is worth
/// more than any raster could be. It is also the guaranteed fallback beneath
/// every network image (see `AppNetworkImage`), so no screen in the app is ever
/// a blank rectangle waiting on a request that may never complete.
///
/// Purely decorative, so it is excluded from the semantics tree: a screen
/// reader announcing "drawing of overlapping circles" helps nobody. Screens
/// carry the meaning in their text.
class AppIllustration extends StatelessWidget {
  const AppIllustration({
    required this.motif,
    this.size,
    this.tone = IllustrationTone.soft,
    super.key,
  });

  final IllustrationMotif motif;

  /// Side length. Null means "fill the parent", which is what the image
  /// placeholder wants; a number is what a fixed hero slot wants.
  final double? size;

  final IllustrationTone tone;

  @override
  Widget build(BuildContext context) {
    final colors = ShadTheme.of(context).colorScheme;

    final (Color wash, Color line, Color accent) = switch (tone) {
      IllustrationTone.soft => (
          colors.primary.withValues(alpha: 0.10),
          colors.primary,
          colors.foreground.withValues(alpha: 0.55),
        ),
      IllustrationTone.onBrand => (
          AppPalette.white.withValues(alpha: 0.12),
          AppPalette.white.withValues(alpha: 0.92),
          AppPalette.teak200,
        ),
      IllustrationTone.quiet => (
          colors.muted,
          colors.mutedForeground.withValues(alpha: 0.45),
          colors.mutedForeground.withValues(alpha: 0.28),
        ),
    };

    // The painter never rebuilds on its own, but the widget above it might —
    // the boundary keeps a parent's rebuild from repainting this subtree.
    return ExcludeSemantics(
      child: RepaintBoundary(
        child: CustomPaint(
          size: size == null ? Size.infinite : Size.square(size!),
          painter: _MotifPainter(
            motif: motif,
            wash: wash,
            line: line,
            accent: accent,
          ),
        ),
      ),
    );
  }
}

/// Draws every motif in a normalised 100x100 box, centred and scaled to the
/// shortest side of whatever it is given.
///
/// One painter with a switch rather than seven painter classes: the shared
/// setup — the wash, the stroke style, the coordinate mapping — is most of the
/// code, and seven copies of it is seven places for the stroke weights to
/// drift apart.
class _MotifPainter extends CustomPainter {
  const _MotifPainter({
    required this.motif,
    required this.wash,
    required this.line,
    required this.accent,
  });

  final IllustrationMotif motif;
  final Color wash;
  final Color line;
  final Color accent;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;

    final double s = size.shortestSide;
    final Offset origin = Offset(
      (size.width - s) / 2,
      (size.height - s) / 2,
    );

    /// Normalised point (0..100) to canvas offset.
    Offset p(double x, double y) => origin + Offset(x / 100 * s, y / 100 * s);

    /// Normalised length to canvas length.
    double u(double v) => v / 100 * s;

    _paintWash(canvas, p(50, 50), u(50));

    final Paint stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = math.max(1.5, u(4.5))
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = line
      ..isAntiAlias = true;

    final Paint fill = Paint()
      ..style = PaintingStyle.fill
      ..color = accent
      ..isAntiAlias = true;

    switch (motif) {
      case IllustrationMotif.community:
        _paintCommunity(canvas, p, u, stroke, fill);
      case IllustrationMotif.network:
        _paintNetwork(canvas, p, u, stroke, fill);
      case IllustrationMotif.shield:
        _paintShield(canvas, p, stroke, fill);
      case IllustrationMotif.gathering:
        _paintGathering(canvas, p, u, stroke, fill);
      case IllustrationMotif.invite:
        _paintInvite(canvas, p, u, stroke, fill);
      case IllustrationMotif.empty:
        _paintEmpty(canvas, p, u, stroke, fill);
      case IllustrationMotif.offline:
        _paintOffline(canvas, p, u, stroke, fill);
    }
  }

  /// The soft halo every motif sits on. Does most of the work of making a
  /// line drawing look designed rather than clip-art.
  void _paintWash(Canvas canvas, Offset centre, double radius) {
    final Rect rect = Rect.fromCircle(center: centre, radius: radius);
    canvas.drawCircle(
      centre,
      radius,
      Paint()
        ..isAntiAlias = true
        ..shader = RadialGradient(
          colors: <Color>[wash, wash.withValues(alpha: 0)],
          stops: const <double>[0.45, 1],
        ).createShader(rect),
    );
  }

  void _paintCommunity(
    Canvas canvas,
    Offset Function(double, double) p,
    double Function(double) u,
    Paint stroke,
    Paint fill,
  ) {
    const List<(double, double)> centres = <(double, double)>[
      (34, 40),
      (66, 40),
      (50, 68),
    ];
    for (final (double x, double y) in centres) {
      canvas.drawCircle(p(x, y), u(17), stroke);
      canvas.drawCircle(p(x, y), u(5.5), fill);
    }
  }

  void _paintNetwork(
    Canvas canvas,
    Offset Function(double, double) p,
    double Function(double) u,
    Paint stroke,
    Paint fill,
  ) {
    const List<((double, double), (double, double))> edges =
        <((double, double), (double, double))>[
      ((50, 22), (24, 54)),
      ((50, 22), (50, 54)),
      ((50, 22), (76, 54)),
      ((24, 54), (16, 82)),
      ((24, 54), (32, 82)),
      ((76, 54), (68, 82)),
      ((76, 54), (84, 82)),
    ];
    for (final ((double ax, double ay), (double bx, double by)) in edges) {
      canvas.drawLine(p(ax, ay), p(bx, by), stroke);
    }

    canvas.drawCircle(p(50, 22), u(9), Paint()..color = stroke.color);
    for (final (double x, double y) in <(double, double)>[
      (24, 54),
      (50, 54),
      (76, 54),
    ]) {
      canvas.drawCircle(p(x, y), u(6.5), fill);
    }
    for (final (double x, double y) in <(double, double)>[
      (16, 82),
      (32, 82),
      (68, 82),
      (84, 82),
    ]) {
      canvas.drawCircle(p(x, y), u(4), fill);
    }
  }

  void _paintShield(
    Canvas canvas,
    Offset Function(double, double) p,
    Paint stroke,
    Paint fill,
  ) {
    final Path shield = Path()
      ..moveTo(p(50, 14).dx, p(50, 14).dy)
      ..lineTo(p(82, 27).dx, p(82, 27).dy)
      ..lineTo(p(82, 50).dx, p(82, 50).dy)
      ..quadraticBezierTo(
        p(82, 74).dx,
        p(82, 74).dy,
        p(50, 88).dx,
        p(50, 88).dy,
      )
      ..quadraticBezierTo(
        p(18, 74).dx,
        p(18, 74).dy,
        p(18, 50).dx,
        p(18, 50).dy,
      )
      ..lineTo(p(18, 27).dx, p(18, 27).dy)
      ..close();
    canvas.drawPath(shield, stroke);

    final Path check = Path()
      ..moveTo(p(36, 50).dx, p(36, 50).dy)
      ..lineTo(p(46, 60).dx, p(46, 60).dy)
      ..lineTo(p(66, 39).dx, p(66, 39).dy);
    canvas.drawPath(
      check,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke.strokeWidth
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..isAntiAlias = true
        ..color = fill.color,
    );
  }

  void _paintGathering(
    Canvas canvas,
    Offset Function(double, double) p,
    double Function(double) u,
    Paint stroke,
    Paint fill,
  ) {
    // Ripples spreading from a point: the shape of news reaching a community.
    // Outermost radius stays under 46 so the stroke clears the 100-unit box —
    // at 50 the arc lands exactly on the edge and the round cap is clipped.
    for (final (double radius, double alpha) in <(double, double)>[
      (20, 1),
      (33, 0.65),
      (46, 0.35),
    ]) {
      canvas.drawArc(
        Rect.fromCircle(center: p(50, 80), radius: u(radius)),
        math.pi,
        math.pi,
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = stroke.strokeWidth
          ..strokeCap = StrokeCap.round
          ..isAntiAlias = true
          ..color = stroke.color.withValues(alpha: alpha),
      );
    }
    canvas.drawCircle(p(50, 80), u(6.5), fill);
    for (final (double x, double y) in <(double, double)>[
      (28, 34),
      (50, 24),
      (72, 34),
    ]) {
      canvas.drawCircle(p(x, y), u(4), fill);
    }
  }

  void _paintInvite(
    Canvas canvas,
    Offset Function(double, double) p,
    double Function(double) u,
    Paint stroke,
    Paint fill,
  ) {
    final RRect body = RRect.fromRectAndRadius(
      Rect.fromPoints(p(16, 34), p(84, 76)),
      Radius.circular(u(7)),
    );
    canvas.drawRRect(body, stroke);

    final Path flap = Path()
      ..moveTo(p(16, 34).dx, p(16, 34).dy)
      ..lineTo(p(50, 58).dx, p(50, 58).dy)
      ..lineTo(p(84, 34).dx, p(84, 34).dy);
    canvas.drawPath(flap, stroke);

    // The badge that says the invite is live rather than a drawing of an
    // envelope: it is the one warm accent in the motif, so the eye finds it.
    canvas.drawCircle(p(80, 30), u(10), fill);
  }

  void _paintEmpty(
    Canvas canvas,
    Offset Function(double, double) p,
    double Function(double) u,
    Paint stroke,
    Paint fill,
  ) {
    final RRect card = RRect.fromRectAndRadius(
      Rect.fromPoints(p(16, 32), p(84, 82)),
      Radius.circular(u(9)),
    );
    canvas.drawRRect(card, stroke);

    // Two placeholder rows — an avatar and a name. The shape of the list that
    // *will* be here, which is the message: nothing yet, nothing broken.
    final Paint row = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = u(4)
      ..strokeCap = StrokeCap.round
      ..isAntiAlias = true
      ..color = fill.color.withValues(alpha: 0.55);

    for (final (double y, double right) in <(double, double)>[
      (48, 72),
      (66, 64),
    ]) {
      canvas.drawCircle(p(31, y), u(6.5), fill);
      canvas.drawLine(p(45, y), p(right, y), row);
    }
  }

  void _paintOffline(
    Canvas canvas,
    Offset Function(double, double) p,
    double Function(double) u,
    Paint stroke,
    Paint fill,
  ) {
    final Path cloud = Path()
      ..moveTo(p(30, 66).dx, p(30, 66).dy)
      ..arcToPoint(p(38, 44), radius: Radius.circular(u(13)), clockwise: true)
      ..arcToPoint(p(64, 40), radius: Radius.circular(u(15)), clockwise: true)
      ..arcToPoint(p(74, 66), radius: Radius.circular(u(14)), clockwise: true)
      ..close();
    canvas.drawPath(cloud, stroke);

    canvas.drawLine(
      p(26, 80),
      p(78, 28),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke.strokeWidth * 1.15
        ..strokeCap = StrokeCap.round
        ..isAntiAlias = true
        ..color = fill.color,
    );
  }

  @override
  bool shouldRepaint(_MotifPainter old) =>
      old.motif != motif ||
      old.wash != wash ||
      old.line != line ||
      old.accent != accent;
}
