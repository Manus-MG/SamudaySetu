import 'package:flutter_test/flutter_test.dart';
import 'package:samudaysetu/core/config/app_config.dart';
import 'package:samudaysetu/core/deeplink/deep_link_service.dart';

/// [DeepLinkParser] is the seam every external entry point funnels through — a
/// tapped WhatsApp link, the web landing page's button, and a scanned QR all end
/// up here. It is also the one piece that cannot be exercised by opening the app
/// and clicking, which is exactly why it is worth a test.
void main() {
  final String host = AppConfig.linkHost;
  final String scheme = AppConfig.deepLinkScheme;

  Uri uri(String value) => Uri.parse(value);

  group('DeepLinkParser.toLocation', () {
    group('accepts', () {
      test('a verified https join link', () {
        expect(
          DeepLinkParser.toLocation(uri('https://$host/join/SURAJ-KAMAL')),
          '/join/SURAJ-KAMAL',
        );
      });

      test('a verified https invite link', () {
        expect(
          DeepLinkParser.toLocation(uri('https://$host/invite/abc123')),
          '/invite/abc123',
        );
      });

      test('the custom scheme with a query parameter, as the backend composes it', () {
        expect(
          DeepLinkParser.toLocation(uri('$scheme://join?code=SURAJ-KAMAL')),
          '/join/SURAJ-KAMAL',
        );
      });

      test('the custom scheme with the value in the path, as people write it by hand', () {
        expect(
          DeepLinkParser.toLocation(uri('$scheme://join/SURAJ-KAMAL')),
          '/join/SURAJ-KAMAL',
        );
      });

      test('the custom scheme for an invite', () {
        expect(
          DeepLinkParser.toLocation(uri('$scheme://invite?token=abc123')),
          '/invite/abc123',
        );
      });

      test('a mixed-case action, since QR encoders and mail clients rewrite case', () {
        expect(
          DeepLinkParser.toLocation(uri('$scheme://JOIN?code=SURAJ-KAMAL')),
          '/join/SURAJ-KAMAL',
        );
      });

      test('a link with extra query parameters, such as a campaign tag', () {
        expect(
          DeepLinkParser.toLocation(uri('https://$host/join/SURAJ-KAMAL?utm_source=poster')),
          '/join/SURAJ-KAMAL',
        );
      });
    });

    group('rejects', () {
      test('a look-alike host', () {
        // The whole point of the host check: without it, any site could publish
        // a /join/ URL and drive this app on a device where the user once
        // picked it from an "open with" dialog.
        expect(DeepLinkParser.toLocation(uri('https://evil.example/join/SURAJ-KAMAL')), isNull);
      });

      test('an unknown path on the right host', () {
        expect(DeepLinkParser.toLocation(uri('https://$host/api/v1/health/live')), isNull);
      });

      test('a join link with no code', () {
        expect(DeepLinkParser.toLocation(uri('https://$host/join')), isNull);
        expect(DeepLinkParser.toLocation(uri('$scheme://join')), isNull);
        expect(DeepLinkParser.toLocation(uri('$scheme://join?code=')), isNull);
      });

      test('an unrelated custom scheme', () {
        expect(DeepLinkParser.toLocation(uri('upi://pay?pa=someone@bank')), isNull);
      });

      test('a bare string with no scheme, which is what a free-text QR decodes to', () {
        expect(DeepLinkParser.toLocation(uri('samuday-setu-meeting-tomorrow')), isNull);
      });
    });

    test('re-encodes the code so a separator in it cannot split the route', () {
      // `Uri` hands the value over already decoded. Dropping it into a path
      // unencoded would let a code containing `/` become two segments and match
      // a different route.
      expect(
        DeepLinkParser.toLocation(uri('$scheme://join?code=A%2FB')),
        '/join/A%2FB',
      );
    });

    test('is case-insensitive about the host, which DNS is too', () {
      expect(
        DeepLinkParser.toLocation(uri('https://${host.toUpperCase()}/join/SURAJ-KAMAL')),
        '/join/SURAJ-KAMAL',
      );
    });
  });
}
