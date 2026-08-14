import 'package:flutter/material.dart';

/// An ink-splashing tap target that clips to its child's own corner radius.
///
/// `InkWell` paints its splash on the nearest `Material` ancestor, which is
/// *behind* a `Container` with its own background — so a bare `InkWell` around
/// a decorated box produces a splash nobody can see. `Material` with a
/// transparent type puts the ink surface in front of the decoration instead.
///
/// Passing a null [onTap] returns the child untouched rather than rendering a
/// dead ink layer. That is what lets a caller show the same tile as a display-
/// only element — a feature a non-member cannot open yet — without a second
/// widget that duplicates the layout.
class AppTappable extends StatelessWidget {
  const AppTappable({
    required this.onTap,
    required this.borderRadius,
    required this.child,
    super.key,
  });

  final VoidCallback? onTap;
  final double borderRadius;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final VoidCallback? onTap = this.onTap;
    if (onTap == null) return child;

    return Stack(
      // `passthrough` forwards the incoming constraints to the decorated child.
      // Without it the child is laid out loose and a tile in a stretched row
      // stops short of the row's height, leaving a visible gap under the
      // shorter of the two.
      fit: StackFit.passthrough,
      children: <Widget>[
        child,
        Positioned.fill(
          child: Material(
            type: MaterialType.transparency,
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(borderRadius),
            ),
          ),
        ),
      ],
    );
  }
}
