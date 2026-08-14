import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:shadcn_ui/shadcn_ui.dart';

import '../../../core/deeplink/deep_link_service.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_theme.dart';

/// Joining by pointing the camera at the leader's QR.
///
/// The zero-typing path, and the one this audience succeeds at: reading a
/// two-word code off someone else's screen and retyping it is the step people
/// actually fail at, in bright sunlight, on a keyboard they are not fast with.
///
/// The QR encodes the ordinary `https://<host>/join/<code>` URL — the same one
/// that goes on posters and into WhatsApp — so a member whose phone camera app
/// already scans QRs never needs this screen at all. It exists for the ones whose
/// camera app does not, which on a ₹7,000 handset is most of them.
class ScanCodeScreen extends StatefulWidget {
  const ScanCodeScreen({super.key});

  @override
  State<ScanCodeScreen> createState() => _ScanCodeScreenState();
}

class _ScanCodeScreenState extends State<ScanCodeScreen> with WidgetsBindingObserver {
  /// `qrCode` only, and it is not a micro-optimisation: leaving every format on
  /// means the decoder runs barcode, Aztec and PDF417 passes on every frame,
  /// which on a low-end phone is the difference between a preview that tracks
  /// and one that stutters while the user holds their arm out.
  ///
  /// `noDuplicates` stops the same symbol firing on consecutive frames — the
  /// `_hasHandled` guard below is still needed for the first two frames, but
  /// without this the callback runs at frame rate for as long as the code is in
  /// view.
  final MobileScannerController _controller = MobileScannerController(
    formats: <BarcodeFormat>[BarcodeFormat.qrCode],
    detectionSpeed: DetectionSpeed.noDuplicates,
  );

  /// One scan per visit. Navigation is asynchronous, so without this a second
  /// detection lands while the first is still routing and pushes the join screen
  /// twice — leaving a back button that returns to a dead camera.
  bool _hasHandled = false;

  String? _unrecognised;

  @override
  void initState() {
    super.initState();
    // `MobileScanner` registers its own lifecycle observer *only* when it owns
    // the controller. Supplying one — which the torch button requires — makes
    // that our job instead. Skip this and the camera comes back dead after the
    // user switches to WhatsApp to look at the code and returns.
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Starting a camera we were never granted throws rather than prompting; the
    // permission flow belongs to the first `start()`, not to a resume.
    if (!_controller.value.hasCameraPermission) return;

    switch (state) {
      case AppLifecycleState.resumed:
        unawaited(_controller.start());
      case AppLifecycleState.inactive:
        unawaited(_controller.stop());
      // `paused` and `hidden` always follow `inactive`, and `detached` is
      // followed by `dispose`. Acting on them would stop an already-stopped
      // camera, which the plugin reports as an error.
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
      case AppLifecycleState.detached:
        return;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    // Returns a future in mobile_scanner 6; `dispose` cannot await, and the
    // camera is released either way.
    unawaited(_controller.dispose());
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_hasHandled) return;

    for (final barcode in capture.barcodes) {
      final raw = barcode.rawValue;
      if (raw == null || raw.isEmpty) continue;

      final uri = Uri.tryParse(raw);
      // The same parser the OS link stream uses, deliberately. A QR is just
      // another way for that URL to arrive, and two parsers would mean a link
      // that works when tapped and fails when scanned.
      final location = uri == null ? null : DeepLinkParser.toLocation(uri);

      if (location != null) {
        _hasHandled = true;
        // The detection stream can outlive this screen by a frame when the user
        // presses back mid-scan.
        if (!mounted) return;
        // `pushReplacement`, so the back button from the join screen returns to
        // wherever the user started rather than to the camera they have finished
        // with.
        context.pushReplacement(location);
        return;
      }
    }

    // A QR that is not ours — a UPI code, a WiFi code, a poster's website. Say
    // so and keep scanning rather than silently doing nothing, which reads as a
    // camera that has stopped working.
    if (_unrecognised == null && mounted) {
      setState(() => _unrecognised = 'यह QR समुदाय का नहीं लगता। दोबारा कोशिश करें।');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text('QR स्कैन करें', style: TextStyle(fontSize: 18)),
        actions: <Widget>[
          // Indoors, in a hall, at a meeting held after dark — which is when
          // most of these gatherings happen.
          ValueListenableBuilder<MobileScannerState>(
            valueListenable: _controller,
            builder: (context, state, _) => IconButton(
              tooltip: 'टॉर्च',
              onPressed: () => unawaited(_controller.toggleTorch()),
              icon: Icon(
                state.torchState == TorchState.on
                    ? Icons.flashlight_on_rounded
                    : Icons.flashlight_off_rounded,
                size: 26,
              ),
            ),
          ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          MobileScanner(controller: _controller, onDetect: _onDetect),
          const _ViewfinderFrame(),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(AppTheme.pagePadding),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Text(
                      _unrecognised ?? 'नेता के फ़ोन पर दिख रहे QR के सामने कैमरा रखें।',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.p.copyWith(
                        height: AppTheme.devanagariLineHeight,
                        color: _unrecognised == null ? Colors.white : theme.colorScheme.destructive,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Always present, never conditional on an error state. If the
                    // camera is refused, unavailable or simply will not focus,
                    // this is the way out — and the user should not have to
                    // discover that by pressing back.
                    SizedBox(
                      height: AppTheme.minTapTarget,
                      width: double.infinity,
                      child: FilledButton.tonal(
                        onPressed: () => context.pushReplacement(AppRoutes.joinCommunity),
                        child: const Text('कोड हाथ से डालें', style: TextStyle(fontSize: 16)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A square cut out of a dimmed overlay, telling the user where to aim.
///
/// Purely presentational — the decoder reads the whole frame, and constraining
/// it to this rectangle would make an off-centre code fail for no reason.
class _ViewfinderFrame extends StatelessWidget {
  const _ViewfinderFrame();

  @override
  Widget build(BuildContext context) {
    final theme = ShadTheme.of(context);

    return IgnorePointer(
      child: Center(
        child: Container(
          height: 250,
          width: 250,
          decoration: BoxDecoration(
            border: Border.all(color: theme.colorScheme.primary, width: 3),
            borderRadius: BorderRadius.circular(AppTheme.radiusLg),
          ),
        ),
      ),
    );
  }
}
